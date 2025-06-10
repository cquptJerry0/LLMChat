import { useSettingStore } from '@/stores/setting'
import { handleApiError, ApiError } from './errorHandler'

// 从环境变量获取API基础URL，回退到默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.siliconflow.cn/v1';

interface RequestConfig<D = any> {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  data?: D;
  params?: Record<string, string>;
  responseType?: 'json' | 'text' | 'stream';
  signal?: AbortSignal;
  timeout?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private createUrl(url: string, params?: Record<string, string>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    if (!params) return fullUrl;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });

    return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${searchParams.toString()}`;
  }

  private async prepareRequest<D>(config: RequestConfig<D>): Promise<RequestInit> {
    const settingStore = useSettingStore();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settingStore.settings.apiKey}`,
      ...config.headers
    };

    // 特殊处理流式响应
    if (config.responseType === 'text' || config.responseType === 'stream') {
      headers['Accept'] = 'text/event-stream';
    }

    const requestInit: RequestInit = {
      method: config.method || 'GET',
      headers,
      signal: config.signal
    };

    // 添加请求体
    if (config.data && config.method !== 'GET') {
      requestInit.body = JSON.stringify(config.data);
    }

    return requestInit;
  }

  async request<T, D = any>(config: RequestConfig<D>): Promise<T> {
    try {
      const url = this.createUrl(config.url || '', config.params);
      const requestInit = await this.prepareRequest<D>(config);

      // 处理超时
      const timeoutPromise = config.timeout
        ? new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), config.timeout);
        })
        : null;

      // 发送请求
      const fetchPromise = fetch(url, requestInit);
      const response = await (timeoutPromise
        ? Promise.race([fetchPromise, timeoutPromise])
        : fetchPromise) as Response;

      // 对于非 2xx 状态码抛出错误
      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // 忽略解析错误
        }

        throw new ApiError(
          errorData?.message || `Request failed with status ${response.status}`,
          response.status,
          errorData?.code,
          response
        );
      }

      // 处理响应
      if (config.responseType === 'text' || config.responseType === 'stream') {
        // 克隆响应以确保可以多次读取
        const clonedResponse = response.clone();

        // 检查响应头是否正确
        const contentType = clonedResponse.headers.get('content-type');
        if (!contentType?.includes('text/event-stream')) {
          console.warn('Stream response content-type is not text/event-stream:', contentType);
        }

        // 验证响应是否有效
        if (!clonedResponse.body) {
          throw new ApiError('Invalid stream response: body is null');
        }

        // 返回克隆的响应对象，用于流处理
        return clonedResponse as unknown as T;
      } else {
        // 默认返回 JSON
        const data = await response.json();
        return data as T;
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T, D = any>(url: string, data?: D, config?: RequestConfig): Promise<T> {
    return this.request<T, D>({ ...config, method: 'POST', url, data });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
