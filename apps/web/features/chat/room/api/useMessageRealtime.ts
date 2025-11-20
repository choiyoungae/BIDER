import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { decodeShortId } from '@/shared/lib/shortUuid';
import { useAuthStore } from '@/shared/model/authStore';
import { MessageWithImage } from '@/entities/message/model/types';
import { RealtimeMessagePayload } from '../types';
import { Profiles } from '@/entities/profiles/model/types';
import { createClient } from '@/shared/lib/supabase/client';
import { anonSupabase } from '@/shared/lib/supabaseClient';
import { MessageImage } from '@/entities/messageImage/model/types';

export const useMessageRealtime = (chatRoomId: string) => {
  const queryClient = useQueryClient();
  const fullChatRoomId = decodeShortId(chatRoomId);
  const userId = useAuthStore((state) => state.user?.id) as string;
  const supabase = createClient();

  // 이미지 데이터를 안전하게 가져오는 함수 (타이밍 이슈 방어)
  const fetchImagesWithRetry = async (messageId: string, retry = 5, delay = 500) => {
    for (let i = 0; i < retry; i++) {
      const { data, error } = await supabase
        .from('message_image')
        .select('*')
        .eq('message_id', messageId)
        .order('order_index');

      if (error) {
        console.error('이미지 로드 실패:', error);
        break;
      }

      if (data && data.length > 0) {
        return data as MessageImage[];
      }

      // 아직 DB에 이미지가 반영되지 않았다면 delay 후 재시도
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // 최종 실패 시 빈 배열 반환
    return [];
  };

  // 캐시 업데이트 함수
  const updateMessageCache = useCallback(
    async (payload: RealtimeMessagePayload) => {
      const queryKey = ['messages', chatRoomId];

      if (payload.eventType === 'INSERT') {
        const rawMessage = payload.new as MessageWithImage;
        if (!rawMessage) {
          console.warn('INSERT 페이로드에 새 메시지 데이터가 없습니다.');
          return;
        }

        let newMessage: typeof rawMessage & Partial<{ profile: Profiles; images: MessageImage[] }> =
          {
            ...rawMessage,
          };

        // 프로필 및 이미지 데이터를 병렬로 가져오기
        const profilePromise =
          rawMessage.sender_id !== userId
            ? anonSupabase
                .from('profiles')
                .select('profile_img, nickname')
                .eq('user_id', rawMessage.sender_id)
                .single()
            : Promise.resolve({ data: null, error: null });

        const imagePromise =
          rawMessage.message_type === 'image'
            ? new Promise<MessageImage[]>(async (resolve) => {
                await new Promise((r) => setTimeout(r, 1000));
                const images = await fetchImagesWithRetry(rawMessage.message_id);
                resolve(images);
              })
            : Promise.resolve([]);

        try {
          const [profileResult, imageData] = await Promise.all([profilePromise, imagePromise]);

          if (profileResult.data) {
            newMessage.profile = profileResult.data as Profiles;
          }

          if (imageData) {
            newMessage.images = imageData;
          }
        } catch (e) {
          console.error('메시지 추가 데이터 가져오기 에러:', e);
        }

        // 모든 데이터가 준비된 후에만 캐시에 추가
        queryClient.setQueryData(queryKey, (oldData: MessageWithImage[] | undefined) => {
          if (!oldData) {
            queryClient.invalidateQueries({ queryKey });
            return oldData;
          }

          const exists = oldData.some((msg) => msg.message_id === newMessage.message_id);
          if (exists) return oldData;

          return [...oldData, newMessage];
        });
      } else if (payload.eventType === 'UPDATE') {
        // 메시지 업데이트 처리 (읽음 상태 등)
        queryClient.setQueryData(queryKey, (oldData: MessageWithImage[] | undefined) => {
          if (!oldData) {
            queryClient.invalidateQueries({ queryKey });
            return oldData;
          }
          const updatedMessage = payload.new as MessageWithImage;
          return oldData.map((msg) =>
            msg.message_id === updatedMessage.message_id ? { ...msg, ...updatedMessage } : msg
          );
        });
      }
    },
    [queryClient, chatRoomId]
  );

  useEffect(() => {
    if (!userId || !fullChatRoomId) return;

    const channel = supabase.channel(`message-${fullChatRoomId}`);

    // 1. message 테이블 변경 감지
    channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'message',
        filter: `chatroom_id=eq.${fullChatRoomId}`,
      },
      async (payload: RealtimeMessagePayload) => {
        const isInsert = payload.eventType === 'INSERT';
        const isUpdate = payload.eventType === 'UPDATE';

        if (isInsert) {
          await updateMessageCache(payload);
        } else if (isUpdate) {
          // UPDATE의 경우 내 메시지만 처리 (읽음 상태 등)
          const isMyMessage = payload.new?.sender_id === userId;
          if (isMyMessage) {
            await updateMessageCache(payload);
          }
        }
      }
    );

    // 2. chat_room 상태 변경 감지
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_room',
        filter: `chatroom_id=eq.${fullChatRoomId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['chatRoom_active', chatRoomId] });
      }
    );

    // 3. system_message 테이블 INSERT 감지
    channel.on(
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'system_message',
        filter: `chatroom_id=eq.${fullChatRoomId}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['systemMessage', chatRoomId] });
      }
    );

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, fullChatRoomId, queryClient, userId]);
};
