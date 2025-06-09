/**
 * 计算生成速度的工具函数
 *
 * @param completionTokens 已完成的token数
 * @param startTime 开始时间（毫秒时间戳）
 * @param endTime 结束时间（毫秒时间戳），默认为当前时间
 * @returns 生成速度（tokens/second）
 */
export function calculateSpeed(
  completionTokens: number,
  startTime: number,
  endTime: number = Date.now()
): number {
  const durationInSeconds = Math.max(0.1, (endTime - startTime) / 1000);
  return Number((completionTokens / durationInSeconds).toFixed(2));
}

/**
 * 将速度转换为字符串表示
 *
 * @param speed 速度值，可以是数字或字符串
 * @param defaultValue 默认值，当speed无效时返回
 * @returns 格式化后的速度字符串
 */
export function formatSpeed(speed: number | string | undefined, defaultValue: string = '0'): string {
  if (typeof speed === 'number') {
    return speed.toString();
  }
  return speed || defaultValue;
}
