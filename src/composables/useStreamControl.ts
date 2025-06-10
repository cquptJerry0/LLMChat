import { computed, onMounted, inject, provide } from 'vue'
import { useStreamStore } from '@/stores/stream'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { chatService } from '@/services/chat/chatService'
import type { ChatMessage, UpdateCallback } from '@/types/api'
import type { Message } from '@/types/chat'

/**
 * 依赖注入的唯一标识符，用于在组件树中传递流控制器
 */
const STREAM_CONTROL_KEY = Symbol('streamControl')

/**
 * 聊天流控制器 Composable
 *
 * 提供对流式聊天生成过程的完整控制，包括暂停、恢复和取消功能。
 * 自动处理状态持久化，支持页面刷新后恢复。
 *
 * @param messageId - 要控制的消息ID
 * @param options - 配置选项
 * @returns 流控制器接口
 */
export function useStreamControl(
  messageId: string,
  options: StreamControlOptions = {}
): StreamControlReturn {
  // 解构配置选项，设置默认值
  const {
    chatStore = useNormalizedChatStore,
    streamStore = useStreamStore,
    clearOnUnmount = false
  } = options

  // 初始化存储实例
  const _chatStore = chatStore()
  const _streamStore = streamStore()

  /**
   * 统一状态管理：从store中派生状态
   * 每当store中的数据更新时，这个计算属性也会更新
   */
  const state = computed(() => {
    const message = _chatStore.messages.get(messageId)
    const streamState = _streamStore.getStreamState(messageId)

    return {
      content: message?.content || '',
      reasoning_content: message?.reasoning_content || '',
      completion_tokens: message?.completion_tokens || 0,
      speed: message?.speed || 0,
      status: streamState?.status || 'completed',
      error: streamState?.error,
      timestamp: Date.now()
    }
  })

  /**
   * 派生的计算属性：流是否暂停中
   */
  const isPaused = computed((): boolean => state.value.status === 'paused')

  /**
   * 派生的计算属性：流是否正在生成中
   */
  const isStreaming = computed((): boolean => state.value.status === 'streaming')

  /**
   * 派生的计算属性：流是否出错
   */
  const isError = computed((): boolean => state.value.status === 'error')

  /**
   * 派生的计算属性：错误信息
   */
  const errorMessage = computed((): string | undefined => state.value.error)

  /**
   * 派生的计算属性：流是否未完成（处于流或暂停状态）
   */
  const isIncomplete = computed((): boolean =>
    state.value.status === 'streaming' || state.value.status === 'paused'
  )

  /**
   * 暂停生成流
   * @returns 中断控制器，如果流不在生成中则返回null
   */
  const pause = (): AbortController | null => {
    if (isStreaming.value) {
      const controller = _streamStore.pauseStream(messageId)
      return controller instanceof AbortController ? controller : null
    }
    return null
  }

  /**
   * 恢复生成流
   * @param updateCallback - 用于更新UI的回调函数
   */
  const resume = async (updateCallback: UpdateCallback): Promise<void> => {
    if (isPaused.value) {
      try {
        const message = _chatStore.messages.get(messageId)
        if (!message?.parentId) return

        const messageHistory = buildMessageHistory(message.parentId)
        await chatService.resumeChatCompletion(
          messageHistory,
          messageId,
          updateCallback
        )
      } catch (error) {
        _streamStore.setStreamError(
          messageId,
          error instanceof Error ? error.message : '恢复流失败'
        )
      }
    }
  }

  /**
   * 取消生成流
   * @returns 是否成功取消
   */
  const cancel = (): boolean => {
    try {
      const result = chatService.cancelRequest(messageId)

      if (isIncomplete.value) {
        _streamStore.completeStream(messageId)
      }

      return result
    } catch (error) {
      console.error('Failed to cancel stream:', error)
      return false
    }
  }

  /**
   * 构建消息历史
   * 从指定消息ID开始，向上遍历消息树，构建完整的对话历史
   *
   * @param latestMessageId - 最新消息的ID
   * @returns 完整的消息历史数组
   */
  const buildMessageHistory = (latestMessageId: string): ChatMessage[] => {
    const history: ChatMessage[] = []
    let currentId: string | null = latestMessageId

    while (currentId) {
      const message = _chatStore.messages.get(currentId) as Message | undefined
      if (!message) break

      // 类型断言确保角色符合API要求
      const role = message.role as "user" | "assistant" | "system"

      history.unshift({
        role,
        content: message.content,
        reasoning_content: message.reasoning_content
      })

      currentId = message.parentId
    }

    return history
  }

  // 设置生命周期钩子
  onMounted(() => {
    // 提供给子组件
    provide(STREAM_CONTROL_KEY, {
      state,
      controls: { pause, resume, cancel }
    })
  })

  // 返回公开的API
  return {
    // 状态
    state,
    isPaused,
    isStreaming,
    isError,
    errorMessage,
    isIncomplete,

    // 控制方法
    pause,
    resume,
    cancel
  }
}

/**
 * 子组件使用的流控制器钩子
 * 必须在 useStreamControl 提供的上下文中使用
 *
 * @returns 父组件提供的流控制器上下文
 * @throws 如果不在正确的上下文中使用
 */
export function useStreamControlChild(): StreamControlContext {
  const control = inject<StreamControlContext | undefined>(STREAM_CONTROL_KEY)
  if (!control) {
    throw new Error('useStreamControlChild must be used within a StreamControl provider')
  }
  return control
}
