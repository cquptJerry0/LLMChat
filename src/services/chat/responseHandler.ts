import { XStream, type XStreamOptions } from '@/utils/xstream'
import { useStreamStore } from '@/stores/stream'
import { calculateSpeed } from '@/utils/speed'
import { createParseError } from '../base/errorHandler'
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
import { StreamStatus } from '@/types/stream'

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
    console.log('[ResponseHandler层] 开始处理流式响应', options?.messageId)

    if (!response || !response.body) {
      console.error('[ResponseHandler层] 无效的流式响应: 响应体为空')
      throw createParseError('无效的流式响应: 响应体为空');
    }

    if (!response.ok) {
      console.error(`[ResponseHandler层] 无效的流式响应: HTTP ${response.status} ${response.statusText}`)
      throw createParseError(`无效的流式响应: HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      console.warn('[ResponseHandler层] 警告: 响应内容类型不是 text/event-stream:', contentType);
    }

    const streamStore = this.getStreamStore();
    const messageId = options?.messageId;
    const signal = options?.signal;
    const resumeInfo = options?.resumeInfo;

    if (!messageId) {
      console.error('[ResponseHandler层] 缺少消息ID')
      throw createParseError('缺少消息ID');
    }

    console.log('[ResponseHandler层] 流处理参数:', {
      messageId,
      hasSignal: !!signal,
      hasResumeInfo: !!resumeInfo,
      signalAborted: signal?.aborted
    })

    try {
      // 克隆响应以便我们可以使用XStream处理
      const clonedResponse = response.clone();
      console.log('[ResponseHandler层] 响应已克隆')

      // 初始化状态，如果有恢复信息则使用恢复信息
      let accumulatedContent = resumeInfo?.lastContent || '';
      let accumulatedReasoning = resumeInfo?.lastReasoning || '';
      let lastCompletionTokens = resumeInfo?.lastTokens || 0;
      let accumulatedToolCalls: ToolCall[] = [];
      const startTime = resumeInfo?.pausedAt || Date.now();

      console.log('[ResponseHandler层] 初始化状态:', {
        contentLength: accumulatedContent.length,
        reasoningLength: accumulatedReasoning.length,
        tokens: lastCompletionTokens,
        startTime
      })

      // 如果有恢复信息，立即更新UI显示之前的内容
      if (resumeInfo) {
        console.log('[ResponseHandler层] 使用恢复信息更新UI')
        updateCallback(
          accumulatedContent,
          accumulatedReasoning,
          lastCompletionTokens,
          '0',
          accumulatedToolCalls
        );
      }

      // 使用XStream处理流式响应
      console.log('[ResponseHandler层] 创建XStream')
      const stream = XStream({
        readableStream: clonedResponse.body!
      } as XStreamOptions, signal);

      // 异步迭代处理流
      try {
        console.log('[ResponseHandler层] 开始迭代处理流')
        let eventCount = 0;

        for await (const event of stream) {
          eventCount++;

          // 每10个事件记录一次状态
          if (eventCount % 10 === 0) {
            console.log(`[ResponseHandler层] 已处理 ${eventCount} 个事件, 消息ID: ${messageId}`)
          }

          // 检查是否有data字段
          if (!event.data) {
            console.log('[ResponseHandler层] 跳过无data字段的事件')
            continue;
          }

          try {
            // 检查是否是结束标记
            if (event.data === '[DONE]') {
              console.log('[ResponseHandler层] 收到流结束标记')

              // 重要：收到DONE标记不应自动完成处于暂停状态的流
              const currentState = streamStore.getStreamState(messageId);
              if (currentState?.status === 'paused' || currentState?.isPaused) {
                console.log('[ResponseHandler层] 流处于暂停状态，即使收到DONE标记也保持暂停状态');
              }

              continue;
            }

            // 检查中断信号
            if (signal?.aborted) {
              console.log('[ResponseHandler层] 检测到中断信号，停止处理流', { messageId });
              break;
            }

            // 检查流状态
            const streamState = streamStore.getStreamState(messageId);
            if (!streamState || streamState.status === 'completed' || streamState.status === 'error') {
              console.log('[ResponseHandler层] 流状态异常，停止处理', {
                messageId,
                status: streamState?.status
              });
              break;
            }

            // 解析JSON数据
            const data = JSON.parse(event.data);
            if (!data.choices?.[0]?.delta) {
              console.warn('[ResponseHandler层] 警告: SSE 消息缺少必要的字段:', data);
              continue;
            }

            const delta: DeltaMessage = data.choices[0].delta;
            if (delta.reasoning_content === null) {
              streamStore.reasoningComplete(messageId);
            }
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

            // 每50个事件记录一次内容长度
            if (eventCount % 50 === 0) {
              console.log(`[ResponseHandler层] 当前内容长度: ${accumulatedContent.length}, 推理长度: ${accumulatedReasoning.length}, 令牌数: ${completion_tokens}`)
            }

            // 更新状态 - 注意：updateStream方法内部会根据isPaused状态决定是否更新UI
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
            console.error('[ResponseHandler层] 解析 SSE 数据错误:', error, '原始数据:', event.data);
            // 继续处理下一个事件
          }
        }

        console.log(`[ResponseHandler层] 流处理完成，共处理 ${eventCount} 个事件, 消息ID: ${messageId}`)
      } catch (error) {
        // 检查是否是因为中断信号导致的错误
        if (signal?.aborted) {
          console.log('[ResponseHandler层] 流处理被中断', { messageId });
          // 不抛出错误，让流正常结束
          return;
        } else {
          console.error('[ResponseHandler层] 流处理过程中发生错误:', error)
          throw error;
        }
      }
    } catch (error) {
      console.error('[ResponseHandler层] 处理流式响应错误:', error);
      throw createParseError('处理流式响应失败', error);
    } finally {
      // 检查流的最终状态
      const finalState = streamStore.getStreamState(messageId);
      console.log(`[ResponseHandler层] 流处理结束，最终状态: ${finalState?.status}`, { messageId })

      // 修复：对暂停状态的特殊处理
      if (finalState) {
        if (finalState.status === StreamStatus.PAUSED || finalState.isPaused) {
          // 流处于暂停状态，但内容已全部接收，标记内容完成
          console.log(`[ResponseHandler层] 流处于暂停状态，但内容已全部接收，标记内容完成: ${messageId}`, {
            status: finalState.status,
            isPaused: finalState.isPaused,
            content: finalState.accumulatedContent.length
          })
          streamStore.markContentComplete(messageId);
        } else if (finalState.status !== StreamStatus.COMPLETED &&
          finalState.status !== StreamStatus.ERROR) {
          // 非暂停、非完成、非错误状态，正常标记完成
          console.log(`[ResponseHandler层] 标记流完成: ${messageId}`, {
            status: finalState.status
          })
          streamStore.completeStream(messageId);
        }
      }
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
      throw createParseError('响应类型与处理模式不匹配');
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
