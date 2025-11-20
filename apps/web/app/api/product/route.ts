import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/lib/supabaseClient';
import sharp from 'sharp';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const minPrice = parseInt(formData.get('min_price') as string, 10);
    const endAt = formData.get('end_at') as string;
    const exhibitUserId = formData.get('user_id') as string;
    const dealLatitudeRaw = formData.get('deal_latitude');
    const dealLongitudeRaw = formData.get('deal_longitude');
    const dealLatitude = dealLatitudeRaw !== null ? Number(dealLatitudeRaw) : null;
    const dealLongitude = dealLongitudeRaw !== null ? Number(dealLongitudeRaw) : null;
    const dealAddress = formData.get('deal_address') as string;
    const isSecret = formData.get('is_secret') as string;

    // STEP 0: 로그인한 회원 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', exhibitUserId);

    if (userError || !userData) {
      return NextResponse.json({ error: '회원 정보 조회 실패' }, { status: 500 });
    }

    const user = userData?.[0];
    const latitude = user.latitude;
    const longitude = user.longitude;
    const address = user.address;

    const uploadedImageUrls: string[] = [];

    // STEP 1: 이미지 업로드 → 실패 시 abort
    for (const [index, file] of files.entries()) {
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
        return NextResponse.json(
          { error: `이미지 업로드 실패: ${uploadError.message}` },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage.from('product-image').getPublicUrl(filePath);

      uploadedImageUrls.push(urlData.publicUrl);
    }

    // STEP 2: product 등록 (이미지 업로드 성공 이후)
    const { data: productData, error: productError } = await supabase
      .from('product')
      .insert({
        title,
        description,
        exhibit_user_id: exhibitUserId,
        created_at: new Date().toISOString(),
        latitude,
        longitude,
        category,
        address,
      })
      .select('product_id')
      .single();

    if (productError || !productData) {
      return NextResponse.json({ error: '상품 등록 실패' }, { status: 500 });
    }

    const productId = productData.product_id;

    // STEP 3: product_image 테이블에 이미지 URL insert
    for (const [index, url] of uploadedImageUrls.entries()) {
      const { error: imageInsertError } = await supabase.from('product_image').insert({
        product_id: productId,
        image_url: url,
        order_index: index,
      });

      if (imageInsertError) {
        return NextResponse.json({ error: '이미지 메타데이터 저장 실패' }, { status: 500 });
      }
    }

    // STEP 4: auction 테이블에 insert
    const { error: auctionError } = await supabase.from('auction').insert({
      product_id: productId,
      min_price: minPrice,
      auction_end_at: endAt,
      auction_status: '경매 대기',
      deal_longitude: dealLongitude,
      deal_latitude: dealLatitude,
      deal_address: dealAddress,
      is_secret: isSecret,
    });

    if (auctionError) {
      console.error('경매 저장 실패:', auctionError);
    }

    return NextResponse.json({ success: true, product_id: productId });
  } catch (err) {
    console.error('서버 오류:', err);
    return NextResponse.json({ error: '서버 내부 오류 발생' }, { status: 500 });
  }
}
