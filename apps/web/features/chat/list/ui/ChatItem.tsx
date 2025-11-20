import { Avatar } from '@repo/ui/components/Avatar/Avatar';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { ChatItemProps } from '../types';
import StatusBadge from '@/shared/ui/badge/StatusBadge';
import { getTimeAgo } from '../lib/getTimeAgo';

const ChatItem = ({ data, isLastMsgMine }: ChatItemProps) => {
  return (
    <div className="bg-neutral-0 flex w-full items-center justify-between py-[17px]">
      <div className="flex w-full items-center">
        <div className="relative size-[46px] overflow-hidden rounded">
          <Image
            src={data.product_image.image_url}
            alt="상품 사진"
            fill
            sizes="46"
            className="object-cover object-center"
          />
        </div>
        <div className="ml-[15px]" style={{ width: 'calc(100% - 61px)' }}>
          <div className="flex items-center gap-[7px]">
            <Avatar className="size-[18px]" src={data.your_profile.profile_img || undefined} />
            <div className="typo-body-medium">{data.your_profile.nickname}</div>
            {data.is_win && <StatusBadge type="state-blue" label="낙찰" />}
          </div>
          <div className="relative mt-[6px] w-full">
            {data.last_message ? (
              data.last_message.message_type === 'image' ? (
                <p
                  className={`typo-caption-regular ${
                    data.last_message?.is_read || isLastMsgMine ? 'text-neutral-400' : ''
                  }`}
                >
                  사진을 보냈습니다.{' '}
                </p>
              ) : (
                <div className="flex">
                  <div
                    className={`typo-caption-regular max-w-[70%] truncate ${
                      data.last_message?.is_read || isLastMsgMine ? 'text-neutral-400' : ''
                    }`}
                  >
                    {data.last_message?.content}
                  </div>
                  <div className="typo-caption-regular ml-[4px] text-neutral-400">
                    · {getTimeAgo(data.last_message.created_at)}
                  </div>
                </div>
              )
            ) : (
              <p className="typo-caption-regular text-neutral-400">아직 대화가 없습니다. </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-[8px]">
        {data.unread_count !== 0 && (
          <div className="bg-alert text-neutral-0 typo-caption-medium flex size-[21px] items-center justify-center rounded-full">
            {data.unread_count}
          </div>
        )}
        <ChevronRight className="text-neutral-400" />
      </div>
    </div>
  );
};

export default ChatItem;
