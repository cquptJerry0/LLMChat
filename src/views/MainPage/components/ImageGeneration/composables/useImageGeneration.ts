import { ref, computed, onMounted } from 'vue';
import { useSettingStore, imageModelOptions, imageSizeOptions, batchSizeOptions, stepsOptions, guidanceScaleOptions } from '@/stores/setting';
import { useImageGalleryStore } from '@/stores';
import { imageGenerationService } from '@/services';
import type { ImageGenerationParams } from '@/types/imageGeneration';
import { ElMessage, ElMessageBox } from 'element-plus';

export function useImageGeneration() {
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

  // 保存API密钥到设置
  const saveApiKey = () => {
    settingStore.settings.apiKey = apiKey.value;
    ElMessage.success('API密钥已保存');
  };

  // 更新图片模型
  const updateModel = (model: string) => {
    settingStore.updateImageSettings({ model });
  };

  // 更新图片尺寸
  const updateImageSize = (size: string) => {
    settingStore.updateImageSettings({ image_size: size });
  };

  // 图片生成API调用
  const generateImage = async (uploadedImage?: string | null) => {
    if (!apiKey.value) {
      errorMessage.value = '请先设置API密钥';
      ElMessage.error(errorMessage.value);
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
        seed: useSeed.value ? seed.value : undefined,
        image: uploadedImage || undefined // 添加上传的图片
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
        ElMessage.error(errorMessage.value);
        isLoading.value = false;
      }
    } catch (error: any) {
      console.error('生成图片错误:', error);
      errorMessage.value = `生成图片错误: ${error.message || '未知错误'}`;
      ElMessage.error(errorMessage.value);
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
        ElMessage.error(errorMessage.value);
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
      ElMessage.success('图片已保存到图库');
    } catch (error) {
      console.error('保存到图片库失败:', error);
      ElMessage.error('保存失败');
    }
  };

  // 删除图片
  const deleteImageFromGallery = async (id: string) => {
    await imageGalleryStore.deleteImage(id);
    ElMessage.success('图片已删除');
  };

  // 清空图片库
  const clearGallery = async () => {
    try {
      await ElMessageBox.confirm('确定要清空所有图片吗？此操作不可恢复。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });

      await imageGalleryStore.clearAllImages();
      ElMessage.success('图片库已清空');
    } catch {
      // 用户取消操作
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

    // 如果当前是图片库标签，加载图片
    if (activeTab.value === 'gallery') {
      imageGalleryStore.loadImages();
    }
  });

  return {
    // 状态
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
    activeTab,
    imageGalleryStore,

    // 选项常量
    imageModelOptions,
    imageSizeOptions,
    batchSizeOptions,
    stepsOptions,
    guidanceScaleOptions,

    // 方法
    generateNewSeed,
    resetSettings,
    saveApiKey,
    updateModel,
    updateImageSize,
    generateImage,
    saveToGallery,
    manualSaveToGallery,
    deleteImageFromGallery,
    clearGallery,
    switchTab,
    toggleUseSeed
  };
}
