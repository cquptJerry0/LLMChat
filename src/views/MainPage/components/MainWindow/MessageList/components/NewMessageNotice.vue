<script setup lang="ts">
const props = defineProps<{
  count: number
  position?: 'top' | 'bottom'
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <Transition name="fade">
    <div
      class="new-message-notice"
      :class="position || 'bottom'"
      @click="emit('click')"
    >
      <div class="notice-content">
        <span class="notice-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 16l-6-6h12z"/>
          </svg>
        </span>
        <span class="notice-text">
          {{ count }} 条新消息
        </span>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.new-message-notice {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--text-placeholder);
  color: white;
  padding: $spacing-mini $spacing-base;
  border-radius: $border-radius-base;
  cursor: pointer;
  box-shadow: $box-shadow-base;
  z-index: 10;
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--text-secondary);
    transform: translateX(-50%) translateY(-2px);
  }

  &.bottom {
    bottom: $spacing-base;
  }

  &.top {
    top: $spacing-base;
  }

  .notice-content {
    display: flex;
    align-items: center;
    gap: $spacing-mini;

    .notice-icon {
      display: flex;
      align-items: center;
    }

    .notice-text {
      font-size: 14px;
      font-weight: 500;
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
