import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import './styles.scss'
import { processMarkdown, replaceCursorMarkers } from './cursor'

// 创建markdown-it实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) { }
    }
    return '' // 使用默认的转义
  }
})

// 渲染带光标的Markdown
export function renderWithCursor(content: string, isStreaming = false, isComplete = false) {
  if (!content) return ''

  // 如果不是流式响应或已完成，直接渲染
  if (!isStreaming || isComplete) {
    return md.render(content)
  }

  // 处理Markdown内容并渲染
  const processed = processMarkdown(content, isStreaming, isComplete)
  const rendered = md.render(processed)

  // 替换特殊标记为光标
  return replaceCursorMarkers(rendered)
}

export { md }
