import { useSettingStore } from '@/stores/setting'
import { useStreamStore } from '@/stores/stream'
import { StreamStatus } from '@/types/stream'
import type {
  ChatMessage,
  ChatCompletionParams,
  ChatCompletionResponse,
  StreamResponse,
  APIError as APIErrorType,
  APIRequestOptions
} from '@/types/api'

const API_BASE_URL = 'https://api.siliconflow.cn/v1'

// API 错误类
export class APIError extends Error implements APIErrorType {
  status?: number
  code?: string
  response?: Response

  constructor(message: string, status?: number, code?: string, response?: Response) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.response = response
  }
}

// 创建聊天完成请求
export const createChatCompletion = async (
  messages: ChatMessage[],
  options?: APIRequestOptions
): Promise<ChatCompletionResponse | StreamResponse> => {
  const settingStore = useSettingStore()
  const streamStore = useStreamStore()

  // 获取消息ID
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
    // 新增参数
    enable_thinking: true, // 默认开启思考模式
    thinking_budget: 4096, // 默认思考 token 预算
    min_p: 0.05, // 默认最小概率阈值
    frequency_penalty: 0.5, // 默认频率惩罚
    n: 1 // 默认生成数量
  }

  // 构建请求选项
  const fetchOptions = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settingStore.settings.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    // 添加中断信号
    signal: options?.signal || (messageId ? streamStore.streams.get(messageId)?.abortController?.signal : undefined)
  }

  try {
    const startTime = Date.now()
    const response = await fetch(`${API_BASE_URL}/chat/completions`, fetchOptions)

    if (!response.ok) {
      throw new APIError(
        `HTTP error! status: ${response.status}`,
        response.status,
        undefined,
        response
      )
    }

    // 处理流式响应
    if (settingStore.settings.stream) {
      return response as StreamResponse
    }

    // 处理普通响应
    const data = await response.json() as ChatCompletionResponse

    // 注意：speed 不是 API 的标准字段，这里我们在客户端计算它
    const duration = (Date.now() - startTime) / 1000
      ; (data as any).speed = (data.usage.completion_tokens / duration).toFixed(2)

    return data
  } catch (error) {
    console.error('Chat API Error:', error)

    // 如果是用户主动中断，不视为错误
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (messageId) {
        // 中断处理逻辑
        const state = streamStore.streams.get(messageId)
        if (state && state.status === StreamStatus.STREAMING) {
          // 如果中断时状态还是streaming，说明是错误导致的中断而非暂停
          streamStore.setStreamError(messageId, '请求被中断')
        }
      }

      // 构造一个特殊的错误对象，以便调用者区分是用户中断还是其他错误
      const abortError = new APIError('Request aborted by user')
      abortError.code = 'ABORT_ERROR'
      throw abortError
    }

    if (messageId) {
      // 更新流状态为错误
      streamStore.setStreamError(
        messageId,
        error instanceof Error ? error.message : '未知错误'
      )
    }

    if (error instanceof APIError) {
      throw error
    }

    // 包装其他错误为 APIError
    throw new APIError(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      'UNKNOWN_ERROR'
    )
  }
}

// 恢复之前中断的聊天完成请求
export const resumeChatCompletion = async (
  messages: ChatMessage[],
  messageId: string,
  options?: APIRequestOptions
): Promise<StreamResponse> => {
  const streamStore = useStreamStore()
  const state = streamStore.streams.get(messageId)

  // 验证状态
  if (!state || state.status !== StreamStatus.PAUSED) {
    throw new APIError('Cannot resume: message is not paused', undefined, 'INVALID_STATE')
  }

  // 更新状态为流式处理中
  streamStore.resumeStream(messageId)

  // 调用API
  const response = await createChatCompletion(
    messages,
    {
      signal: state.abortController?.signal,
      messageId
    }
  )

  // 确保返回的是流式响应
  if ('body' in response) {
    return response
  } else {
    throw new APIError('Expected stream response but got normal response', undefined, 'INVALID_RESPONSE')
  }
}
