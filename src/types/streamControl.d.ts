/**
 * 流状态的可能值
 */
type StreamStatus = 'streaming' | 'paused' | 'completed' | 'error'

/**
 * 流数据的完整状态定义
 */
interface StreamState {
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
  chatStore?: typeof useNormalizedChatStore;
  /** 自定义流存储 */
  streamStore?: typeof useStreamStore;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number;
  /** 是否在组件卸载时清除状态 */
  clearOnUnmount?: boolean;
}

/**
 * 提供给子组件的控制接口
 */
interface StreamControlContext {
  /** 当前流状态 */
  state: ComputedRef<StreamState>;
  /** 控制方法 */
  controls: {
    /** 暂停生成 */
    pause: () => AbortController | null;
    /** 恢复生成 */
    resume: (updateCallback: UpdateCallback) => Promise<void>;
    /** 取消生成 */
    cancel: () => boolean;
  };
}

/**
 * 返回值类型定义
 */
interface StreamControlReturn {
  /** 完整状态 */
  state: ComputedRef<StreamState>;
  /** 是否暂停中 */
  isPaused: ComputedRef<boolean>;
  /** 是否生成中 */
  isStreaming: ComputedRef<boolean>;
  /** 是否出错 */
  isError: ComputedRef<boolean>;
  /** 错误信息 */
  errorMessage: ComputedRef<string | undefined>;
  /** 是否未完成（流或暂停状态） */
  isIncomplete: ComputedRef<boolean>;

  /** 暂停生成，返回中断控制器 */
  pause: () => AbortController | null;
  /** 恢复生成 */
  resume: (updateCallback: UpdateCallback) => Promise<void>;
  /** 取消生成，返回是否成功取消 */
  cancel: () => boolean;
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
