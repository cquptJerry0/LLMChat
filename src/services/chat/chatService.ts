import { apiClient } from '../base/apiClient'
import { useSettingStore } from '@/stores/setting'
import { useStreamStore } from '@/stores/stream'
import {
  BusinessErrorCode,
  createBusinessError,
  ResponseParseError
} from '../base/errorHandler'
import { calculateSpeed } from '@/utils/speed'
import { responseHandler, IResponseHandler } from './responseHandler'
import type { ResumeInfo } from '@/types/stream'
import type {
  ChatMessage,
  ChatCompletionParams,
  ChatCompletionResponse,
  ExtendedChatCompletionResponse,
  StreamHandlerOptions,
  UpdateCallback
} from '@/types/api'

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
      updateCallback?: UpdateCallback,
      resumeInfo?: ResumeInfo
    }
  ): Promise<ExtendedChatCompletionResponse | any>;

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
      updateCallback?: UpdateCallback,
      resumeInfo?: ResumeInfo
    }
  ): Promise<ExtendedChatCompletionResponse | any> {
    const settingStore = this.getSettingStore();
    const streamStore = this.getStreamStore();
    const messageId = options?.messageId;
    const updateCallback = options?.updateCallback;
    const resumeInfo = options?.resumeInfo;

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
        if (!resumeInfo) {
          // 新的流
          streamStore.startStream(messageId);
        }
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

      // 确保使用 AbortController 以便能够取消请求
      let abortController: AbortController | undefined;

      if (messageId) {
        // 检查是否已经有流控制器
        const existingController = streamStore.streams.get(`stream_${messageId}`)?.abortController;

        if (existingController) {
          abortController = existingController;
        } else {
          // 创建新的控制器
          abortController = new AbortController();

          // 如果是流式响应且有messageId，更新流控制器
          if (settingStore.settings.stream) {
            const streamState = streamStore.getStreamState(messageId);
            if (streamState) {
              streamState.abortController = abortController;
            }
          }
        }

        // 保存 AbortController 以便后续取消
        console.log(`保存 AbortController: ${messageId}`);
        this.abortControllers.set(messageId, abortController);
      }

      // 创建请求配置
      const config = {
        url: '/chat/completions',
        data: payload,
        signal: options?.signal || (abortController ? abortController.signal : undefined),
        responseType: settingStore.settings.stream ? 'text' : 'json'
      } as const;

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

        // 检查响应是否有效
        if (!streamResponse || !streamResponse.body) {
          const headers: Record<string, string> = {};
          if (streamResponse?.headers) {
            streamResponse.headers.forEach((value, key) => {
              headers[key] = value;
            });
          }

          console.error('无效的流式响应:', {
            status: streamResponse?.status,
            statusText: streamResponse?.statusText,
            headers,
            hasBody: !!streamResponse?.body
          });
          throw new Error('无效的流式响应');
        }

        // 如果提供了updateCallback，处理流式响应
        if (updateCallback && messageId) {
          const streamOptions: StreamHandlerOptions = {
            signal: config.signal,
            messageId,
            resumeInfo
          };

          // 异步处理流式响应，不等待完成
          this.handleStreamResponse(streamResponse, updateCallback, streamOptions, messageId)
            .catch(error => {
              console.error('处理流式响应出错:', error);
              this.handleError(error, messageId);
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
      this.handleError(error, messageId);
      throw error;
    }
  }

  /**
   * 取消请求
   */
  cancelRequest(messageId: string): boolean {
    console.log(`尝试取消请求: ${messageId}`, this.abortControllers.has(messageId))
    const controller = this.abortControllers.get(messageId);
    if (controller) {
      console.log('找到AbortController，执行中止操作');
      try {
        controller.abort();
        this.abortControllers.delete(messageId);
        console.log('成功中止请求');
        return true;
      } catch (error) {
        console.error('中止请求时出错:', error);
        return false;
      }
    }

    console.log('未找到请求的AbortController');
    return false;
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(
    response: Response,
    updateCallback: UpdateCallback,
    options: StreamHandlerOptions,
    messageId: string
  ): Promise<void> {
    console.log('chatService.handleStreamResponse', { messageId });

    try {
      await this.responseHandler.handleStreamResponse(response, updateCallback, {
        ...options,
        messageId
      });
    } catch (error) {
      // 处理响应解析错误
      this.handleError(error, messageId);
    }
  }

  private handleError(error: unknown, messageId?: string): void {
    if (!messageId) return;

    const streamStore = this.getStreamStore();
    let errorMessage: string;

    // 简化的错误分类
    if (error instanceof ResponseParseError) {
      errorMessage = `解析错误: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = '未知错误';
    }

    console.error('Error in ChatService:', {
      messageId,
      message: errorMessage,
      error
    });

    // 更新流状态
    streamStore.setStreamError(messageId, errorMessage);
  }
}

// 导出单例实例
export const chatService = new ChatService({
  responseHandler,
  getStreamStore: useStreamStore,
  getSettingStore: useSettingStore
});

