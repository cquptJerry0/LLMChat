<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CSSProperties } from 'vue';
import { Download } from '@element-plus/icons-vue';
import { imageGenerationService } from '@/services';

const props = defineProps({
  imageData: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    default: ''
  },
  model: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Number,
    default: 0
  },
  autoSave: {
    type: Boolean,
    default: false
  },
  showDelete: {
    type: Boolean,
    default: false
  },
  imageFit: {
    type: String,
    default: 'contain',
    validator: (value: string) => ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(value)
  }
});

const emit = defineEmits(['save', 'delete']);

// 图片显示模式 - 使用内部状态
const currentFit = ref(props.imageFit);

// 监听props变化
watch(() => props.imageFit, (newValue) => {
  currentFit.value = newValue;
});

// 切换图片显示模式
const toggleFit = () => {
  const fits = ['contain', 'cover', 'none', 'scale-down'];
  const currentIndex = fits.indexOf(currentFit.value);
  const nextIndex = (currentIndex + 1) % fits.length;
  currentFit.value = fits[nextIndex];
};

// 控制预览显示
const showPreview = ref(false);

// 显示模式对话框
const showFitDialog = ref(false);

// 模式描述
const fitDescription = computed(() => {
  const descriptions = {
    contain: '完整显示整个图片，保持宽高比，可能有空白',
    cover: '填满容器，保持宽高比，可能裁剪部分图片',
    fill: '拉伸填满容器，不保持宽高比，可能变形',
    none: '保持原始尺寸，不缩放',
    'scale-down': '在原始尺寸和包含模式之间选择较小的一个'
  };
  return descriptions[currentFit.value as keyof typeof descriptions];
});

// 格式化日期
const formatDate = (timestamp: number): string => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 容器样式
const containerStyle = computed(() => {
  // 根据显示模式调整容器高度
  const heightMap = {
    contain: 'auto',
    cover: '200px',
    fill: '200px',
    none: 'auto',
    'scale-down': 'auto'
  };

  return {
    height: heightMap[currentFit.value as keyof typeof heightMap]
  };
});

// 下载图片
const downloadImage = async () => {
  try {
    // 获取文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `image-${timestamp}.png`;

    // 如果是base64格式，直接下载
    if (props.imageData.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = props.imageData;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // 如果是URL，使用服务下载
      await imageGenerationService.downloadImage(props.imageData, filename);
    }
  } catch (error) {
    console.error('下载图片失败:', error);
  }
};
</script>

<template>
  <div class="image-card">
    <div class="image-card__container" :style="containerStyle">
      <el-image
        :src="imageData"
        :alt="prompt"
        :fit="currentFit"
        class="image-card__image"
        :preview-src-list="[imageData]"
        :initial-index="0"
        :preview-teleported="true"
        loading="lazy"
        @click="showPreview = true"
      >
        <template #placeholder>
          <div class="image-card__loading">
            <el-icon class="is-loading"><i class="el-icon-loading"></i></el-icon>
            <span>加载中...</span>
          </div>
        </template>
        <template #error>
          <div class="image-card__error">
            <i class="el-icon-picture-outline"></i>
            <span>加载失败</span>
          </div>
        </template>
      </el-image>

      <div class="image-card__fit-badge">
        <el-tag size="small" effect="dark">{{ currentFit }}</el-tag>
      </div>

      <div class="image-card__actions-overlay">
        <el-button
          class="image-card__download-btn"
          circle
          size="small"
          @click.stop="downloadImage"
          title="下载图片"
        >
          <el-icon><Download /></el-icon>
        </el-button>
      </div>

    </div>

    <div class="image-card__info">
      <div class="image-card__prompt" :title="prompt">{{ prompt }}</div>

      <div class="image-card__meta">
        <el-tag size="small" v-if="model" class="image-card__tag">{{ model }}</el-tag>
        <el-tag size="small" type="info" v-if="size" class="image-card__tag">{{ size }}</el-tag>
        <el-tag size="small" type="success" v-if="createdAt" class="image-card__tag">
          {{ formatDate(createdAt) }}
        </el-tag>
      </div>

      <div class="image-card__controls">
        <div class="image-card__fit-selector">
          <div class="image-card__fit-label">显示模式:</div>
          <el-select v-model="currentFit" size="small" class="image-card__fit-select">
            <el-option label="完整显示 (contain)" value="contain">
              <div class="image-card__fit-option">
                <div class="image-card__fit-icon image-card__fit-icon--contain"></div>
                <span>完整显示</span>
              </div>
            </el-option>
            <el-option label="填满裁剪 (cover)" value="cover">
              <div class="image-card__fit-option">
                <div class="image-card__fit-icon image-card__fit-icon--cover"></div>
                <span>填满裁剪</span>
              </div>
            </el-option>
            <el-option label="原始尺寸 (none)" value="none">
              <div class="image-card__fit-option">
                <div class="image-card__fit-icon image-card__fit-icon--none"></div>
                <span>原始尺寸</span>
              </div>
            </el-option>
            <el-option label="适当缩小 (scale-down)" value="scale-down">
              <div class="image-card__fit-option">
                <div class="image-card__fit-icon image-card__fit-icon--scale-down"></div>
                <span>适当缩小</span>
              </div>
            </el-option>
          </el-select>
        </div>
        <div class="image-card__fit-description">{{ fitDescription }}</div>
      </div>

      <div class="image-card__actions">
        <el-button
          v-if="!autoSave && !showDelete"
          size="small"
          type="primary"
          @click.stop="$emit('save')"
          class="image-card__button"
        >
          保存到图库
        </el-button>

        <el-button
          v-if="showDelete"
          size="small"
          type="danger"
          @click.stop="$emit('delete')"
          class="image-card__button"
        >
          删除
        </el-button>

        <el-button
          size="small"
          @click.stop="downloadImage"
          class="image-card__button"
        >
          <el-icon><Download /></el-icon>
          下载
        </el-button>
      </div>
    </div>

  </div>
