import { formatNumberWithComma } from '@/shared/lib/formatNumberWithComma';
import { Avatar } from '@repo/ui/components/Avatar/Avatar';
import { AlarmClock, Info, PencilLine } from 'lucide-react';
import React, { useState } from 'react';
import { formatTimestamptz } from '@/shared/lib/formatTimestamp';

import { getCategoryLabel } from '@/features/category/lib/utils';
import { CategoryValue } from '@/features/category/types';
import GoogleMapView from '@/features/location/ui/GoogleMapView';

import { AuctionDetailContentProps } from '@/features/auction/detail/types';
import SecretBidStatusBoard from '@/features/auction/secret/ui/SecretBiddingStatusBoard';
import Link from 'next/link';
import ProposalActionButton from '@/features/auction/detail/ui/ProposalActionButton';
import BiddingStatusBoard from '@/features/auction/detail/ui/BiddingStatusBoard';
import { SECRET_PRICE } from '@/features/auction/list/constants';

const AuctionDetail = ({ data, isProductMine }: AuctionDetailContentProps) => {
  const [currentHighestBid, setCurrentHighestBid] = useState(data.currentHighestBid);

  return (
    <>
      {/* 경매 상품 내용 */}
      <div className="p-box flex flex-col gap-[25px]">
        <div className="flex flex-col gap-[14px]">
          <div className="typo-subtitle-bold">{data.productTitle}</div>
          <Link href={`/auction?cate=${data.productCategory}`}>
            <u className="typo-caption-regular w-fit text-neutral-700">
              {getCategoryLabel(data.productCategory as CategoryValue)}
            </u>
          </Link>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="typo-caption-regular text-neutral-600">최고 입찰가</div>
            <div className="typo-subtitle-bold">
              {data.isSecret ? (
                <span className="text-event">{SECRET_PRICE} </span>
              ) : (
                formatNumberWithComma(currentHighestBid as number)
              )}
              원
            </div>
          </div>
          {/* 제안하기 */}
          {!isProductMine && data.auctionStatus !== '경매 종료' && !data.isSecret && (
            <ProposalActionButton auctionId={data.auctionId} />
          )}
        </div>

        <div className="bg-neutral-050 flex w-full items-center justify-around px-[12px] py-[9px]">
          <div className="flex items-center gap-[10px]">
            <div className="flex items-center gap-[3px]">
              <PencilLine size={12} className="text-neutral-600" />
              <div className="text-[10px] text-neutral-600">입찰 시작가</div>
            </div>
            <div className="typo-caption-medium">{formatNumberWithComma(data.minPrice)}원</div>
          </div>
          <div className="h-[12px] w-[1px] bg-neutral-300"></div>
          <div className="flex items-center gap-[10px]">
            <div className="flex items-center gap-[3px]">
              <AlarmClock size={12} className="text-neutral-600" />
              <div className="text-[10px] text-neutral-600">입찰 마감 일자</div>
            </div>
            <div className="typo-caption-medium">{formatTimestamptz(data.auctionEndAt)}</div>
          </div>
        </div>

        <div className="typo-body-regular whitespace-pre-line">{data.productDescription}</div>

        {/* 거래 희망 장소 */}
        {data.dealAddress && data.dealLocation && (
          <div className="flex flex-col gap-[14px]">
            <div className="flex items-end gap-[11px]">
              <div className="typo-subtitle-small-medium">거래 희망 장소</div>
              <div className="typo-body-regular text-neutral-700">{data.dealAddress}</div>
            </div>
            <div className="overflow-hidden rounded-[10px]">
              <GoogleMapView
                mapId="productDetail"
                height="h-[126px]"
                location={data.dealLocation}
                showMyLocation={true}
              />
            </div>
          </div>
        )}
      </div>

      <div className="h-[8px] w-full bg-neutral-100"></div>

      {data.isSecret ? (
        <SecretBidStatusBoard
          auctionId={data.auctionId}
          auctionEndAt={data.auctionEndAt}
          bidCnt={data.bidCnt}
          isSecret={data.isSecret}
          onNewHighestBid={(newPrice) => setCurrentHighestBid(newPrice)}
        />
      ) : (
        <div className="p-box">
          <div className="items-baseline-last mb-[14px] flex justify-between">
            <div className="typo-subtitle-small-medium">입찰 현황판</div>
            <div className="typo-caption-regular flex items-center gap-1 text-neutral-600">
              <Info size={13} strokeWidth={2} stroke="var(--color-neutral-400)" /> 상위 5등까지만
              조회 가능합니다.
            </div>
          </div>
          <BiddingStatusBoard
            data={data.bidHistory}
            auctionId={data.auctionId}
            onNewHighestBid={(newPrice) => setCurrentHighestBid(newPrice)}
          />
        </div>
      )}

      <div className="h-[8px] w-full bg-neutral-100"></div>

      {/* 판매자 정보 */}
      <div className="p-box mb-[25px] flex items-center gap-[19px]">
        <Avatar src={data.exhibitUser?.profile_img || undefined} className="size-[40px]" />
        <div className="flex flex-col gap-[5px]">
          <div className="typo-body-medium">{data.exhibitUser?.nickname}</div>
          <div className="typo-caption-regular">{data.exhibitUser?.address}</div>
        </div>
      </div>
    </>
  );
};

export default AuctionDetail;
