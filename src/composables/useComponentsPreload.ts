import { onMounted, ref, Ref } from "vue";


type ComponentImporter = () => Promise<any>;

/**
 * 组件预加载钩子
 * @template T 组件类型
 * @param components 需要预加载的组件导入函数数组
 * @param options 预加载配置选项
 * @returns 预加载状态和控制方法
 */
export function useComponentsPreload(
  components: ComponentImporter[] = [],
  options: {
    timeout?: number;
    onSuccess?: (component: any, index: number) => void;
    onError?: (error: Error, index: number) => void;
    sequential?: boolean; // 是否按顺序加载
  } = {}
) {
  const {
    timeout = 2000,
    onSuccess,
    onError,
    sequential = true
  } = options;

  // 使用泛型确保类型安全
  const preloadedComponents: Ref<Set<ComponentImporter>> = ref(new Set());
  const loadedResults: Ref<Map<number, any>> = ref(new Map());
  const errors: Ref<Map<number, Error>> = ref(new Map());
  const isLoading: Ref<boolean> = ref(false);

  // 预加载状态
  const status = ref({
    total: components.length,
    loaded: 0,
    failed: 0,
    pending: components.length
  });

  // 预加载单个组件
  const preloadComponent = (index: number): Promise<any | null> => {
    if (index >= components.length) return Promise.resolve(null);

    const component = components[index];

    return new Promise<any | null>((resolve) => {
      const ric = window.requestIdleCallback || setTimeout;
      ric(() => {
        isLoading.value = true;

        component()
          .then((result: any) => {
            preloadedComponents.value.add(component);
            loadedResults.value.set(index, result);
            status.value.loaded++;
            status.value.pending--;

            onSuccess?.(result, index);

            // 如果是顺序加载，则加载下一个
            if (sequential) {
              resolve(result);
              preloadComponent(index + 1);
            } else {
              resolve(result);
            }
          })
          .catch((error: Error) => {
            errors.value.set(index, error);
            status.value.failed++;
            status.value.pending--;

            onError?.(error, index);
            resolve(null);

            // 如果是顺序加载，继续尝试下一个
            if (sequential) {
              preloadComponent(index + 1);
            }
          })
          .finally(() => {
            // 检查是否所有组件都已处理完毕
            if (status.value.loaded + status.value.failed === status.value.total) {
              isLoading.value = false;
            }
          });
      }, { timeout });
    });
  };

  // 开始预加载所有组件
  const startPreload = () => {
    if (sequential) {
      // 顺序加载
      preloadComponent(0);
    } else {
      // 并行加载
      components.forEach((_, index) => {
        preloadComponent(index);
      });
    }
  };

  // 重置预加载状态
  const reset = () => {
    preloadedComponents.value.clear();
    loadedResults.value.clear();
    errors.value.clear();
    isLoading.value = false;
    status.value = {
      total: components.length,
      loaded: 0,
      failed: 0,
      pending: components.length
    };
  };

  onMounted(() => {
    if (components.length > 0) {
      startPreload();
    }
  });

  return {
    preloadedComponents,
    loadedResults,
    errors,
    isLoading,
    status,
    startPreload,
    reset
  };
}
