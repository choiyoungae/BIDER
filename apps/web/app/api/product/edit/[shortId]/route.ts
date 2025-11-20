import { v4 as uuidv4 } from 'uuid';
import { decodeShortId } from '@/shared/lib/shortUuid';
import { supabase } from '@/shared/lib/supabaseClient';
import { NextResponse } from 'next/server';
import { ProductForEdit } from '@/entities/product/model/types';
import sharp from 'sharp';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shortId: string }> }
): Promise<
  NextResponse<
    ProductForEdit | { error: string; details?: string; shortId?: string; decodedId?: any }
  >
> {
  const resolvedParams = await params;
  const id = decodeShortId(resolvedParams.shortId);

  try {
    // 1. 먼저 경매 정보만 가져오기
    const { data, error } = await supabase
      .from('product')
      .select(
        `
                *,
                product_image (*),
                auction!inner (
                  min_price, 
                  auction_end_at,
                  deal_longitude,
                  deal_latitude,
                  deal_address,
                  is_secret
                )
            `
      )
      .eq('product_id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error: 'Product not found',
          details: error?.message,
          shortId: resolvedParams.shortId,
          decodedId: id,
        },
        { status: 404 }
      );
    }
    // auction 데이터 추출 (배열의 첫 번째 요소)
    const auctionData = data.auction[0];

    // ProductForEdit 타입에 맞게 데이터 변환
    const productForEdit: ProductForEdit = {
      ...data,
      min_price: auctionData.min_price,
      auction_end_at: auctionData.auction_end_at,
      deal_address: auctionData.deal_address,
      deal_longitude: auctionData.deal_longitude,
      deal_latitude: auctionData.deal_latitude,
      auction: undefined, // auction 배열 제거
      is_secret: auctionData.is_secret,
    };

    return NextResponse.json(productForEdit);
  } catch (err) {
    return NextResponse.json({ error: '서버 내부 오류 발생' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const shortId = url.pathname.split('/').pop();
  const formData = await request.formData();
  const productId = decodeShortId(shortId!);
  const title = formData.get('title') as string;
  const category = formData.get('category') as string;
  const description = formData.get('description') as string;
  const minPrice = formData.get('min_price') as string;
  const endAt = formData.get('end_at') as string;
  const dealLatitudeRaw = formData.get('deal_latitude');
  const dealLongitudeRaw = formData.get('deal_longitude');
  const dealAddressRaw = formData.get('deal_address');
  const dealLatitude = dealLatitudeRaw !== null ? Number(dealLatitudeRaw) : null;
  const dealLongitude = dealLongitudeRaw !== null ? Number(dealLongitudeRaw) : null;
  const isSecret = formData.get('is_secret') as string;

  const dealAddress =
    dealAddressRaw !== null && dealAddressRaw !== '' ? String(dealAddressRaw) : null;
  // 새로 업로드할 파일들
  const newImageFiles = formData.getAll('images') as File[];

  // 이미지 순서 정보 파싱
  const imageOrders: { index: number; id: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('image_order_')) {
      const index = parseInt(key.replace('image_order_', ''));
      imageOrders.push({ index, id: value as string });
    }
  }

  // 이미지 변경 여부 확인
  const hasImageChanges = newImageFiles.length > 0 || imageOrders.length > 0;

  try {
    // STEP 0: 경매 상태 체크
    const { data: auction, error: auctionError } = await supabase
      .from('auction')
      .select('auction_status')
      .eq('product_id', productId)
      .maybeSingle();

    if (auctionError) {
      throw new Error(`경매 상태 조회 실패: ${auctionError.message}`);
    }

    if (!auction || auction.auction_status !== '경매 대기') {
      return NextResponse.json({ error: '상품 수정 가능 시간이 만료되었습니다.' }, { status: 400 });
    }

    // STEP 1: product 테이블 업데이트
    const { error: productUpdateError } = await supabase
      .from('product')
      .update({
        title,
        category,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId);
    if (productUpdateError) {
      throw new Error(`상품 정보 업데이트 실패: ${productUpdateError.message}`);
    }

    // STEP 2: auction 테이블 업데이트
    const { error: auctionUpdateError } = await supabase
      .from('auction')
      .update({
        min_price: parseInt(minPrice),
        auction_end_at: endAt,
        updated_at: new Date().toISOString(),
        deal_latitude: dealLatitude,
        deal_longitude: dealLongitude,
        deal_address: dealAddress,
        is_secret: isSecret,
      })
      .eq('product_id', productId);

    if (auctionUpdateError) {
      throw new Error(`경매 정보 업데이트 실패: ${auctionUpdateError.message}`);
    }

    // STEP 3: 이미지 처리 로직 (변경이 있는 경우에만)
    if (hasImageChanges) {
      // 3-1: 기존 이미지 데이터 조회
      const { data: existingImages, error: fetchError } = await supabase
        .from('product_image')
        .select('*')
        .eq('product_id', productId)
        .order('order_index');

      if (fetchError) {
        throw new Error(`기존 이미지 조회 실패: ${fetchError.message}`);
      }

      // 3-2: 새 이미지 업로드 (조건부 webP 변환)
      const uploadedImageUrls: string[] = [];
      for (const file of newImageFiles) {
        const fileName = `${uuidv4()}.webp`;
        const filePath = `products/${fileName}`;

        let finalBuffer: Buffer;
        let contentType = 'image/webp';

        // WebP 파일인지 확인
        if (file.type === 'image/webp') {
          // 이미 WebP인 경우 그대로 사용
          const arrayBuffer = await file.arrayBuffer();
          finalBuffer = Buffer.from(arrayBuffer);
        } else {
          // WebP가 아닌 경우 변환
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // sharp를 사용하여 WebP로 변환
          finalBuffer = await sharp(buffer).toFormat('webp', { quality: 90 }).toBuffer();
        }

        const { error: uploadError } = await supabase.storage
          .from('product-image')
          .upload(filePath, finalBuffer, {
            contentType,
          });

        if (uploadError) {
          throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('product-image').getPublicUrl(filePath);
        uploadedImageUrls.push(urlData.publicUrl);
      }

      // 3-3: 기존 이미지 중 유지할 것들과 삭제할 것들 구분
      // 기존 이미지 ID만 골라내기 (새 이미지 'NEW_IMAGE_x' 제외)
      const orderExistingImageIds = imageOrders
        .filter((order) => !order.id.startsWith('NEW_IMAGE_'))
        .map((order) => order.id);

      // 삭제할 이미지: 기존에 있었지만 클라이언트에서 유지하지 않은 이미지
      const imagesToDelete = existingImages.filter(
        (img) => !orderExistingImageIds.includes(img.image_id.toString())
      );

      // 3-4: 삭제할 이미지들 제거 (스토리지에서도 삭제)
      if (imagesToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('product_image')
          .delete()
          .in(
            'image_id',
            imagesToDelete.map((img) => img.image_id)
          );

        if (deleteError) {
          throw new Error(`이미지 삭제 실패: ${deleteError.message}`);
        }

        // 스토리지에서도 파일 삭제
        for (const img of imagesToDelete) {
          try {
            // URL에서 파일 경로 추출
            const url = new URL(img.image_url);
            const filePath = url.pathname.split('/').slice(-2).join('/'); // "products/filename.webp" 형태

            await supabase.storage.from('product-image').remove([filePath]);
          } catch (error) {
            console.warn(`스토리지 파일 삭제 실패: ${img.image_url}`, error);
            // 스토리지 삭제 실패는 치명적이지 않으므로 계속 진행
          }
        }
      }

      // 3-5: 이미지 순서 재정렬 및 새 이미지 추가
      let newImageIndex = 0;

      for (const orderInfo of imageOrders) {
        if (orderInfo.id.startsWith('NEW_IMAGE_')) {
          // 새 이미지 추가
          if (newImageIndex < uploadedImageUrls.length) {
            const { error: insertError } = await supabase.from('product_image').insert({
              product_id: productId,
              image_url: uploadedImageUrls[newImageIndex],
              order_index: orderInfo.index === 0 ? 0 : 1, // 첫 번째는 메인(0), 나머지는 일반(1)
            });

            if (insertError) {
              throw new Error(`새 이미지 추가 실패: ${insertError.message}`);
            }
            newImageIndex++;
          }
        } else {
          // 기존 이미지 순서 업데이트
          const { error: updateError } = await supabase
            .from('product_image')
            .update({
              order_index: orderInfo.index === 0 ? 0 : 1, // 첫 번째는 메인(0), 나머지는 일반(1)
            })
            .eq('image_id', orderInfo.id);

          if (updateError) {
            throw new Error(`이미지 순서 업데이트 실패: ${updateError.message}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '상품이 성공적으로 수정되었습니다.',
    });
  } catch (error) {
    console.error('상품 수정 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '상품 수정 실패' },
      { status: 500 }
    );
  }
}
