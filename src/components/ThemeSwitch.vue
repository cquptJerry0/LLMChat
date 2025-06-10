<script setup lang="ts">
import { computed } from 'vue'
import { useTheme, type Theme } from '@/composables/useTheme'

const { currentTheme, setTheme } = useTheme()

const themeLabels: Record<Theme, string> = {
  light: '浅色模式',
  dark: '深色模式',
  'eye-care': '护眼模式'
}

const themeIcons: Record<Theme, string> = {
  light: 'i-mdi-weather-sunny',
  dark: 'i-mdi-weather-night',
  'eye-care': 'i-mdi-eye-outline'
}

const isDark = computed(() => currentTheme.value === 'dark')

const handleThemeChange = (theme: Theme) => {
  setTheme(theme)
}
</script>

<template>
  <el-dropdown @command="handleThemeChange">
    <el-button type="primary" :icon="isDark ? 'i-mdi-weather-night' : 'i-mdi-weather-sunny'">
      {{ themeLabels[currentTheme] }}
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="(label, theme) in themeLabels"
          :key="theme"
          :command="theme"
          :class="{ 'is-active': currentTheme === theme }"
        >
          <div class="theme-item">
            <i :class="themeIcons[theme]"></i>
            <span>{{ label }}</span>
          </div>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>


<style lang="scss" scoped>
.theme-item {
  display: flex;
  align-items: center;
  gap: 8px;

  i {
    font-size: 16px;
  }
}

:deep(.el-dropdown-menu__item.is-active) {
  color: var(--primary-color);
  background-color: var(--background-color-base);
}
</style>
