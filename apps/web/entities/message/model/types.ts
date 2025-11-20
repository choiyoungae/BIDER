import { MessageImage } from '@/entities/messageImage/model/types';
import { Profiles } from '@/entities/profiles/model/types';

type MessageType = 'text' | 'image';

export interface Message {
  message_id: string;
  chatroom_id: string;
  sender_id: string;
  content?: string | null;
  is_read: boolean;
  created_at: string;
  message_type: MessageType;
}

export interface MessageWithProfile extends Message {
  profile?: Profiles;
}

export interface MessageWithImage extends MessageWithProfile {
  images?: MessageImage[];
}
