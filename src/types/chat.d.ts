import type { Message } from './message'
import type { Ref, ComputedRef } from 'vue'

// 对话类型
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  lastUpdatedAt?: number;
  messages: Message[];
}

export interface Message {
  id: string
  conversationId: string
  parentId: string | null
  role: string
  content: string
  reasoning_content: string
  completion_tokens: number
  speed: number
  timestamp: string
  children: string[]
}

// 聊天存储类型
export interface ChatStore {
  conversations: Ref<Conversation[]>;
  currentConversationId: Ref<string>;
  currentConversation: ComputedRef<Conversation | undefined>;
  currentMessages: ComputedRef<Message[]>;
  isLoading: Ref<boolean>;

  // 方法
  createConversation: () => void;
  switchConversation: (conversationId: string) => void;
  setCurrentConversationById: (conversationId: string) => boolean;
  addMessage: (message: Partial<Message>) => void;
  setIsLoading: (value: boolean) => void;
  updateLastMessage: (
    content: string,
    reasoning_content: string,
    completion_tokens: number,
    speed: string
  ) => void;
  updateMessageById: (
    messageId: string,
    content: string,
    reasoning_content: string,
    completion_tokens: number,
    speed: number
  ) => boolean;
  getLastMessage: () => Message | null;
  updateConversationTitle: (conversationId: string, newTitle: string) => void;
  deleteConversation: (conversationId: string) => void;
}
