<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { useSettingStore, modelOptions } from '@/stores/setting'

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
  (newModel: string) => {
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
const open = () => {
  visible.value = true
}

// 导出方法供父组件调用
defineExpose({
  open,
})
</script>

<template>
  <el-drawer v-model="visible" title="设置" direction="rtl" size="350px" class="settings-drawer">
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
.settings-panel {
  padding: 20px;
  color: var(--text-primary);
  background-color: var(--background-color-light);

  &__item {
    margin-bottom: 24px;
  }

  &__label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-weight: 500;
    color: #e0e0e0; /* 浅灰色文字 */
  }

  &__label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    color: #e0e0e0; /* 浅灰色文字 */
  }

  &__label-with-tooltip {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__link {
    font-size: 14px;
    color: black; /* 黑色链接 */
    text-decoration: none;

    &:hover {
      text-decoration: underline;
      color: #333; /* 悬停时深灰色 */
    }
  }

  &__control {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  &__slider {
    flex: 1;
  }

  &__model-select {
    width: 100%;
  }

  :deep(.el-input-number) {
    width: 120px;
  }

  :deep(.el-icon.el-drawer__close:hover) {
    color: var(--text-primary) !important;
  }

  /* 暗色主题下的元素样式覆盖 */
  :deep(.el-input) {
    --el-input-bg-color: var(--background-color-base);
    --el-input-border-color: var(--border-color-base);
    --el-input-text-color: var(--text-primary);
  }

  :deep(.el-select) {
    --el-select-border-color-hover: #555;
    --el-select-text-color: black;
    --el-select-input-text-color: black;
  }

  :deep(.el-select__wrapper.is-focused) {
    box-shadow: rgb(186, 192, 199) 0px 0px 0px 1px inset !important;
  }

  /* 修改选择框中显示的文本颜色 */
  :deep(.el-select .el-input__inner) {
    color: black;
  }

  :deep(.el-slider) {
    --el-slider-main-bg-color: #b1bac2;
  }

  :deep(.el-switch) {
    --el-switch-on-color: black;
  }

  :deep(.el-tooltip__trigger) {
    --el-color-primary: black;
  }

  :deep(.el-input__wrapper) {
    box-shadow: 0px 0px 0px 0px;
  }

  :deep(.el-input__wrapper.is-focus) {
    box-shadow: rgb(186, 192, 199) 0px 0px 0px 1px inset !important;
  }
}
</style>

<style>
/* 修改下拉选择框中选中项的文字颜色和背景色 */
.el-select-dropdown__item.selected {
  color: black !important;
  background-color: #f0f0f0 !important;
}

/* 修改下拉框中的文字颜色 */
.el-select-dropdown__item {
  color: #333 !important;
}

/* 修改下拉框的焦点边框颜色 */
.el-popper.is-light .el-popper__arrow::before {
  border-color: #dcdfe6 !important;
}

/* 修改下拉框的边框颜色 */
.el-popper.is-light {
  border-color: #dcdfe6 !important;
}

.el-drawer__header .el-drawer__close-btn .el-icon.el-drawer__close:hover {
  color: #333 !important;
  background-color: var(--background-color-light) !important;
}
</style>
