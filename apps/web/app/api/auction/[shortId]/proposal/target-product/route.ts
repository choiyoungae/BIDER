import { supabase } from '@/shared/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';
import shortUUID from 'short-uuid';

const translator = shortUUID();

export async function GET(request: NextRequest, context: { params: { shortId: string } }) {
  try {
    const { shortId } = context.params;
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId || !shortId) {
      throw new Error('요청 정보가 부족합니다.');
    }

    const auctionId = translator.toUUID(shortId);

    const { data, error } = await supabase
      .from('auction')
      .select(
        `
        auction_id,
        product_id,
        min_price,
        product:product_id(
          *,
          product_image:product_image!product_image_product_id_fkey(*)
        ),
        bid_history!auction_id(bid_price)
    `
      )
      .eq('auction_id', auctionId)
      .single();

    if (error || !data) {
      throw new Error(`상품 불러오기 실패 : ${error.message}`);
    }

    return NextResponse.json({ success: true, data: data });
  } catch (err) {
    console.error(`target-product 처리 실패`, err);
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
