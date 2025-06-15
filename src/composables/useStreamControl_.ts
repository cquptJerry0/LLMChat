import { computed, onMounted, inject, provide, onUnmounted, ref, watch } from 'vue'
import { useStreamStore } from '@/stores/stream'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { StreamStatus } from '@/types/stream'
import type { UpdateCallback } from '@/types/api'

const STREAM_CONTROL_KEY = Symbol('streamControl')

/**
 * 流控制钩子 - 专注于流的生命周期控制
 */
export function useStreamControl(initialMessageId?: string) {
  const streamStore = useStreamStore()
  const chatStore = useNormalizedChatStore()

  // 当前消息ID
  const messageId = ref(initialMessageId || '')

  // 监听消息ID变化，自动获取状态
  watch(messageId, (newId) => {
    if (newId) {
      // 只获取状态，不自动恢复
      streamStore.getStreamState(newId)
    }
  }, { immediate: !!initialMessageId })

  // 流状态
  const state = computed(() => {
    if (!messageId.value) {
      return {
        messageId: '',
        status: StreamStatus.COMPLETED,
        isStreaming: false,
        isPaused: false,
        isError: false,
        isCompleted: true,
        error: null
      }
    }

    const streamState = streamStore.getStreamState(messageId.value)
    const message = chatStore.messages.get(messageId.value)

    return {
      messageId: messageId.value,
      status: streamState?.status || StreamStatus.COMPLETED,
      content: message?.content || '',
      reasoning_content: message?.reasoning_content || '',
      completion_tokens: message?.completion_tokens || 0,
      speed: message?.speed || 0,
      error: streamState?.error || null,
      isStreaming: streamState?.status === StreamStatus.STREAMING,
      isPaused: streamState?.status === StreamStatus.PAUSED,
      isError: streamState?.status === StreamStatus.ERROR,
      isCompleted: !streamState || streamState.status === StreamStatus.COMPLETED,
      pausedAt: streamState?.pausedAt
    }
  })

  /**
   * 设置当前消息ID
   */
  function setMessageId(id: string) {
    if (id && id !== messageId.value) {
      messageId.value = id
    }
  }

  /**
   * 开始新的流
   * 只负责初始化流状态，不包含生成逻辑
   */
  function startStream() {
    if (!messageId.value) return null
    return streamStore.startStream(messageId.value)
  }

  /**
   * 更新流内容
   */
  function updateStream(content: string, reasoning_content?: string, completion_tokens?: number, speed?: number) {
    if (!messageId.value) return
    streamStore.updateStream(
      messageId.value,
      content,
      reasoning_content,
      completion_tokens,
      speed
    )
  }

  /**
   * 暂停流
   * 返回AbortController用于中断请求
   */
  function pauseStream() {
    if (!messageId.value) return null
    return streamStore.pauseStream(messageId.value)
  }

  /**
   * 中断流请求
   * 用于完全中断生成
   */
  function abortStream() {
    if (!messageId.value) return false
    return streamStore.abortStream(messageId.value)
  }

  /**
   * 恢复流
   * 返回新的AbortController和恢复信息
   */
  function resumeStream() {
    if (!messageId.value) return null
    return streamStore.resumeStream(messageId.value)
  }

  /**
   * 简单恢复流状态
   * 不重新创建请求，只将状态从暂停改为流式
   * 用于用户手动暂停后的恢复
   */
  function simpleResumeStream() {
    if (!messageId.value) return false

    const streamId = `stream_${messageId.value}`
    const stream = streamStore.streams.get(streamId)

    if (stream && stream.status === StreamStatus.PAUSED) {
      // 只修改状态，不创建新的AbortController
      stream.status = StreamStatus.STREAMING
      stream.pauseTime = undefined
      streamStore.streams.set(streamId, stream)

      // 保存状态到localStorage
      try {
        localStorage.setItem(
          `stream_state_${messageId.value}`,
          JSON.stringify({
            content: stream.accumulatedContent,
            reasoning_content: stream.accumulatedReasoning,
            completion_tokens: stream.lastCompletionTokens,
            speed: 0,
            status: StreamStatus.STREAMING,
            timestamp: Date.now(),
            savedAt: Date.now()
          })
        )
      } catch (error) {
        console.error('Failed to save stream state:', error)
      }

      return true
    }

    return false
  }

  /**
   * 完成流
   */
  function completeStream() {
    if (!messageId.value) return false
    return streamStore.completeStream(messageId.value)
  }

  /**
   * 设置流错误
   */
  function setStreamError(error: string) {
    if (!messageId.value) return false
    return streamStore.setStreamError(messageId.value, error)
  }

  /**
   * 获取流状态
   */
  function getStreamState() {
    if (!messageId.value) return null
    return streamStore.getStreamState(messageId.value)
  }

  // 创建控制器接口
  const controller = {
    state,
    setMessageId,
    startStream,
    updateStream,
    pauseStream,
    abortStream,
    resumeStream,
    simpleResumeStream,
    completeStream,
    setStreamError,
    getStreamState
  }

  // 提供给子组件
  provide(STREAM_CONTROL_KEY, controller)

  return controller
}

/**
 * 子组件使用流控制
 */
export function useStreamControlChild() {
  const controller = inject(STREAM_CONTROL_KEY)
  if (!controller) {
    throw new Error('Stream control not found in context')
  }
  return controller
}
