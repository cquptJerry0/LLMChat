import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ChatStore, Conversation } from '@/types/chat'
import type { Message } from '@/types/message'

export const useChatStore = defineStore(
  'llm-chat',
  (): ChatStore => {
    // 所有对话列表
    const conversations = ref<Conversation[]>([
      {
        id: '1',
        title: '日常问候',
        messages: [],
        createdAt: Date.now(),
      },
    ])

    // 当前选中的对话 ID
    const currentConversationId = ref('1')

    // 加载状态
    const isLoading = ref(false)

    // 获取当前对话
    const currentConversation = computed(() => {
      return conversations.value.find((conv) => conv.id === currentConversationId.value)
    })

    // 获取当前对话的消息
    const currentMessages = computed(() => currentConversation.value?.messages || [])

    // 创建新对话
    const createConversation = () => {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: '日常问候',
        messages: [],
        createdAt: Date.now(),
      }
      conversations.value.unshift(newConversation)
      currentConversationId.value = newConversation.id
    }

    // 切换对话
    const switchConversation = (conversationId: string) => {
      currentConversationId.value = conversationId
    }

    // 根据ID设置当前对话
    const setCurrentConversationById = (conversationId: string) => {
      if (conversations.value.some(conv => conv.id === conversationId)) {
        currentConversationId.value = conversationId
        return true
      }
      return false
    }

    // 添加消息到当前对话
    const addMessage = (message: Partial<Message>) => {
      if (currentConversation.value) {
        currentConversation.value.messages.push({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...message,
        } as Message)
      }
    }

    const setIsLoading = (value: boolean) => {
      isLoading.value = value
    }

    const updateLastMessage = (
      content: string,
      reasoning_content: string,
      completion_tokens: number,
      speed: string
    ) => {
      const conv = currentConversation.value
      if (conv && conv.messages.length > 0) {
        const lastMessage = conv.messages[conv.messages.length - 1] as Message
        lastMessage.content = content
        lastMessage.reasoning_content = reasoning_content
        lastMessage.completion_tokens = completion_tokens
        lastMessage.speed = Number(speed)
      }
    }

    // 根据消息ID更新消息内容
    const updateMessageById = (
      messageId: string,
      content: string,
      reasoning_content: string,
      completion_tokens: number,
      speed: number
    ) => {
      // 遍历所有对话查找消息
      for (const conv of conversations.value) {
        const message = conv.messages.find(m => m.id.toString() === messageId)
        if (message) {
          message.content = content
          message.reasoning_content = reasoning_content
          message.completion_tokens = completion_tokens
          message.speed = speed
          return true
        }
      }
      return false
    }

    const getLastMessage = () => {
      const conv = currentConversation.value
      if (conv && conv.messages.length > 0) {
        return conv.messages[conv.messages.length - 1] as Message
      }
      return null
    }

    // 更新对话标题
    const updateConversationTitle = (conversationId: string, newTitle: string) => {
      const conversation = conversations.value.find((c) => c.id === conversationId)
      if (conversation) {
        conversation.title = newTitle
      }
    }

    // 删除对话
    const deleteConversation = (conversationId: string) => {
      const index = conversations.value.findIndex((c) => c.id === conversationId)
      if (index !== -1) {
        conversations.value.splice(index, 1)

        // 如果删除后没有对话了，创建一个新对话
        if (conversations.value.length === 0) {
          createConversation()
        }
        // 如果删除的是当前对话，切换到第一个对话
        else if (conversationId === currentConversationId.value) {
          currentConversationId.value = conversations.value[0].id
        }
      }
    }

    return {
      conversations,
      currentConversationId,
      currentConversation,
      currentMessages,
      isLoading,
      addMessage,
      setIsLoading,
      updateLastMessage,
      updateMessageById,
      getLastMessage,
      createConversation,
      switchConversation,
      setCurrentConversationById,
      updateConversationTitle,
      deleteConversation,
    }
  },
  {
    persist: true,
  },
)
