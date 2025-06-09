<script setup>
import { ref, watch, computed } from 'vue'
import { useSettingStore, modelOptions } from '@/stores/setting'
import { QuestionFilled } from '@element-plus/icons-vue'

const settingStore = useSettingStore()

// 控制抽屉显示
const visible = ref(false)

// 计算当前选中模型的最大 tokens
const currentMaxTokens = computed(() => {
  const selectedModel = modelOptions.find((option) => option.value === settingStore.settings.model)
  return selectedModel ? selectedModel.maxTokens : 4096
})

// 监听模型变化
watch(
  () => settingStore.settings.model,
  (newModel) => {
    const selectedModel = modelOptions.find((option) => option.value === newModel)
    if (selectedModel) {
      // 更新 maxTokens，并确保不超过模型的最大值
      settingStore.settings.maxTokens = Math.min(
        settingStore.settings.maxTokens,
        selectedModel.maxTokens,
      )
    }
  },
)

// 打开抽屉
const openDrawer = () => {
  visible.value = true
}

// 导出方法供父组件调用
defineExpose({
  openDrawer,
})
</script>

<template>
  <el-drawer v-model="visible" title="设置" direction="rtl" size="350px">
    <div class="settings-panel">
      <!-- 模型选择 -->
      <div class="settings-panel__item">
        <div class="settings-panel__label">Model</div>
        <el-select
          v-model="settingStore.settings.model"
          class="settings-panel__model-select"
          placeholder="选择模型"
        >
          <el-option
            v-for="option in modelOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>

      <!-- 流式响应开关 -->
      <div class="settings-panel__item">
        <div class="settings-panel__label-row">
          <div class="settings-panel__label-with-tooltip">
            <span>流式响应</span>
            <el-tooltip content="开启后将流式响应 AI 的回复" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
          <el-switch v-model="settingStore.settings.stream" />
        </div>
      </div>

      <!-- API Key -->
      <div class="settings-panel__item">
        <div class="settings-panel__label-row">
          <div class="settings-panel__label-with-tooltip">
            <span>API Key</span>
            <el-tooltip content="设置 API Key" placement="top">
              <el-icon><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>

          <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" class="settings-panel__link">
            获取 API Key
          </a>
        </div>
        <el-input
          v-model="settingStore.settings.apiKey"
          type="password"
          placeholder="请输入 API Key"
          show-password
        />
      </div>

      <!-- Max Tokens -->
      <div class="settings-panel__item">
        <div class="settings-panel__label">
          Max Tokens
          <el-tooltip content="生成文本的最大长度" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="settings-panel__control">
          <el-slider
            v-model="settingStore.settings.maxTokens"
            :min="1"
            :max="currentMaxTokens"
            :step="1"
            :show-tooltip="false"
            class="settings-panel__slider"
          />
          <el-input-number
            v-model="settingStore.settings.maxTokens"
            :min="1"
            :max="currentMaxTokens"
            :step="1"
            controls-position="right"
          />
        </div>
      </div>

      <!-- Temperature -->
      <div class="settings-panel__item">
        <div class="settings-panel__label">
          Temperature
          <el-tooltip content="值越高，回答越随机" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="settings-panel__control">
          <el-slider
            v-model="settingStore.settings.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :show-tooltip="false"
            class="settings-panel__slider"
          />
          <el-input-number
            v-model="settingStore.settings.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            controls-position="right"
          />
        </div>
      </div>

      <!-- Top-P -->
      <div class="settings-panel__item">
        <div class="settings-panel__label">
          Top-P
          <el-tooltip content="核采样阈值" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="settings-panel__control">
          <el-slider
            v-model="settingStore.settings.topP"
            :min="0"
            :max="1"
            :step="0.1"
            :show-tooltip="false"
            class="settings-panel__slider"
          />
          <el-input-number
            v-model="settingStore.settings.topP"
            :min="0"
            :max="1"
            :step="0.1"
            controls-position="right"
          />
        </div>
      </div>

      <!-- Top-K -->
      <div class="settings-panel__item">
        <div class="settings-panel__label">
          Top-K
          <el-tooltip content="保留概率最高的 K 个词" placement="top">
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
        <div class="settings-panel__control">
          <el-slider
            v-model="settingStore.settings.topK"
            :min="1"
            :max="100"
            :step="1"
            :show-tooltip="false"
            class="settings-panel__slider"
          />
          <el-input-number
            v-model="settingStore.settings.topK"
            :min="1"
            :max="100"
            :step="1"
            controls-position="right"
          />
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
/*
 * 设置面板组件
 * 用于配置AI模型参数和系统设置
 * 使用 BEM 命名规范: settings-panel 作为块名
 */

.settings-panel {
  padding: 20px; /* 内边距，给内容提供呼吸空间 */
  color: #27272a; /* 深灰色文字，提供良好可读性 */

  /* 设置项容器 */
  &__item {
    margin-bottom: 24px; /* 项目之间的间距，形成清晰的视觉分组 */
  }

  /* 基础标签样式 */
  &__label {
    display: flex; /* 弹性布局，容纳文本和图标 */
    align-items: center; /* 垂直居中对齐 */
    gap: 8px; /* 文本和图标之间的间距 */
    margin-bottom: 8px; /* 与下方控件的间距 */
    font-weight: 500; /* 中等字重，增强可读性 */
    color: #27272a; /* 深灰色，确保与内容形成对比 */
  }

  /* 带提示的标签行 - 用于在同一行显示标签和控件 */
  &__label-row {
    display: flex; /* 弹性布局使元素水平排列 */
    justify-content: space-between; /* 两端对齐，标签在左，控件在右 */
    align-items: center; /* 垂直居中 */
    margin-bottom: 8px; /* 与下方元素保持间距 */
    color: #27272a; /* 深灰色文字 */
  }

  /* 标签和提示图标组合 */
  &__label-with-tooltip {
    display: flex; /* 弹性布局使标签和图标水平排列 */
    align-items: center; /* 垂直居中 */
    gap: 8px; /* 标签和图标之间的间距 */
  }

  /* 获取API Key链接 */
  &__link {
    font-size: 14px; /* 稍小的字体大小 */
    color: #3f7af1; /* 蓝色链接，与整体风格一致 */
    text-decoration: none; /* 无下划线，简洁外观 */

    /* 悬停效果 */
    &:hover {
      text-decoration: underline; /* 悬停时显示下划线，提示可点击 */
    }
  }

  /* 控件容器 - 用于包含滑块和数字输入框 */
  &__control {
    display: flex; /* 弹性布局使滑块和输入框水平排列 */
    align-items: center; /* 垂直居中 */
    gap: 16px; /* 控件之间的间距 */
  }

  /* 滑块样式 */
  &__slider {
    flex: 1; /* 占据剩余空间，最大化宽度 */
  }

  /* 模型选择下拉框 */
  &__model-select {
    width: 100%; /* 宽度占满容器 */
  }

  /* 自定义 Element Plus 下拉菜单项样式 */
  :deep(.el-select-dropdown__item) {
    color: #27272a; /* 与整体文字颜色一致 */
  }

  /* 自定义数字输入框宽度 */
  :deep(.el-input-number) {
    width: 120px; /* 固定宽度，保持一致性 */
  }
}
</style>
