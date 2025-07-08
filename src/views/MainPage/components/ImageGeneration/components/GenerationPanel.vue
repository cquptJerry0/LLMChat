<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import AdvancedSettings from './AdvancedSettings.vue';
import ImageCard from './ImageCard.vue';
import { useImageGeneration } from '../composables/useImageGeneration';
import type { ImageModel, ImageSize } from '@/types/imageGeneration';
import { ElMessage } from 'element-plus';
import { Picture as PictureOutlined, UploadFilled, Delete } from '@element-plus/icons-vue';

// 使用图片生成相关的逻辑
const {
  apiKey,
  imageSettings,
  prompt,
  showAdvancedSettings,
  negativePrompt,
  numSteps,
  guidanceScale,
  batchSize,
  useSeed,
  seed,
  autoSaveToGallery,
  generatedImages,
  isLoading,
  errorMessage,

  // 选项常量
  imageModelOptions,
  imageSizeOptions,
  batchSizeOptions,

  // 方法
  generateNewSeed,
  resetSettings,
  updateModel,
  updateImageSize,
  generateImage,
  manualSaveToGallery
} = useImageGeneration();

// 本地模型和尺寸值，用于v-model绑定
const modelValue = ref<ImageModel>(imageSettings.value.model as ImageModel);
const sizeValue = ref<ImageSize>(imageSettings.value.image_size as ImageSize);

// 图片显示模式
const defaultFit = 'scale-down';
const imageFits = ref<Record<number, string>>({});

// 上传的本地图片
const uploadedImage = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// 监听模型变化
const onModelChange = (value: ImageModel) => {
  modelValue.value = value;
  updateModel(value);
};

// 监听尺寸变化
const onSizeChange = (value: ImageSize) => {
  sizeValue.value = value;
  updateImageSize(value);
};

// 选择本地图片
const selectLocalImage = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

// 处理图片上传
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择有效的图片文件');
    return;
  }

  // 检查文件大小（限制为10MB）
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过10MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // 确保获取的是base64格式
    const result = e.target?.result as string;
    if (result) {
      // 确认是base64格式
      if (result.startsWith('data:')) {
        uploadedImage.value = result;
      } else {
        ElMessage.error('图片格式转换失败');
      }
    }
  };
  reader.onerror = () => {
    ElMessage.error('读取图片失败');
  };
  // 明确指定读取为DataURL (base64)
  reader.readAsDataURL(file);

  // 重置input，以便可以重新选择相同的文件
  if (target) target.value = '';
};

// 移除上传的图片
const removeUploadedImage = () => {
  uploadedImage.value = null;
};

// 调用生成图片函数并传递上传的图片
const onGenerateImage = () => {
  generateImage(uploadedImage.value);
};

// 组件挂载时初始化
onMounted(() => {
  // 初始化本地值
  modelValue.value = imageSettings.value.model as ImageModel;
  sizeValue.value = imageSettings.value.image_size as ImageSize;
});
</script>

