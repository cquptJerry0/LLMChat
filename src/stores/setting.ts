import { defineStore } from 'pinia'
import { reactive } from 'vue'

const API_KEY = import.meta.env.VITE_API_KEY || 'sk-miswxuakfhtsgcrobgggnjnigvbueatzsobuqsigqxanippa';
const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL || 'deepseek-ai/DeepSeek-R1';

export const useSettingStore = defineStore(
  'llm-setting',
  () => {
    const settings = reactive({
      model: DEFAULT_MODEL,
      apiKey: API_KEY,
      stream: true,
      maxTokens: 4096,
      temperature: 0.7,
      topP: 0.7,
      topK: 50,
    })

    return {
      settings,
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
