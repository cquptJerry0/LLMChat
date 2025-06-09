// src/services/chat/responseHandler.ts
import { XStream, type XStreamOptions } from '@/utils/xstream'
import { useStreamStore } from '@/stores/stream'
import { StreamStatus } from '@/types/stream'
import { calculateSpeed, formatSpeed } from '@/utils/speed'
import type { MessageRole, MessageFile } from '@/types/message'
import type { ToolCall } from '@/types/api'
import type {
  UpdateCallback,
  DeltaMessage
} from '@/types/message'
import type {
  ChatCompletionResponse,
  ExtendedChatCompletionResponse,
  StreamHandlerOptions
} from '@/types/api'

/**
 * 响应解析错误
 */
export class ResponseParseError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ResponseParseError';
  }
}

/**
 * 响应处理器接口
 */
export interface IResponseHandler {
  /**
   * 处理流式响应
   */
  handleStreamResponse(
    response: Response,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ): Promise<void>;

  /**
   * 处理非流式响应
   */
  handleNormalResponse(
    response: ExtendedChatCompletionResponse,
    updateCallback: UpdateCallback
  ): void;

  /**
   * 统一的响应处理函数
   */
  handleResponse(
    response: ExtendedChatCompletionResponse | Response,
    isStream: boolean,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ): Promise<void>;

  /**
   * 格式化消息
   */
  formatMessage(
    role: MessageRole,
    content: string,
    reasoning_content?: string,
    files?: MessageFile[],
    tool_calls?: ToolCall[]
  ): any;
}

/**
 * 响应处理器实现
 */
class ResponseHandler implements IResponseHandler {
  /**
   * 处理流式响应
   */
  async handleStreamResponse(
    response: Response,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ): Promise<void> {
    if (!response.body) {
      throw new ResponseParseError('Response body is null');
    }

    const streamStore = useStreamStore();
    const messageId = options?.messageId;
    const signal = options?.signal;

    // 状态追踪
    let accumulatedContent = options?.initialContent || '';
    let accumulatedReasoning = options?.initialReasoningContent || '';
    let accumulatedToolCalls: ToolCall[] = [];
    const startTime = Date.now();

    // 配置 XStream
    const streamOptions: XStreamOptions = {
      readableStream: response.body,
      errorHandler: (error) => {
        console.error('Stream processing error:', error);
        // 注意：这里我们只记录错误，不处理流状态
        // 流状态应该由调用者处理
      }
    };

    // 创建可中断的流处理器
    const controller = new AbortController();
    const stream = XStream(streamOptions, signal || controller.signal);

    try {
      // 使用异步迭代器处理流数据
      for await (const chunk of stream) {
        if (chunk.data === '[DONE]') continue;

        try {
          const data = JSON.parse(chunk.data);
          const delta: DeltaMessage = data.choices[0].delta || {};

          // 更新累积内容
          if (delta.content) {
            accumulatedContent += delta.content;
          }
          if (delta.reasoning_content) {
            accumulatedReasoning += delta.reasoning_content;
          }
          if (delta.tool_calls) {
            accumulatedToolCalls = [...accumulatedToolCalls, ...delta.tool_calls];
          }

          // 计算生成速度
          const completion_tokens = data.usage?.completion_tokens || 0;
          const speed = calculateSpeed(completion_tokens, startTime);

          // 通过回调更新 UI
          updateCallback(
            accumulatedContent,
            accumulatedReasoning,
            completion_tokens,
            speed.toString(),
            accumulatedToolCalls
          );

          // 如果有messageId，更新流状态
          if (messageId && streamStore) {
            streamStore.updateStream(
              messageId,
              accumulatedContent,
              accumulatedReasoning,
              completion_tokens,
              speed
            );
          }
        } catch (error) {
          throw new ResponseParseError('Error parsing chunk data', error, chunk.data);
        }
      }

      // 流完成后，不处理状态，由调用者负责
    } catch (error) {
      // 只重新抛出解析错误，其他错误由调用者处理
      if (error instanceof ResponseParseError) {
        throw error;
      }

      // 非解析错误(如网络错误、中断错误等)，包装后重新抛出
      throw new ResponseParseError(
        error instanceof Error ? error.message : '未知的流处理错误',
        error
      );
    } finally {
      await stream.cancel();
    }
  }

  /**
   * 处理非流式响应
   */
  handleNormalResponse(response: ExtendedChatCompletionResponse, updateCallback: UpdateCallback): void {
    try {
      const message = response.choices[0].message;

      if (!message) {
        throw new ResponseParseError('Response message is missing');
      }

      const speedStr = formatSpeed(response.speed);

      updateCallback(
        message.content,
        message.reasoning_content || '',
        response.usage.completion_tokens,
        speedStr,
        message.tool_calls
      );
    } catch (error) {
      if (error instanceof ResponseParseError) {
        throw error;
      }

      throw new ResponseParseError(
        '处理非流式响应失败',
        error,
        response
      );
    }
  }

  /**
   * 统一的响应处理函数
   */
  async handleResponse(
    response: ExtendedChatCompletionResponse | Response,
    isStream: boolean,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ): Promise<void> {
    if (isStream) {
      await this.handleStreamResponse(response as Response, updateCallback, options);
    } else {
      this.handleNormalResponse(response as ExtendedChatCompletionResponse, updateCallback);
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
    };
  }
}

export const responseHandler = new ResponseHandler();
