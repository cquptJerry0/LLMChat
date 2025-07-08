// 图片生成API的请求参数类型
export interface ImageGenerationParams {
  // 必填参数
  model: string;          // 模型名称，例如 "Kwai-Kolors/Kolors"
  prompt: string;         // 图片生成的文本提示词
  image_size: string;     // 图片尺寸，例如 "1024x1024", "960x1280" 等
  batch_size: number;     // 输出图片的数量，范围 1-4
  num_inference_steps: number; // 推理步数，范围 1-100
  guidance_scale: number; // 控制生成图像与提示词匹配程度的参数，范围 0-20

  // 可选参数
  lastPrompt?: string;     // 最后使用的提示词
  negative_prompt?: string; // 负面提示词
  seed?: number;           // 随机种子，范围 0-9999999999
  image?: string;          // Base64编码的图片数据
}

// 图片生成API的响应类型
export interface ImageGenerationResponse {
  images: ImageGenerationResult[];
  timings: {
    total_time: number;
    [key: string]: number;
  };
  seed: number;
}

// 单个生成图片的结果类型
export interface ImageGenerationResult {
  url: string;          // 生成图片的URL（有效期1小时）
  base64?: string;      // 可能的Base64编码图片数据
  width: number;        // 图片宽度
  height: number;       // 图片高度
}

// 图片生成API的错误类型
export interface ImageGenerationError extends Error {
  status?: number;
  code?: string;
  response?: Response;
}

// 图片生成API的请求选项类型
export interface ImageGenerationRequestOptions {
  signal?: AbortSignal;    // 用于中断请求的信号
  onProgress?: (progress: number) => void; // 进度回调
}

// 图片生成API的服务接口
export interface ImageGenerationService {
  generateImage: (
    params: ImageGenerationParams,
    options?: ImageGenerationRequestOptions
  ) => Promise<ImageGenerationResponse>;
}

// 图片尺寸类型
export type ImageSize = "1024x1024" | "960x1280" | "768x1024" | "720x1440" | "720x1280";

// 图片模型类型
export type ImageModel = "Kwai-Kolors/Kolors";
