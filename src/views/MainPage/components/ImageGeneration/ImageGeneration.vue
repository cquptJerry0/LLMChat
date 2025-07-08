<script setup lang="ts">
import { ref, computed } from 'vue';
import GenerationPanel from './components/GenerationPanel.vue';
import GalleryPanel from './components/GalleryPanel.vue';
import { useImageGeneration } from './composables/useImageGeneration';

// 使用图片生成相关的逻辑
const { activeTab, switchTab } = useImageGeneration();

// 本地活动标签值
const localActiveTab = computed({
  get: () => activeTab.value,
  set: (val) => switchTab(val)
});
</script>

<template>
  <div class="image-generation">
    <el-tabs v-model="localActiveTab" class="image-generation__tabs">
      <el-tab-pane label="生成图片" name="generate">
        <GenerationPanel />
      </el-tab-pane>
      <el-tab-pane label="图片库" name="gallery">
        <GalleryPanel />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.image-generation {
  height: 100%;
  width: 100%;
  padding: var(--spacing-base);
  background-color: var(--background-color-light);
  display: flex;
  flex-direction: column;

  &__tabs {
    height: 100%;
    display: flex;
    flex-direction: column;

    :deep(.el-tabs__header) {
      border-bottom: none;
      margin-bottom: var(--spacing-base);

      .el-tabs__nav-wrap::after {
        content: none;
      }

      .el-tabs__active-bar {
        background-color: var(--primary-color);
      }

      .el-tabs__item {
        color: var(--text-secondary);

        &.is-active {
          color: var(--primary-color);
        }

        &:hover {
          color: var(--text-primary);
        }
      }
    }

    :deep(.el-tabs__content) {
      height: calc(100% - 40px);
      overflow-y: auto;
      border: none;
      flex: 1;
      display: flex;
      flex-direction: column;

      .el-tab-pane {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
    }
  }
}
</style>
