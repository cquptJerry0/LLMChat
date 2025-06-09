/**
 * 消息处理工具
 *
 * 负责处理消息的创建、更新和响应解析
 * 支持流式和非流式响应处理
 * 支持工具调用和推理内容
 */
import type {
  MessageRole,
  MessageFile,
  UpdateCallback,
  DeltaMessage,
  MessageHandler
} from '@/types/message';
import type { ChatCompletionResponse, ToolCall, StreamHandlerOptions } from '@/types/api';
import { XStream, type XStreamOptions } from './xstream';
import { useStreamStore } from '@/stores/stream';
import { StreamStatus } from '@/types/stream';
import { calculateSpeed } from '@/utils/speed'

/**
 * 消息处理器实现
 * 提供消息格式化和响应处理功能
 */
export const messageHandler: MessageHandler = {
  /**
   * 格式化消息
   * 创建一个新的消息对象，设置默认值
   *
   * @param role - 消息角色(user/assistant/system)
   * @param content - 消息内容
   * @param reasoning_content - 推理内容(可选)
   * @param files - 附件文件列表(可选)
   * @param tool_calls - 工具调用列表(可选)
   * @returns 格式化后的消息对象
   */
  formatMessage(
    role: MessageRole,
    content: string,
    reasoning_content = '',
    files: MessageFile[] = [],
    tool_calls: ToolCall[] = []
  ) {
    return {
      id: Date.now(),                // 使用时间戳作为ID
      role,
      content,
      reasoning_content,
      files,
      tool_calls,
      completion_tokens: 0,          // 初始化为0
      speed: 0,                      // 初始化为0
      loading: false,                // 初始状态非加载中
    }
  },

  /**
   * 处理流式响应
   * 使用 XStream 解析 SSE 流并通过回调更新 UI
   *
   * @param response - 流式响应对象
   * @param updateCallback - 更新UI的回调函数
   * @param options - 流处理选项，包含信号和初始状态
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

    // 获取消息ID和中断信号
    const messageId = options?.messageId
    const signal = options?.signal

    // 状态追踪
    let accumulatedContent = options?.initialContent || ''
    let accumulatedReasoning = options?.initialReasoningContent || ''
    let accumulatedToolCalls: ToolCall[] = []
    const startTime = Date.now()

    // 配置 XStream
    const streamOptions: XStreamOptions = {
      readableStream: response.body,
      errorHandler: (error) => {
        console.error('Stream processing error:', error)

        // 如果有messageId，更新流状态为错误
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
        // 跳过结束标记
        if (chunk.data === '[DONE]') continue

        try {
          // 解析数据块
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
          const speed = calculateSpeed(data.usage?.completion_tokens || 0, startTime)
          const speedStr = speed.toString()
          const completion_tokens = data.usage?.completion_tokens || 0

          // 通过回调更新 UI
          updateCallback(
            accumulatedContent,
            accumulatedReasoning,
            completion_tokens,
            speedStr,
            accumulatedToolCalls
          )

          // 如果有messageId，更新流状态
          if (messageId) {
            streamStore.updateStream(
              messageId,
              accumulatedContent,
              accumulatedReasoning,
              completion_tokens,
              parseFloat(speedStr)
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
      console.error('Stream processing failed:', error)

      // 检查是否是用户主动中断
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Stream was aborted by user')

        // 如果有messageId但状态不是暂停，则设为错误
        if (messageId) {
          const state = streamStore.streams.get(messageId)
          if (state && state.status !== StreamStatus.PAUSED) {
            streamStore.setStreamError(messageId, '请求被中断')
          }
        }
      } else if (messageId) {
        // 其他错误，更新状态
        streamStore.setStreamError(
          messageId,
          error instanceof Error ? error.message : '未知错误'
        )
      }

      throw error
    } finally {
      // 确保资源被正确释放
      await stream.cancel()
    }
  },

  /**
   * 处理非流式响应
   * 解析完整响应并一次性更新 UI
   */
  handleNormalResponse(response: ChatCompletionResponse, updateCallback: UpdateCallback) {
    const message = response.choices[0].message
    updateCallback(
      message.content,
      message.reasoning_content || '',
      response.usage.completion_tokens,
      (response as any).speed || '0',     // speed是客户端计算的非标准字段
      message.tool_calls
    )
  },

  /**
   * 统一的响应处理函数
   * 根据响应类型选择合适的处理方法
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
  },
}
