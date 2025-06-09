// src/services/api/apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { useSettingStore } from '@/stores/setting'
import { handleApiError } from './errorHandler'

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

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config)
      return response.data
    } catch (error) {
      throw handleApiError(error)
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }
}

export const apiClient = new ApiClient('https://api.siliconflow.cn/v1')
