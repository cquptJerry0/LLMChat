import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { DEFAULT_IMAGE_GENERATION_PARAMS, IMAGE_MODELS, IMAGE_SIZES, PARAM_LIMITS } from '@/constants/imageGeneration'
import type { ImageGenerationParams } from '@/types/imageGeneration'

const API_KEY = import.meta.env.VITE_API_KEY || 'sk-miswxuakfhtsgcrobgggnjnigvbueatzsobuqsigqxanippa';
const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || 'deepseek-ai/DeepSeek-R1';

export const useSettingStore = defineStore(
  'llm-setting',
  () => {
    const settings = reactive({
      // 聊天设置
      model: DEFAULT_MODEL,
      apiKey: API_KEY,
      stream: true,
      maxTokens: 4096,
      temperature: 0.7,
      topP: 0.7,
      topK: 50,

      // 图片生成设置
      imageGeneration: {
        // 基本设置
        model: DEFAULT_IMAGE_GENERATION_PARAMS.model,
        image_size: DEFAULT_IMAGE_GENERATION_PARAMS.image_size,
        batch_size: DEFAULT_IMAGE_GENERATION_PARAMS.batch_size,

        // 高级设置
        num_inference_steps: DEFAULT_IMAGE_GENERATION_PARAMS.num_inference_steps,
        guidance_scale: DEFAULT_IMAGE_GENERATION_PARAMS.guidance_scale,
        negative_prompt: '',
        seed: undefined as number | undefined,
        useSeed: false, // 是否使用固定随机种子

        // 历史记录
        lastPrompt: '一只可爱的小猫',

        // 界面设置
        showAdvancedSettings: false,
        autoSaveToGallery: true, // 是否自动保存到图库
      }
    })

    // 更新图片生成设置
    const updateImageSettings = (newSettings: Partial<ImageGenerationParams & {
      useSeed?: boolean;
      showAdvancedSettings?: boolean;
      autoSaveToGallery?: boolean;
    }>) => {
      Object.assign(settings.imageGeneration, newSettings)
    }

    // 重置图片生成设置为默认值
    const resetImageSettings = () => {
      settings.imageGeneration = {
        ...DEFAULT_IMAGE_GENERATION_PARAMS,
        negative_prompt: '',
        seed: undefined,
        useSeed: false,
        lastPrompt: settings.imageGeneration.lastPrompt, // 保留上次的提示词
        showAdvancedSettings: false,
        autoSaveToGallery: true
      }
    }

    // 生成随机种子
    const generateRandomSeed = () => {
      return Math.floor(Math.random() * (PARAM_LIMITS.seed.max - PARAM_LIMITS.seed.min + 1)) + PARAM_LIMITS.seed.min
    }

    return {
      settings,
      updateImageSettings,
      resetImageSettings,
      generateRandomSeed
    }
  },
  {
    persist: true,
  },
)

export const modelOptions = [
  {
    label: 'DeepSeek-R1',
    value: 'deepseek-ai/DeepSeek-R1',
    maxTokens: 16384,
  },
  {
    label: 'DeepSeek-V3',
    value: 'deepseek-ai/DeepSeek-V3',
    maxTokens: 4096,
  },
  {
    label: 'DeepSeek-V2.5',
    value: 'deepseek-ai/DeepSeek-V2.5',
    maxTokens: 4096,
  },
  {
    label: 'Qwen2.5-72B-Instruct-128K',
    value: 'Qwen/Qwen2.5-72B-Instruct-128K',
    maxTokens: 4096,
  },
  {
    label: 'QwQ-32B-Preview',
    value: 'Qwen/QwQ-32B-Preview',
    maxTokens: 8192,
  },
  {
    label: 'glm-4-9b-chat',
    value: 'THUDM/glm-4-9b-chat',
    maxTokens: 4096,
  },
  {
    label: 'glm-4-9b-chat(Pro)',
    value: 'Pro/THUDM/glm-4-9b-chat',
    maxTokens: 4096,
  },
]

// 图片生成模型选项
export const imageModelOptions = [
  {
    label: 'Kolors',
    value: IMAGE_MODELS.KOLORS,
  },
  // 可以添加更多模型选项
]

// 图片尺寸选项
export const imageSizeOptions = [
  {
    label: '正方形 (1024x1024)',
    value: IMAGE_SIZES.SQUARE,
  },
  {
    label: '竖版 (768x1024)',
    value: IMAGE_SIZES.PORTRAIT,
  },
  {
    label: '竖版小 (512x768)',
    value: IMAGE_SIZES.PORTRAIT_SMALL,
  },
  {
    label: '竖版中 (640x960)',
    value: IMAGE_SIZES.PORTRAIT_MEDIUM,
  },
  {
    label: '手机尺寸 (540x960)',
    value: IMAGE_SIZES.PORTRAIT_MOBILE,
  },
]

// 批量生成数量选项
export const batchSizeOptions = [
  { label: '1张', value: 1 },
  { label: '2张', value: 2 },
  { label: '3张', value: 3 },
  { label: '4张', value: 4 }
]

// 推理步数选项
export const stepsOptions = [
  { label: '快速 (10步)', value: 10 },
  { label: '标准 (20步)', value: 20 },
  { label: '精细 (30步)', value: 30 },
  { label: '超精细 (50步)', value: 50 }
]

// 引导系数选项
export const guidanceScaleOptions = [
  { label: '低 (5.0)', value: 5.0 },
  { label: '中 (7.5)', value: 7.5 },
  { label: '高 (10.0)', value: 10.0 },
  { label: '极高 (15.0)', value: 15.0 }
]
