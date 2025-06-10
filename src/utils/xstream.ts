/**
 * XStream - 高效处理流式数据的工具库
 *
 * 主要用于处理服务器发送事件(SSE)和其他流式数据格式
 * 支持二进制数据流到结构化对象的转换、流的中断和异步迭代
 */

/**
 * SSE字段类型定义
 * 符合SSE规范的四种标准字段
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format
 */
export type SSEFields = 'data' | 'event' | 'id' | 'retry'

/**
 * SSE输出对象类型
 * 例如: { event: "delta", data: '{"content":"hello"}' }
 */
export type SSEOutput = Partial<Record<SSEFields, any>>

/**
 * XStream选项接口
 * 定义流处理的各种配置项
 */
export interface XStreamOptions<Output = SSEOutput> {
  /**
   * 二进制数据可读流
   * 通常来自fetch API的response.body
   * @example const response = await fetch(url); options.readableStream = response.body;
   */
  readableStream: ReadableStream<Uint8Array>

  /**
   * 自定义转换流，用于处理特定格式数据
   * 若不提供，则使用默认的SSE解析流程
   * @default 使用SSE解析流(createSplitStream + createPartParser)
   */
  transformStream?: TransformStream<string, Output>

  /**
   * 自定义流分隔符 - 用于分割不同事件
   * 在SSE中，双换行符用于分隔不同事件
   * @default '\n\n'
   */
  streamSeparator?: string

  /**
   * 自定义部分分隔符 - 用于分割事件内的不同行
   * 在SSE中，单个换行符用于分隔事件内的字段
   * @default '\n'
   */
  partSeparator?: string

  /**
   * 自定义键值分隔符 - 用于分割字段名和值
   * 在SSE中，冒号用于分隔字段名和字段值
   * @default ':'
   */
  kvSeparator?: string

  /**
   * 错误处理选项
   * 当流处理过程中发生错误时的回调函数
   * @default console.error
   */
  errorHandler?: (error: Error) => void
}

/**
 * 扩展的ReadableStream，支持异步迭代和中断控制
 * 在标准ReadableStream基础上添加了更多功能
 */
export interface XReadableStream<T = SSEOutput>
  extends ReadableStream<T> {
  /**
   * 异步迭代器方法，支持for await...of语法
   * @example for await (const event of stream) { ... }
   */
  [Symbol.asyncIterator](): AsyncGenerator<T>

  /**
   * 流读取器引用，用于内部管理
   */
  reader?: ReadableStreamDefaultReader<T>

  /**
   * 取消流的处理方法
   * @returns Promise<void>
   */
  cancel(): Promise<void>
}

/**
 * 创建流分割转换器
 * 负责将连续的文本流按指定分隔符分割成独立的块
 *
 * 在整个转换链中的位置:
 * [二进制流] → [文本流] → [分割后的文本块] → [结构化对象]
 *                          ↑这里↑
 *
 * @param separator 块分隔符，默认为双换行符
 * @returns 用于分割流的TransformStream
 */
function createSplitStream(separator: string = '\n\n') {
  // 用于存储未完成的数据块
  let buffer = ''

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      // 将新接收的chunk追加到缓冲区
      buffer += chunk

      // 按分隔符分割缓冲区内容
      const parts = buffer.split(separator)

      // 处理所有完整部分(除最后一个可能不完整的部分)
      parts.slice(0, -1).forEach((part) => {
        // 过滤空块
        if ((part ?? '').trim() !== '') {
          // 将完整块发送到下一个转换阶段
          controller.enqueue(part)
        }
      })

      // 保留最后一部分作为缓冲(可能是不完整的)
      buffer = parts[parts.length - 1]
    },
    flush(controller) {
      // 当流结束时，处理剩余的缓冲数据
      if ((buffer ?? '').trim() !== '') {
        controller.enqueue(buffer)
      }
    },
  })
}

/**
 * 创建SSE部分解析器
 * 负责将文本块解析为结构化的SSE事件对象
 *
 * 在整个转换链中的位置:
 * [二进制流] → [文本流] → [分割后的文本块] → [结构化对象]
 *                                          ↑这里↑
 *
 * @param partSeparator 行分隔符，默认为单换行符
 * @param kvSeparator 键值分隔符，默认为冒号
 * @returns 用于解析SSE的TransformStream
 */
