/**
 * 流控制架构 2.0
 * 提供更强大的流状态管理、缓冲区管理和检查点功能
 */

// 类型定义
export * from './types/checkpointStorage'
export * from './types/newStreamControl'
export * from './types/newStreamStore'
export * from './types/newConversationControl'

// 服务和存储
export { checkpointStorage } from './services/storage/checkpointStorage'
export { useNewStreamStore } from './stores/NewStreamStore'

// Composables
export { useNewStreamControl, useNewStreamControlChild } from './composables/useNewStreamControl'
export { useNewConversationControl, useNewConversationControlChild } from './composables/useNewConversationControl'

// 示例组件
export { default as ChatDemo } from './components/ChatDemo.vue'
