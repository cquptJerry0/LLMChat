<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  useSettingStore,
  imageModelOptions,
  imageSizeOptions,
  batchSizeOptions,
  stepsOptions,
  guidanceScaleOptions
} from '@/stores/setting';
import { useImageGalleryStore } from '@/stores';
import { imageGenerationService } from '@/services';
import type { ImageGenerationParams } from '@/types/imageGeneration';

// 获取设置存储和图片库存储
const settingStore = useSettingStore();
const imageGalleryStore = useImageGalleryStore();

// 从设置存储中获取配置
const apiKey = ref(settingStore.settings.apiKey);
const imageSettings = computed(() => settingStore.settings.imageGeneration);
const prompt = ref(imageSettings.value.lastPrompt);

// 高级设置
const showAdvancedSettings = ref(imageSettings.value.showAdvancedSettings);
const negativePrompt = ref(imageSettings.value.negative_prompt);
const numSteps = ref(imageSettings.value.num_inference_steps);
const guidanceScale = ref(imageSettings.value.guidance_scale);
const batchSize = ref(imageSettings.value.batch_size);
const useSeed = ref(imageSettings.value.useSeed);
const seed = ref(imageSettings.value.seed);
const autoSaveToGallery = ref(imageSettings.value.autoSaveToGallery);