</template>

<style lang="scss" scoped>
.image-card {
  max-height: 500px;
  border-radius: var(--border-radius-base);
  overflow: hidden;
  background-color: var(--background-color-light);
  box-shadow: var(--box-shadow-light);
  transition: transform 0.2s, box-shadow 0.2s;
  margin-bottom: var(--spacing-base);
  border: none;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--box-shadow-base);
  }

  &__container {
    position: relative;
    height: 220px;
    width: 100%;
    overflow: hidden;
    border: none;
    flex-shrink: 0;

    @media (max-width: 768px) {
      height: 180px;
    }

    @media (max-width: 480px) {
      height: 160px;
    }

    &:hover {
      .image-card__actions-overlay {
        opacity: 1;
      }
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    border: none;

    :deep(.el-image__inner) {
      transition: transform 0.3s;
      border: none;
      width: 100%;
      height: 100%;
    }

    &:hover {
      :deep(.el-image__inner) {
        transform: scale(1.05);
      }
    }
  }

  &__loading, &__error {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: var(--text-secondary);
    background-color: var(--background-color-base);
    padding: var(--spacing-large);
    border: none;

    i {
      font-size: 24px;
      margin-bottom: var(--spacing-small);
    }
  }

  &__fit-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2;

    :deep(.el-tag) {
      background-color: var(--primary-color);
      color: var(--background-color-light);
      border: none;
    }
  }

  &__fit-toggle {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--primary-color);
    color: var(--background-color-light);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 2;
    border: none;

    &:hover {
      background-color: var(--text-primary);
    }
  }

  &__help {
    position: absolute;
    bottom: 8px;
    right: 44px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background-color: var(--primary-color);
    color: var(--background-color-light);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 2;
    border: none;

    &:hover {
      background-color: var(--text-primary);
    }
  }

  &__container:hover {
    .image-card__fit-toggle,
    .image-card__help {
      opacity: 1;
    }
  }

  &__info {
    padding: var(--spacing-base);
    border: none;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__prompt {
    font-weight: bold;
    margin-bottom: var(--spacing-small);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-primary);
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-mini);
    margin-bottom: var(--spacing-small);

    :deep(.el-tag) {
      border: none;
      background-color: var(--background-color-base);
      color: var(--text-primary);

      &.el-tag--info {
        background-color: var(--background-color-base);
        color: var(--text-secondary);
      }

      &.el-tag--success {
        background-color: var(--background-color-base);
        color: var(--success-color);
      }
    }
  }

  &__tag {
    margin-right: 0;
  }

  &__controls {
    margin: var(--spacing-small) 0;
    border: none;

    @media (max-width: 480px) {
      display: flex;
      flex-direction: column;
    }
  }

  &__fit-selector {
    display: flex;
    align-items: center;
    margin-bottom: var(--spacing-mini);

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__fit-label {
    margin-right: var(--spacing-small);
    color: var(--text-secondary);
    font-size: 14px;

    @media (max-width: 480px) {
      margin-bottom: var(--spacing-mini);
    }
  }

  &__fit-select {
    width: 150px;

    @media (max-width: 480px) {
      width: 100%;
    }

    :deep(.el-input__wrapper) {
      background-color: var(--background-color-base);
      box-shadow: none !important;
      border: none;
    }

    :deep(.el-input__inner) {
      color: var(--text-primary);
    }

    :deep(.el-select-dropdown__item.selected) {
      color: var(--primary-color);
    }
  }

  &__fit-option {
    display: flex;
    align-items: center;
  }

  &__fit-icon {
    width: 20px;
    height: 20px;
    margin-right: var(--spacing-small);
    border: 1px solid var(--border-color);
    position: relative;

    &::after {
      content: '';
      position: absolute;
      background-color: var(--primary-color);
    }

    &--contain::after {
      width: 70%;
      height: 70%;
      top: 15%;
      left: 15%;
    }

    &--cover::after {
      width: 120%;
      height: 70%;
      top: 15%;
      left: -10%;
    }

    &--none::after {
      width: 90%;
      height: 90%;
      top: 5%;
      left: 5%;
      border: 1px dashed var(--border-color);
    }

    &--scale-down::after {
      width: 60%;
      height: 60%;
      top: 20%;
      left: 20%;
      border: 1px dashed var(--border-color);
    }
  }

  &__fit-description {
    color: var(--text-secondary);
    font-size: 12px;
    margin-bottom: var(--spacing-small);
    text-align: center;
    font-style: italic;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
    padding-top: var(--spacing-small);

    @media (max-width: 480px) {
      flex-direction: column;
      gap: var(--spacing-mini);
    }

    :deep(.el-button) {
      border: none;

      &.el-button--primary {
        background-color: var(--primary-color);
        color: var(--background-color-light);
      }

      &.el-button--danger {
        background-color: var(--danger-color);
        color: var(--background-color-light);
      }
    }
  }

  &__button {
    margin-left: var(--spacing-small);

    @media (max-width: 480px) {
      margin-left: 0;
      width: 100%;
    }
  }

  &__fit-examples {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-base);
  }

  &__fit-example {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__fit-example-title {
    font-weight: bold;
    margin-bottom: var(--spacing-small);
  }

  &__fit-example-container {
    width: 200px;
    height: 150px;
    border: 1px solid var(--border-color);
    background-color: var(--background-color-base);
    margin-bottom: var(--spacing-small);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
  }

  &__fit-example-image {
    width: 120px;
    height: 80px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'%3E%3Crect width='120' height='80' fill='%23333333'/%3E%3Ctext x='60' y='40' font-family='Arial' font-size='12' fill='white' text-anchor='middle' dominant-baseline='middle'%3E图片%3C/text%3E%3C/svg%3E");
    background-repeat: no-repeat;

    &--contain {
      width: 120px;
      height: 80px;
      object-fit: contain;
    }

    &--cover {
      width: 250px;
      height: 80px;
      object-fit: cover;
    }

    &--none {
      width: 300px;
      height: 200px;
      object-fit: none;
    }

    &--scale-down {
      width: 80px;
      height: 50px;
      object-fit: scale-down;
    }
  }

  &__fit-example-desc {
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
    max-width: 200px;
  }

  &__actions-overlay {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 2;
  }

  &__download-btn {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;

    &:hover {
      background-color: var(--primary-color);
    }
  }
}

:deep(.el-dialog) {
  border-radius: var(--border-radius-base);
  border: none;
  background-color: var(--background-color-light);

  .el-dialog__header {
    border-bottom: none;

    .el-dialog__title {
      color: var(--text-primary);
    }
  }

  .el-dialog__body {
    color: var(--text-regular);
  }

  .el-dialog__footer {
    border-top: none;

    .el-button {
      border: none;
      background-color: var(--primary-color);
      color: var(--background-color-light);

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>
