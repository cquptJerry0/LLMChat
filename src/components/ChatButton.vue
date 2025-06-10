
<script setup lang="ts">
import { computed, useSlots } from 'vue'
import ChatIcon from './ChatIcon.vue'
// 获取插槽
const slots = useSlots()
const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (val: string) => {
      return ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(val)
    }
  },
  size: {
    type: String,
    default: 'default',
    validator: (val: string) => {
      return ['large', 'default', 'small'].includes(val)
    }
  },
  icon: {
    type: String,
    default: ''
  },
  iconPosition: {
    type: String,
    default: 'left',
    validator: (val: string) => {
      return ['left', 'right'].includes(val)
    }
  },
  circle: {
    type: Boolean,
    default: false
  },
  text: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// 计算是否只有图标
const iconOnly = computed(() => {
  return !!props.icon && !slots.default
})

// 计算图标大小
const iconSize = computed(() => {
  switch (props.size) {
    case 'large': return 20
    case 'small': return 14
    default: return 16
  }
})

</script>

<template>
  <el-button
    :class="[
      'chat-button',
      `chat-button--${type}`,
      `chat-button--${size}`,
      {
        'chat-button--circle': circle,
        'chat-button--text': text,
        'chat-button--icon-only': iconOnly
      }
    ]"
    v-bind="$attrs"
    :disabled="disabled"
    :loading="loading"
  >
    <ChatIcon
      v-if="icon"
      :name="icon"
      :size="iconSize"
      class="chat-button__icon"
      :class="{ 'chat-button__icon--right': iconPosition === 'right' }"
    />
    <slot></slot>
  </el-button>
</template>

<style lang="scss" scoped>
.chat-button {
  // 基础样式
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;

  // 图标样式
  &__icon {
    margin-right: 6px;

    &--right {
      margin-right: 0;
      margin-left: 6px;
      order: 1;
    }
  }

  // 尺寸变体
  &--large {
    padding: 12px 20px;
    font-size: 16px;
  }

  &--small {
    padding: 6px 12px;
    font-size: 12px;
  }

  // 圆形按钮
  &--circle {
    border-radius: 50%;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &.chat-button--large {
      width: 48px;
      height: 48px;
    }

    &.chat-button--default {
      width: 40px;
      height: 40px;
    }

    &.chat-button--small {
      width: 32px;
      height: 32px;
    }
  }

  // 仅图标按钮
  &--icon-only {
    padding: 8px;

    .chat-button__icon {
      margin: 0;
    }
  }

  // 文本按钮
  &--text {
    padding: 4px 8px;
    background: transparent;
    border: none;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
  }

  // 类型变体样式
  &--primary {
    // 主题色按钮样式
  }

  &--success {
    // 成功按钮样式
  }

  // 其他类型样式...
}
</style>