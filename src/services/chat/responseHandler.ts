import { XStream, type XStreamOptions } from '@/utils/xstream'
import { useStreamStore } from '@/stores/stream'
import { calculateSpeed, formatSpeed } from '@/utils/speed'
import type { MessageRole, MessageFile } from '@/types/message'
import type { ToolCall } from '@/types/api'
import type {
  UpdateCallback,
  DeltaMessage
} from '@/types/message'
import type {
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
  private getStreamStore: () => ReturnType<typeof useStreamStore>;

  constructor(dependencies?: {
    getStreamStore?: () => ReturnType<typeof useStreamStore>;
  }) {
    this.getStreamStore = dependencies?.getStreamStore || useStreamStore;
  }

  /**
   * 处理流式响应
   */
  async handleStreamResponse(
    response: Response,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ): Promise<void> {
    if (!response || !response.body) {
      throw new ResponseParseError('无效的流式响应: 响应体为空');
    }

    if (!response.ok) {
      throw new ResponseParseError(`无效的流式响应: HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      console.warn('警告: 响应内容类型不是 text/event-stream:', contentType);
    }

    const streamStore = this.getStreamStore();
    const messageId = options?.messageId;
    const signal = options?.signal;
    const resumeInfo = options?.resumeInfo;

    if (!messageId) {
      throw new ResponseParseError('缺少消息ID');
    }

    try {
      // 获取流读取器
      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      // 初始化状态，如果有恢复信息则使用恢复信息
      let buffer = '';
      let accumulatedContent = resumeInfo?.lastContent || '';
      let accumulatedReasoning = resumeInfo?.lastReasoning || '';
      let lastCompletionTokens = resumeInfo?.lastTokens || 0;
      let accumulatedToolCalls: ToolCall[] = [];
      const startTime = resumeInfo?.pausedAt || Date.now();

      // 如果有恢复信息，立即更新UI显示之前的内容
      if (resumeInfo) {
        updateCallback(
          accumulatedContent,
          accumulatedReasoning,
          lastCompletionTokens,
          '0',
          accumulatedToolCalls
        );
      }

      // 读取数据流
      while (true) {
        // 检查是否中断
        if (signal?.aborted) {
          console.log('流处理被中断', { messageId });
          reader.cancel('用户取消请求');
          break;
        }

        // 尝试读取下一块数据
        const { done, value } = await reader.read();
        if (done) break;

        // 将接收到的数据添加到缓冲区
        buffer += value;

        // 处理完整的 SSE 消息
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

        for (const line of lines) {
          if (!line.trim() || line.includes('[DONE]')) continue;

          try {
            // 移除 "data: " 前缀并解析数据
            const jsonStr = line.replace(/^data: /, '').trim();
            if (!jsonStr) continue;

            const data = JSON.parse(jsonStr);
            if (!data.choices?.[0]?.delta) {
              console.warn('警告: SSE 消息缺少必要的字段:', data);
              continue;
            }

            const delta = data.choices[0].delta;

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
            const completion_tokens = data.usage?.completion_tokens || lastCompletionTokens;
            lastCompletionTokens = completion_tokens;
            const speed = calculateSpeed(completion_tokens, startTime);

            // 更新状态
            this.updateState(
              messageId,
              accumulatedContent,
              accumulatedReasoning,
              completion_tokens,
              speed,
              accumulatedToolCalls,
              updateCallback
            );
          } catch (error) {
            console.error('解析 SSE 数据错误:', error, '原始数据:', line);
            // 继续处理下一行
          }
        }
      }
    } catch (error) {
      console.error('处理流式响应错误:', error);
      throw new ResponseParseError('处理流式响应失败', error);
    } finally {
      // 标记流完成
      streamStore.completeStream(messageId);
    }
  }

  /**
   * 处理非流式响应
   */
  handleNormalResponse(
    response: ExtendedChatCompletionResponse,
    updateCallback: UpdateCallback
  ): void {
    const content = response.choices[0]?.message?.content || '';
    const reasoning_content = response.choices[0]?.message?.reasoning_content || '';
    const tool_calls = response.choices[0]?.message?.tool_calls || [];
    const completion_tokens = response.usage?.completion_tokens || 0;

    updateCallback(
      content,
      reasoning_content,
      completion_tokens,
      '0',
      tool_calls
    );
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
    if (isStream && response instanceof Response) {
      await this.handleStreamResponse(response, updateCallback, options);
    } else if (!isStream && !(response instanceof Response)) {
      this.handleNormalResponse(response, updateCallback);
    } else {
      throw new ResponseParseError('响应类型与处理模式不匹配');
    }
  }

  /**
   * 格式化消息
   */
  formatMessage(
    role: MessageRole,
    content: string,
    reasoning_content = '',
    files: MessageFile[] = [],
    tool_calls: ToolCall[] = []
  ) {
    return {
      role,
      content,
      reasoning_content,
      files,
      tool_calls
    };
  }

  /**
   * 更新状态（私有辅助方法）
   */
  private updateState(
    messageId: string,
    content: string,
    reasoning_content: string,
    completion_tokens: number,
    speed: number,
    tool_calls: ToolCall[],
    updateCallback: UpdateCallback
  ): void {
    // 通过回调更新 UI
    updateCallback(
      content,
      reasoning_content,
      completion_tokens,
      speed.toString(),
      tool_calls
    );

    // 更新流状态
    const streamStore = this.getStreamStore();
    streamStore.updateStream(
      messageId,
      content,
      reasoning_content,
      completion_tokens,
      speed
    );
  }
}

// 导出默认实例
export const responseHandler = new ResponseHandler();
