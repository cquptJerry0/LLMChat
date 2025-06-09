<script setup lang="ts">
import { ref } from 'vue'
import { Fold } from '@element-plus/icons-vue'
import Conversations from './Conversations.vue'

defineOptions({
  name: 'ChatSidebar'
})

// 定义 props
const props = withDefaults(defineProps<{
  displayMode: 'overlay' | 'below-header'
}>(), {
  displayMode: 'overlay'
})

const emit = defineEmits(['close'])

// 关闭侧边栏
const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="sidebar" :class="[`sidebar--${displayMode}`]">
    <!-- 会话列表 -->
    <div class="sidebar__content">
      <Conversations />
    </div>

    <!-- 底部收起按钮 -->
    <div class="sidebar__footer">
      <el-button
        class="sidebar__collapse-btn"
        :icon="Fold"
        circle
        @click="handleClose"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar {
  height: 100vh;
  border-right: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
  animation: slideIn 0.3s ease;

  /* 覆盖模式 - 固定在左侧 */
  &--overlay {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 20;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  }

  /* 在header下方模式 */
  &--below-header {
    position: fixed;
    top: 60px; /* header的高度 */
    left: 0;
    height: calc(100vh - 60px);
    z-index: 5;
  }

  /* 内容区域 */
  &__content {
    flex: 1;
    overflow: hidden;
    width: 100%;
    height: calc(100vh - 64px);
  }

  /* 底部区域 */
  &__footer {
    padding: 16px;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--el-border-color-light);
  }
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
}
</style>
