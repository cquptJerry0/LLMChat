<script setup lang="ts">
const props = defineProps<{
  content: string
}>()
</script>

<template>
  <div class="user-wrapper">
    <div class="user-container">
      <div class="user-content">{{ content }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user-wrapper {
  display: flex;
  justify-content: flex-end;
  max-width: 624px;
}

.user-container {
  min-height: 46px;
  background-color: var(--background-color-base);
  border-radius: 16px;
  display: flex;
  align-items: center;
}

.user-content {
  color: #000000E6;
  padding: $spacing-small $spacing-base;
  font-size: 16px;
  font-family: -apple-system, BlinkMacSystem, sans-serif;
  border-radius: 16px 4px 16px 16px;
  white-space: pre-wrap;  // 保留换行和空格
  word-break: break-word; // 长单词换行
  line-height: 1.5;       // 行高
}

// 适配暗色主题
[data-theme="dark"] {
  .user-content {
    background-color: #303841;
    color: #e0e0e0;
  }
}
</style>
