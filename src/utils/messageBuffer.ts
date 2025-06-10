/**
 * MessageBuffer - 消息缓冲管理器
 *
 * 用于批量处理流式消息，减少DOM更新频率
 * 实现双缓冲队列，定时刷新消息到UI
 */
export class MessageBuffer {
  private buffer: string[] = [];
  private isProcessing = false;
  private readonly FLUSH_INTERVAL = 200; // 200ms批量更新
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushHandler: ((messages: string) => void) | null = null;

  /**
   * 添加消息到缓冲区
   */
  push(message: string) {
    this.buffer.push(message);
    this.scheduleFlush();
  }

  /**
   * 调度刷新缓冲区
   */
  private scheduleFlush() {
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL);
    }
  }

  /**
   * 设置回调处理器
   */
  setHandler(handler: (messages: string) => void) {
    this.flushHandler = handler;
  }

  /**
   * 刷新缓冲区
   */
  private async flush() {
    if (this.isProcessing || this.buffer.length === 0 || !this.flushHandler) return;

    this.isProcessing = true;
    this.flushTimer = null;

    const messages = this.buffer.join('');
    this.buffer = [];

    await this.scheduleRender(() => {
      if (this.flushHandler) this.flushHandler(messages);
    });

    this.isProcessing = false;

    // 如果仍有消息，继续调度刷新
    if (this.buffer.length > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * 使用requestIdleCallback调度渲染
   */
  private scheduleRender(task: () => void) {
    return new Promise<void>(resolve => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(
          () => {
            task();
            resolve();
          },
          { timeout: 500 }  // 设置超时确保必要时强制执行
        );
      } else {
        setTimeout(() => {
          task();
          resolve();
        }, 0);
      }
    });
  }

  /**
   * 立即刷新缓冲区
   */
  flushNow() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    return this.flush();
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.buffer = [];
    this.isProcessing = false;
    this.flushHandler = null;
  }
}
