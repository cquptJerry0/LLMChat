import { icons } from '@/constants/icons'

// 生成代码块的HTML模板
export const generateCodeBlockHtml = (code: string, lang: string): string => {
  return `
    <div class="code-block">
      <div class="code-header">
        <span class="code-lang">${lang}</span>
        <div class="chat-message__code-actions">
          <button class="chat-message__copy-button" data-action="copy" data-tooltip="复制">
            <img src="${icons.copy}" alt="copy" />
          </button>
          <button class="chat-message__copy-button" data-action="theme" data-tooltip="切换主题">
            <img src="${icons.dark}" alt="theme" data-theme-light="${icons.light}" data-theme-dark="${icons.dark}" />
          </button>
        </div>
      </div>
      <pre class="hljs"><code>${code}</code></pre>
    </div>
  `.trim()
}

// 生成普通代码的HTML模板
export const generateInlineCodeHtml = (code: string): string => {
  return `<code>${code}</code>`
}
