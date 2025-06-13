// 光标HTML定义
export const CURSOR_TYPES = {
  TEXT: '<span class="typewriter-cursor"></span>',
  CODE: '<span class="code-cursor"></span>',
  CODE_MARKER: '/* CURSOR_POSITION */'
} as const;

/**
 * 检测字符串中的Markdown代码块
 * @param text Markdown文本内容
 * @returns 包含代码块信息的数组
 */
export function detectCodeBlocks(text: string): Array<{ content: string; isCode: boolean; start: number; end: number }> {
  const segments: Array<{ content: string; isCode: boolean; start: number; end: number }> = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // 添加代码块前的普通文本
    if (match.index > lastIndex) {
      segments.push({
        content: text.slice(lastIndex, match.index),
        isCode: false,
        start: lastIndex,
        end: match.index - 1
      });
    }

    // 添加代码块
    segments.push({
      content: match[0],
      isCode: true,
      start: match.index,
      end: match.index + match[0].length - 1
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加最后一段普通文本
  if (lastIndex < text.length) {
    segments.push({
      content: text.slice(lastIndex),
      isCode: false,
      start: lastIndex,
      end: text.length - 1
    });
  }

  return segments;
}

/**
 * 在Markdown内容中处理光标位置
 * @param text Markdown文本内容
 * @param shouldShowCursor 是否显示光标
 */
export function processMarkdownWithCursor(text: string, shouldShowCursor: boolean): string {
  if (!text || !shouldShowCursor) return text;

  // 获取文本中的代码块信息
  const segments = detectCodeBlocks(text);

  // 找到最后一个段落
  const lastSegment = segments[segments.length - 1];

  // 如果没有段落，直接返回原文本
  if (!lastSegment) return text;

  // 根据最后一个段落类型添加光标
  if (lastSegment.isCode) {
    // 检查是否有语言标记 (```language)
    const firstLineEnd = lastSegment.content.indexOf('\n');
    const firstLine = firstLineEnd > 0 ? lastSegment.content.substring(0, firstLineEnd) : '';
    const hasLanguage = firstLine.length > 3 && !!firstLine.slice(3).trim();

    if (hasLanguage) {
      // 在代码块内容中添加光标标记
      const lastContentChar = lastSegment.content.lastIndexOf('```');
      return text.substring(0, lastContentChar) + ' ' + CURSOR_TYPES.CODE_MARKER + text.substring(lastContentChar);
    } else {
      // 在代码块末尾添加光标
      return text + CURSOR_TYPES.CODE;
    }
  } else {
    // 在普通文本末尾添加光标
    return text + CURSOR_TYPES.TEXT;
  }
}

/**
 * 在渲染后的HTML中替换光标标记
 * @param html 渲染后的HTML内容
 */
export function replaceCursorMarker(html: string): string {
  return html.replace(
    new RegExp(CURSOR_TYPES.CODE_MARKER, 'g'),
    CURSOR_TYPES.CODE
  );
}
