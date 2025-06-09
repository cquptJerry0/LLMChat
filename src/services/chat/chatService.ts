// src/services/chat/chatService.ts
import { apiClient } from '../base/apiClient'
import { useSettingStore } from '@/stores/setting'
import { useStreamStore } from '@/stores/stream'
import { ApiError, BusinessError, BusinessErrorCode, createBusinessError } from '../base/errorHandler'
import { calculateSpeed } from '@/utils/speed'
import { responseHandler, ResponseParseError, IResponseHandler } from './responseHandler'
import type {
  ChatMessage,
  ChatCompletionParams,
  ChatCompletionResponse,
  ExtendedChatCompletionResponse,
  StreamHandlerOptions,
  UpdateCallback
} from '@/types/api'

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',   // 网络层错误
  BUSINESS = 'business', // 业务层错误
  PARSING = 'parsing',   // 解析层错误
  USER_ABORT = 'abort',  // 用户中断
  UNKNOWN = 'unknown'    // 未知错误
}

/**
 * 聊天服务接口
 */
export interface IChatService {
  /**
   * 创建聊天完成请求
   */
  createChatCompletion(
    messages: ChatMessage[],
    options?: {
      messageId?: string,
      signal?: AbortSignal,
      updateCallback?: UpdateCallback
    }
  ): Promise<ExtendedChatCompletionResponse | Response>;

  /**
   * 恢复之前中断的聊天完成请求
   */
  resumeChatCompletion(
    messages: ChatMessage[],
    messageId: string,
    updateCallback: UpdateCallback
  ): Promise<Response>;

  /**
   * 取消请求
   */
  cancelRequest(messageId: string): boolean;
}

/**
 * 聊天服务依赖项
 */
export interface ChatServiceDependencies {
  responseHandler: IResponseHandler;
  getStreamStore: () => ReturnType<typeof useStreamStore>;
  getSettingStore: () => ReturnType<typeof useSettingStore>;
}

/**
 * 聊天服务实现
 */
class ChatService implements IChatService {
  private abortControllers: Map<string, AbortController> = new Map();
  private responseHandler: IResponseHandler;
  private getStreamStore: () => ReturnType<typeof useStreamStore>;
  private getSettingStore: () => ReturnType<typeof useSettingStore>;

  /**
   * 构造函数，通过依赖注入接收依赖项
   */
  constructor(dependencies?: Partial<ChatServiceDependencies>) {
    this.responseHandler = dependencies?.responseHandler || responseHandler;
    this.getStreamStore = dependencies?.getStreamStore || useStreamStore;
    this.getSettingStore = dependencies?.getSettingStore || useSettingStore;
  }

  /**
   * 创建聊天完成请求
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options?: {
      messageId?: string,
      signal?: AbortSignal,
      updateCallback?: UpdateCallback
    }
  ): Promise<ExtendedChatCompletionResponse | Response> {
    const settingStore = this.getSettingStore();
    const streamStore = this.getStreamStore();
    const messageId = options?.messageId;
    const updateCallback = options?.updateCallback;

    try {
      // 参数验证
      if (!messages || messages.length === 0) {
        throw createBusinessError(
          BusinessErrorCode.INVALID_INPUT,
          '消息不能为空'
        );
      }

      // 如果提供了messageId，启动流状态跟踪
      if (messageId && settingStore.settings.stream) {
        streamStore.startStream(messageId);
      }

      // 构建请求参数
      const payload: ChatCompletionParams = {
        model: settingStore.settings.model,
        messages,
        stream: settingStore.settings.stream,
        max_tokens: settingStore.settings.maxTokens,
        temperature: settingStore.settings.temperature,
        top_p: settingStore.settings.topP,
        top_k: settingStore.settings.topK,
        enable_thinking: true,
        thinking_budget: 4096,
        min_p: 0.05,
        frequency_penalty: 0.5,
        n: 1
      };

      const startTime = Date.now();

      // 创建请求配置
      const config = {
        url: '/chat/completions',
        data: payload,
        signal: options?.signal || (
          messageId ?
            streamStore.streams.get(`stream_${messageId}`)?.abortController?.signal :
            undefined
        ),
        responseType: settingStore.settings.stream ? 'stream' : 'json'
      } as const;

      // 保存abortController便于后续取消
      if (messageId && streamStore.streams.get(`stream_${messageId}`)?.abortController) {
        this.abortControllers.set(
          messageId,
          streamStore.streams.get(`stream_${messageId}`)!.abortController!
        );
      }

      // 发送请求
      const response = await apiClient.post<ChatCompletionResponse | Response>(
        '/chat/completions',
        payload,
        {
          signal: config.signal,
          responseType: config.responseType
        }
      );

      // 处理流式响应
      if (settingStore.settings.stream) {
        const streamResponse = response as Response;

        // 如果提供了updateCallback，处理流式响应
        if (updateCallback && messageId) {
          const streamOptions: StreamHandlerOptions = {
            signal: config.signal,
            messageId
          };

          // 异步处理流式响应，不等待完成
          this.handleStreamResponse(streamResponse.clone(), updateCallback, streamOptions, messageId)
            .catch(error => {
              this.handleBusinessError(error, messageId);
            });
        }

        return streamResponse;
      }

      // 处理普通响应
      const data = response as ChatCompletionResponse;
      const speed = calculateSpeed(data.usage.completion_tokens, startTime);

      // 构建扩展响应
      const extendedResponse: ExtendedChatCompletionResponse = {
        ...data,
        speed
      };

      // 如果提供了updateCallback，处理普通响应
      if (updateCallback) {
        try {
          this.responseHandler.handleNormalResponse(extendedResponse, updateCallback);
        } catch (error) {
          console.error('Error handling normal response:', error);
          // 解析错误不影响主流程
        }
      }

      return extendedResponse;
    } catch (error) {
      this.handleBusinessError(error, messageId);
      throw error;
    }
  }

  /**
   * 恢复之前中断的聊天完成请求
   */
  async resumeChatCompletion(
    messages: ChatMessage[],
    messageId: string,
    updateCallback: UpdateCallback
  ): Promise<Response> {
    const streamStore = this.getStreamStore();

    try {
      const signal = streamStore.resumeStream(messageId);

      if (!signal) {
        throw createBusinessError(
          BusinessErrorCode.INVALID_STATE,
          '无法恢复: 消息不在暂停状态'
        );
      }

      const response = await this.createChatCompletion(
        messages,
        { signal, messageId, updateCallback }
      );

      if (response instanceof Response) {
        return response;
      } else {
        throw createBusinessError(
          BusinessErrorCode.INVALID_RESPONSE,
          '预期流式响应但收到普通响应'
        );
      }
    } catch (error) {
      this.handleBusinessError(error, messageId);
      throw error;
    }
  }

