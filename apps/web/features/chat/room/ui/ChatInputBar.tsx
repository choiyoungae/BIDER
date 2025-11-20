'use client';

import { cn } from '@repo/ui/lib/utils';
import { Camera, SendHorizontal } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import { sendMessage } from '../api/sendMessage';
import { Textarea } from '@repo/ui/components/Textarea/Textarea';
import { ChatImage } from '../types';
import ImageUploadForChat from './ImageUploadForChat';

const ChatInputBar = ({ shortId, isChatEnd }: { shortId: string; isChatEnd: boolean }) => {
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(0);
  const [isSendImage, setIsSendImage] = useState(false);
  const [images, setImages] = useState<ChatImage[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600); // 모바일 기준 너비

      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setBottomOffset(offset > 0 ? offset : 0);
      }
    };

    handleResize(); // 초기 판단
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  let isMessageSendable = Boolean(message.trim().length > 0);

  const onSubmit = async () => {
    const messageToSend = message.trim();
    if (!messageToSend) return;

    // 먼저 입력창 비우기
    setMessage('');

    startTransition(async () => {
      try {
        await sendMessage({
          chatRoomId: shortId,
          message: messageToSend,
          location: window.location.origin,
        });
      } catch (error) {
        console.error('메시지 전송 실패:', error);
        // 에러 발생 시 메시지 복원
        setMessage(messageToSend);
      }
    });
  };

  useEffect(() => {
    if (images.length > 0) {
      startTransition(async () => {
        try {
          await sendMessage({
            chatRoomId: shortId,
            images,
            location: window.location.origin,
          });
          setImages([]); // 전송 후 초기화
        } catch (error) {
          console.error('이미지 메시지 전송 실패:', error);
        }
      });
    }
  }, [images, shortId]);

  return (
    <div
      style={{ bottom: bottomOffset }}
      className={cn(
        'bg-neutral-0 flex w-full items-end gap-[12px] border-t border-neutral-100 px-[16px] pt-[12px]',
        !isMobile ? 'pb-[34px]' : isFocused ? 'pb-[12px]' : 'pb-[34px]'
      )}
    >
      <div
        className={`flex flex-1 items-end rounded-[10px] ${isChatEnd || isPending ? 'bg-neutral-300' : 'bg-neutral-050'}`}
      >
        <Textarea
          name="message"
          placeholder="메시지 보내기"
          variant="chat"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isChatEnd || isPending}
          onKeyDown={(e) => {
            if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); // 줄바꿈 막기
              onSubmit(); // 전송
            }
          }}
          className="max-h-[157px] flex-1"
        />
        <button className="ring-0" onClick={() => setIsSendImage(true)} disabled={isChatEnd}>
          <Camera size={24} className="mx-[15px] mb-[9px] cursor-pointer text-neutral-700" />
        </button>
      </div>
      <button
        className={`mb-[9px] ring-0 ${isMessageSendable ? 'cursor-pointer' : ''}`}
        onClick={onSubmit}
        disabled={!isMessageSendable || isChatEnd || isPending}
      >
        <SendHorizontal
          size={24}
          className={isMessageSendable ? 'text-main' : 'text-neutral-700'}
        />
      </button>
      <ImageUploadForChat
        open={isSendImage}
        onImagesChange={setImages}
        onClose={() => setIsSendImage(false)}
      />
    </div>
  );
};

export default ChatInputBar;
