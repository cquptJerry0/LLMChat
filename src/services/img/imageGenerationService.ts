import { apiClient } from '../base/apiClient';
import { handleError } from '../base/errorHandler';
import { DEFAULT_IMAGE_GENERATION_PARAMS } from '@/constants/imageGeneration';
import type {
    ImageGenerationParams,
    ImageGenerationResponse,
    ImageGenerationRequestOptions,
    ImageGenerationError
} from '@/types/imageGeneration';

/**
 * 图片生成服务
 * 提供图片生成API的调用方法
 */
class ImageGenerationServiceImpl {
    /**
     * 生成图片
     * @param params - 图片生成参数
     * @param options - 请求选项
     * @returns 生成的图片结果
     */
    async generateImage(
        params: ImageGenerationParams,
        options?: ImageGenerationRequestOptions
    ): Promise<ImageGenerationResponse> {
        try {
            // 设置默认值
            const requestParams: ImageGenerationParams = {
                model: params.model || DEFAULT_IMAGE_GENERATION_PARAMS.model,
                prompt: params.prompt,
                image_size: params.image_size || DEFAULT_IMAGE_GENERATION_PARAMS.image_size,
                batch_size: params.batch_size || DEFAULT_IMAGE_GENERATION_PARAMS.batch_size,
                num_inference_steps: params.num_inference_steps || DEFAULT_IMAGE_GENERATION_PARAMS.num_inference_steps,
                guidance_scale: params.guidance_scale || DEFAULT_IMAGE_GENERATION_PARAMS.guidance_scale,
                negative_prompt: params.negative_prompt,
                seed: params.seed,
                image: params.image
            };

            // 发送请求
            const response = await apiClient.post<ImageGenerationResponse>(
                '/images/generations',
                requestParams,
                {
                    signal: options?.signal
                }
            );

            return response;
        } catch (error) {
            throw handleError(error as Error) as ImageGenerationError;
        }
    }

    /**
     * 下载并保存生成的图片
     * @param url - 图片URL
     * @param filename - 保存的文件名
     */
    async downloadImage(url: string, filename?: string): Promise<Blob> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`下载图片失败: ${response.statusText}`);
            }

            const blob = await response.blob();

            // 如果提供了文件名，尝试保存文件
            if (filename) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            }

            return blob;
        } catch (error) {
            throw handleError(error as Error) as ImageGenerationError;
        }
    }
}

// 导出图片生成服务实例
export const imageGenerationService = new ImageGenerationServiceImpl();
