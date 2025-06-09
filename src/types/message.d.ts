/**
 * 消息类型定义文件
 * 定义了与消息处理相关的所有类型接口
 */
import type { ChatCompletionResponse, ChatMessage as APIChatMessage, ToolCall, StreamHandlerOptions } from './api';

/**
 * 消息角色类型
 * 复用 API 中定义的角色类型: 'user' | 'assistant' | 'system'
 */
export type MessageRole = APIChatMessage['role'];

/**
 * 文件类型
 * 定义了消息中可以包含的文件信息
 */
export interface MessageFile {
  url: string;      // 文件URL
  type: string;     // 文件类型
  name: string;     // 文件名称
  size: number;     // 文件大小
}

/**
 * 消息类型
 * 定义了应用中使用的消息对象结构
 */
export interface Message {
  id: number;                     // 消息唯一ID
  role: MessageRole;              // 消息角色
  content: string;                // 消息内容
  reasoning_content: string;      // 推理内容(思考过程)
  files: MessageFile[];           // 附件文件列表
  tool_calls?: ToolCall[];        // 工具调用列表
  completion_tokens: number;      // 完成的token数量
  speed: number;                  // 生成速度(tokens/s)
  loading: boolean;               // 是否正在加载
  timestamp?: string;             // 时间戳
}

/**
 * Delta 消息类型
 * 用于流式响应中的增量更新
 */
export interface DeltaMessage {
  content?: string;               // 增量内容
  reasoning_content?: string;     // 增量推理内容
  tool_calls?: ToolCall[];        // 增量工具调用
}

/**
 * 更新回调函数类型
 * 用于在接收到新内容时更新UI
 */
export type UpdateCallback = (
  content: string,                // 当前累积的内容
  reasoning_content: string,      // 当前累积的推理内容
  completion_tokens: number,      // 完成的token数量
  speed: string,                  // 生成速度
  tool_calls?: ToolCall[]         // 工具调用列表
) => void;

/**
 * 流式响应类型
 * 扩展标准Response类型
 */
export interface StreamResponse extends Response {
  body: ReadableStream<Uint8Array>;  // 可读流
}

/**
 * 消息处理器接口
 * 定义了处理消息的核心方法
 */
export interface MessageHandler {
  /**
   * 格式化消息
   * 创建一个新的消息对象
   */
  formatMessage: (
    role: MessageRole,            // 消息角色
    content: string,              // 消息内容
    reasoning_content?: string,   // 推理内容
    files?: MessageFile[],        // 文件列表
    tool_calls?: ToolCall[]       // 工具调用列表
  ) => Message;

  /**
   * 处理流式响应
   * 解析SSE流并通过回调更新UI
   */
  handleStreamResponse: (
    response: Response,           // 流式响应对象
    updateCallback: UpdateCallback, // 更新回调函数
    options?: StreamHandlerOptions  // 流处理选项
  ) => Promise<void>;

  /**
   * 处理普通响应
   * 解析完整响应并一次性更新UI
   */
  handleNormalResponse: (
    response: ChatCompletionResponse, // 完整响应对象
    updateCallback: UpdateCallback    // 更新回调函数
  ) => void;

  /**
   * 统一的响应处理函数
   * 根据响应类型选择合适的处理方法
   */
  handleResponse: (
    response: ChatCompletionResponse | Response, // 响应对象
    isStream: boolean,                          // 是否为流式响应
    updateCallback: UpdateCallback,             // 更新回调函数
    options?: StreamHandlerOptions              // 流处理选项
  ) => Promise<void>;
}
