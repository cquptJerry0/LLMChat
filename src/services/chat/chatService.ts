// src/services/chat/chatService.ts
import { apiClient } from '../base/apiClient'
import { useSettingStore } from '@/stores/setting'
import { useStreamStore } from '@/stores/stream'
import { ApiError } from '../base/errorHandler'
import type {
  ChatMessage,
  ChatCompletionParams,
  ChatCompletionResponse
} from '@/types/api'

class ChatService {
  private abortControllers: Map<string, AbortController> = new Map()

  /**
   * 创建聊天完成请求
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options?: {
      messageId?: string,
      signal?: AbortSignal
    }
  ): Promise<ChatCompletionResponse | Response> {
    const settingStore = useSettingStore()
    const streamStore = useStreamStore()
    const messageId = options?.messageId

    // 如果提供了messageId，启动流状态跟踪
    if (messageId && settingStore.settings.stream) {
      streamStore.startStream(messageId)
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
    }

    try {
      const startTime = Date.now()

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
      } as const

      // 发送请求
      const response = await apiClient.post(
        '/chat/completions',
        payload,
        {
          signal: config.signal,
          responseType: config.responseType as any
        }
      )

      // 处理流式响应
      if (settingStore.settings.stream) {
        return response as unknown as Response
      }

      // 处理普通响应
      const data = response as ChatCompletionResponse
      const duration = (Date.now() - startTime) / 1000
        ; (data as any).speed = (data.usage.completion_tokens / duration).toFixed(2)

      return data
    } catch (error) {
      this.handleError(error, messageId, streamStore)
      throw error
    }
  }

  /**
   * 恢复之前中断的聊天完成请求
   */
  async resumeChatCompletion(
    messages: ChatMessage[],
    messageId: string
  ): Promise<Response> {
    const streamStore = useStreamStore()
    const signal = streamStore.resumeStream(messageId)

    if (!signal) {
      throw new ApiError('无法恢复: 消息不在暂停状态', undefined, 'INVALID_STATE')
    }

    const response = await this.createChatCompletion(
      messages,
      { signal, messageId }
    )

    if (response instanceof Response) {
      return response
    } else {
      throw new ApiError('预期流式响应但收到普通响应', undefined, 'INVALID_RESPONSE')
    }
  }

  /**
   * 取消请求
   */
  cancelRequest(messageId: string): boolean {
    const controller = this.abortControllers.get(messageId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(messageId)
      return true
    }
    return false
  }

  /**
   * 处理错误
   */
  private handleError(error: any, messageId?: string, streamStore?: any) {
    if (!messageId || !streamStore) return

    if (error instanceof DOMException && error.name === 'AbortError') {
      const state = streamStore.streams.get(`stream_${messageId}`)
      if (state && state.status === 'streaming') {
        streamStore.setStreamError(messageId, '请求被中断')
      }
    } else {
      streamStore.setStreamError(
        messageId,
        error instanceof Error ? error.message : '未知错误'
      )
    }
  }
}

export const chatService = new ChatService()
