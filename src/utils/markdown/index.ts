import MarkdownIt from 'markdown-it'
import './styles.scss'
import { generateCodeBlockHtml, generateInlineCodeHtml } from './template'
import { highlightCode, hljs } from './highlight'
import { sanitizeHtml, sanitizeElement } from './domPurify'

// 创建markdown-it实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = highlightCode(str, lang)
        // 使用自定义模板渲染代码块
        return generateCodeBlockHtml(highlighted, lang)
      } catch (__) { }
    }
    return generateCodeBlockHtml(str, 'text')
  }
})

md.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  const code = token.content
  return generateInlineCodeHtml(code)
}

export { md, sanitizeHtml, sanitizeElement }
