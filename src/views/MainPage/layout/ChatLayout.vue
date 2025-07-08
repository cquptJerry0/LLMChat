<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Sidebar from './Sidebar.vue'
import {provide} from 'vue'
// 侧边栏折叠状态
const isSidebarCollapsed = ref(false)
provide('isSidebarCollapsed', isSidebarCollapsed)
// 切换侧边栏
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

// 快速侧边栏状态
const isQuickSidebarVisible = ref(false)
let hideQuickSidebarTimer: number | null = null

// 显示快速侧边栏
const showQuickSidebar = () => {
  if (hideQuickSidebarTimer) {
    clearTimeout(hideQuickSidebarTimer)
    hideQuickSidebarTimer = null
  }
  isQuickSidebarVisible.value = true
}

// 隐藏快速侧边栏（带延迟）
const hideQuickSidebarWithDelay = () => {
  hideQuickSidebarTimer = window.setTimeout(() => {
    isQuickSidebarVisible.value = false
  }, 300) as unknown as number
}

// 组件卸载时清理定时器
onMounted(() => {
  return () => {
    if (hideQuickSidebarTimer) {
      clearTimeout(hideQuickSidebarTimer)
    }
  }
})
</script>

<template>
  <el-container class="chat-layout">
    <!-- 侧边栏 -->
    <transition name="sidebar-fade">
    <Sidebar
        v-if="!isSidebarCollapsed"
      class="chat-layout__sidebar"
      @toggle-sidebar="toggleSidebar"
    />
    </transition>

    <!-- 触边显示侧边栏的触发区域 -->
    <div
      v-if="isSidebarCollapsed"
      class="sidebar-trigger-area"
      @mouseenter="showQuickSidebar"
    ></div>

    <!-- 快速侧边栏 -->
    <transition name="quick-sidebar">
      <div
        v-show="isQuickSidebarVisible && isSidebarCollapsed"
        class="quick-sidebar"
        @mouseleave="hideQuickSidebarWithDelay"
      >
        <Sidebar class="quick-sidebar__inner" />
      </div>
    </transition>

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
  position: relative; /* 为绝对定位元素提供定位上下文 */

  &__sidebar {
    width: 240px;
    height: 100%;
    transition: width 0.3s ease;
  }

  &__main {
    flex: 1;
    height: 100%;
    overflow: hidden;
    background-color: #fff;
  }
}

// 侧边栏过渡动画
.sidebar-fade-enter-active {
  animation: sidebar-slide-in 0.3s ease-out forwards;
  transform-origin: left;
}

.sidebar-fade-leave-active {
  animation: sidebar-slide-out 0.3s ease-in forwards;
  transform-origin: left;
}

@keyframes sidebar-slide-in {
  0% {
    opacity: 0;
    transform: translateX(-30px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes sidebar-slide-out {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-30px);
  }
}

// 侧边栏触发区域
.sidebar-trigger-area {
  position: absolute;
  left: 0;
  top: 50px;
  width: 8px;
  height: calc(100% - 50px);
  z-index: 100;
  cursor: pointer;
}

// 快速侧边栏
.quick-sidebar {
  position: absolute;
  left: 0;
  top: 50px; /* 从Header下方开始 */
  bottom: 0;
  width: 240px;
  display: flex;
  background-color: var(--background-color-base);
  border-radius: 10px;
  z-index: 99;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  &__inner {
    width: 240px !important;
    max-width: 240px !important;
    overflow: hidden !important;
  }

  :deep(.el-aside) {
    width: 240px !important;
    max-width: 240px !important;
  }
}

// 快速侧边栏动画
.quick-sidebar-enter-active {
  animation: quick-slide-in 0.25s ease-out forwards;
}

.quick-sidebar-leave-active {
  animation: quick-slide-out 0.25s ease-in forwards;
}

@keyframes quick-slide-in {
  0% {
    opacity: 0.6;
    transform: translateX(-100%);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes quick-slide-out {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0.6;
    transform: translateX(-100%);
  }
}

.chat-layout__main {
  border-radius: 17px;
  border-top: 5px solid var(--background-color-base);
  border-right: 5px solid var(--background-color-base);
  border-bottom: 5px solid var(--background-color-base);
}
</style>
