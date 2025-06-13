/**
 * DoubleBuffer - 通用双缓冲区管理器
 *
 * 用于平滑处理流式内容渲染，减少闪烁和性能问题
 * 实现标准的双缓冲区机制，控制内容从接收到渲染的流程
 */
export class DoubleBuffer {
  // 缓冲区状态
  private primaryBuffer: string = ''; // 接收新内容的主缓冲区
  private renderBuffer: string = ''; // 待渲染的缓冲区
  private displayContent: string = ''; // 当前显示的内容

  // 控制状态
  private isUpdating: boolean = false; // 是否正在更新渲染
  private updateTimer: number | null = null; // 更新定时器ID
  private isComplete: boolean = false; // 内容是否完成

  // 配置参数
  private updateInterval: number; // 更新间隔(ms)
  private renderCallback: (content: string) => void; // 渲染回调
  private debugMode: boolean; // 是否启用调试

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options: {
    updateInterval?: number; // 更新间隔，默认200ms
    renderCallback: (content: string) => void; // 必须提供渲染回调
    debugMode?: boolean; // 是否启用调试模式
  }) {
    this.updateInterval = options.updateInterval || 200;
    this.renderCallback = options.renderCallback;
    this.debugMode = options.debugMode || false;

    if (!this.renderCallback) {
      throw new Error('DoubleBuffer: 必须提供渲染回调函数');
    }
  }

  /**
   * 日志输出
   */
  private log(...args: any[]) {
    if (this.debugMode) {
      console.log(...args);
    }
  }

  /**
   * 获取当前显示内容
   */
  public getDisplayContent(): string {
    return this.displayContent;
  }

  /**
   * 判断内容是否完成
   */
  public isContentComplete(): boolean {
    return this.isComplete;
  }

  /**
   * 调度更新 - 使用setTimeout延迟执行transferBuffer
   */
  private scheduleUpdate(): void {
    if (this.updateTimer === null && !this.isUpdating) {
      this.log('调度更新，间隔:', this.updateInterval);
      this.updateTimer = window.setTimeout(() => {
        this.transferBuffer();
      }, this.updateInterval);
    }
  }

  /**
   * 将主缓冲区内容转移到渲染缓冲区
   */
  private transferBuffer(): void {
    this.log('转移缓冲区:', {
      primary: this.primaryBuffer,
      render: this.renderBuffer,
      display: this.displayContent
    });

    this.updateTimer = null;

    // 主缓冲区为空则跳过
    if (this.primaryBuffer === '') {
      this.log('主缓冲区为空，跳过转移');
      return;
    }

    // 转移内容
    this.renderBuffer = this.primaryBuffer;
    this.primaryBuffer = '';

    // 请求动画帧渲染
    this.requestRender();
  }

  /**
   * 请求渲染 - 使用requestAnimationFrame优化渲染时机
   */
  private requestRender(): void {
    if (this.isUpdating) {
      this.log('渲染正在进行中，跳过请求');
      return;
    }

    this.isUpdating = true;

    requestAnimationFrame(() => {
      // 更新显示内容
      this.displayContent = this.renderBuffer;

      // 调用渲染回调
      this.renderCallback(this.displayContent);

      this.log('渲染完成:', {
        display: this.displayContent,
        length: this.displayContent.length
      });

      this.isUpdating = false;

      // 如果主缓冲区还有内容，继续调度更新
      if (this.primaryBuffer !== '') {
        this.log('主缓冲区还有内容，继续调度更新');
        this.scheduleUpdate();
      }
    });
  }

  /**
   * 更新内容 - 外部调用接口
   * @param newContent 新内容
   * @param isStream 是否是流式内容
   */
  public updateContent(newContent: string, isStream: boolean = true): void {
    if (!newContent) return;

    this.log('接收新内容:', {
      newContent,
      length: newContent.length,
      isStream,
      currentDisplay: this.displayContent.length
    });

    // 非流式内容直接处理
    if (!isStream) {
      const requestIdleCallback =
        window.requestIdleCallback ||
        ((cb) => setTimeout(cb, 1));

      requestIdleCallback(() => {
        this.displayContent = newContent;
        this.isComplete = true;
        this.renderCallback(this.displayContent);
        this.log('非流式内容更新完成');
      });
      return;
    }

    // 流式内容处理
    // 检查内容连续性
    const hasExistingContent = this.displayContent && newContent.includes(this.displayContent);

    if (!hasExistingContent) {
      // 内容不连续，重置缓冲区
      this.log('内容不连续，重置缓冲区');
      this.clearBuffers();
      this.displayContent = newContent;
      this.renderCallback(this.displayContent);
    } else {
      // 提取新增内容
      const addedContent = newContent.slice(this.displayContent.length);

      // 检查是否有重复内容
      const hasDuplicate = this.primaryBuffer.includes(addedContent);

      this.log('处理新增内容:', {
        addedContent,
        length: addedContent.length,
        hasDuplicate
      });

      if (addedContent && !hasDuplicate) {
        this.primaryBuffer += addedContent;
        this.scheduleUpdate();
      } else if (hasDuplicate) {
        this.log('检测到重复内容，跳过');
      }
    }

    this.isComplete = false;
  }

  /**
   * 强制刷新缓冲区
   */
  public flushBuffers(): void {
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.transferBuffer();
  }

  /**
   * 清空所有缓冲区
   */
  public clearBuffers(): void {
    this.primaryBuffer = '';
    this.renderBuffer = '';

    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    this.isUpdating = false;
  }

  /**
   * 重置所有状态
   */
  public reset(): void {
    this.clearBuffers();
    this.displayContent = '';
    this.isComplete = false;
  }

  /**
   * 销毁实例，清理资源
   */
  public destroy(): void {
    this.clearBuffers();
    this.displayContent = '';
    this.isComplete = false;
    this.renderCallback = () => { };
  }
}
