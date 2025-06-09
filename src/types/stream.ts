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
  id: string;            // 消息ID (对应Message.id)
  status: StreamStatus;  // 当前状态
  content: string;       // 当前累积的内容
  reasoning_content?: string; // 当前累积的推理内容
  startTime: number;     // 开始时间戳
  pauseTime?: number;    // 暂停时间戳
  completeTime?: number; // 完成时间戳
  error?: string;        // 错误信息
  completion_tokens?: number; // 已完成的token数
  speed?: number;        // 生成速度 (tokens/second)
  abortController?: AbortController; // 用于中断请求的控制器
}

// 流状态管理器接口
export interface StreamStateManager {
  // 获取指定消息的流状态
  getStreamState: (messageId: string) => StreamState | undefined;

  // 开始新的流
  startStream: (messageId: string) => void;

  // 更新流内容
  updateStream: (
    messageId: string,
    content: string,
    reasoning_content?: string,
    completion_tokens?: number,
    speed?: number
  ) => void;

  // 暂
  pauseStream: (messageId: string) => Promise<void>;

  // 恢复流
  resumeStream: (messageId: string) => Promise<void>;

  // 完成流
  completeStream: (messageId: string) => void;

  // 设置流错误
  setStreamError: (messageId: string, error: string) => void;

  // 清除指定流
  clearStream: (messageId: string) => void;

  // 清除所有流
  clearAllStreams: () => void;
}

// 流状态存储接口
export interface StreamStore {
  streamStates: Map<string, StreamState>;
  streamStateManager: StreamStateManager;
}
