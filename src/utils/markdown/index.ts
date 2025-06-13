import MarkdownIt from 'markdown-it'
import mdLinkAttributes from 'markdown-it-link-attributes'
import { full as emoji } from 'markdown-it-emoji'
import { configureHighlight, highlightCode } from './highlight'
import { generateCodeBlockHtml, generateInlineCodeHtml } from './template'
import { processMarkdownWithCursor, replaceCursorMarker } from './cursor'
import './styles.scss'

// 配置 highlight.js
configureHighlight()

// 创建 markdown-it 实例
const md: MarkdownIt = new MarkdownIt({
  html: true, // 启用 HTML 标签
  breaks: true, // 转换换行符为 <br>
  linkify: true, // 自动转换 URL 为链接
  highlight: function (str, lang) {
    if (lang && str) {
      try {
        const highlighted = highlightCode(str, lang)
        return generateCodeBlockHtml(highlighted, lang)
      } catch (__) { }
    }
    return generateInlineCodeHtml(md.utils.escapeHtml(str))
  },
})

// 配置链接在新标签页打开
md.use(mdLinkAttributes, {
  attrs: {
    target: '_blank',
    rel: 'noopener',
  },
})

// 启用 emoji 支持
md.use(emoji)

// 导出渲染函数
export const renderMarkdown = (content: string): string => {
  if (!content) return ''
  return md.render(content)
}

// 带光标效果的Markdown渲染
export const renderMarkdownWithCursor = (content: string): string => {
  if (!content) return ''

  // 处理Markdown内容，在适当位置插入光标
  const processed = processMarkdownWithCursor(content, true)

  // 渲染处理后的内容
  const rendered = md.render(processed)

  // 替换特殊光标标记
  return replaceCursorMarker(rendered)
}

// 导出 markdown-it 实例，以便需要时进行更多配置
export { md }
