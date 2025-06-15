<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Sidebar from './Sidebar.vue'

// 侧边栏折叠状态
const isSidebarCollapsed = ref(false)

// 切换侧边栏
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

</script>

<template>
  <el-container class="chat-layout">
    <!-- 侧边栏 -->
    <Sidebar
      :class="{ 'chat-layout__sidebar--collapsed': isSidebarCollapsed }"
      class="chat-layout__sidebar"
    />

    <!-- 主窗口 - 使用具名插槽 -->
    <el-container class="chat-layout__main">
      <slot name="main-window" :toggle-sidebar="toggleSidebar" />
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.chat-layout {
  width: 100%;
  height: 100%;
  background-color: var(--background-color-base);

  &__sidebar {
    width: 240px;
    height: 100%;
    transition: width 0.3s ease;

    &--collapsed {
      width: 0;
      overflow: hidden;
    }
  }

  &__main {
    flex: 1;
    height: 100%;
    overflow: hidden;
    background-color: #fff;
  }
}
.chat-layout__main {
  border-radius: 17px;
  border-top: 5px solid var(--background-color-base);
  border-right: 5px solid var(--background-color-base);
  border-bottom: 5px solid var(--background-color-base);
}
</style>
