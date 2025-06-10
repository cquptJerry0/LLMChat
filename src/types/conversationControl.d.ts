import type { Message } from './chat'
import type { MessageTree } from '@/stores/normalizedChat'
import type { ComputedRef } from 'vue'
import type { useNormalizedChatStore } from '@/stores/normalizedChat'
import type { useStreamStore } from '@/stores/stream'
import type { StreamControlReturn } from './streamControl'

// 会话状态接口
export interface ConversationState {
  currentMessages: Message[]
  rootMessages: Message[]
  isGenerating: boolean
  lastAssistantMessageId: string | null
  currentConversationId: string | null
}

// 会话操作接口
export interface ConversationActions {
  create: (title: string) => string
  switch: (id: string) => boolean
  delete: (id: string) => boolean
}

export interface MessageActions {
  send: (content: string, parentId?: string) => Promise<string>
  resend: (messageId: string) => Promise<void>
  getTree: (messageId: string) => MessageTree | null
  saveLastAssistant: (messageId: string) => void
  restoreLastAssistant: () => boolean
  copyMessage: (messageId: string) => boolean
  likeMessage: (messageId: string, isLike: boolean) => void
  shareMessage: (messageId: string) => void
  getStreamControl: (messageId: string) => StreamControlReturn
}

// 会话控制器配置选项
export interface ConversationControlOptions {
  chatStore?: typeof useNormalizedChatStore
  streamStore?: typeof useStreamStore
  clearOnUnmount?: boolean
}

// 提供给子组件的控制接口
export interface ConversationControlContext {
  state: ComputedRef<ConversationState>
  conversationActions: ConversationActions
  messageActions: MessageActions
}

// 生命周期管理器接口
export interface LifecycleManager {
  setup: () => void
  cleanup: () => void
}