// 生成状态
const generatedImages = ref<string[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');

// 图片库状态
const activeTab = ref('generate'); // 'generate' 或 'gallery'

// 生成随机种子
const generateNewSeed = () => {
  seed.value = settingStore.generateRandomSeed();
};

// 重置所有设置
const resetSettings = () => {
  settingStore.resetImageSettings();
  // 更新本地变量
  showAdvancedSettings.value = settingStore.settings.imageGeneration.showAdvancedSettings;
  negativePrompt.value = settingStore.settings.imageGeneration.negative_prompt;
  numSteps.value = settingStore.settings.imageGeneration.num_inference_steps;
  guidanceScale.value = settingStore.settings.imageGeneration.guidance_scale;
  batchSize.value = settingStore.settings.imageGeneration.batch_size;
  useSeed.value = settingStore.settings.imageGeneration.useSeed;
  seed.value = settingStore.settings.imageGeneration.seed;
  autoSaveToGallery.value = settingStore.settings.imageGeneration.autoSaveToGallery;
};

// 图片生成API调用
const generateImage = async () => {
  if (!apiKey.value) {
    errorMessage.value = '请先设置API密钥';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  generatedImages.value = [];

  try {
    // 如果使用随机种子且没有设置，生成一个新的
    if (useSeed.value && seed.value === undefined) {
      generateNewSeed();
    }

    // 保存设置到Pinia
    settingStore.updateImageSettings({
      lastPrompt: prompt.value,
      negative_prompt: negativePrompt.value,
      num_inference_steps: numSteps.value,
      guidance_scale: guidanceScale.value,
      batch_size: batchSize.value,
      seed: useSeed.value ? seed.value : undefined,
      useSeed: useSeed.value,
      showAdvancedSettings: showAdvancedSettings.value,
      autoSaveToGallery: autoSaveToGallery.value
    });

    // 使用imageGenerationService生成图片
    const params: ImageGenerationParams = {
      model: imageSettings.value.model,
      prompt: prompt.value,
      image_size: imageSettings.value.image_size,
      batch_size: batchSize.value,
      num_inference_steps: numSteps.value,
      guidance_scale: guidanceScale.value,
      negative_prompt: negativePrompt.value,
      seed: useSeed.value ? seed.value : undefined
    };

    const response = await imageGenerationService.generateImage(params);

    if (response && response.images && response.images.length > 0) {
      // 处理多张图片
      for (const image of response.images) {
        const imageUrl = image.url;
        // 使用WebWorker下载图片并转换为Base64
        downloadImageAsBase64(imageUrl);
      }
    } else {
      errorMessage.value = '生成图片失败，未返回有效数据';
      isLoading.value = false;
    }
  } catch (error: any) {
    console.error('生成图片错误:', error);
    errorMessage.value = `生成图片错误: ${error.message || '未知错误'}`;
    isLoading.value = false;
  }
};

// 使用WebWorker下载图片并转换为Base64
const downloadImageAsBase64 = (url: string) => {
  const worker = new Worker(URL.createObjectURL(new Blob([`
    self.onmessage = function(e) {
      const imageUrl = e.data;
      fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = function() {
            self.postMessage({ base64: reader.result });
          };
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          self.postMessage({ error: error.message });
        });
    };
  `], { type: 'application/javascript' })));

  worker.onmessage = (e) => {
    if (e.data.base64) {
      // 添加到生成的图片列表
      generatedImages.value.push(e.data.base64);

      // 如果启用了自动保存，保存到图片库
      if (autoSaveToGallery.value) {
        saveToGallery(e.data.base64);
      }

      // 所有图片都加载完成后，设置加载状态为false
      if (generatedImages.value.length >= batchSize.value) {
        isLoading.value = false;
      }
    } else if (e.data.error) {
      errorMessage.value = `下载图片错误: ${e.data.error}`;
      isLoading.value = false;
    }
    worker.terminate();
  };

  worker.postMessage(url);
};

// 保存图片到图片库
const saveToGallery = async (imageData: string) => {
  try {
    await imageGalleryStore.saveImage({
      prompt: prompt.value,
      imageData,
      model: imageSettings.value.model,
      size: imageSettings.value.image_size
    });
  } catch (error) {
    console.error('保存到图片库失败:', error);
  }
};

// 手动保存单张图片到图片库
const manualSaveToGallery = async (imageData: string) => {
  try {
    await imageGalleryStore.saveImage({
      prompt: prompt.value,
      imageData,
      model: imageSettings.value.model,
      size: imageSettings.value.image_size
    });
    // 显示成功消息
    alert('图片已保存到图库');
  } catch (error) {
    console.error('保存到图片库失败:', error);
    alert('保存失败');
  }
};

// 保存API密钥到设置
const saveApiKey = () => {
  settingStore.settings.apiKey = apiKey.value;
};

// 更新图片模型
const updateModel = (model: string) => {
  settingStore.updateImageSettings({ model });
};

// 更新图片尺寸
const updateImageSize = (size: string) => {
  settingStore.updateImageSettings({ image_size: size });
};

// 删除图片
const deleteImageFromGallery = async (id: string) => {
  await imageGalleryStore.deleteImage(id);
};

// 清空图片库
const clearGallery = async () => {
  if (confirm('确定要清空所有图片吗？此操作不可恢复。')) {
    await imageGalleryStore.clearAllImages();
  }
};

// 切换到生成或图片库标签
const switchTab = (tab: string) => {
  activeTab.value = tab;
  if (tab === 'gallery' && imageGalleryStore.images.length === 0) {
    imageGalleryStore.loadImages();
  }
};

// 切换使用随机种子
const toggleUseSeed = () => {
  useSeed.value = !useSeed.value;
  if (useSeed.value && seed.value === undefined) {
    generateNewSeed();
  }
};

// 组件挂载时加载图片库
onMounted(() => {
  // 初始化设置
  showAdvancedSettings.value = imageSettings.value.showAdvancedSettings;
  negativePrompt.value = imageSettings.value.negative_prompt;
  numSteps.value = imageSettings.value.num_inference_steps;
  guidanceScale.value = imageSettings.value.guidance_scale;
  batchSize.value = imageSettings.value.batch_size;
  useSeed.value = imageSettings.value.useSeed;
  seed.value = imageSettings.value.seed;
  autoSaveToGallery.value = imageSettings.value.autoSaveToGallery;
});
</script>

<template>
  <div class="test-page">
    <h1>图片生成与管理</h1>

    <!-- 标签切换 -->
    <div class="tabs">
      <div
        class="tab"
        :class="{ active: activeTab === 'generate' }"
        @click="switchTab('generate')"
      >
        生成图片
      </div>
      <div
        class="tab"
        :class="{ active: activeTab === 'gallery' }"
        @click="switchTab('gallery')"
      >
        图片库
      </div>
    </div>

    <!-- 生成图片面板 -->
    <div v-if="activeTab === 'generate'" class="panel">
      <div class="settings-panel">
        <div class="form-group">
          <label for="apiKey">API密钥:</label>
          <div class="api-key-input">
            <input
              id="apiKey"
              v-model="apiKey"
              type="password"
              placeholder="输入API密钥"
            />
            <button @click="saveApiKey">保存密钥</button>
          </div>
        </div>

        <div class="form-group">
          <label for="prompt">提示词:</label>
          <textarea
            id="prompt"
            v-model="prompt"
            placeholder="描述你想生成的图片"
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="model">模型:</label>
            <select
              id="model"
              :value="imageSettings.model"
              @change="event => updateModel((event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in imageModelOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="size">尺寸:</label>
            <select
              id="size"
              :value="imageSettings.image_size"
              @change="event => updateImageSize((event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in imageSizeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="batch-size">生成数量:</label>
            <select
              id="batch-size"
              v-model="batchSize"
            >
              <option v-for="option in batchSizeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- 高级设置 -->
        <div class="advanced-settings">
          <div class="advanced-toggle" @click="showAdvancedSettings = !showAdvancedSettings">
            高级设置
            <span>{{ showAdvancedSettings ? '▼' : '▶' }}</span>
          </div>

          <div v-if="showAdvancedSettings" class="advanced-panel">
            <div class="form-group">
              <label for="negative-prompt">反向提示词:</label>
              <textarea
                id="negative-prompt"
                v-model="negativePrompt"
                placeholder="不希望出现在图片中的元素"
                rows="2"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="steps">推理步数:</label>
                <select id="steps" v-model="numSteps">
                  <option v-for="option in stepsOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="guidance">引导系数:</label>
                <select id="guidance" v-model="guidanceScale">
                  <option v-for="option in guidanceScaleOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group seed-group">
                <div class="checkbox-group">
                  <input type="checkbox" id="use-seed" v-model="useSeed">
                  <label for="use-seed">使用固定随机种子</label>
                </div>
                <div class="seed-input" v-if="useSeed">
                  <input
                    type="number"
                    v-model="seed"
                    placeholder="随机种子值"
                    min="0"
                    max="9999999999"
                  />
                  <button class="small-button" @click="generateNewSeed">随机</button>
                </div>
              </div>

              <div class="form-group">
                <div class="checkbox-group">
                  <input type="checkbox" id="auto-save" v-model="autoSaveToGallery">
                  <label for="auto-save">自动保存到图库</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button
            @click="resetSettings"
            class="reset-button"
            :disabled="isLoading"
          >
            重置设置
          </button>
          <button
            @click="generateImage"
            :disabled="isLoading || !apiKey"
            class="generate-button"
          >
            {{ isLoading ? '生成中...' : '生成图片' }}
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="result-container">
        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <p>正在生成图片，请稍候...</p>
        </div>

        <div v-else-if="generatedImages.length > 0" class="image-results">
          <h3>生成结果:</h3>
          <div class="image-grid">
            <div v-for="(image, index) in generatedImages" :key="index" class="image-item">
              <img :src="image" :alt="`生成的图片 ${index + 1}`" />
              <div class="image-actions" v-if="!autoSaveToGallery">
                <button @click="manualSaveToGallery(image)" class="small-button">
                  保存到图库
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片库面板 -->
    <div v-if="activeTab === 'gallery'" class="panel gallery-panel">
      <div class="gallery-header">
        <h2>我的图片库</h2>
        <button v-if="imageGalleryStore.images.length > 0" @click="clearGallery" class="danger-button">
          清空图片库
        </button>
      </div>

      <div v-if="imageGalleryStore.isLoading" class="loading">
        <div class="spinner"></div>
        <p>加载图片库...</p>
      </div>

      <div v-else-if="imageGalleryStore.images.length === 0" class="empty-gallery">
        <p>图片库为空，生成一些图片吧！</p>
      </div>

      <div v-else class="gallery-grid">
        <div v-for="image in imageGalleryStore.images" :key="image.id" class="gallery-item">
          <div class="gallery-image">
            <img :src="image.imageData" :alt="image.prompt" />
          </div>
          <div class="gallery-info">
            <div class="gallery-prompt">{{ image.prompt }}</div>
            <div class="gallery-meta">
              <span>{{ new Date(image.createdAt).toLocaleString() }}</span>
              <span>{{ image.model }}</span>
              <span>{{ image.size }}</span>
            </div>
            <div class="gallery-actions">
              <button @click="deleteImageFromGallery(image.id)" class="small-button danger-button">
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.test-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;

  h1 {
    text-align: center;
    margin-bottom: 20px;
  }
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;

  .tab {
    padding: 10px 20px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    &.active {
      font-weight: bold;
      border-bottom: 2px solid var(--primary-color);
    }
  }
}

.panel {
  min-height: 300px;
}

.settings-panel {
  background-color: var(--bg-color-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;

  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }

  input, textarea, select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--bg-color);
    color: var(--text-color);

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }

  &.seed-group {
    flex: 2;

    .seed-input {
      display: flex;
      gap: 8px;
      margin-top: 8px;

      input {
        flex: 1;
      }
    }
  }
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;

  input[type="checkbox"] {
    width: auto;
  }

  label {
    margin-bottom: 0;
  }
}

