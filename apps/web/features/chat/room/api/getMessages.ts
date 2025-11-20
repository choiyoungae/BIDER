'use server';

import { MessageWithImage } from '@/entities/message/model/types';
import { MessageImage } from '@/entities/messageImage/model/types';
import { decodeShortId } from '@/shared/lib/shortUuid';
import { supabase } from '@/shared/lib/supabaseClient';

export const getMessages = async (chatRoomId: string) => {
  const fullChatRoomId = decodeShortId(chatRoomId);

  // 1) 메시지 조회
  const { data: messages, error: msgError } = await supabase
    .from('message')
    .select('*, profile:sender_id (*)')
    .eq('chatroom_id', fullChatRoomId)
    .order('created_at', { ascending: true });

  if (msgError) {
    throw new Error(`Message 조회 실패: ${msgError.message}`);
  }

  // 2) 이미지 메시지 처리
  const messagesWithImages: MessageWithImage[] = await Promise.all(
    messages.map(async (msg: any) => {
      let images: MessageImage[] = [];
      if (msg.message_type === 'image') {
        const { data: imgs, error: imgError } = await supabase
          .from('message_image')
          .select('*')
          .eq('message_id', msg.message_id)
          .order('order_index', { ascending: true });

        if (imgError) {
          console.error(`이미지 조회 실패: ${imgError.message}`);
        } else {
          images = imgs as MessageImage[];
        }
      }

      return {
        ...msg,
        images,
      };
    })
  );

  return messagesWithImages;
};
