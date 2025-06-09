import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNormalizedChatStore } from './normalizedChat'
import type { StreamState, ResumeResult } from '@/types/stream'
import { StreamStatus } from '@/types/stream'

export const useStreamStore = defineStore(
  'stream-optimized',
  () => {
    const streams = ref<Map<string, StreamState>>(new Map())
    const chatStore = useNormalizedChatStore()

    const startStream = (messageId: string) => {
      const streamId = `stream_${messageId}`

      streams.value.set(streamId, {
        id: streamId,
        messageId,
        status: StreamStatus.STREAMING,
        startTime: Date.now(),
        abortController: new AbortController(),
        accumulatedContent: '',
        accumulatedReasoning: '',
        lastCompletionTokens: 0,
        pausedAt: 0
      })

      return streamId
    }

    const updateStream = (messageId: string, content: string, reasoning_content?: string, completion_tokens?: number, speed?: number) => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.status === StreamStatus.STREAMING) {
        stream.accumulatedContent = content
        stream.accumulatedReasoning = reasoning_content || ''
        stream.lastCompletionTokens = completion_tokens || 0

        chatStore.updateMessage(messageId, {
          content,
          reasoning_content,
          completion_tokens,
          speed
        })
      }
    }

    const pauseStream = (messageId: string) => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.status === StreamStatus.STREAMING) {
        stream.status = StreamStatus.PAUSED
        stream.pauseTime = Date.now()
        stream.pausedAt = Date.now()

        const currentController = stream.abortController
        stream.abortController = undefined

        streams.value.set(streamId, stream)

        return currentController
      }

      return null
    }

    const resumeStream = (messageId: string): ResumeResult | null => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.status === StreamStatus.PAUSED) {
        const newController = new AbortController()

        stream.status = StreamStatus.STREAMING
        stream.abortController = newController
        stream.pauseTime = undefined

        streams.value.set(streamId, stream)

        return {
          signal: newController.signal,
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

    const completeStream = (messageId: string) => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream) {
        stream.status = StreamStatus.COMPLETED
        stream.completeTime = Date.now()
        stream.abortController = undefined
        streams.value.set(streamId, stream)

        setTimeout(() => {
          streams.value.delete(streamId)
        }, 5000)

        return true
      }

      return false
    }

    const setStreamError = (messageId: string, error: string) => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream) {
        stream.status = StreamStatus.ERROR
        stream.error = error
        stream.abortController = undefined
        streams.value.set(streamId, stream)

        return true
      }

      return false
    }

    const getStreamState = (messageId: string): StreamState | undefined => {
      const streamId = `stream_${messageId}`
      return streams.value.get(streamId)
    }

    return {
      streams,
      startStream,
      updateStream,
      pauseStream,
      resumeStream,
      completeStream,
      setStreamError,
      getStreamState
    }
  }
)