<template>
  <div class="generation-panel">
    <div class="generation-panel__container">
      <!-- 左侧设置区域 -->
      <div class="generation-panel__settings">
        <el-card class="generation-panel__settings-card" shadow="hover">
          <el-form label-position="top">

            <!-- 提示词输入 -->
            <el-form-item label="提示词" class="generation-panel__form-item">
              <el-input
                v-model="prompt"
                type="textarea"
                :rows="30"
                placeholder="描述你想生成的图片"
                show-word-limit
                class="generation-panel__textarea"
              />
            </el-form-item>

            <!-- 本地图片上传 -->
            <el-form-item label="参考图片（可选）" class="generation-panel__form-item">
              <div class="generation-panel__upload-container">
                <input
                  type="file"
                  ref="fileInputRef"
                  accept="image/*"
                  style="display: none;"
                  @change="handleImageUpload"
                />

                <div v-if="!uploadedImage" class="generation-panel__upload-placeholder">
                  <el-button @click="selectLocalImage" class="generation-panel__upload-btn">
                    <el-icon><upload-filled /></el-icon>
                    选择图片
                  </el-button>
                  <div class="generation-panel__upload-hint">
                    上传参考图片可以生成相似风格的图片
                  </div>
                </div>

                <div v-else class="generation-panel__uploaded-image">
                  <div class="generation-panel__image-preview">
                    <el-image
                      :src="uploadedImage"
                      fit="scale-down"
                      class="generation-panel__preview"
                    />
                  </div>
                  <div class="generation-panel__upload-actions">
                    <el-button @click="removeUploadedImage" size="small" type="danger">
                      <el-icon><delete /></el-icon>
                      移除图片
                    </el-button>
                  </div>
                </div>
              </div>
            </el-form-item>

            <!-- 基本设置 -->
            <div class="generation-panel__options">
              <el-form-item label="模型" class="generation-panel__form-item generation-panel__option">
                <el-select
                  v-model="modelValue"
                  @update:model-value="onModelChange"
                  class="generation-panel__select"
                >
                  <el-option
                    v-for="option in imageModelOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="尺寸" class="generation-panel__form-item generation-panel__option">
                <el-select
                  v-model="sizeValue"
                  @update:model-value="onSizeChange"
                  class="generation-panel__select"
                >
                  <el-option
                    v-for="option in imageSizeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="数量" class="generation-panel__form-item generation-panel__option">
                <el-select
                  v-model="batchSize"
                  class="generation-panel__select"
                >
                  <el-option
                    v-for="option in batchSizeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </el-form-item>
            </div>

            <!-- 高级设置 -->
            <AdvancedSettings
              v-model:show="showAdvancedSettings"
              v-model:negative-prompt="negativePrompt"
              v-model:steps="numSteps"
              v-model:guidance="guidanceScale"
              v-model:use-seed="useSeed"
              v-model:seed="seed"
              v-model:auto-save="autoSaveToGallery"
              @generate-seed="generateNewSeed"
            />

            <!-- 操作按钮 -->
            <div class="generation-panel__actions">
              <el-button
                @click="resetSettings"
                class="generation-panel__reset-btn"
                :disabled="isLoading"
              >
                重置设置
              </el-button>
              <el-button
                type="primary"
                @click="onGenerateImage"
                :loading="isLoading"
                :disabled="!apiKey"
                class="generation-panel__generate-btn"
              >
                {{ isLoading ? '生成中...' : '生成图片' }}
              </el-button>
            </div>
          </el-form>
        </el-card>
      </div>

      <!-- 右侧结果区域 -->
      <div class="generation-panel__results-container">
        <el-card class="generation-panel__result-card" shadow="hover">
          <div v-if="errorMessage" class="generation-panel__error">
            {{ errorMessage }}
          </div>

          <div v-if="isLoading" class="generation-panel__loading">
            <el-skeleton :rows="3" animated />
            <div class="generation-panel__loading-text">正在生成图片，请稍候...</div>
          </div>

          <div v-else-if="generatedImages.length > 0" class="generation-panel__results">
            <h3 class="generation-panel__results-title">生成结果:</h3>
            <div class="generation-panel__image-grid">
              <div
                v-for="(image, index) in generatedImages"
                :key="index"
                class="generation-panel__image-item"
              >
                <ImageCard
                  :image-data="image"
                  :prompt="prompt"
                  :image-fit="defaultFit"
                  :auto-save="autoSaveToGallery"
                  @save="manualSaveToGallery(image)"
                />
              </div>
            </div>
          </div>

          <div v-else class="generation-panel__empty">
            <div class="generation-panel__empty-content">
              <el-icon class="generation-panel__empty-icon"><picture-outlined /></el-icon>
              <p class="generation-panel__empty-text">填写提示词并点击"生成图片"开始创作</p>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.generation-panel {
  height: 100%;

  &__container {
    display: flex;
    height: 100%;
    gap: var(--spacing-base);

    @media (max-width: 1024px) {
      flex-direction: column;
    }
  }

  &__settings {
    flex: 0 0 500px; /* 固定宽度 */
    display: flex;
    flex-direction: column;

    @media (max-width: 1024px) {
      flex: 0 0 auto;
      margin-right: 0;
      margin-bottom: var(--spacing-base);
    }
  }

  &__results-container {
    flex: 1; /* 占据剩余空间 */
    min-width: 0; /* 防止溢出 */
  }

  &__settings-card,
  &__result-card {
    height: 100%;
    border: none;
    box-shadow: var(--box-shadow-light);
    display: flex;
    flex-direction: column;

    :deep(.el-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  }

  &__form-item {
    margin-bottom: var(--spacing-base);

    :deep(.el-form-item__label) {
      color: var(--text-primary);
    }
  }

  &__option {
    margin-bottom: 0;
  }

  &__options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-base);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  &__api-key-group {
    display: flex;
    gap: var(--spacing-small);
  }

  &__input,
  &__textarea,
  &__select {
    width: 100%;

    :deep(.el-input__wrapper),
    :deep(.el-textarea__inner) {
      box-shadow: none;
      border: 1px solid var(--border-color);
      background-color: var(--background-color-light);

      &:hover, &:focus {
        border-color: var(--primary-color);
        box-shadow: none;
      }
    }

    :deep(.el-input__inner),
    :deep(.el-textarea__inner) {
      color: var(--text-primary);

      &::placeholder {
        color: var(--text-placeholder);
      }
    }
  }

  &__textarea {
    :deep(.el-textarea__inner) {
      height: 300px;
      max-height: 300px;
      overflow-y: auto;
      resize: none;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */

      &::-webkit-scrollbar {
        display: none; /* Chrome, Safari, Opera */
      }
    }
  }

  :deep(.el-select-dropdown__item) {
    &.selected {
      color: var(--primary-color);
    }
  }

  &__save-key-btn {
    flex-shrink: 0;
    margin-top: 0;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-small);
    margin-top: var(--spacing-large);

    :deep(.el-button) {
      border: none;

      &.el-button--primary {
        background-color: var(--primary-color);
        color: var(--background-color-light);
      }

      &:not(.el-button--primary) {
        background-color: var(--background-color-base);
        color: var(--text-primary);
      }

      &:hover {
        opacity: 0.9;
      }
    }
  }

  &__generate-btn {
    min-width: 120px;
  }

  &__error {
    color: var(--danger-color);
    padding: var(--spacing-base);
    background-color: rgba(var(--danger-color), 0.1);
    border-radius: var(--border-radius-base);
    margin-bottom: var(--spacing-base);
  }

  &__loading {
    padding: var(--spacing-large);

    :deep(.el-skeleton__item) {
      background: var(--background-color-base);
    }
  }

  &__loading-text {
    text-align: center;
    margin-top: var(--spacing-base);
    color: var(--text-secondary);
  }

  &__results {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__results-title {
    margin-bottom: var(--spacing-base);
    color: var(--text-primary);
    font-weight: 500;
  }

  &__image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--spacing-base);
    overflow-y: auto;
    flex: 1;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */

    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }
  }

  &__image-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__empty-content {
    text-align: center;
    color: var(--text-secondary);
  }

  &__empty-icon {
    font-size: 48px;
    margin-bottom: var(--spacing-base);
    color: var(--text-secondary);
  }

  &__empty-text {
    font-size: var(--font-size-large);
  }

  &__upload-container {
    border: 1px dashed var(--border-color);
    border-radius: var(--border-radius-base);
    padding: var(--spacing-base);
    background-color: var(--background-color-base);
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    text-align: center;
  }

  &__upload-hint {
    margin-top: var(--spacing-small);
    color: var(--text-secondary);
    font-size: var(--font-size-small);
  }

  &__uploaded-image {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-small);
  }

  &__image-preview {
    width: 100%;
    height: 180px;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    border-radius: var(--border-radius-base);
    background-color: var(--background-color-light);
  }

  &__preview {
    width: 100%;
    height: 100%;
  }

  &__upload-actions {
    display: flex;
    justify-content: center;
  }

  &__upload-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-mini);

    .el-icon {
      margin-right: 4px;
    }
  }
}

:deep(.el-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}
</style>
