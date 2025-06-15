/**
 * 流状态管理相关类型定义
 */

// 流状态枚举
export enum StreamStatus {
  STREAMING = 'streaming',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// 持久化的流状态
export interface PersistedStreamState {
  content: string;
  reasoning_content: string;
  completion_tokens: number;
  speed: number;
  status: string;
  error?: string;
  timestamp: number;
  savedAt: number;
  pausedAt?: number;
}

// 恢复信息接口
export interface ResumeInfo {
  lastContent: string;         // 上次累积的内容
  lastReasoning: string;      // 上次累积的推理内容
  lastTokens: number;         // 上次的完成令牌数
  pausedAt: number;          // 暂停时的时间戳
}

// 单个消息流的状态接口
export interface StreamState {
  id: string;                 // 流ID (格式为 stream_${messageId})
  messageId: string;          // 消息ID
  status: StreamStatus;       // 当前状态
  startTime: number;          // 开始时间戳
  pauseTime?: number;         // 暂停时间戳
  completeTime?: number;      // 完成时间戳
  error?: string;             // 错误信息
  abortController?: AbortController; // 用于中断请求的控制器

  // 新增字段：用于状态恢复
  accumulatedContent: string;    // 累积的内容
  accumulatedReasoning: string;  // 累积的推理内容
  lastCompletionTokens: number;  // 上次的完成令牌数
  pausedAt: number;             // 暂停时的位置

  // 暂停相关字段
  isPaused: boolean;           // 是否处于暂停状态
  contentBuffer: string;       // 暂停时的内容缓冲区
  reasoningBuffer: string;     // 暂停时的推理内容缓冲区
}

// 恢复结果接口
export interface ResumeResult {
  signal: AbortSignal;
  resumeInfo: ResumeInfo;
}

// 流状态管理器接口
export interface StreamStateManager {
  // 获取指定消息的流状态
  getStreamState: (messageId: string) => StreamState | undefined;

  // 开始新的流
  startStream: (messageId: string) => string;

  // 更新流内容
  updateStream: (
    messageId: string,
    content: string,
    reasoning_content?: string,
    completion_tokens?: number,
    speed?: number
  ) => void;

  // 暂停流
  pauseStream: (messageId: string) => boolean;

  // 恢复流
  resumeStream: (messageId: string) => ResumeResult | null;

  // 完成流
  completeStream: (messageId: string) => boolean;

  // 设置流错误
  setStreamError: (messageId: string, error: string) => boolean;
}

// 流状态存储接口
export interface StreamStore extends StreamStateManager {
  streams: Map<string, StreamState>;
}
