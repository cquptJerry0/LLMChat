export interface Position {
  line: number
  column: number
}

// 光标HTML标记
const CURSOR_MARKERS = {
  TEXT: '<span class="typewriter-cursor"></span>',
  CODE: '/* CURSOR_POSITION */'
}

/**
 * 处理Markdown内容，在适当位置插入光标
 */
export function processMarkdown(text: string, isStreaming: boolean, isComplete: boolean): string {
  if (!text) return ''

  // 分割文本为行
  const lines = text.split('\n')
  let inCodeBlock = false
  let languageSpecified = false

  // 处理每一行
  const processedLines = lines.map((line, index) => {
    // 检查是否是代码块开始或结束
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // 代码块开始，检查是否指定了语言
        inCodeBlock = true
        languageSpecified = line.length > 3 && !!line.slice(3).trim()
        return line
      } else {
        // 代码块结束
        inCodeBlock = false
        return line
      }
    }

    // 如果是最后一行且需要显示光标
    if (index === lines.length - 1 && isStreaming && !isComplete) {
      if (inCodeBlock) {
        // 在代码块内
        if (languageSpecified) {
          // 语言指定的代码块中添加特殊注释标记，以便后续替换
          return line + ' /* CURSOR_POSITION */'
        } else {
          // 没有语言的代码块，直接添加光标HTML
          return line + CURSOR_MARKERS.TEXT
        }
      } else {
        // 不在代码块内，添加HTML光标
        return line + CURSOR_MARKERS.TEXT
      }
    }

    return line
  })

  return processedLines.join('\n')
}

/**
 * 替换渲染后HTML中的光标标记
 */
export function replaceCursorMarkers(html: string): string {
  return html.replace(
    /\/\* CURSOR_POSITION \*\//g,
    '<span class="code-cursor"></span>'
  )
}

/**
 * 获取光标位置
 */
export function getCursorPosition(text: string): Position {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const textCursorIndex = line.indexOf(CURSOR_MARKERS.TEXT)
    const codeCursorIndex = line.indexOf(CURSOR_MARKERS.CODE)

    if (textCursorIndex !== -1) {
      return { line: i, column: textCursorIndex }
    }
    if (codeCursorIndex !== -1) {
      return { line: i, column: codeCursorIndex }
    }
  }

  return { line: 0, column: 0 }
}
