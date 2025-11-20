'use client';

import { PROPOSAL_COST } from '@/shared/consts/pointConstants';
import { Button } from '@repo/ui/components/Button/Button';
import { Input } from '@repo/ui/components/Input/Input';
import Loading from '@/shared/ui/Loading/Loading';
import { useTargetProduct } from '@/features/proposal/make/model/useTargetProduct';
import { useParams, useRouter } from 'next/navigation';
import { toast } from '@repo/ui/components/Toast/Sonner';
import { useState } from 'react';
import { useMemo } from 'react';
import shortUUID from 'short-uuid';

const translator = shortUUID();

const MakePrice = ({ userId }: { userId: string }) => {
  const params = useParams();
  const shortId = params?.shortId as string;
  const auctionId = translator.toUUID(shortId);

  const [price, setPrice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [inputStatus, setInputStatus] = useState<'default' | 'error'>('default');

  const { data, isLoading, error } = useTargetProduct({ userId, shortId });
  const router = useRouter();

  const formattedPrice = useMemo(() => {
    if (!price) return '';
    const numeric = parseInt(price.replaceAll(',', ''), 10);
    return isNaN(numeric) ? '' : numeric.toLocaleString();
  }, [price]);

  if (isLoading || error || !data) return <Loading />;

  const highestBid = data.bid_history.at(-1).bid_price ?? data.min_price;
  const numericPrice = parseInt(price, 10);
  const isValidPrice = !isNaN(numericPrice) && numericPrice > highestBid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPrice) return;

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('auctionId', auctionId);
    formData.append('proposedPrice', price);

    try {
      const res = await fetch(`/api/auction/${shortId}/proposal`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const error = await fetch('/api/alarm/proposal/proposal-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'pending',
          user_id: userId,
          auctionId: auctionId,
          price: price,
        }),
      });

      router.push(`/auction/${shortId}`);
      toast({ content: '제안이 완료되었습니다.' });

      router.refresh();
    } catch (error) {
      console.error('Unexpected error in callback:', error);
      toast({ content: '예상치 못한 오류가 발생했습니다.' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-box flex flex-col gap-[20px] pt-[35px]">
      <div>
        <div className="typo-subtitle-small-medium pb-[5px]">얼마로 제안할까요?</div>
        <p className="typo-caption-regular text-neutral-600">
          {PROPOSAL_COST}포인트를 사용해 가격을 제안할 수 있어요.
        </p>
      </div>
      <div className="typo-body-medium flex w-full justify-between gap-2">
        <Input
          status={inputStatus}
          errorMessage={errorMessage}
          value={formattedPrice}
          onChange={(e) => {
            const rawValue = e.target.value.replaceAll(',', '');
            setPrice(rawValue);

            const parsed = parseInt(rawValue, 10);
            if (isNaN(parsed) || parsed <= highestBid) {
              setInputStatus('error');
              setErrorMessage('최고 입찰가보다 높게 제안해 주세요.');
            } else {
              setInputStatus('default');
              setErrorMessage('');
            }
          }}
          placeholder="희망하는 제안가를 적어주세요."
          required
        />
        <span className="pt-[25px]">원</span>
      </div>
      <Button type="submit" disabled={!price || !isValidPrice}>
        제안하기
      </Button>
    </form>
  );
};
export default MakePrice;
