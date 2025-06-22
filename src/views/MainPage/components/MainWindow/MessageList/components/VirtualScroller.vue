<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'
import { ref, computed, nextTick } from 'vue'
import type { Message } from '@/types/chat'
import MessageBubble from './MessageBubble.vue'

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

const containerRef = ref<HTMLElement | null>(null)

// 创建响应式的数据源
const dataSource = computed(() => props.messages)

// 使用 useVirtualList 创建虚拟列表
const { list, containerProps, wrapperProps } = useVirtualList(
  dataSource,
  {
    itemHeight: () => props.estimateSize || 100,
    overscan: 5
  }
)

const handleScroll = (e: Event) => {
  const el = e.target as HTMLElement
  emit('scroll', {
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight
  })
}

// 计算总高度
const totalHeight = computed(() => props.messages.length * (props.estimateSize || 60))

// 计算每个项目的位置
const getItemPosition = (index: number) => index * (props.estimateSize || 60)

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  })
}

// 暴露给父组件
defineExpose({
  scrollToBottom
})
</script>

<template>
  <div
    v-bind="containerProps"
    class="virtual-scroller"
    @scroll="handleScroll"
    ref="containerRef"
  >
    <div v-bind="wrapperProps">
      <div
        v-for="item in list"
        :key="item.data.id"
        class="message-item"
      >
        <MessageBubble
          v-memo="[item.data.id, item.data.content, isGenerating]"
          :message="item.data"
          :is-latest-message="item.index === messages.length - 1"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.virtual-scroller {
  height: 100%;
  overflow-y: auto;
  position: relative;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: var(--scrollbar-thumb-color, rgba(0, 0, 0, 0.2));
    border-radius: 3px;

    &:hover {
      background-color: var(--scrollbar-thumb-hover-color, rgba(0, 0, 0, 0.3));
    }
  }

  &::-webkit-scrollbar-track {
    background-color: var(--scrollbar-track-color, transparent);
  }
}

.message-item {
  padding: 0 16px;
  margin-bottom: 16px;
}
</style>
