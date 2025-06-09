import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNormalizedChatStore } from './normalizedChat'

export const useStreamStore = defineStore(
  'stream-optimized',
  () => {
    const streams = ref<Map<string, {
      id: string,
      messageId: string,
      status: 'streaming' | 'paused' | 'completed' | 'error',
      startTime: number,
      pauseTime?: number,
      completeTime?: number,
      error?: string,
      abortController?: AbortController
    }>>(new Map())

    const chatStore = useNormalizedChatStore()

    const startStream = (messageId: string) => {
      const streamId = `stream_${messageId}`

      streams.value.set(streamId, {
        id: streamId,
        messageId,
        status: 'streaming',
        startTime: Date.now(),
        abortController: new AbortController()
      })

      return streamId
    }

    const updateStream = (messageId: string, content: string, reasoning_content?: string, completion_tokens?: number, speed?: number) => {
      chatStore.updateMessage(messageId, {
        content,
        reasoning_content,
        completion_tokens,
        speed
      })
    }

    const pauseStream = (messageId: string) => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.status === 'streaming') {
        if (stream.abortController) {
          stream.abortController.abort('Stream paused by user')
        }

        stream.status = 'paused'
        stream.pauseTime = Date.now()
        streams.value.set(streamId, stream)

        return true
      }

      return false
    }

    const resumeStream = (messageId: string) => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream && stream.status === 'paused') {
        stream.status = 'streaming'
        stream.abortController = new AbortController()
        streams.value.set(streamId, stream)

        return stream.abortController.signal
      }

      return null
    }

    const completeStream = (messageId: string) => {
      const streamId = `stream_${messageId}`
      const stream = streams.value.get(streamId)

      if (stream) {
        stream.status = 'completed'
        stream.completeTime = Date.now()
        stream.abortController = undefined
        streams.value.set(streamId, stream)

        // 延迟删除已完成的流状态，减轻存储负担
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
        stream.status = 'error'
        stream.error = error
        stream.abortController = undefined
        streams.value.set(streamId, stream)

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
      completeStream,
      setStreamError
    }
  }
)