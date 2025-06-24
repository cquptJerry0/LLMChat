/**
 * 代码块交互功能模块
 * 处理代码复制与主题切换等交互
 */

import { icons } from '@/constants/icons'

// 存储已处理的代码块
const processedCodeBlocks = new Set<HTMLElement>()

/**
 * 复制代码到剪贴板
 * @param codeElement 代码元素
 * @param copyButton 复制按钮
 */
const copyCode = (codeElement: HTMLElement, copyButton: HTMLElement): void => {
  // 获取代码内容
  const code = codeElement.textContent || ''

  // 使用新的Clipboard API
  navigator.clipboard.writeText(code).then(
    () => {
      // 显示复制成功状态
      copyButton.setAttribute('data-copied', 'true')
      copyButton.setAttribute('data-tooltip', '已复制')

      // 3秒后恢复原状
      setTimeout(() => {
        copyButton.removeAttribute('data-copied')
        copyButton.setAttribute('data-tooltip', '复制')
      }, 3000)
    },
    () => {
      // 复制失败时回退到传统方法
      fallbackCopy(code, copyButton)
    }
  )
}

/**
 * 复制功能的降级处理
 * 兼容不支持Clipboard API的浏览器
 */
const fallbackCopy = (text: string, button: HTMLElement): void => {
  // 创建临时文本区域
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  // 选中并复制
  textarea.select()
  try {
    document.execCommand('copy')
    button.setAttribute('data-copied', 'true')
    button.setAttribute('data-tooltip', '已复制')

    // 3秒后恢复
    setTimeout(() => {
      button.removeAttribute('data-copied')
      button.setAttribute('data-tooltip', '复制')
    }, 3000)
  } catch (err) {
    console.error('无法复制代码:', err)
    button.setAttribute('data-tooltip', '复制失败')

    // 3秒后恢复
    setTimeout(() => {
      button.setAttribute('data-tooltip', '复制')
    }, 3000)
  } finally {
    document.body.removeChild(textarea)
  }
}

/**
 * 切换代码块主题
 * @param codeBlock 代码块元素
 * @param themeButton 主题切换按钮
 */
const toggleCodeTheme = (codeBlock: HTMLElement, themeButton: HTMLElement): void => {
  // 检查当前主题
  const isDark = codeBlock.classList.contains('dark-theme')

  // 切换主题类名
  if (isDark) {
    codeBlock.classList.remove('dark-theme')
    codeBlock.classList.add('light-theme')
    themeButton.querySelector('img')?.setAttribute('src', icons.dark)
  } else {
    codeBlock.classList.remove('light-theme')
    codeBlock.classList.add('dark-theme')
    themeButton.querySelector('img')?.setAttribute('src', icons.light)
  }

  // 保存用户主题偏好
  localStorage.setItem('code-theme-preference', isDark ? 'light' : 'dark')
}

/**
 * 初始化单个代码块的交互功能
 * @param codeBlock 要初始化的代码块元素
 */
export const initializeCodeBlock = (codeBlock: HTMLElement): void => {
  // 防止重复初始化
  if (processedCodeBlocks.has(codeBlock)) return
  processedCodeBlocks.add(codeBlock)

  // 获取预处理和代码元素
  const preElement = codeBlock.querySelector('pre.hljs')
  if (!preElement) return

  const codeElement = preElement.querySelector('code')
  if (!codeElement) return

  // 获取按钮元素
  const copyButton = codeBlock.querySelector('[data-action="copy"]') as HTMLElement
  const themeButton = codeBlock.querySelector('[data-action="theme"]') as HTMLElement

  if (copyButton) {
    copyButton.addEventListener('click', () => {
      copyCode(codeElement as HTMLElement, copyButton)
    })
  }

  if (themeButton) {
    // 应用保存的主题偏好
    const savedTheme = localStorage.getItem('code-theme-preference') || 'light'
    if (savedTheme === 'dark') {
      codeBlock.classList.add('dark-theme')
      themeButton.querySelector('img')?.setAttribute('src', icons.light)
    } else {
      codeBlock.classList.add('light-theme')
    }

    // 添加主题切换事件
    themeButton.addEventListener('click', () => {
      toggleCodeTheme(codeBlock, themeButton)
    })
  }
}

/**
 * 批量初始化代码块
 * @param container 包含代码块的容器元素
 */
export const initializeAllCodeBlocks = (container: HTMLElement): void => {
  // 查找所有未初始化的代码块
  const codeBlocks = container.querySelectorAll('.code-block')
  codeBlocks.forEach(block => {
    initializeCodeBlock(block as HTMLElement)
  })
}

/**
 * 创建代码块监控器，自动初始化新添加的代码块
 * @param container 要监控的容器元素
 */
export const createCodeBlockObserver = (container: HTMLElement): MutationObserver => {
  // 配置观察器
  const config = { childList: true, subtree: true }

  // 创建观察器实例
  const observer = new MutationObserver((mutations) => {
    let shouldInitialize = false

    // 检查DOM变化是否包含新的代码块
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const element = node as HTMLElement
            if (element.querySelector('.code-block')) {
              shouldInitialize = true
            }
          }
        })
      }
    })

    // 如果有新代码块，初始化它们
    if (shouldInitialize) {
      requestAnimationFrame(() => {
        initializeAllCodeBlocks(container)
      })
    }
  })

  // 开始观察
  observer.observe(container, config)

  return observer
}

export default {
  initializeCodeBlock,
  initializeAllCodeBlocks,
  createCodeBlockObserver
}
