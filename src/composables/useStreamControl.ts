import { computed, inject, provide, ref, watch, nextTick } from 'vue'
import { useStreamStore } from '@/stores/stream'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { StreamStatus } from '@/types/stream'

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
        error: null,
        isContentComplete: false
      }
    }

    const streamState = streamStore.getStreamState(messageId.value)
    const message = chatStore.messages.get(messageId.value)

    // 如果流状态为完成，但之前是内容完成状态，需要保留isContentComplete标志
    const isContentComplete = streamState?.isContentComplete ||
      streamState?.status === StreamStatus.COMPLETED;

    return {
      messageId: messageId.value,
      status: streamState?.status || StreamStatus.COMPLETED,
      content: message?.content || '',
      reasoning_content: message?.reasoning_content || '',
      completion_tokens: message?.completion_tokens || 0,
      speed: message?.speed || 0,
      error: streamState?.error || null,
      isStreaming: streamState?.status === StreamStatus.STREAMING,
      isPaused: streamState?.status === StreamStatus.PAUSED || !!streamState?.isPaused,
      isError: streamState?.status === StreamStatus.ERROR,
      isCompleted: !streamState || streamState.status === StreamStatus.COMPLETED,
      pausedAt: streamState?.pausedAt,
      // 重要：即使流状态变为完成，也保留内容完成标志
      isContentComplete
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
   */
  function resumeStream() {
    if (!messageId.value) return false

    // 获取流状态
    const stream = streamStore.getStreamState(messageId.value)

    // 如果流不存在或不是暂停状态，直接返回
    if (!stream || stream.status !== StreamStatus.PAUSED) {
      return false
    }

    // 如果内容已全部接收，直接显示完整内容
    if (stream.isContentComplete) {
      console.log('[StreamControl] 内容已全部接收，直接显示完整内容', stream.accumulatedContent.length)

      // 获取消息对象
      const message = chatStore.messages.get(messageId.value)
      if (message) {
        // 1. 先通过store更新消息内容
        chatStore.updateMessage(messageId.value, {
          content: stream.accumulatedContent,
          reasoning_content: stream.accumulatedReasoning || ''
        })

        // 2. 使用nextTick确保DOM更新后再标记流为完成
        nextTick(() => {
          // 3. 触发自定义事件通知组件刷新 - 直接发送完整内容
          const event = new CustomEvent('stream-completed', {
            detail: {
              messageId: messageId.value,
              content: stream.accumulatedContent,
              reasoning_content: stream.accumulatedReasoning || '',
              isContentComplete: true,
              isCompleted: true
            }
          })
          window.dispatchEvent(event)

          streamStore.completeStream(messageId.value)
        })

        return true
      }
    }

    // 正常恢复流程 - 使用store中的resumeStream方法
    console.log('[StreamControl] 恢复流', messageId.value)
    const result = streamStore.resumeStream(messageId.value)
    return !!result
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
