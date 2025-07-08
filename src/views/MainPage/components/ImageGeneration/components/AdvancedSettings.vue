<script setup lang="ts">
import { computed } from 'vue';
import { stepsOptions, guidanceScaleOptions } from '@/stores/setting';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  negativePrompt: {
    type: String,
    default: ''
  },
  steps: {
    type: Number,
    default: 20
  },
  guidance: {
    type: Number,
    default: 7.5
  },
  useSeed: {
    type: Boolean,
    default: false
  },
  seed: {
    type: Number,
    default: undefined
  },
  autoSave: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits([
  'update:show',
  'update:negativePrompt',
  'update:steps',
  'update:guidance',
  'update:useSeed',
  'update:seed',
  'update:autoSave',
  'generateSeed'
]);

// 本地状态，用于双向绑定
const localNegativePrompt = computed({
  get: () => props.negativePrompt,
  set: (val) => emit('update:negativePrompt', val)
});

const localSteps = computed({
  get: () => props.steps,
  set: (val) => emit('update:steps', val)
});

const localGuidance = computed({
  get: () => props.guidance,
  set: (val) => emit('update:guidance', val)
});

const localUseSeed = computed({
  get: () => props.useSeed,
  set: (val) => emit('update:useSeed', val)
});

const localSeed = computed({
  get: () => props.seed,
  set: (val) => emit('update:seed', val)
});

const localAutoSave = computed({
  get: () => props.autoSave,
  set: (val) => emit('update:autoSave', val)
});

// 切换高级设置显示
const toggleSettings = () => {
  emit('update:show', !props.show);
};

// 生成新随机种子
const generateNewSeed = () => {
  emit('generateSeed');
};
</script>

<template>
  <div class="advanced-settings">
    <div class="advanced-settings__toggle" @click="toggleSettings">
      <span class="advanced-settings__toggle-text">高级设置</span>
      <span class="advanced-settings__toggle-icon">{{ show ? '▼' : '▶' }}</span>
    </div>

    <el-collapse-transition>
      <div v-if="show" class="advanced-settings__panel">
        <el-form-item label="反向提示词" class="advanced-settings__form-item">
          <el-input
            v-model="localNegativePrompt"
            type="textarea"
            :rows="2"
            placeholder="不希望出现在图片中的元素"
            class="advanced-settings__input"
          />
        </el-form-item>

        <div class="advanced-settings__grid">
          <el-form-item label="推理步数" class="advanced-settings__form-item">
            <el-select
              v-model="localSteps"
              class="advanced-settings__select"
            >
              <el-option
                v-for="option in stepsOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="引导系数" class="advanced-settings__form-item">
            <el-select
              v-model="localGuidance"
              class="advanced-settings__select"
            >
              <el-option
                v-for="option in guidanceScaleOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </div>

        <div class="advanced-settings__grid">
          <div class="advanced-settings__seed-container">
            <el-form-item label="随机种子" class="advanced-settings__form-item">
              <div class="advanced-settings__seed-group">
                <el-checkbox
                  v-model="localUseSeed"
                  class="advanced-settings__checkbox"
                >
                  使用固定随机种子
                </el-checkbox>

                <div v-if="localUseSeed" class="advanced-settings__seed-input">
                  <el-input
                    v-model.number="localSeed"
                    type="number"
                    placeholder="随机种子值"
                    class="advanced-settings__number-input"
                  />
                  <el-button
                    size="small"
                    @click="generateNewSeed"
                    class="advanced-settings__generate-btn"
                  >
                    随机
                  </el-button>
                </div>
              </div>
            </el-form-item>
          </div>

          <div class="advanced-settings__autosave-container">
            <el-form-item class="advanced-settings__form-item">
              <el-checkbox
                v-model="localAutoSave"
                class="advanced-settings__checkbox"
              >
                自动保存到图库
              </el-checkbox>
            </el-form-item>
          </div>
        </div>
      </div>
    </el-collapse-transition>
  </div>
</template>

<style lang="scss" scoped>
.advanced-settings {
  margin: var(--spacing-base) 0;

  &__toggle {
    display: flex;
    justify-content: space-between;
    padding: var(--spacing-small) 0;
    color: var(--primary-color);
    font-weight: bold;
    cursor: pointer;

    &-text {
      font-size: var(--font-size-base);
    }

    &-icon {
      transition: transform 0.3s ease;
    }
  }

  &__panel {
    padding: var(--spacing-base);
    background-color: var(--background-color-base);
    border-radius: var(--border-radius-base);
    margin-top: var(--spacing-small);
    border: none;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-base);
    margin-bottom: var(--spacing-base);

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: var(--spacing-small);
    }
  }

  &__seed-container {
    @media (max-width: 768px) {
      margin-bottom: var(--spacing-small);
    }
  }

  &__autosave-container {
    display: flex;
    align-items: center;

    @media (max-width: 768px) {
      margin-top: var(--spacing-base);
    }
  }

  &__form-item {
    margin-bottom: var(--spacing-small);
    width: 100%;

    :deep(.el-form-item__label) {
      color: var(--text-primary);
    }
  }

  &__input,
  &__select,
  &__number-input {
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

  &__input {
    :deep(.el-textarea__inner) {
      height: 100px;
      max-height: 100px;
      overflow-y: auto;
      resize: none;

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
  }

  :deep(.el-select-dropdown__item) {
    &.selected {
      color: var(--primary-color);
    }
  }

  &__seed-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-small);
  }

  &__seed-input {
    display: flex;
    gap: var(--spacing-small);
    align-items: center;

    @media (max-width: 480px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__checkbox {
    margin-right: var(--spacing-small);

    :deep(.el-checkbox__input) {
      &.is-checked {
        .el-checkbox__inner {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
        }
      }

      .el-checkbox__inner {
        border-color: var(--border-color);
        background-color: var(--background-color-light);
      }
    }

    :deep(.el-checkbox__label) {
      color: var(--text-primary);
    }
  }

  &__generate-btn {
    flex-shrink: 0;
    border: none;
    background-color: var(--background-color-base);
    color: var(--text-primary);

    @media (max-width: 480px) {
      width: 100%;
      margin-top: var(--spacing-mini);
    }

    &:hover {
      color: var(--primary-color);
      background-color: var(--background-color-base);
    }
  }
}

:deep(.el-collapse-transition) {
  transition: all 0.3s ease;
}
</style>
