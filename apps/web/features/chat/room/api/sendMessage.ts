'use server';

import getUserId from '@/shared/lib/getUserId';
import { decodeShortId } from '@/shared/lib/shortUuid';
import { supabase } from '@/shared/lib/supabaseClient';
import { MessageRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export const sendMessage = async ({ chatRoomId, message, location, images }: MessageRequest) => {
  try {
    const userId = await getUserId();
    const fullChatRoomId = decodeShortId(chatRoomId);
    const isImageMessage = images && images.length > 0;

    // 1. message row 생성
    const { data, error } = await supabase
      .from('message')
      .insert({
        chatroom_id: fullChatRoomId,
        sender_id: userId,
        message_type: isImageMessage ? 'image' : 'text',
        content: isImageMessage ? null : message,
      })
      .select()
      .single();

    if (error) {
      console.error('메시지 전송 에러:', error);
      throw new Error(`메시지 전송 실패: ${error.message}`);
    }

    // 2. image message일 경우 storage 업로드 & message_image insert
    if (isImageMessage) {
      const uploadedImageUrls: string[] = [];

      await Promise.all(
        images.map(async (img, idx) => {
          if (!img.file) return null;
          const file = img.file;

          const fileName = `${uuidv4()}.webp`;
          const filePath = `${data.message_id}/${fileName}`;

          let finalBuffer: Buffer;
          let contentType = 'image/webp';

          if (file.type === 'image/webp') {
            const arrayBuffer = await file.arrayBuffer();
            finalBuffer = Buffer.from(arrayBuffer);
          } else {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            finalBuffer = await sharp(buffer).toFormat('webp', { quality: 90 }).toBuffer();
          }

          const { error: uploadError } = await supabase.storage
            .from('message-image')
            .upload(filePath, finalBuffer, { contentType });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('message-image').getPublicUrl(filePath);

          uploadedImageUrls.push(urlData.publicUrl);
        })
      );

      for (const [index, url] of uploadedImageUrls.entries()) {
        const { error: imgError } = await supabase.from('message_image').insert({
          message_id: data.message_id,
          image_url: url,
          order_index: index,
        });
        if (imgError) throw imgError;
      }
    }

    if (!location) {
      throw new Error('sendMessage 실패: location (origin) 값이 전달되지 않았습니다.');
    }

    await fetch(`${location}/api/alarm/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatroom_id: fullChatRoomId,
        sender_id: userId,
      }),
    });

    return data;
  } catch (error) {
    console.error('sendMessage 함수 에러:', error);
    throw error;
  }
};
