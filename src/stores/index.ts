import { useNormalizedChatStore } from './normalizedChat'
import { useStreamStore } from './stream'
import { useSettingStore } from './setting'
import { useImageGalleryStore } from './imageGallery'
import { createPinia } from 'pinia'
import persist from 'pinia-plugin-persistedstate'
import type { Plugin } from 'vue'

const piniaPlugin: Plugin = {
  install: (app) => {
    app.use(createPinia().use(persist))
  }
}

export default piniaPlugin

export { useNormalizedChatStore, useStreamStore, useSettingStore, useImageGalleryStore }