function createPartParser(
  partSeparator: string = '\n',
  kvSeparator: string = ':'
) {
  return new TransformStream<string, SSEOutput>({
    transform(chunk, controller) {
      try {
        // 分割事件文本为多行
        // 例如: "event: delta\ndata: {\"content\":\"hello\"}"
        // 分割为: ["event: delta", "data: {\"content\":\"hello\"}"]
        const lines = chunk.split(partSeparator)

        // 解析每行为键值对，组合成对象
        const result = lines.reduce<SSEOutput>((acc, line) => {
          // 查找键值分隔符位置
          const sepIndex = line.indexOf(kvSeparator)
          if (sepIndex === -1) return acc // 跳过无效行

          // 提取键(字段名)
          const key = line.slice(0, sepIndex).trim()
          if (!key) return acc // 跳过空键

          // 提取值(字段内容)
          const value = line.slice(sepIndex + 1).trim()

          // 构建事件对象
          // 例如: { event: "delta", data: "{\"content\":\"hello\"}" }
          return { ...acc, [key]: value }
        }, {})

        // 只有当结果对象有内容时才发送
        if (Object.keys(result).length > 0) {
          controller.enqueue(result)
        }
      } catch (error) {
        // 错误处理
        console.error('解析SSE部分时出错:', error)
      }
    },
  })
}

/**
 * XStream - 通用流处理函数
 * 将二进制流数据转换为结构化对象的完整流程
 *
 * 数据转换完整流程:
 * 1. [二进制流(Uint8Array)] - 从网络请求中获取的原始数据
 * 2. → TextDecoder → [UTF-8文本流(string)]
 * 3. → createSplitStream → [分割后的文本块(string)]
 * 4. → createPartParser → [结构化对象(SSEOutput)]
 *
 * @param options 流处理选项
 * @param signal 可选的中断信号，用于取消流处理
 * @returns 处理后的可读流，支持异步迭代
 */
export function XStream<Output = SSEOutput>(
  options: XStreamOptions<Output>,
  signal?: AbortSignal
): XReadableStream<Output> {
  // 解构配置选项，设置默认值
  const {
    readableStream,
    transformStream,
    streamSeparator = '\n\n',
    partSeparator = '\n',
    kvSeparator = ':',
    errorHandler = console.error,
  } = options

  // 参数验证
  if (!(readableStream instanceof ReadableStream)) {
    throw new TypeError(
      'options.readableStream 必须是 ReadableStream 的实例'
    )
  }

  // 第1步: 创建文本解码器流 - 将二进制数据(Uint8Array)转换为文本(string)
  const decoderStream = new TextDecoderStream()

  // 创建处理管道
  let processedStream: ReadableStream<any>

  if (transformStream) {
    // 使用自定义转换流 - 适用于非SSE格式的数据处理
    // 流程: [二进制编码流] → [文本流] → [自定义转换] → [输出对象]
    processedStream = readableStream
      .pipeThrough(decoderStream) // Uint8Array → string
      .pipeThrough(transformStream) // string → Output
  } else {
    // 使用默认的SSE解析流 - 分两步处理数据
    // 流程: [二进制流] → [文本流] → [分割文本块] → [SSE对象]
    processedStream = readableStream
      .pipeThrough(decoderStream) // 第1步: Uint8Array → string
      .pipeThrough(createSplitStream(streamSeparator)) // 第2步: 连续文本 → 分割块
      .pipeThrough(createPartParser(partSeparator, kvSeparator)) // 第3步: 文本块 → SSE对象
  }

  // 扩展ReadableStream，添加异步迭代器支持
  const xstream = processedStream as XReadableStream<Output>
  let streamReader: ReadableStreamDefaultReader<Output> | null =
    null

  // 实现异步迭代器 - 使流支持for await...of语法
  xstream[Symbol.asyncIterator] = async function* () {
    try {
      // 获取流读取器
      streamReader = this.getReader()
      xstream.reader = streamReader

      while (true) {
        // 检查中断信号 - 支持外部取消操作
        if (signal?.aborted) {
          break
        }

        // 读取下一个数据块
        const { done, value } = await streamReader.read()

        // 流结束时退出循环
        if (done) break

        // 产出非空值
        if (value) yield value
      }
    } catch (error) {
      // 错误处理和传递
      if (error instanceof Error) {
        errorHandler(error)
      }
      throw error // 重新抛出错误，允许调用者捕获
    } finally {
      // 无论如何都释放锁，防止资源泄漏
      streamReader?.releaseLock()
    }
  }

  // 添加取消方法 - 允许手动取消流处理
  // 添加取消方法 - 允许手动取消流处理
  xstream.cancel = async function () {
    if (streamReader) {
      try {
        // 通知流取消并释放资源
        await streamReader.cancel('Stream explicitly cancelled');
      } catch (error) {
        // 忽略已释放读取器的错误
        if (error instanceof TypeError &&
          error.message.includes('reader has been released')) {
          // 读取器已经被释放，忽略错误
        } else {
          // 其他错误则传递给错误处理器
          errorHandler(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        try {
          streamReader.releaseLock();
        } catch (e) {
          // 忽略释放锁时的错误
        }
      }
    }
  };

  // 处理中断信号 - 支持AbortController中断
  if (signal) {
    signal.addEventListener('abort', () => {
      // 当收到中断信号时取消流
      xstream.cancel().catch(errorHandler)
    })
  }

  // 返回增强后的流
  return xstream
}
