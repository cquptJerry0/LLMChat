<!-- src/components/common/Icon.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { Icon as IconifyIcon } from '@iconify/vue'

// 定义图标映射
const iconMap: Record<string, string> = {
  // 系统操作
  'new': 'mdi:plus',
  'delete': 'mdi:delete',
  'edit': 'mdi:pencil',
  'setting': 'mdi:cog',

  // 消息操作
  'send': 'mdi:send',
  'copy': 'mdi:content-copy',
  'check': 'mdi:check',
  'regenerate': 'mdi:refresh',

  // 状态图标
  'loading': 'mdi:loading',
  'success': 'mdi:check-circle',
  'error': 'mdi:alert-circle',
  'completed': 'mdi:check',

  // 其他
  'more': 'mdi:dots-vertical',
  'upload': 'mdi:upload',
  'attachment': 'mdi:attachment',
  'image': 'mdi:image',
  'like': 'mdi:thumb-up',
  'dislike': 'mdi:thumb-down',
  'back': 'mdi:arrow-left',
  'theme': 'mdi:theme-light-dark',
  'chat': 'mdi:chat',

  // 聊天框下面的操作图标
  'share': 'mdi:share-variant',
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
    default: 'currentColor'
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
    :style="{ color, fontSize: size + 'px' }"
  >
    <iconify-icon :icon="iconName" />
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