  /**
   * 取消请求
   */
  cancelRequest(messageId: string): boolean {
    const controller = this.abortControllers.get(messageId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(messageId);
      return true;
    }
    return false;
  }

  /**
   * 处理流式响应（私有方法）
   */
  private async handleStreamResponse(
    response: Response,
    updateCallback: UpdateCallback,
    options: StreamHandlerOptions,
    messageId: string
  ): Promise<void> {
    try {
      await this.responseHandler.handleStreamResponse(response, updateCallback, options);

      // 成功完成流处理，更新状态
      const streamStore = this.getStreamStore();
      if (messageId) {
        streamStore.completeStream(messageId);
      }
    } catch (error) {
      // 处理响应解析错误
      this.handleBusinessError(error, messageId);
    }
  }

  /**
   * 处理业务错误（私有方法）
   */
  private handleBusinessError(error: unknown, messageId?: string): void {
    if (!messageId) return;

    const streamStore = this.getStreamStore();
    let errorMessage: string;
    let errorType: ErrorType = ErrorType.UNKNOWN;

    // 解析错误 (Parsing Layer)
    if (error instanceof ResponseParseError) {
      errorType = ErrorType.PARSING;
      errorMessage = `解析错误: ${error.message}`;
      console.error(`[${errorType}] Response parse error:`, error);
    }
    // 第二层：业务逻辑错误 (Business Layer)
    else if (error instanceof BusinessError) {
      errorType = ErrorType.BUSINESS;
      errorMessage = error.message;
      console.error(`[${errorType}] Business error (${error.code}):`, error);
    }
    // 第三层：API/网络错误 (Network Layer)
    else if (error instanceof ApiError) {
      errorType = ErrorType.NETWORK;
      errorMessage = error.message;
      console.error(`[${errorType}] API error (${error.status}):`, error);
    }
    // 用户中断
    else if (error instanceof DOMException && error.name === 'AbortError') {
      errorType = ErrorType.USER_ABORT;
      const state = streamStore.streams.get(`stream_${messageId}`);
      if (state?.status === 'streaming') {
        errorMessage = '请求被中断';
      } else {
        // 如果已经是暂停状态，不视为错误
        return;
      }
    }
    // 未知错误
    else {
      errorType = ErrorType.UNKNOWN;
      errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`[${errorType}] Unknown error in chat service:`, error);
    }

    // 记录错误日志
    this.logError(error, errorType, messageId);

    // 更新流状态
    streamStore.setStreamError(messageId, errorMessage);
  }

  /**
   * 记录错误日志
   */
  private logError(error: Error | BusinessError | ApiError | ResponseParseError | unknown, errorType: ErrorType, messageId: string): void {
    console.group(`Error in ChatService (${errorType}) - Message ID: ${messageId}`);
    console.error('Error details:', {
      type: errorType,
      errorClass: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });

    if (error instanceof Error && error.stack) {
      console.debug('Stack trace:', error.stack);
    }

    if (error instanceof BusinessError && error.data) {
      console.debug('Business error data:', error.data);
    }

    if (error instanceof ApiError) {
      console.debug('API error details:', {
        status: error.status,
        code: error.code,
        response: error.response
      });
    }

    if (error instanceof ResponseParseError && error.data) {
      console.debug('Parse error data:', error.data);
    }

    console.groupEnd();
  }
}

// 导出单例实例
export const chatService = new ChatService();
