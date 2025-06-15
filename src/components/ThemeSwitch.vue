<script setup lang="ts">
import { computed } from 'vue'
import { useTheme, type Theme } from '@/composables/useTheme'
import ChatButton from './ChatButton.vue'
import ChatIcon from './ChatIcon.vue'

const { currentTheme, setTheme } = useTheme()

const themeLabels: Record<Theme, string> = {
  light: '浅色模式',
  dark: '深色模式',
  'eye-care': '护眼模式'
}

const currentIcon = computed(() => themeIcons[currentTheme.value])

const themeIcons: Record<Theme, string> = {
  light: 'light',
  dark: 'dark',
  'eye-care': 'eye-care'
}

const handleThemeChange = (theme: Theme) => {
  setTheme(theme)
}
</script>

<template>
  <el-dropdown @command="handleThemeChange">
    <ChatButton
      type="primary"
      :icon="currentIcon"
      eb:round="true"
      et:placement="bottom"
    >
      {{ themeLabels[currentTheme] }}
    </ChatButton>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="(label, theme) in themeLabels"
          :key="theme"
          :command="theme"
          :class="{ 'is-active': currentTheme === theme }"
        >
          <div class="theme-item">
            <ChatIcon :name="themeIcons[theme]" />
            <span>{{ label }}</span>
          </div>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
