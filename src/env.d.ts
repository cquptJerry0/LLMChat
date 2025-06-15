/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/**
 * 环境变量类型定义
 */
interface ImportMetaEnv {
  /** API密钥 */
  readonly VITE_API_KEY: string;
  /** API基础URL */
  readonly VITE_API_BASE_URL: string;
  /** 默认模型 */
  readonly VITE_DEFAULT_MODEL: string;
  /** 应用名称 */
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
