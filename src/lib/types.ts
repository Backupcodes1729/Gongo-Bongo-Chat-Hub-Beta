
import type { User as FirebaseUser } from "firebase/auth";
import type { Timestamp, FieldValue } from "firebase/firestore";

export interface User extends FirebaseUser {
  lastLogin?: Timestamp;
  createdAt?: Timestamp;
  dataAiHint?: string; // Optional hint for AI image generation for user avatar
  isOnline?: boolean;
  lastSeen?: Timestamp | number; // Can be Firestore Timestamp or RTDB number
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp | FieldValue; // For serverTimestamp on write, Timestamp on read
  status: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  replyTo?: string; // Message ID being replied to
  repliedMessageText?: string; // Optional: Store a snippet of the replied message text
  repliedMessageSender?: string; // Optional: Store the sender of the replied message
  senderPhotoURL?: string | null;
  senderDisplayName?: string | null;
}

export interface Chat {
  id: string;
  participants: string[]; // Array of user UIDs
  participantDetails?: { // For denormalized user info, useful for quick display
    [uid: string]: {
      displayName: string | null;
      photoURL: string | null;
    }
  };
  lastMessage?: {
    text: string;
    timestamp: Timestamp | FieldValue; // For serverTimestamp on write, Timestamp on read
    senderId: string;
  } | null; // Can be null if no messages or chat just created
  updatedAt: Timestamp | FieldValue; // For serverTimestamp on write, Timestamp on read
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string | null;
  adminIds?: string[];
  createdBy?: string; // UID of user who created the group chat
  createdAt?: Timestamp | FieldValue; // For serverTimestamp on write, Timestamp on read
}
