<script setup lang="ts">
import { Bubble } from 'vue-element-plus-x'
import MarkdownRender from './MarkdownRender.vue'

defineProps<{
  content: string
}>()
</script>

<template>
  <Bubble
    :content="content"
    placement="end"
    variant="filled"
    :no-avatar="true"
    class="user-bubble"
  >
    <template #content>
      <div class="user-content">
        <MarkdownRender :content="content" />
      </div>
    </template>
  </Bubble>
</template>

<style lang="scss" scoped>
.user-bubble {
  max-width: 80%;

  :deep(.el-bubble) {
    background-color: #f2f3f5;
    border-radius: 16px 4px 16px 16px;
  }
}

.user-content {
  padding: $spacing-base;
  color: #303133;

  :deep(.markdown-body) {
    background-color: transparent;
  }
}

// 适配暗色主题
[data-theme="dark"] {
  .user-bubble {
    :deep(.el-bubble) {
      background-color: #303841;
    }
  }

  .user-content {
    color: #e0e0e0;
  }
}
</style>
