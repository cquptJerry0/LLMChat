// src/stores/normalizedChat.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { LRUCache } from '@/utils/LRUCache'
import { STORAGE_KEYS } from '@/constants/storage'
import type { Conversation, Message } from '@/types/chat'
import type { ToolCall } from '@/types/api'
// 递归构建消息树
export interface MessageTree extends Omit<Message, 'children'> {
  children: MessageTree[]
}
// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: NodeJS.Timeout | null = null
  return (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export const useNormalizedChatStore = defineStore('normalized-chat', () => {
  // 扁平化存储结构
  const conversations = ref<Map<string, Conversation>>(new Map())
  const messages = ref<Map<string, Message>>(new Map())
  const conversationMessages = ref<Map<string, string[]>>(new Map())
  const currentConversationId = ref<string>('')
  const messagesLRU = new LRUCache<string, Message>(5000)

  // 计算属性：获取当前会话
  const currentConversation = computed(() => {
    return conversations.value.get(currentConversationId.value)
  })

  // 计算属性：获取当前会话的所有消息
  const currentConversationAllMessages = computed(() => {
    const messageIds = conversationMessages.value.get(currentConversationId.value) || []
    return messageIds.map(id => messages.value.get(id)).filter(Boolean)
  })

  // 计算属性：获取当前会话的根消息（非子消息）
  const currentConversationRootMessages = computed(() => {
    return currentConversationAllMessages.value.filter(msg => !msg?.parentId)
  })

  // 初始化函数：从localStorage加载数据
  const initializeFromStorage = () => {
    try {
      // 加载会话数据
      const savedConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)
      if (savedConversations) {
        conversations.value = new Map(Object.entries(JSON.parse(savedConversations)))
      }

      // 加载当前会话ID
      const savedCurrentId = localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION_ID)
      if (savedCurrentId) {
        currentConversationId.value = savedCurrentId
      }

      // 加载消息数据（只加载当前会话的消息）
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES)
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages) as Record<string, Message>
        Object.entries(parsedMessages).forEach(([id, msg]: [string, Message]) => {
          if (msg.conversationId === currentConversationId.value) {
            messages.value.set(id, msg)
            messagesLRU.set(id, msg)
          }
        })
      }

      // 重建会话消息索引
      conversations.value.forEach((_, convId) => {
        const convMessages = Array.from(messages.value.values())
          .filter(msg => msg.conversationId === convId)
          .map(msg => msg.id)
        conversationMessages.value.set(convId, convMessages)
      })
    } catch (error) {
      console.error('Failed to load data from storage:', error)
    }
  }

  // 保存数据到localStorage的防抖函数
  const saveToStorage = debounce(() => {
    try {
      // 保存会话数据
      localStorage.setItem(
        STORAGE_KEYS.CONVERSATIONS,
        JSON.stringify(Object.fromEntries(conversations.value))
      )

      // 保存当前会话ID
      localStorage.setItem(
        STORAGE_KEYS.CURRENT_CONVERSATION_ID,
        currentConversationId.value
      )

      // 只保存当前会话和LRU缓存中的消息
      const messagesToSave = new Map<string, Message>()

      // 保存当前会话的消息
      const currentMessages = conversationMessages.value.get(currentConversationId.value) || []
      currentMessages.forEach(msgId => {
        const msg = messages.value.get(msgId)
        if (msg) messagesToSave.set(msgId, msg)
      })

      // 保存LRU缓存中的热门消息
      const hotMessages = messagesLRU.getTopN(1000)
      hotMessages.forEach(([id, msg]) => {
        messagesToSave.set(id, msg)
      })

      localStorage.setItem(
        STORAGE_KEYS.MESSAGES,
        JSON.stringify(Object.fromEntries(messagesToSave))
      )
    } catch (error) {
      console.error('Failed to save data to storage:', error)
      // 如果是 QuotaExceededError，执行清理
      if ((error as Error).name === 'QuotaExceededError') {
        performGC()
        // 重试保存
        saveToStorage()
      }
    }
  }, 1000)

  // 添加会话
  const addConversation = (conversationData: { id: string, title: string }) => {
    conversations.value.set(conversationData.id, {
      ...conversationData,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      messages: []
    } as Conversation)
    conversationMessages.value.set(conversationData.id, [])

    if (!currentConversationId.value) {
      currentConversationId.value = conversationData.id
    }

    return conversationData.id
  }

  // 添加消息
  const addMessage = (messageData: {
    conversationId: string,
    parentId?: string | null,
    role: string,
    content: string,
    reasoning_content?: string
  }) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const message: Message = {
      id: messageId,
      conversationId: messageData.conversationId,
      parentId: messageData.parentId || null,
      role: messageData.role,
      content: messageData.content,
      reasoning_content: messageData.reasoning_content || '',
      completion_tokens: 0,
      speed: 0,
      timestamp: new Date().toISOString(),
      children: []
    }

    messages.value.set(messageId, message)
    messagesLRU.set(messageId, message)

    const convMsgs = conversationMessages.value.get(messageData.conversationId) || []
    conversationMessages.value.set(messageData.conversationId, [...convMsgs, messageId])

    if (messageData.parentId) {
      const parentMsg = messages.value.get(messageData.parentId)
      if (parentMsg) {
        parentMsg.children.push(messageId)
        messages.value.set(messageData.parentId, parentMsg)
        messagesLRU.set(messageData.parentId, parentMsg)
      }
    }

    const conversation = conversations.value.get(messageData.conversationId)
    if (conversation) {
      conversation.lastUpdatedAt = Date.now()
      conversations.value.set(messageData.conversationId, conversation)
    }

    return messageId
  }

  // 更新消息
  const updateMessage = (
    messageId: string,
    updates: {
      content?: string,
      reasoning_content?: string,
      completion_tokens?: number,
      speed?: number,
      tool_calls?: ToolCall[]
    }
  ) => {
    const message = messages.value.get(messageId)
    if (!message) return false

    const updatedMessage = {
      ...message,
      ...updates
    }

    messages.value.set(messageId, updatedMessage)
    messagesLRU.set(messageId, updatedMessage)

    const conversation = conversations.value.get(message.conversationId)
    if (conversation) {
      conversation.lastUpdatedAt = Date.now()
      conversations.value.set(message.conversationId, conversation)
    }

    return true
  }

  // 切换当前会话
  const switchConversation = (conversationId: string) => {
    if (conversations.value.has(conversationId)) {
      currentConversationId.value = conversationId
      return true
    }
    return false
  }

  // 删除会话及其所有消息
  const deleteConversation = (conversationId: string) => {
    const messageIds = conversationMessages.value.get(conversationId) || []

    messageIds.forEach(id => {
      messages.value.delete(id)
      messagesLRU.delete(id)
    })

    conversationMessages.value.delete(conversationId)
    conversations.value.delete(conversationId)

    if (currentConversationId.value === conversationId) {
      const nextConversation = Array.from(conversations.value.keys())[0]
      currentConversationId.value = nextConversation || ''
    }

    return true
  }

  // 获取消息树
  const getMessageTree = (messageId: string): MessageTree | null => {
    return buildTree(messageId);
  }

  // 获取消息树
  const buildTree = (messageId: string): MessageTree | null => {
    const message = messages.value.get(messageId)
    if (!message) return null

    return {
      ...message,
      children: message.children
        .map(childId => buildTree(childId))
        .filter((child): child is MessageTree => child !== null)
    }
  }

  // 执行GC，清理不活跃的消息
  const performGC = () => {
    const overflowMessages = messagesLRU.getOverflowKeys()
    overflowMessages.forEach(id => {
      const msg = messages.value.get(id)
      if (msg && msg.conversationId !== currentConversationId.value) {
        messages.value.delete(id)
      }
    })
  }

  // 监听状态变化，自动保存
  watch(
    [conversations, currentConversationId, messages],
    () => {
      saveToStorage()
    },
    { deep: true }
  )

  // 保存最后一条助手消息
  const saveLastAssistantMessage = (messageId: string): void => {
    if (!currentConversationId.value) return

    localStorage.setItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE, JSON.stringify({
      conversationId: currentConversationId.value,
      messageId: messageId,
      timestamp: Date.now()
    }))
  }

  // 恢复最后一条助手消息
  const restoreLastAssistantMessage = (): { messageId: string, conversationId: string } | null => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE)
      if (!savedData) return null

      const { conversationId, messageId } = JSON.parse(savedData)
      if (conversationId !== currentConversationId.value) return null

      const message = messages.value.get(messageId)
      if (!message) return null

      return { messageId, conversationId }
    } catch (error) {
      console.error('Failed to restore last assistant message:', error)
      return null
    }
  }

  // 清除最后一条助手消息
  const clearLastAssistantMessage = (): void => {
    localStorage.removeItem(STORAGE_KEYS.LAST_ASSISTANT_MESSAGE)
  }

  // 初始化store
  initializeFromStorage()

  // 保存消息历史
  const saveMessageHistory = (messageId: string, history: any[]): void => {
    try {
      localStorage.setItem(
        `${STORAGE_KEYS.MESSAGE_HISTORY}${messageId}`,
        JSON.stringify(history)
      )
    } catch (error) {
      console.error('Failed to save message history:', error)
    }
  }

  return {
    // 状态
    conversations,
    messages,
    conversationMessages,
    currentConversationId,
    // 计算属性
    currentConversation,
    currentConversationAllMessages,
    currentConversationRootMessages,
    // 方法
    addConversation,
    addMessage,
    updateMessage,
    switchConversation,
    deleteConversation,
    getMessageTree,
    performGC,
    initializeFromStorage,
    saveToStorage,
    saveLastAssistantMessage,
    restoreLastAssistantMessage,
    clearLastAssistantMessage,
    saveMessageHistory
  }
})
