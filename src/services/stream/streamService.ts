import { useStreamStore } from '@/stores/stream'

class StreamService {
  /**
   * 开始流式处理
   */
  startStream(messageId: string): string {
    const streamStore = useStreamStore()
    return streamStore.startStream(messageId)
  }

  /**
   * 暂停流
   */
  pauseStream(messageId: string): boolean {
    const streamStore = useStreamStore()
    return streamStore.pauseStream(messageId)
  }

  /**
   * 恢复流
   */
  resumeStream(messageId: string): AbortSignal | null {
    const streamStore = useStreamStore()
    return streamStore.resumeStream(messageId)
  }

  /**
   * 完成流
   */
  completeStream(messageId: string): boolean {
    const streamStore = useStreamStore()
    return streamStore.completeStream(messageId)
  }

  /**
   * 设置流错误
   */
  setStreamError(messageId: string, error: string): boolean {
    const streamStore = useStreamStore()
    return streamStore.setStreamError(messageId, error)
  }

  /**
   * 获取流状态
   */
  getStreamState(messageId: string) {
    const streamStore = useStreamStore()
    return streamStore.streams.get(`stream_${messageId}`)
  }
}

export const streamService = new StreamService()
