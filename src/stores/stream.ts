import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNormalizedChatStore } from './normalizedChat'
import { STORAGE_KEYS } from '@/constants/storage'
import type { StreamState, ResumeResult, PersistedStreamState } from '@/types/stream'
import { StreamStatus } from '@/types/stream'

export const useStreamStore = defineStore(
  'stream-optimized',
  () => {
    const streams = ref<Map<string, StreamState>>(new Map())
    const chatStore = useNormalizedChatStore()

    // 内部方法：保存流状态到localStorage
    const persistStreamState = (messageId: string, state: PersistedStreamState) => {
      try {
        localStorage.setItem(
          `${STORAGE_KEYS.STREAM_STATE_PREFIX}${messageId}`,
          JSON.stringify(state)
        )
        return true
      } catch (error) {
        console.error('Failed to save stream state:', error)
        return false
      }
    }

    // 内部方法：从localStorage加载流状态
    const loadStreamState = (messageId: string): PersistedStreamState | null => {
      try {
        const saved = localStorage.getItem(`${STORAGE_KEYS.STREAM_STATE_PREFIX}${messageId}`)
        if (!saved) return null
        return JSON.parse(saved) as PersistedStreamState
      } catch (error) {
        console.error('Failed to load stream state:', error)
        return null
      }
    }

    // 内部方法：从localStorage删除流状态
    const removeStreamState = (messageId: string) => {
      localStorage.removeItem(`${STORAGE_KEYS.STREAM_STATE_PREFIX}${messageId}`)
    }

    const startStream = (messageId: string) => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`

      const streamState = {
        id: streamId,
        messageId,
        status: StreamStatus.STREAMING,
        startTime: Date.now(),
        abortController: new AbortController(),
        accumulatedContent: '',
        accumulatedReasoning: '',
        lastCompletionTokens: 0,
        pausedAt: 0,
        isPaused: false
      }

      streams.value.set(streamId, streamState)

      // 保存初始状态
      persistStreamState(messageId, {
        content: '',
        reasoning_content: '',
        completion_tokens: 0,
        speed: 0,
        status: StreamStatus.STREAMING,
        timestamp: Date.now(),
        savedAt: Date.now()
      })

      return streamId
    }

    const updateStream = (messageId: string, content: string, reasoning_content?: string, completion_tokens?: number, speed?: number) => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      const stream = streams.value.get(streamId)

      if (stream) {
        // 更新累积内容
        stream.accumulatedContent = content
        stream.accumulatedReasoning = reasoning_content || ''
        stream.lastCompletionTokens = completion_tokens || 0

        // 如果处于暂停状态，不更新UI
        if (stream.isPaused) {
          console.log(`[StreamStore] 暂停状态更新内容: ${messageId}`, {
            contentLength: content.length,
            reasoningLength: (reasoning_content || '').length
          })

          // 仍然保存到localStorage以防断网
          persistStreamState(messageId, {
            content: stream.accumulatedContent,
            reasoning_content: stream.accumulatedReasoning || '',
            completion_tokens: completion_tokens || 0,
            speed: speed || 0,
            status: stream.status,
            timestamp: Date.now(),
            savedAt: Date.now(),
            pausedAt: stream.pausedAt,
            isContentComplete: stream.isContentComplete
          })

          return
        }

        // 非暂停状态，正常更新UI
        chatStore.updateMessage(messageId, {
          content,
          reasoning_content,
          completion_tokens,
          speed
        })

        // 每次内容更新时立即保存到 localStorage，确保断网时不丢失内容
        persistStreamState(messageId, {
          content,
          reasoning_content: reasoning_content || '',
          completion_tokens: completion_tokens || 0,
          speed: speed || 0,
          status: stream.status,
          timestamp: Date.now(),
          savedAt: Date.now(),
          isContentComplete: stream.isContentComplete
        })
      }
    }

    const pauseStream = (messageId: string) => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.status === StreamStatus.STREAMING) {
        stream.status = StreamStatus.PAUSED
        stream.pauseTime = Date.now()
        stream.pausedAt = Date.now()
        // 设置暂停标志，但不中断网络请求
        stream.isPaused = true

        const currentController = stream.abortController
        // 不清除 abortController，保持网络连接
        // stream.abortController = undefined

        streams.value.set(streamId, stream)

        // 保存暂停状态
        persistStreamState(messageId, {
          content: stream.accumulatedContent,
          reasoning_content: stream.accumulatedReasoning,
          completion_tokens: stream.lastCompletionTokens,
          speed: 0,
          status: StreamStatus.PAUSED,
          timestamp: Date.now(),
          savedAt: Date.now(),
          pausedAt: stream.pausedAt
        })

        return currentController
      }

      return null
    }

    const resumeStream = (messageId: string): ResumeResult | null => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.status === StreamStatus.PAUSED) {
        // 只修改状态，不创建新的AbortController
        stream.status = StreamStatus.STREAMING
        stream.isPaused = false
        stream.pauseTime = undefined
        streams.value.set(streamId, stream)

        // 保存状态到localStorage
        persistStreamState(messageId, {
          content: stream.accumulatedContent,
          reasoning_content: stream.accumulatedReasoning,
          completion_tokens: stream.lastCompletionTokens,
          speed: 0,
          status: StreamStatus.STREAMING,
          timestamp: Date.now(),
          savedAt: Date.now()
        })

        // 返回AbortController信号和恢复信息
        return {
          signal: stream.abortController?.signal || (new AbortController()).signal,
          resumeInfo: {
            lastContent: stream.accumulatedContent,
            lastReasoning: stream.accumulatedReasoning,
            lastTokens: stream.lastCompletionTokens,
            pausedAt: stream.pausedAt
          }
        }
      }

      return null
    }

    const markContentComplete = (messageId: string) => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      const stream = streams.value.get(streamId)

      if (stream) {
        // 添加内容完成标记，但保持暂停状态
        stream.isContentComplete = true
        console.log(`[StreamStore] 标记内容已全部接收: ${messageId}`, stream)

        // 更新localStorage存储
        persistStreamState(messageId, {
          content: stream.accumulatedContent,
          reasoning_content: stream.accumulatedReasoning,
          completion_tokens: stream.lastCompletionTokens,
          speed: 0,
          status: StreamStatus.PAUSED,
          timestamp: Date.now(),
          savedAt: Date.now(),
          pausedAt: stream.pausedAt,
          isContentComplete: true
        })

        return true
      }

      return false
    }

    const completeStream = (messageId: string) => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      const stream = streams.value.get(streamId)

      if (stream) {
        // 保留isContentComplete标志
        const wasContentComplete = stream.isContentComplete || false

        stream.status = StreamStatus.COMPLETED
        stream.completeTime = Date.now()
        stream.abortController = undefined
        stream.isPaused = false
        // 保留内容完成标志
        stream.isContentComplete = wasContentComplete || true

        streams.value.set(streamId, stream)

        // 保存完成状态
        persistStreamState(messageId, {
          content: stream.accumulatedContent,
          reasoning_content: stream.accumulatedReasoning,
          completion_tokens: stream.lastCompletionTokens,
          speed: 0,
          status: StreamStatus.COMPLETED,
          timestamp: Date.now(),
          savedAt: Date.now(),
          isContentComplete: true // 已完成的流内容必然是完整的
        })

        setTimeout(() => {
          streams.value.delete(streamId)
          removeStreamState(messageId)
        }, 5000)

        return true
      }

      return false
    }

    const setStreamError = (messageId: string, error: string) => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      const stream = streams.value.get(streamId)

      if (stream) {
        stream.status = StreamStatus.ERROR
        stream.error = error
        stream.abortController = undefined
        streams.value.set(streamId, stream)

        // 保存错误状态
        persistStreamState(messageId, {
          content: stream.accumulatedContent,
          reasoning_content: stream.accumulatedReasoning,
          completion_tokens: stream.lastCompletionTokens,
          speed: 0,
          status: StreamStatus.ERROR,
          error,
          timestamp: Date.now(),
          savedAt: Date.now()
        })

        return true
      }

      return false
    }

    const getStreamState = (messageId: string): StreamState | undefined => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      let stream = streams.value.get(streamId)

      // 如果内存中没有状态，尝试从localStorage恢复
      if (!stream) {
        const savedState = loadStreamState(messageId)
        if (savedState) {
          // 即使状态是 completed，也恢复保存的内容，确保不丢失已生成的内容
          if (savedState.content) {
            // 更新消息内容为保存的内容
            chatStore.updateMessage(messageId, {
              content: savedState.content,
              reasoning_content: savedState.reasoning_content,
              completion_tokens: savedState.completion_tokens,
              speed: savedState.speed
            })
          }

          // 只有流还在进行中或暂停时才恢复流控制
          if ([StreamStatus.STREAMING, StreamStatus.PAUSED].includes(savedState.status as StreamStatus)) {
            startStream(messageId)
            stream = streams.value.get(streamId)
            if (stream && savedState.status === StreamStatus.PAUSED) {
              pauseStream(messageId)

              // 恢复暂停位置
              if (stream && savedState.pausedAt) {
                stream.pausedAt = savedState.pausedAt
              }
            }
          }
        }
      }

      return stream
    }

    const abortStream = (messageId: string) => {
      const streamId = `${STORAGE_KEYS.STREAM_ID_PREFIX}${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.abortController) {
        // 中断网络请求
        stream.abortController.abort()
        stream.abortController = undefined
        return true
      }

      return false
    }

    return {
      streams,
      startStream,
      updateStream,
      pauseStream,
      resumeStream,
      markContentComplete,
      completeStream,
      setStreamError,
      getStreamState,
      abortStream
    }
  }
)
