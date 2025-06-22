<!-- src/components/common/Icon.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'
import { watchEffect } from 'vue'
// 定义图标映射
const iconMap: Record<string, string> = {
  // 系统操作
  'new': 'mdi:plus-circle-outline',
  'delete': 'mdi:delete-outline',
  'edit': 'mdi:pencil-outline',
  'setting': 'mdi:cog-outline',
  'menu-fold': 'mdi:arrow-left-bold-outline',

  // 消息操作
  'send': 'mdi:arrow-up',
  'copy': 'mdi:content-copy',
  'check': 'mdi:check',
  'regenerate': 'mdi:refresh',
  'clock': 'mdi:clock-outline',
  'scroll-down': 'mdi:arrow-down',
  'pause': 'mdi:pause-circle',
  'play': 'mdi:play-circle',

  // 状态图标
  'loading': 'mdi:loading',
  'success': 'mdi:check-circle-outline',
  'error': 'mdi:alert-circle-outline',
  'completed': 'mdi:check-outline',
  'stop': 'mdi:stop-circle-outline',
  'cancel': 'mdi:cancel',
  'close': 'mdi:close-outline',

  // 其他
  'more': 'mdi:dots-horizontal',
  'upload': 'mdi:upload-outline',
  'attachment': 'mdi:attachment',
  'image': 'mdi:image-outline',
  'like': 'mdi:thumb-up-outline',
  'dislike': 'mdi:thumb-down-outline',
  'back': 'mdi:arrow-left-bold-outline',
  'theme': 'mdi:theme-light-dark',
  'chat': 'mdi:chat-outline',

  // 聊天框下面的操作图标
  'share': 'mdi:share-variant-outline',
  'retry': 'mdi:refresh',

  // 主题图标
  'light': 'mdi:weather-sunny',
  'dark': 'mdi:weather-night',
  'eye-care': 'mdi:eye-outline',
}

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  },
  color: {
    type: String,
    default: 'var(--icon-color)'
  },
  spin: {
    type: Boolean,
    default: false
  }
})

// 计算最终的图标名称
const iconName = computed(() => {
  return iconMap[props.name] || props.name
})

</script>
<template>
  <span
    class="icon"
    :class="[`icon--${name}`, { 'icon--spin': spin }]"
    :style="{ fontSize: size + 'px' }"
  >
    <iconify-icon :icon="iconName" :color="color" />
  </span>
</template>

<style lang="scss" scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &--spin {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
