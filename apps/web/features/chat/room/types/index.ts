import { MessageWithImage, MessageWithProfile } from '@/entities/message/model/types';
import { MessageImage } from '@/entities/messageImage/model/types';
import { SystemMessageWithNickname } from '@/entities/systemMessage/model/types';

// Supabase 실시간 페이로드 타입 정의
export interface RealtimeMessagePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
  schema: string;
  table: string;
  commitTimestamp: string;
  old: MessageWithProfile | null; // DELETE, UPDATE 시 이전 데이터
  new: MessageWithProfile | null; // INSERT, UPDATE 시 새 데이터
  errors: string[];
}
export interface MessageProps {
  text: string | null | undefined;
  showTime: boolean;
  isRead?: boolean;
  showAvatar?: boolean;
  isLast?: boolean;
  className?: string;
  time: string;
  avatar?: string;
  isImage?: boolean;
  images?: MessageImage[];
}

export interface MessageRequest {
  chatRoomId: string;
  message?: string;
  location?: string;
  images?: ChatImage[];
}

export interface AuctionInfoData {
  auctionId: string;
  image: string;
  title: string;
  price: number;
  status: string;
  yourNickName: string;
  exhibitUserId: string;
  bidUserId: string;
}

export type CombinedMessage =
  | (MessageWithImage & { messageType: 'user' })
  | (SystemMessageWithNickname & { messageType: 'system' });

export interface CreateSystemMessagePayload {
  chatroomId: string;
  exhibitUserId: string;
  bidUserId: string;
  imgUrl: string;
  price: number;
  title: string;
}

export interface ChatImage {
  id: string;
  file: File | null;
  preview: string;
  isConverted?: boolean;
}
