import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface GeneratedImage {
  id: string;
  prompt: string;
  imageData: string;
  model: string;
  size: string;
  createdAt: number;
}

// IndexedDB 数据库名称和版本
const DB_NAME = 'image-gallery-db';
const DB_VERSION = 1;
const STORE_NAME = 'generated-images';

// 初始化 IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB 打开失败:', event);
      reject('无法打开数据库');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建对象存储，使用 id 作为键
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // 创建索引
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('model', 'model', { unique: false });
      }
    };
  });
};

export const useImageGalleryStore = defineStore('image-gallery', () => {
  const images = ref<GeneratedImage[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 从 IndexedDB 加载所有图片
  const loadImages = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');

      const request = index.openCursor(null, 'prev'); // 按时间降序排列
      const loadedImages: GeneratedImage[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          loadedImages.push(cursor.value);
          cursor.continue();
        } else {
          // 所有数据加载完毕
          images.value = loadedImages;
          isLoading.value = false;
        }
      };

      request.onerror = (event) => {
        console.error('加载图片失败:', event);
        error.value = '加载图片失败';
        isLoading.value = false;
      };

    } catch (err) {
      console.error('加载图片时出错:', err);
      error.value = err instanceof Error ? err.message : '未知错误';
      isLoading.value = false;
    }
  };

  // 保存新生成的图片到 IndexedDB
  const saveImage = async (image: Omit<GeneratedImage, 'id' | 'createdAt'>) => {
    try {
      const newImage: GeneratedImage = {
        ...image,
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      };

      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.add(newImage);

      request.onsuccess = () => {
        // 添加到本地状态
        images.value = [newImage, ...images.value];
      };

      request.onerror = (event) => {
        console.error('保存图片失败:', event);
        error.value = '保存图片失败';
      };

      return newImage;
    } catch (err) {
      console.error('保存图片时出错:', err);
      error.value = err instanceof Error ? err.message : '未知错误';
      throw err;
    }
  };

  // 删除图片
  const deleteImage = async (id: string) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(id);

      request.onsuccess = () => {
        // 从本地状态中移除
        images.value = images.value.filter(img => img.id !== id);
      };

      request.onerror = (event) => {
        console.error('删除图片失败:', event);
        error.value = '删除图片失败';
      };
    } catch (err) {
      console.error('删除图片时出错:', err);
      error.value = err instanceof Error ? err.message : '未知错误';
    }
  };

  // 清空所有图片
  const clearAllImages = async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => {
        // 清空本地状态
        images.value = [];
      };

      request.onerror = (event) => {
        console.error('清空图片失败:', event);
        error.value = '清空图片失败';
      };
    } catch (err) {
      console.error('清空图片时出错:', err);
      error.value = err instanceof Error ? err.message : '未知错误';
    }
  };

  return {
    images,
    isLoading,
    error,
    loadImages,
    saveImage,
    deleteImage,
    clearAllImages
  };
});
