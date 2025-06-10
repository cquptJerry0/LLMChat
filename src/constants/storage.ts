export const STORAGE_KEYS = {
  LAST_ASSISTANT_MESSAGE: 'last_assistant_message',
  MESSAGE_HISTORY: 'message_history_',
  CONVERSATIONS: 'llm-chat-conversations',
  CURRENT_CONVERSATION_ID: 'llm-chat-current-conversation',
  MESSAGES: 'llm-chat-messages',
  STREAM_STATE_PREFIX: 'stream_state_',
  STREAM_ID_PREFIX: 'stream_'
} as const

export type StorageKey = keyof typeof STORAGE_KEYS
