/**
 * 流状态管理相关类型定义
 */

// 流状态枚举
export enum StreamStatus {
  IDLE = 'idle',         // 初始状态
  STREAMING = 'streaming', // 正在生成
  PAUSED = 'paused',     // 已暂停
  COMPLETED = 'completed', // 已完成
  ERROR = 'error'        // 出错
}

// 单个消息流的状态接口
export interface StreamState {
  id: string;            // 流ID (格式为 stream_${messageId})
  messageId: string;     // 消息ID
  status: StreamStatus;  // 当前状态
  startTime: number;     // 开始时间戳
  pauseTime?: number;    // 暂停时间戳
  completeTime?: number; // 完成时间戳
  error?: string;        // 错误信息
  abortController?: AbortController; // 用于中断请求的控制器
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
  resumeStream: (messageId: string) => AbortSignal | null;

  // 完成流
  completeStream: (messageId: string) => boolean;

  // 设置流错误
  setStreamError: (messageId: string, error: string) => boolean;
}

// 流状态存储接口
export interface StreamStore {
  streams: Map<string, StreamState>;
  startStream: (messageId: string) => string;
  updateStream: (messageId: string, content: string, reasoning_content?: string, completion_tokens?: number, speed?: number) => void;
  pauseStream: (messageId: string) => boolean;
  resumeStream: (messageId: string) => AbortSignal | null;
  completeStream: (messageId: string) => boolean;
  setStreamError: (messageId: string, error: string) => boolean;
}
