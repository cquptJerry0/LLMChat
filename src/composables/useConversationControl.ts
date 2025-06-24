import { ref, computed, onMounted, onUnmounted, inject, provide } from 'vue'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { useStreamStore } from '@/stores/stream'
import { chatService } from '@/services/chat/chatService'
import { useStreamControl } from '@/composables/useStreamControl'
import type { Message } from '@/types/chat'
import type { UpdateCallback } from '@/types/api'
import type {
  ConversationState,
  ConversationControlOptions,
  ConversationControlContext,
  LifecycleManager
} from '@/types/conversationControl'

/**
 * 依赖注入的唯一标识符
 */
const CONVERSATION_CONTROL_KEY = Symbol('conversationControl')

/**
 * 会话控制器 Composable
 * 提供对聊天会话的完整控制，包括会话创建、切换、消息发送等功能
 *
 * @param options - 控制器配置选项
 * @returns 会话控制器接口
 */
export function useConversationControl(
  options: ConversationControlOptions = {}
): ConversationControlContext {
  const {
    chatStore = useNormalizedChatStore,
    clearOnUnmount = false
  } = options

  const _chatStore = chatStore()

  // 本地状态管理
  const isGenerating = ref<boolean>(false)
  const lastAssistantMessageId = ref<string | null>(null)

  // 会话状态计算属性
  const state = computed<ConversationState>(() => {
    const msgs = _chatStore.currentConversationAllMessages
    const rootMsgs = _chatStore.currentConversationRootMessages
    const currentMessages: Message[] = msgs.filter((msg: unknown): msg is Message => msg !== undefined)
    const rootMessages: Message[] = rootMsgs.filter((msg: unknown): msg is Message => msg !== undefined)

    return {
      currentMessages,
      rootMessages,
      isGenerating: isGenerating.value,
      lastAssistantMessageId: lastAssistantMessageId.value,
      currentConversationId: _chatStore.currentConversationId
    }
  })

  /**
   * 会话相关操作
   */
  const conversationActions = {
    create: (title?: string): string => {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      const defaultTitle = `新的对话 - ${formattedDate}`;
      const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      return _chatStore.addConversation({ id, title: title || defaultTitle })
    },

    switch: (id: string): boolean => {
      const result = _chatStore.switchConversation(id)
      if (result) {
        messageActions.restoreLastAssistant()
      }
      return result
    },

    delete: (id: string): boolean => {
      if (id === _chatStore.currentConversationId) {
        _chatStore.clearLastAssistantMessage()
        lastAssistantMessageId.value = null
      }
      return _chatStore.deleteConversation(id)
    }
  }

  /**
   * 消息相关操作
   */
  const messageActions = {
    send: async (content: string, parentId?: string): Promise<string> => {
      if (!_chatStore.currentConversationId) {
        throw new Error('No active conversation')
      }

      try {
        isGenerating.value = true

        const userMessageId = _chatStore.addMessage({
          conversationId: _chatStore.currentConversationId,
          parentId: parentId || null,
          role: 'user',
          content
        })

        const assistantMessageId = _chatStore.addMessage({
          conversationId: _chatStore.currentConversationId,
          parentId: userMessageId,
          role: 'assistant',
          content: ''
        })

        messageActions.saveLastAssistant(assistantMessageId)

        // 使用统一的消息历史构建方法
        const messageHistory = _chatStore.getMessageHistory(userMessageId)
        _chatStore.saveMessageHistory(userMessageId, messageHistory)

        const updateCallback: UpdateCallback = (
          content,
          reasoning_content,
          completion_tokens,
          speed,
          tool_calls
        ) => {
          _chatStore.updateMessage(assistantMessageId, {
            content,
            reasoning_content,
            completion_tokens: Number(completion_tokens),
            speed: Number(speed),
            tool_calls: tool_calls
          })
        }

        await chatService.createChatCompletion(
          messageHistory,
          {
            messageId: assistantMessageId,
            updateCallback
          }
        )

        return assistantMessageId
      } catch (error) {
        console.error('Failed to send message:', error)
        return ''
      } finally {
        isGenerating.value = false
      }
    },

    resend: async (messageId: string): Promise<void> => {
      const message = _chatStore.messages.get(messageId)
      if (!message || message.role !== 'user') return
      await messageActions.send(message.content, message.parentId || undefined)
    },

    getTree: (messageId: string) => {
      return _chatStore.getMessageTree(messageId)
    },

    saveLastAssistant: (messageId: string): void => {
      _chatStore.saveLastAssistantMessage(messageId)
      lastAssistantMessageId.value = messageId
    },

    restoreLastAssistant: (): boolean => {
      const result = _chatStore.restoreLastAssistantMessage()
      if (!result) return false

      lastAssistantMessageId.value = result.messageId

      const streamControl = useStreamControl(result.messageId)
      if (streamControl.state.value.isCompleted) {
        isGenerating.value = true
      }

      return true
    },

    // 新增：复制消息内容
    copyMessage: (messageId: string): boolean => {
      const message = _chatStore.messages.get(messageId)
      if (!message) return false

      const textToCopy = message.reasoning_content
        ? `${message.content}\n\n推理过程：\n${message.reasoning_content}`
        : message.content

      try {
        window.navigator.clipboard.writeText(textToCopy)
        return true
      } catch (error) {
        console.error('Failed to copy message:', error)
        return false
      }
    },

    // 新增：点赞/踩消息
    likeMessage: (messageId: string, isLike: boolean): void => {
      // 这里可以添加点赞/踩的逻辑，例如保存到服务器
      console.log('Like message:', messageId, isLike)

      // 为将来的扩展预留接口
      // 例如：apiService.likeMessage(messageId, isLike)
    },

    // 新增：分享消息
    shareMessage: (messageId: string): void => {
      // 这里可以添加分享逻辑，例如生成分享链接
      console.log('Share message:', messageId)

      // 为将来的扩展预留接口
      // 例如：const shareLink = apiService.generateShareLink(messageId)
    },
  }

  /**
   * 生命周期管理：处理组件的挂载和卸载
   */
  const lifecycle: LifecycleManager = {
    /**
     * 组件挂载时的设置
     */
    setup() {
      if (_chatStore.currentConversationId) {
        messageActions.restoreLastAssistant()
      }
    },

    /**
     * 组件卸载时的清理
     */
    cleanup() {
      // 清理生成状态
      isGenerating.value = false
      // 清理最后一条消息状态
      lastAssistantMessageId.value = null

      // 如果配置为卸载时清除
      if (clearOnUnmount) {
        _chatStore.clearLastAssistantMessage()
      }
    }
  }

  // 设置生命周期钩子
  onMounted(() => {
    lifecycle.setup()
  })

  onUnmounted(() => {
    lifecycle.cleanup()
  })

  // 立即提供上下文，而不是等到组件挂载
  provide(CONVERSATION_CONTROL_KEY, {
    state,
    conversationActions,
    messageActions
  })

  // 返回控制器接口
  return {
    state,
    conversationActions,
    messageActions
  }
}

/**
 * 在子组件中使用父组件提供的会话控制器
 *
 * @returns 父组件提供的会话控制器上下文
 * @throws 如果不在正确的上下文中使用
 */
export function useConversationControlChild(): ConversationControlContext {
  const control = inject<ConversationControlContext>(CONVERSATION_CONTROL_KEY)
  if (!control) {
    throw new Error('useConversationControlChild must be used within a ConversationControl provider')
  }
  return control
}
