<script setup lang="ts">
import { onMounted } from 'vue';
import ImageCard from './ImageCard.vue';
import { useImageGeneration } from '../composables/useImageGeneration';

// 使用图片生成相关的逻辑
const {
  imageGalleryStore,
  deleteImageFromGallery,
  clearGallery
} = useImageGeneration();

// 组件挂载时加载图片库
onMounted(() => {
  imageGalleryStore.loadImages();
});
</script>

<template>
  <div class="gallery-panel">
    <div class="gallery-panel__header">
      <h2 class="gallery-panel__title">我的图片库</h2>
      <el-button
        v-if="imageGalleryStore.images.length > 0"
        type="danger"
        @click="clearGallery"
        class="gallery-panel__clear-btn"
      >
        清空图片库
      </el-button>
    </div>

    <div v-if="imageGalleryStore.isLoading" class="gallery-panel__loading">
      <el-skeleton :rows="3" animated />
      <div class="gallery-panel__loading-text">加载图片库...</div>
    </div>

    <div v-else-if="imageGalleryStore.images.length === 0" class="gallery-panel__empty">
      <div class="gallery-panel__empty-content">
        <el-icon class="gallery-panel__empty-icon"><picture-outlined /></el-icon>
        <p class="gallery-panel__empty-text">图片库为空，生成一些图片吧！</p>
      </div>
    </div>

    <div v-else class="gallery-panel__grid">
      <div
        v-for="image in imageGalleryStore.images"
        :key="image.id"
        class="gallery-panel__grid-item"
      >
        <ImageCard
          :image-data="image.imageData"
          :prompt="image.prompt"
          :model="image.model"
          :size="image.size"
          :created-at="image.createdAt"
          :image-fit="'scale-down'"
          :show-delete="true"
          @delete="deleteImageFromGallery(image.id)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gallery-panel {
  height: 100%;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-large);

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-small);
    }
  }

  &__title {
    margin: 0;
    font-size: var(--font-size-xl);
    color: var(--text-primary);
  }

  &__clear-btn {
    flex-shrink: 0;
    border: none;
    background-color: var(--danger-color);
    color: var(--background-color-light);

    @media (max-width: 480px) {
      width: 100%;
    }

    &:hover {
      opacity: 0.9;
      background-color: var(--danger-color);
    }
  }

  &__loading {
    padding: var(--spacing-large);
    flex: 1;

    :deep(.el-skeleton__item) {
      background: var(--background-color-base);
    }
  }

  &__loading-text {
    text-align: center;
    margin-top: var(--spacing-base);
    color: var(--text-secondary);
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 300px;
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
    font-size: var(--font-size-base);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--spacing-base);
    overflow-y: auto;
    flex: 1;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--border-color);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-track {
      background-color: var(--background-color-base);
    }
  }

  &__grid-item {
    width: 100%;
    margin-bottom: var(--spacing-base);
  }
}
</style>
