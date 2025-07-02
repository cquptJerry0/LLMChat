import { ref, onMounted, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'eye-care'

const THEME_KEY = 'preferred-theme'

export const useTheme = () => {
  const currentTheme = ref<Theme>('light')

  // 设置主题
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }

  // 获取系统主题偏好
  const getSystemTheme = (): Theme => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }

  // 监听系统主题变化
  const watchSystemTheme = () => {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
          setTheme(e.matches ? 'dark' : 'light')
        }
      })
    }
  }

  // 初始化主题
  onMounted(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    const theme = savedTheme || getSystemTheme()
    setTheme(theme)
    watchSystemTheme()
  })

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    setTheme(newTheme)
  })

  return {
    currentTheme,
    setTheme
  }
}
