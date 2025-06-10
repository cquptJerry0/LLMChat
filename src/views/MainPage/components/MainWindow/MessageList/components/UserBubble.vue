<script setup lang="ts">
import { md } from '@/utils/markdown'
import { computed } from 'vue'

const props = defineProps<{
  content: string
}>()

// 渲染 Markdown
const renderedContent = computed(() => {
  if (!props.content) return ''
  return md.render(props.content)
})
</script>

<template>
  <div class="user-wrapper">
    <div class="user-container">
      <div class="user-content">
        <div class="markdown-content" v-html="renderedContent"></div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user-wrapper {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin: 4px 0;
}

.user-container {
  max-width: 780px;
  min-height: 46px;
  background-color: var(--background-color-base);
  border-radius: 16px;
  display: flex;
  align-items: center;
}

.user-content {
  color: #000000E6;
  padding: 0 11px;
  font-size: 16px;
  line-height: 0.8;
  font-family: -apple-system, BlinkMacSystem, sans-serif;
  border-radius: 16px 4px 16px 16px;

  :deep(.markdown-body) {
    background-color: transparent;
    font-size: 16px;
    line-height: 0.8;
  }
}

// 适配暗色主题
[data-theme="dark"] {
  .user-content {
    background-color: #303841;
    color: #e0e0e0;
  }
}
</style>
