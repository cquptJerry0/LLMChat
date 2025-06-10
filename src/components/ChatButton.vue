<script setup lang="ts">
import { computed, useSlots, useAttrs } from 'vue'
import ChatIcon from './ChatIcon.vue'
const slots = useSlots()
const attrs = useAttrs()
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
  },
  tooltip: {
    type: String,
    default: ''
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
    case 'small': return 8
    default: return 16
  }
})

const tooltipAttrs = computed(() => {
  const tooltipProps = ['content', 'placement', 'effect', 'raw-content', 'disabled', 'offset', 'visible', 'hide-after', 'show-after', 'auto-close', 'manual', 'popper-options', 'enterable', 'show-arrow', 'append-to', 'popper-class', 'teleported', 'transition', 'trigger', 'virtual-triggering', 'virtual-ref', 'persistent']
  const result: Record<string, any> = {}

  for (const key in attrs) {
    if (tooltipProps.includes(key)) {
      result[key] = attrs[key]
    }
  }
  return result
})

const buttonAttrs = computed(() => {
  const tooltipProps = ['content', 'placement', 'effect', 'raw-content', 'disabled', 'offset', 'visible', 'hide-after', 'show-after', 'auto-close', 'manual', 'popper-options', 'enterable', 'show-arrow', 'append-to', 'popper-class', 'teleported', 'transition', 'trigger', 'virtual-triggering', 'virtual-ref', 'persistent']
  const result: Record<string, any> = {}

  for (const key in attrs) {
    if (!tooltipProps.includes(key)) {
      result[key] = attrs[key]
    }
  }
  return result
})

</script>

<template>
  <el-tooltip v-if="tooltip || tooltipAttrs.content" v-bind="tooltipAttrs" :content="tooltip || tooltipAttrs.content">
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
      v-bind="buttonAttrs"
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
  </el-tooltip>
  <el-button
    v-else
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
  color: #606266;
  background-color: #f2f3f5;
  border-color: transparent;

  &:hover {
    background-color: #e6e8eb;
    color: #303133;
  }

  &:active {
    background-color: #dcdfe6;
  }

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
    background-color: #409eff;
    color: #ffffff;

    &:hover {
      background-color: #66b1ff;
      color: #ffffff;
    }

    &:active {
      background-color: #3a8ee6;
    }
  }

  &--success {
    background-color: #67c23a;
    color: #ffffff;

    &:hover {
      background-color: #85ce61;
      color: #ffffff;
    }

    &:active {
      background-color: #5daf34;
    }
  }

  &--warning {
    background-color: #e6a23c;
    color: #ffffff;

    &:hover {
      background-color: #ebb563;
      color: #ffffff;
    }

    &:active {
      background-color: #cf9236;
    }
  }

  &--danger {
    background-color: #f56c6c;
    color: #ffffff;

    &:hover {
      background-color: #f78989;
      color: #ffffff;
    }

    &:active {
      background-color: #dd6161;
    }
  }

  &--info {
    background-color: #909399;
    color: #ffffff;

    &:hover {
      background-color: #a6a9ad;
      color: #ffffff;
    }

    &:active {
      background-color: #82848a;
    }
  }
}
</style>
