/**
 * 图片尺寸常量
 */
export const IMAGE_SIZES = {
  SQUARE: "1024x1024",
  PORTRAIT: "960x1280",
  PORTRAIT_SMALL: "768x1024",
  PORTRAIT_MOBILE: "720x1440",
  PORTRAIT_MEDIUM: "720x1280"
} as const;

/**
 * 图片模型常量
 */
export const IMAGE_MODELS = {
  KOLORS: "Kwai-Kolors/Kolors"
} as const;

/**
 * 默认参数
 */
export const DEFAULT_IMAGE_GENERATION_PARAMS = {
  model: IMAGE_MODELS.KOLORS,
  image_size: IMAGE_SIZES.SQUARE,
  batch_size: 4,
  num_inference_steps: 20,
  guidance_scale: 7.5
} as const;

/**
 * 参数范围限制
 */
export const PARAM_LIMITS = {
  batch_size: {
    min: 1,
    max: 4
  },
  num_inference_steps: {
    min: 1,
    max: 100
  },
  guidance_scale: {
    min: 0,
    max: 20
  },
  seed: {
    min: 0,
    max: 9999999999
  }
} as const;
