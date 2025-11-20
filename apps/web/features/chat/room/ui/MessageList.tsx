'use client';

import React, { useEffect, useRef } from 'react';
import { DateDivider } from '@/features/chat/room/ui/DateDivider';
import MyMessage from '@/features/chat/room/ui/MyMessage';
import YourMessage from '@/features/chat/room/ui/YourMessage';
import { useAuthStore } from '@/shared/model/authStore';
import Loading from '@/shared/ui/Loading/Loading';
import { useMessageRealtime } from '../api/useMessageRealtime';
import { setMessagesRead } from '../api/setMessageRead';
import { cn } from '@repo/ui/lib/utils';
import { getChatRoomLink } from '../model/getChatRoomLink';
import { AuctionInfoData, CombinedMessage } from '../types';
import { useRouter } from 'next/navigation';
import { encodeUUID } from '@/shared/lib/shortUuid';
import BidWinMessage from './BidWinMessage';
import { useCombinedMessages } from '../model/useCombiedMessages';
import { isUserMessage } from '../lib/utils';

const MessageList = ({
  shortId,
  isChatEnd,
  auctionInfo,
}: {
  shortId: string;
  isChatEnd: boolean;
  auctionInfo: AuctionInfoData;
}) => {
  const { combinedMessages: data, isLoading, error } = useCombinedMessages(shortId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const userId = useAuthStore((state) => state.user?.id) as string;
  const router = useRouter();
  const hasInitialScrolled = useRef(false); // 초기 스크롤 완료 여부

  useMessageRealtime(shortId);

  // 초기 로드 시 스크롤
  useEffect(() => {
    if (data && data.length > 0 && !isLoading && !hasInitialScrolled.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        hasInitialScrolled.current = true;
      }, 100);
      prevMessageCountRef.current = data.length;
      setMessagesRead(shortId);
    }
  }, [data, isLoading, shortId]);

  // 새 메시지가 추가될 때 스크롤
  useEffect(() => {
    if (data && data.length > prevMessageCountRef.current && hasInitialScrolled.current) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      prevMessageCountRef.current = data.length;
      setMessagesRead(shortId);
    }
  }, [data?.length, shortId]);

  if (isLoading) return <Loading />;
  if (error) return <p>오류: {(error as Error).message}</p>;
  if (!data || (data.length === 0 && !isChatEnd))
    return (
      <div className="p-box flex-1 overflow-y-auto pb-[30px]">
        <p className="pt-[30px] text-center">아직 대화가 없습니다.</p>
      </div>
    );

  const linkChatRoom = async () => {
    const { auctionId, exhibitUserId, bidUserId } = auctionInfo;
    const encodedChatRoomId = await getChatRoomLink(
      encodeUUID(auctionId),
      encodeUUID(exhibitUserId),
      encodeUUID(bidUserId)
    );
    router.push(`/chat/${encodedChatRoomId}`);
  };

  const messages = data;

  return (
    <div className="p-box custom-scrollbar flex-1 overflow-y-auto">
      {data?.map((message: CombinedMessage, index) => {
        const isLastMessage = index === messages.length - 1;
        if (message.messageType === 'system') {
          return (
            <div
              key={message.system_message_id}
              className={isLastMessage && index > 0 ? 'mt-[30px]' : ''}
            >
              {index === 0 && <DateDivider isoDate={message.created_at} />}
              <BidWinMessage data={message} />
            </div>
          );
        } else {
          // 최초 메세지이거나 이전 메세지와 날짜가 달라진 경우 DateDivider
          const currentDate = new Date(message.created_at);

          // 이전 메시지가 존재하는지 체크
          const prevMessage = data && index > 0 ? messages[index - 1] : undefined;
          const nextMessage = data && index < messages.length - 1 ? messages[index + 1] : undefined;
          const prevDate = isUserMessage(prevMessage)
            ? new Date(prevMessage.created_at)
            : undefined;
          const nextDate = isUserMessage(nextMessage)
            ? new Date(nextMessage.created_at)
            : undefined;

          const isFirstMessage = index === 0;
          const isDifferentDay = prevDate
            ? currentDate.getFullYear() !== prevDate.getFullYear() ||
              currentDate.getMonth() !== prevDate.getMonth() ||
              currentDate.getDate() !== prevDate.getDate()
            : false;

          const isNextSameTime = nextDate
            ? currentDate.getHours() === nextDate.getHours() &&
              currentDate.getMinutes() === nextDate.getMinutes()
            : false;
          const isNextSameDay = nextDate
            ? currentDate.getFullYear() === nextDate.getFullYear() &&
              currentDate.getMonth() === nextDate.getMonth() &&
              currentDate.getDate() === nextDate.getDate()
            : false;

          const isSameUserTalking = isUserMessage(prevMessage)
            ? prevMessage.sender_id === message.sender_id
            : false;
          const willSameUserTalk = isUserMessage(nextMessage)
            ? nextMessage.sender_id === message.sender_id
            : false;

          const isBetweenSystemTop = prevMessage?.messageType === 'system';
          const isBetweenSystemBottom = nextMessage?.messageType === 'system';

          const showTime =
            !willSameUserTalk || !isNextSameTime || !isNextSameDay || isBetweenSystemBottom;
          const returnMessage = (
            <div key={message.message_id}>
              {(isFirstMessage || isDifferentDay) && <DateDivider isoDate={message.created_at} />}
              {userId === message.sender_id ? (
                <MyMessage
                  className={cn(
                    isFirstMessage || isDifferentDay
                      ? ''
                      : isSameUserTalking
                        ? 'mt-[10px]'
                        : 'mt-[20px]',
                    isLastMessage && 'mb-[30px]',
                    isBetweenSystemTop && 'mt-[30px]',
                    isBetweenSystemBottom && 'mb-[30px]'
                  )}
                  text={message.content}
                  showTime={showTime}
                  time={message.created_at}
                  isRead={message.is_read}
                  isLast={isLastMessage}
                  isImage={message.message_type === 'image'}
                  images={message.images}
                />
              ) : (
                <YourMessage
                  className={cn(
                    isFirstMessage || isDifferentDay
                      ? ''
                      : isSameUserTalking
                        ? 'mt-[10px]'
                        : 'mt-[20px]',
                    isLastMessage && 'mb-[30px]',
                    isBetweenSystemTop && 'mt-[30px]',
                    isBetweenSystemBottom && 'mb-[30px]'
                  )}
                  text={message.content}
                  showTime={showTime}
                  showAvatar={isDifferentDay || !isSameUserTalking}
                  time={message.created_at}
                  avatar={message.profile?.profile_img}
                  isImage={message.message_type === 'image'}
                  images={message.images}
                />
              )}
            </div>
          );

          return returnMessage;
        }
      })}
      {isChatEnd && (
        <div className="bg-main-lightest py-[20px] text-center">
          <div className="typo-caption-medium text-neutral-600">
            상대방이 채팅을 종료했습니다. <br />
            대화를 이어가시려면 새로운 채팅방을 생성해주세요.
          </div>
          <button
            onClick={linkChatRoom}
            className="typo-body-medium text-main mt-[7px] cursor-pointer underline outline-none focus:outline-none focus:ring-0 active:outline-none"
          >
            새 채팅 시작하기
          </button>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
