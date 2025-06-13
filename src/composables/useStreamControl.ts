import { computed, onMounted, inject, provide, onUnmounted } from 'vue'
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
    const isPaused = streamState?.status === 'paused'
    const isStreaming = streamState?.status === 'streaming'
    const isError = streamState?.status === 'error'
    const isIncomplete = isStreaming || isPaused
    const isCompleted = streamState?.status === 'completed'
    const errorMessage = streamState?.error
    const timestamp = Date.now()
    return {
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
  const resume = async (updateCallback: UpdateCallback): Promise<void> => {
    if (state.value.isPaused) {
      try {
        const message = _chatStore.messages.get(messageId)
        if (!message?.parentId) return

        // 使用统一的消息历史构建方法
        const messageHistory = _chatStore.getMessageHistory(message.parentId)
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
        const updateCallback: UpdateCallback = (
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
        resume(updateCallback)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.value.isPaused) {
        const updateCallback: UpdateCallback = (
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
        resume(updateCallback)
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
    const streamState = _streamStore.getStreamState(messageId)
    if (streamState && (streamState.status === 'streaming' || streamState.status === 'paused')) {
      const updateCallback: UpdateCallback = (
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
      resume(updateCallback)
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

  // 提供给子组件
  provide(STREAM_CONTROL_KEY, {
    state,
    controls: { pause, resume, cancel }
  })

  // 返回公开的API
  return {
    // 状态
    state,
    /// 控制方法
    pause,
    resume,
    cancel
  }
}
