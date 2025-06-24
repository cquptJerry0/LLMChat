import DOMPurify from 'dompurify'

/**
 * 配置DOMPurify允许的标签和属性，确保Markdown渲染结果安全
 * 特别允许代码块相关的元素和属性，以支持代码高亮和交互功能
 */
const configureDOMPurify = () => {
  // 添加代码块相关按钮所需的属性
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    // 允许data-*属性通过
    if (data.attrName.startsWith('data-')) {
      data.allowedAttributes = data.allowedAttributes || {}
      data.allowedAttributes[data.attrName] = true
    }
  })

  // 配置允许的标签和属性
  const config = {
    ALLOWED_TAGS: [
      // 基础HTML元素
      'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'div', 'em',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
      'li', 'ol', 'p', 'pre', 'span', 'strong', 'table',
      'tbody', 'td', 'th', 'thead', 'tr', 'ul',
      // 代码块特殊元素
      'button', 'pre', 'code'
    ],
    ALLOWED_ATTR: [
      // 基础属性
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'target', 'rel', 'tabindex', 'role', 'aria-label',
      // 代码块特殊属性
      'data-action', 'data-tooltip', 'data-theme-light', 'data-theme-dark',
      'data-lang', 'data-copied'
    ],
    ALLOW_DATA_ATTR: true, // 允许data-*属性
    ADD_ATTR: ['target'], // 允许链接在新窗口打开
    FORBID_TAGS: ['script', 'iframe', 'canvas', 'input'], // 明确禁止的标签
    FORBID_ATTR: ['onerror', 'onload', 'onclick'] // 明确禁止的属性
  }

  return config
}

/**
 * 净化HTML内容，防止XSS攻击
 * @param html 要净化的HTML字符串
 * @returns 安全的HTML字符串
 */
export const sanitizeHtml = (html: string): string => {
  const config = configureDOMPurify()
  return DOMPurify.sanitize(html, config)
}
