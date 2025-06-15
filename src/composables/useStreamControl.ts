import { computed, onMounted, inject, provide, onUnmounted, getCurrentInstance, ref, watch } from 'vue'
import { useStreamStore } from '@/stores/stream'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { chatService } from '@/services/chat/chatService'
import type { UpdateCallback } from '@/types/api'
import type { StreamControlOptions, StreamControlReturn, StreamControlContext } from '@/types/streamControl'

/**
 * 依赖注入的唯一标识符，用于在组件树中传递流控制器
 */
const STREAM_CONTROL_KEY = Symbol('streamControl')

/**
 * 聊天流控制器 Composable
 *
 * 提供对流式聊天生成过程的完整控制，包括暂停、恢复和取消功能。
 * 自动处理状态持久化，支持页面刷新后恢复。
 * 天然跟踪最新的消息ID。
 *
 * @param initialMessageId - 初始消息ID，可选
 * @param options - 配置选项
 * @returns 流控制器接口
 */
export function useStreamControl(
  initialMessageId?: string,
  options: StreamControlOptions = {}
): StreamControlReturn {
  // 解构配置选项，设置默认值
  const {
    chatStore = useNormalizedChatStore,
    streamStore = useStreamStore,
  } = options

  // 初始化存储实例
  const _chatStore = chatStore()
  const _streamStore = streamStore()

  // 当前控制的消息ID
  const currentMessageId = ref(initialMessageId || 'default')

  // 更新当前消息ID
  const updateMessageId = (messageId: string) => {
    if (messageId && messageId !== currentMessageId.value) {
      currentMessageId.value = messageId
    }
  }

  /**
   * 统一状态管理：从store中派生状态
   * 每当store中的数据更新时，这个计算属性也会更新
   */
  const state = computed(() => {
    const messageId = currentMessageId.value
    const message = _chatStore.messages.get(messageId)
    const streamState = _streamStore.getStreamState(messageId)
    const isPaused = streamState?.status === 'paused'
    const isStreaming = streamState?.status === 'streaming'
    const isError = streamState?.status === 'error'
    const isIncomplete = isStreaming || isPaused
    const isCompleted = streamState?.status === 'completed'
    const errorMessage = streamState?.error
    const timestamp = Date.now()
    return {
      messageId,
      content: message?.content || '',
      reasoning_content: message?.reasoning_content || '',
      completion_tokens: message?.completion_tokens || 0,
      speed: message?.speed || 0,
      status: streamState?.status || 'completed',
      error: streamState?.error,
      isPaused,
      isStreaming,
      isError,
      isIncomplete,
      isCompleted,
      errorMessage,
      timestamp
    }
  })

  /**
   * 暂停生成流
   * @returns 中断控制器，如果流不在生成中则返回null
   */
  const pause = (): AbortController | null => {
    const messageId = currentMessageId.value
    if (state.value.isStreaming) {
      const controller = _streamStore.pauseStream(messageId)
      return controller instanceof AbortController ? controller : null
    }
    return null
  }

  /**
   * 恢复生成流
   * @param updateCallback - 用于更新UI的回调函数
   */
  const resume = async (updateCallback?: UpdateCallback): Promise<void> => {
    const messageId = currentMessageId.value
    if (state.value.isPaused) {
      try {
        const message = _chatStore.messages.get(messageId)
        if (!message?.parentId) return

        // 创建默认回调函数
        const defaultCallback: UpdateCallback = (
          content,
          reasoning_content,
          completion_tokens,
          speed,
          tool_calls
        ) => {
          _chatStore.updateMessage(messageId, {
            content,
            reasoning_content,
            completion_tokens: Number(completion_tokens),
            speed: Number(speed),
            tool_calls
          })
        }

        // 使用统一的消息历史构建方法
        const messageHistory = _chatStore.getMessageHistory(message.parentId)
        await chatService.resumeChatCompletion(
          messageHistory,
          messageId,
          updateCallback || defaultCallback
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
    const messageId = currentMessageId.value
    try {
      const result = chatService.cancelRequest(messageId)

      if (state.value.isIncomplete) {
        _streamStore.completeStream(messageId)
      }

      return result
    } catch (error) {
      console.error('Failed to cancel stream:', error)
      return false
    }
  }

  /**
   * 设置网络恢复和页面可见性变化时的自动恢复
   */
  const setupAutoRecover = () => {
    const handleOnline = () => {
      if (state.value.isPaused) {
        resume()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.value.isPaused) {
        resume()
      }
    }

    // 添加事件监听器
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 返回清理函数
    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }

  // 在组件挂载时设置自动恢复
  let cleanupAutoRecover: (() => void) | undefined

  onMounted(() => {
    // 检查是否需要恢复流
    const messageId = currentMessageId.value
    const streamState = _streamStore.getStreamState(messageId)
    if (streamState && (streamState.status === 'streaming' || streamState.status === 'paused')) {
      resume()
    }

    // 设置自动恢复
    cleanupAutoRecover = setupAutoRecover()
  })

  // 在组件卸载时清理
  onUnmounted(() => {
    if (cleanupAutoRecover) {
      cleanupAutoRecover()
    }
  })

  // 创建控制器接口
  const controller: StreamControlReturn = {
    state,
    pause,
    resume,
    cancel,
    updateMessageId
  }

  // 提供给子组件
  provide(STREAM_CONTROL_KEY, {
    state,
    controls: { pause, resume, cancel, updateMessageId }
  })

  // 返回公开的API
  return controller
}

export function useStreamControlChild(): StreamControlContext {
  const streamControl = inject(STREAM_CONTROL_KEY)
  if (!streamControl) {
    throw new Error('Stream control not found')
  }
  return streamControl as StreamControlContext
}
