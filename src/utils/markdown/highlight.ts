import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 代码高亮处理函数
export const highlightCode = (str: string, lang: string): string => {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
    } catch (__) { }
  }
  return hljs.highlightAuto(str).value
}

// 导出 highlight.js 实例，以便需要时进行更多配置
export { hljs }