.form-row {
  display: flex;
  gap: 15px;

  .form-group {
    flex: 1;
  }
}

.api-key-input {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
  }

  button {
    white-space: nowrap;
  }
}

.advanced-settings {
  margin: 15px 0;

  .advanced-toggle {
    cursor: pointer;
    padding: 8px 0;
    color: var(--primary-color);
    font-weight: bold;
    display: flex;
    justify-content: space-between;
  }

  .advanced-panel {
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
    margin-top: 10px;
  }
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.generate-button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--primary-color-dark);
  }

  &:disabled {
    background-color: var(--disabled-color);
    cursor: not-allowed;
  }
}

.reset-button {
  background-color: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.small-button {
  padding: 4px 8px;
  font-size: 0.9em;
  border-radius: 4px;
  border: none;
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;

  &:hover {
    background-color: var(--primary-color-dark);
  }
}

.error-message {
  color: var(--error-color);
  padding: 10px;
  margin-bottom: 20px;
  background-color: rgba(255, 0, 0, 0.1);
  border-radius: 4px;
  border-left: 3px solid var(--error-color);
}

.result-container {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }
}

.image-results {
  width: 100%;

  h3 {
    margin-bottom: 15px;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;

    .image-item {
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

      img {
        width: 100%;
        display: block;
        border-radius: 8px;
      }

      .image-actions {
        padding: 10px;
        display: flex;
        justify-content: center;
      }
    }
  }
}

// 图片库样式
.gallery-panel {
  .gallery-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h2 {
      margin: 0;
    }
  }

  .empty-gallery {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .gallery-item {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    background-color: var(--bg-color-secondary);

    .gallery-image {
      height: 200px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s;

        &:hover {
          transform: scale(1.05);
        }
      }
    }

    .gallery-info {
      padding: 10px;

      .gallery-prompt {
        font-weight: bold;
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .gallery-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 0.8em;
        color: var(--text-secondary);

        span {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .gallery-actions {
        display: flex;
        justify-content: flex-end;
      }
    }
  }
}

.danger-button {
  background-color: var(--error-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;

  &:hover {
    background-color: darken(#f56c6c, 10%);
  }

  &.small-button {
    padding: 4px 8px;
    font-size: 0.9em;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
