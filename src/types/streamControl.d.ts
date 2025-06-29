import { ComputedRef } from 'vue'
import type { UpdateCallback } from './api'
import { StreamStatus } from './stream'

/**
 * 流状态的可能值
 */
// type StreamStatus = 'streaming' | 'paused' | 'completed' | 'error'

/**
 * 流数据的完整状态定义
 */
export interface StreamState {
  /** 当前消息ID */
  messageId?: string;
  /** 消息的文本内容 */
  content: string;
  /** 推理过程的文本内容 */
  reasoning_content: string;
  /** 已完成的令牌数量 */
  completion_tokens: number;
  /** 生成速度（令牌/秒） */
  speed: number;
  /** 当前流的状态 */
  status: StreamStatus;
  /** 错误信息（如果有） */
  error?: string;
  /** 时间戳，用于恢复时计算经过的时间 */
  timestamp: number;
  /** 流是否暂停中 */
  isPaused: boolean;
  /** 流是否生成中 */
  isStreaming: boolean;
  /** 流是否出错 */
  isError: boolean;
  /** 流是否未完成（处于流或暂停状态） */
  isIncomplete: boolean;
  /** 流是否已完成 */
  isCompleted: boolean;
  /** 流是否已完全接收 */
  isContentComplete: boolean;
  /** 暂停时的时间戳 */
  pausedAt?: number;
  /** 累积的内容 */
  accumulatedContent?: string;
  /** 累积的推理内容 */
  accumulatedReasoning?: string;
  /** 上次的完成令牌数 */
  lastCompletionTokens?: number;
}

/**
 * 持久化到localStorage的状态结构
 */
interface PersistedStreamState extends StreamState {
  /** 保存时的时间戳 */
  savedAt: number;
}

/**
 * 流控制器配置选项
 */
interface StreamControlOptions {
  /** 自定义聊天存储 */
  chatStore?: any; // 使用any避免循环引用
  /** 自定义流存储 */
  streamStore?: any; // 使用any避免循环引用
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number;
  /** 是否在组件卸载时清除状态 */
  clearOnUnmount?: boolean;
}

/**
 * 返回值类型定义
 */
export interface StreamControlReturn {
  state: ComputedRef<StreamState>
  pause: () => void
  resume: (updateCallback?: UpdateCallback) => Promise<void>
  cancel: () => void
  updateMessageId: (messageId: string) => void
  setMessageId: (id: string) => void
  startStream: () => string | null
  updateStream: (content: string, reasoning_content?: string, completion_tokens?: number, speed?: number) => void
  abortStream: () => boolean | null
  completeStream: () => boolean | false
  setStreamError: (error: string) => boolean | false
  getStreamState: () => StreamState | null
}

/**
 * 自动保存管理器接口
 */
interface AutoSaveManager {
  /** 定时器ID */
  intervalId: number | null;
  /** 开始自动保存 */
  start: () => void;
  /** 停止自动保存 */
  stop: () => void;
}

/**
 * 存储管理器接口
 */
// 自定义存储管理器接口
interface StreamStorageManager {
  key: string;
  save(): void;
  restore(): boolean;
  clear(): void;
}

/**
 * 生命周期管理器接口
 */
interface LifecycleManager {
  /** 设置和初始化 */
  setup: () => void;
  /** 清理和资源释放 */
  cleanup: () => void;
}
