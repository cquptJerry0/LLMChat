<script setup lang="ts">
import { ref } from 'vue'
import { useTheme, type Theme } from '@/composables/useTheme'
import ChatIcon from '@/components/ChatIcon.vue'

const { currentTheme, setTheme } = useTheme()

// 控制下拉菜单显示
const visible = ref(false)

// 主题选项
const themeOptions: Array<{
  value: Theme
  label: string
  description: string
}> = [
  {
    value: 'light',
    label: '浅色模式',
    description: '默认浅色主题，适合日间使用'
  },
  {
    value: 'dark',
    label: '深色模式',
    description: '深色主题，减少屏幕亮度，适合夜间使用'
  },
  {
    value: 'eye-care',
    label: '护眼模式',
    description: '柔和的绿色系主题，减少眼睛疲劳'
  }
]

// 切换主题
const handleThemeChange = (theme: Theme) => {
  setTheme(theme)
  visible.value = false
}

// 打开主题面板
const open = () => {
  visible.value = true
}

// 导出方法供父组件调用
defineExpose({
  open,
})
</script>

<template>
  <el-popover
    v-model:visible="visible"
    placement="bottom-end"
    :width="300"
    trigger="click"
  >
    <template #reference>
      <div style="display: none;"></div>
    </template>

    <div class="theme-panel">
      <h3 class="theme-panel__title">选择主题</h3>

      <div class="theme-panel__options">
        <div
          v-for="option in themeOptions"
          :key="option.value"
          class="theme-panel__option"
          :class="{ 'theme-panel__option--active': currentTheme === option.value }"
          @click="handleThemeChange(option.value)"
        >
          <div class="theme-panel__option-icon">
            <ChatIcon :name="option.value" />
          </div>
          <div class="theme-panel__option-content">
            <div class="theme-panel__option-title">{{ option.label }}</div>
            <div class="theme-panel__option-desc">{{ option.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<style lang="scss" scoped>
.theme-panel {
  padding: $spacing-base;

  &__title {
    margin-top: 0;
    margin-bottom: $spacing-base;
    font-size: $font-size-large;
    font-weight: 500;
    color: var(--text-primary);
  }

  &__options {
    display: flex;
    flex-direction: column;
    gap: $spacing-small;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: $spacing-base;
    padding: $spacing-base;
    border-radius: $border-radius-base;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--border-color-light);
    }

    &--active {
      background-color: var(--primary-color);
      color: white;

      .theme-panel__option-desc {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  &__option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: $border-radius-circle;
    background-color: var(--border-color-light);

    .theme-panel__option--active & {
      background-color: rgba(255, 255, 255, 0.2);
    }
  }

  &__option-content {
    flex: 1;
  }

  &__option-title {
    font-weight: 500;
    margin-bottom: 4px;
  }

  &__option-desc {
    font-size: $font-size-small;
    color: var(--text-secondary);
  }
}
</style>
