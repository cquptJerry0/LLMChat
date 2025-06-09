// API 基础配置类型
export interface APIConfig {
  baseURL: string;
  headers: Record<string, string>;
}

// 工具调用类型
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// 聊天消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_content?: string;
  tool_calls?: ToolCall[];
}

// 响应格式类型
export interface ResponseFormat {
  type: string;
  [key: string]: any;
}

// 工具函数类型
export interface FunctionTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

// 聊天请求参数类型
export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  enable_thinking?: boolean;
  thinking_budget?: number;
  min_p?: number;
  stop?: string | null;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  n?: number;
  response_format?: ResponseFormat;
  tools?: FunctionTool[];
}

// 聊天响应选项类型
export interface ChatCompletionChoice {
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
}

// 使用量统计类型
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// 聊天响应类型
export interface ChatCompletionResponse {
  id: string;
  choices: ChatCompletionChoice[];
  usage: Usage;
  created: number;
  model: string;
  object: 'chat.completion';
}

// 流式响应类型
export interface StreamResponse extends Response {
  body: ReadableStream<Uint8Array>;
}

// API 错误类型
export interface APIError extends Error {
  status?: number;
  code?: string;
  response?: Response;
}

// API 请求选项类型
export interface APIRequestOptions {
  signal?: AbortSignal;    // 用于中断请求的信号
  messageId?: string;      // 关联的消息ID，用于状态管理
  resumeInfo?: ResumeInfo; // 恢复信息
}

// 流式响应处理选项
export interface StreamHandlerOptions {
  signal?: AbortSignal;   // 用于中断处理的信号
  messageId: string;      // 关联的消息ID
  initialContent?: string; // 初始内容（用于恢复）
  initialReasoningContent?: string; // 初始推理内容（用于恢复）
  resumeInfo?: ResumeInfo; // 恢复信息
}

// API 响应处理器类型
export interface ResponseHandler {
  handleStreamResponse: (
    response: StreamResponse,
    updateCallback: UpdateCallback,
    options?: StreamHandlerOptions
  ) => Promise<void>;

  handleNormalResponse: (
    response: ChatCompletionResponse,
    updateCallback: UpdateCallback
  ) => void;
}

// 更新回调函数类型
export type UpdateCallback = (
  content: string,
  reasoning_content: string,
  completion_tokens: number,
  speed: string,
  tool_calls?: ToolCall[]
) => void;

// API 函数类型
export interface APIFunctions {
  createChatCompletion: (
    messages: ChatMessage[],
    options?: APIRequestOptions
  ) => Promise<ChatCompletionResponse | StreamResponse>;

  // 恢复之前中断的流式请求
  resumeChatCompletion: (
    messages: ChatMessage[],
    messageId: string,
    options?: APIRequestOptions
  ) => Promise<StreamResponse>;
}

// 客户端扩展的聊天响应类型（添加了速度字段）
export interface ExtendedChatCompletionResponse extends ChatCompletionResponse {
  // 扩展字段：生成速度，客户端计算得出，单位为tokens/second
  speed: number;
}
