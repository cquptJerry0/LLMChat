import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStreamStore } from '@/stores/stream'
import { useNormalizedChatStore } from '@/stores/normalizedChat'
import { chatService } from '@/services/chat/chatService'
import { calculateSpeed } from '@/utils/speed'
import type { ChatMessage, UpdateCallback } from '@/types/api'

// 存储键前缀
const STORAGE_KEY_PREFIX = 'stream_state_'

export interface StreamControl {
  // 状态
  isPaused: boolean;
  isStreaming: boolean;
  isError: boolean;
  errorMessage: string | undefined;
  progress: {
    content: string;
    reasoning_content: string;
    completion_tokens: number;
    speed: number;
  };

  // 控制方法
  pause: () => void;
  resume: (updateCallback: UpdateCallback) => Promise<void>;
  cancel: () => void;

  // 流状态持久化
  saveStreamState: () => void;
  restoreStreamState: () => boolean;
  clearStreamState: () => void;
}

export function useStreamControl(messageId: string) {
  const streamStore = useStreamStore()
  const chatStore = useNormalizedChatStore()
  const streamId = `stream_${messageId}`

  // 本地状态，用于持久化
  const progress = ref({
    content: '',
    reasoning_content: '',
    completion_tokens: 0,
    speed: 0
  })

  // 计算属性：流的当前状态
  const streamState = computed(() => streamStore.streams.get(streamId))
  const isPaused = computed(() => streamState.value?.status === 'paused')
  const isStreaming = computed(() => streamState.value?.status === 'streaming')
  const isError = computed(() => streamState.value?.status === 'error')
  const errorMessage = computed(() => streamState.value?.error)

  // 存储流状态到localStorage
  const saveStreamState = () => {
    try {
      const message = chatStore.messages.get(messageId)
      if (!message) return

      const stateToSave = {
        content: message.content,
        reasoning_content: message.reasoning_content || '',
        completion_tokens: message.completion_tokens || 0,
        speed: message.speed || 0,
        status: streamState.value?.status || 'completed',
        timestamp: Date.now()
      }

      localStorage.setItem(`${STORAGE_KEY_PREFIX}${messageId}`, JSON.stringify(stateToSave))

      // 更新本地进度状态
      progress.value = {
        content: stateToSave.content,
        reasoning_content: stateToSave.reasoning_content,
        completion_tokens: stateToSave.completion_tokens,
        speed: stateToSave.speed
      }
    } catch (error) {
      console.error('Failed to save stream state:', error)
    }
  }

  // 从localStorage恢复流状态
  const restoreStreamState = (): boolean => {
    try {
      const savedState = localStorage.getItem(`${STORAGE_KEY_PREFIX}${messageId}`)
      if (!savedState) return false

      const parsedState = JSON.parse(savedState)

      // 更新消息内容
      chatStore.updateMessage(messageId, {
        content: parsedState.content,
        reasoning_content: parsedState.reasoning_content,
        completion_tokens: parsedState.completion_tokens,
        speed: parsedState.speed
      })

      // 更新本地进度状态
      progress.value = {
        content: parsedState.content,
        reasoning_content: parsedState.reasoning_content,
        completion_tokens: parsedState.completion_tokens,
        speed: parsedState.speed
      }

      // 如果流还在进行中或暂停状态，恢复流状态
      if (parsedState.status === 'streaming' || parsedState.status === 'paused') {
        // 创建新的流状态（如果不存在）
        if (!streamState.value) {
          streamStore.startStream(messageId)

          // 如果是暂停状态，设置为暂停
          if (parsedState.status === 'paused') {
            streamStore.pauseStream(messageId)
          }
        }
      }

      return true
    } catch (error) {
      console.error('Failed to restore stream state:', error)
      return false
    }
  }

  // 清除流状态
  const clearStreamState = () => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${messageId}`)
  }

  // 暂停生成
  const pause = () => {
    if (isStreaming.value) {
      streamStore.pauseStream(messageId)
      saveStreamState() // 保存当前状态
    }
  }

  // 恢复生成
  const resume = async (updateCallback: UpdateCallback) => {
    if (isPaused.value) {
      try {
        // 获取消息历史
        const message = chatStore.messages.get(messageId)
        if (!message || !message.parentId) return

        // 构建消息历史
        const messageHistory = buildMessageHistory(message.parentId)

        // 恢复流
        await chatService.resumeChatCompletion(
          messageHistory,
          messageId,
          updateCallback
        )
      } catch (error) {
        console.error('Failed to resume stream:', error)
      }
    }
  }

  // 取消生成
  const cancel = () => {
    chatService.cancelRequest(messageId)
    // 可以选择是否清除状态
    // clearStreamState()
  }

  // 构建消息历史（私有方法）
  const buildMessageHistory = (latestMessageId: string): ChatMessage[] => {
    const history: ChatMessage[] = []
    let currentId: string | null = latestMessageId

    while (currentId) {
      const message = chatStore.messages.get(currentId)
      if (!message) break

      history.unshift({
        role: message.role as "user" | "assistant" | "system",
        content: message.content,
        reasoning_content: message.reasoning_content
      })

      currentId = message.parentId
    }

    return history
  }

  // 自动保存状态（当流在进行中）
  const autoSaveInterval = ref<number | null>(null)

  // 设置自动保存
  const setupAutoSave = () => {
    // 清除之前的定时器
    if (autoSaveInterval.value) {
      clearInterval(autoSaveInterval.value)
    }

    // 创建新的定时器，每秒保存一次状态
    autoSaveInterval.value = window.setInterval(() => {
      if (isStreaming.value) {
        saveStreamState()
      } else {
        // 如果流已经完成或出错，清除定时器
        if (autoSaveInterval.value && !isPaused.value) {
          clearInterval(autoSaveInterval.value)
          autoSaveInterval.value = null

          // 流完成时保存最终状态
          if (!isError.value) {
            saveStreamState()
          }
        }
      }
    }, 1000)
  }

  // 组件挂载时尝试恢复状态并设置自动保存
  onMounted(() => {
    restoreStreamState()
    setupAutoSave()
  })

  // 组件卸载时清除定时器
  onUnmounted(() => {
    if (autoSaveInterval.value) {
      clearInterval(autoSaveInterval.value)
    }
  })

  return {
    // 状态
    isPaused,
    isStreaming,
    isError,
    errorMessage,
    progress: progress.value,

    // 控制方法
    pause,
    resume,
    cancel,

    // 流状态持久化
    saveStreamState,
    restoreStreamState,
    clearStreamState
  }
}
