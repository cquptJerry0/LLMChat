<script setup lang="ts">
import VirtualList from 'vue-virtual-scroll-list'
import MessageBubble from './MessageBubble.vue'
import { computed } from 'vue'
import type { Message } from '@/types/chat'

const props = defineProps<{
  messages: Message[]
  isGenerating: boolean
  estimateSize?: number
}>()

const emit = defineEmits<{
  (e: 'scroll', data: {
    scrollTop: number
    scrollHeight: number
    clientHeight: number
  }): void
}>()

// 虚拟列表配置
const virtualListConfig = {
  keeps: 30,
  estimateSize: props.estimateSize || 60,
  buffer: 10
}

// 处理滚动事件
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  emit('scroll', {
    scrollTop: target.scrollTop,
    scrollHeight: target.scrollHeight,
    clientHeight: target.clientHeight
  })
}
</script>

<template>
  <virtual-list
    class="virtual-scroller"
    :data-key="'id'"
    :data-sources="messages"
    :data-component="MessageBubble"
    :keeps="virtualListConfig.keeps"
    :estimate-size="virtualListConfig.estimateSize"
    @scroll="handleScroll"
  >
    <template #item="{ source, index }">
      <MessageBubble
        v-memo="[source.id, source.content, isGenerating]"
        :message="source"
        :is-latest-message="index === messages.length - 1"
      />
    </template>
  </virtual-list>
</template>

<style lang="scss" scoped>
.virtual-scroller {
  height: 100%;
  overflow-y: auto;
  padding: $spacing-base;

  :deep(.virtual-list-item) {
    margin-bottom: $spacing-base;
  }
}
</style>
