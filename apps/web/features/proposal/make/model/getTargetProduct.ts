import { ProposalPriceParams } from '@/features/proposal/make/types';

const getTargetProduct = async (params: ProposalPriceParams) => {
  const { shortId } = params;
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const res = await fetch(`${BASE_URL}/api/auction/${shortId}/proposal/target-product`);
  const result = await res.json();

  if (!res.ok || !result.success) {
    throw new Error(result.error || '데이터 로딩 실패');
  }

  return result.data;
};

export default getTargetProduct;
