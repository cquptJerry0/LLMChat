// src/services/api/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useSettingStore } from '@/stores/setting'
import { handleApiError, ApiError } from './errorHandler'

// 从环境变量获取API基础URL，回退到默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.siliconflow.cn/v1';

interface RequestConfig<D = any> extends AxiosRequestConfig {
  data?: D;
}

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      config => {
        const settingStore = useSettingStore()
        config.headers.Authorization = `Bearer ${settingStore.settings.apiKey}`
        return config
      },
      error => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      response => response,
      error => Promise.reject(handleApiError(error))
    )
  }

  async request<T, D = any>(config: RequestConfig<D>): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request<T>(config)
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  async post<T, D = any>(url: string, data?: D, config?: RequestConfig): Promise<T> {
    return this.request<T, D>({ ...config, method: 'POST', url, data })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
