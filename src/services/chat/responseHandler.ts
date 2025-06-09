// src/services/chat/responseHandler.ts
import { XStream, type XStreamOptions } from '@/utils/xstream'
import { useStreamStore } from '@/stores/stream'
import { StreamStatus } from '@/types/stream'
import type { MessageRole, MessageFile } from '@/types/message'
import type { ToolCall } from '@/types/api'
import type {
  UpdateCallback,
  DeltaMessage
} from '@/types/message'
import type {
  ChatCompletionResponse,
  StreamHandlerOptions
} from '@/types/api'

class ResponseHandler {
  /**
   * 处理流式响应
   */
  async handleStreamResponse(
    response: Response,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ) {
    if (!response.body) {
      throw new Error('Response body is null')
    }

    const streamStore = useStreamStore()
    const messageId = options?.messageId
    const signal = options?.signal

    // 状态追踪
    let accumulatedContent = options?.initialContent || ''
    let accumulatedReasoning = options?.initialReasoningContent || ''
    let accumulatedToolCalls = []
    const startTime = Date.now()

    // 配置 XStream
    const streamOptions: XStreamOptions = {
      readableStream: response.body,
      errorHandler: (error) => {
        console.error('Stream processing error:', error)
        if (messageId) {
          streamStore.setStreamError(
            messageId,
            error instanceof Error ? error.message : '未知错误'
          )
        }
      }
    }

    // 创建可中断的流处理器
    const controller = new AbortController()
    const stream = XStream(streamOptions, signal || controller.signal)

    try {
      // 使用异步迭代器处理流数据
      for await (const chunk of stream) {
        if (chunk.data === '[DONE]') continue

        try {
          const data = JSON.parse(chunk.data)
          const delta: DeltaMessage = data.choices[0].delta || {}

          // 更新累积内容
          if (delta.content) {
            accumulatedContent += delta.content
          }
          if (delta.reasoning_content) {
            accumulatedReasoning += delta.reasoning_content
          }
          if (delta.tool_calls) {
            accumulatedToolCalls = [...accumulatedToolCalls, ...delta.tool_calls]
          }

          // 计算生成速度
          const elapsedTime = (Date.now() - startTime) / 1000
          const speed = ((data.usage?.completion_tokens || 0) / elapsedTime).toFixed(2)
          const completion_tokens = data.usage?.completion_tokens || 0

          // 通过回调更新 UI
          updateCallback(
            accumulatedContent,
            accumulatedReasoning,
            completion_tokens,
            speed,
            accumulatedToolCalls
          )

          // 如果有messageId，更新流状态
          if (messageId) {
            streamStore.updateStream(
              messageId,
              accumulatedContent,
              accumulatedReasoning,
              completion_tokens,
              parseFloat(speed)
            )
          }
        } catch (error) {
          console.error('Error parsing chunk data:', error)
        }
      }

      // 流完成后更新状态
      if (messageId) {
        streamStore.completeStream(messageId)
      }
    } catch (error) {
      this.handleStreamError(error, messageId, streamStore)
      throw error
    } finally {
      await stream.cancel()
    }
  }

  /**
   * 处理非流式响应
   */
  handleNormalResponse(response: ChatCompletionResponse, updateCallback: UpdateCallback) {
    const message = response.choices[0].message
    updateCallback(
      message.content,
      message.reasoning_content || '',
      response.usage.completion_tokens,
      (response as any).speed || '0',
      message.tool_calls
    )
  }

  /**
   * 统一的响应处理函数
   */
  async handleResponse(
    response: ChatCompletionResponse | Response,
    isStream: boolean,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ) {
    if (isStream) {
      await this.handleStreamResponse(response as Response, updateCallback, options)
    } else {
      this.handleNormalResponse(response as ChatCompletionResponse, updateCallback)
    }
  }

  /**
   * 处理流错误
   */
  private handleStreamError(error: any, messageId?: string, streamStore?: any) {
    if (!messageId || !streamStore) return

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Stream was aborted by user')
      const state = streamStore.streams.get(`stream_${messageId}`)
      if (state && state.status !== StreamStatus.PAUSED) {
        streamStore.setStreamError(messageId, '请求被中断')
      }
    } else {
      streamStore.setStreamError(
        messageId,
        error instanceof Error ? error.message : '未知错误'
      )
    }
  }

  /**
  * 格式化消息
  * 将消息格式化功能集成到响应处理器中
  */
  formatMessage(
    role: MessageRole,
    content: string,
    reasoning_content = '',
    files: MessageFile[] = [],
    tool_calls: ToolCall[] = []
  ) {
    return {
      id: Date.now(),
      role,
      content,
      reasoning_content,
      files,
      tool_calls,
      completion_tokens: 0,
      speed: 0,
      loading: false,
    }
  }
}

export const responseHandler = new ResponseHandler()
