<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { Search, ChatLineRound, Document, Setting } from '@element-plus/icons-vue'
import SearchDialog from '@/components/SearchDialog.vue'

const searchText = ref('')
const showSearchDialog = ref(false)

// 处理搜索框点击
const handleSearchClick = () => {
  showSearchDialog.value = true
}

// 添加点击遮罩层关闭对话框的处理
const handleOverlayClick = (event) => {
  // 只有当点击的是遮罩层本身时才关闭对话框
  if (event.target.classList.contains('home__overlay')) {
    showSearchDialog.value = false
  }
}

// 处理点击外部关闭对话框
const handleClickOutside = (event) => {
  const searchDialog = document.querySelector('.home__dialog')
  if (
    searchDialog &&
    !searchDialog.contains(event.target) &&
    !event.target.closest('.home__search')
  ) {
    showSearchDialog.value = false
  }
}

// 处理快捷键
const handleKeydown = (event) => {
  // ESC 关闭对话框
  if (event.key === 'Escape') {
    showSearchDialog.value = false
  }
  // Cmd/Ctrl + K 打开对话框
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    showSearchDialog.value = true
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="home">
    <header class="home__header">
      <div class="home__header-left">
        <span class="home__logo">LLM Chat</span>
      </div>
      <div class="home__header-right">
        <div class="home__search" @click="handleSearchClick">
          <div class="home__search-input">
            <el-icon class="home__search-icon"><Search /></el-icon>
            <input type="text" placeholder="搜索" readonly v-model="searchText" />
            <div class="home__shortcut">⌘ K</div>
          </div>
        </div>
        <a href="https://github.com/Solomon-He/LLM-chat" target="_blank" class="home__github">
          <img src="@/assets/photo/github.png" alt="GitHub" class="home__github-icon" />
        </a>
      </div>
    </header>

    <!-- 主体内容 -->
    <main class="home__main">
      <div class="home__hero">
        <h1 class="home__title">LLM Chat 2.0 升级计划</h1>
        <p class="home__description">全新的对话体验，更多强大功能即将到来</p>

        <div class="home__features">
          <div class="home__feature">
            <el-icon class="home__feature-icon"><ChatLineRound /></el-icon>
            <h3>多模型支持</h3>
            <p>支持多种大语言模型的接入</p>
            <ul class="home__feature-list">
              <li>DeepSeek</li>
              <li>Claude</li>
              <li>GPT-4</li>
              <li>自定义模型接入</li>
            </ul>
          </div>

          <div class="home__feature">
            <el-icon class="home__feature-icon"><Document /></el-icon>
            <h3>增强的文件处理</h3>
            <p>更强大的文件处理能力</p>
            <ul class="home__feature-list">
              <li>PDF文档解析</li>
              <li>图片OCR识别</li>
              <li>Excel数据分析</li>
              <li>代码文件语法高亮</li>
            </ul>
          </div>

          <div class="home__feature">
            <el-icon class="home__feature-icon"><Setting /></el-icon>
            <h3>个性化配置</h3>
            <p>丰富的自定义选项</p>
            <ul class="home__feature-list">
              <li>自定义提示词</li>
              <li>对话风格设置</li>
              <li>多主题切换</li>
              <li>快捷键配置</li>
            </ul>
          </div>

          <div class="home__feature">
            <el-icon class="home__feature-icon"><Document /></el-icon>
            <h3>知识库功能</h3>
            <p>构建专属知识库</p>
            <ul class="home__feature-list">
              <li>文档语义搜索</li>
              <li>知识图谱构建</li>
              <li>上下文记忆增强</li>
              <li>多轮对话优化</li>
            </ul>
          </div>

          <div class="home__feature">
            <el-icon class="home__feature-icon"><Setting /></el-icon>
            <h3>插件系统</h3>
            <p>可扩展的插件生态</p>
            <ul class="home__feature-list">
              <li>工具型插件</li>
              <li>数据源插件</li>
              <li>可视化插件</li>
              <li>自定义插件开发</li>
            </ul>
          </div>

          <div class="home__feature">
            <el-icon class="home__feature-icon"><ChatLineRound /></el-icon>
            <h3>协作功能</h3>
            <p>团队协作新体验</p>
            <ul class="home__feature-list">
              <li>多人实时对话</li>
              <li>对话历史共享</li>
              <li>角色权限管理</li>
              <li>团队知识沉淀</li>
            </ul>
          </div>
        </div>

        <router-link to="/chat" class="home__button">
          <span class="home__button-text">开始体验</span>
          <div class="home__button-liquid"></div>
        </router-link>
      </div>
    </main>

    <!-- 搜索对话框 -->
    <Transition name="fade">
      <div v-if="showSearchDialog" class="home__overlay" @click="handleOverlayClick">
        <div class="home__dialog" @click.stop>
          <SearchDialog />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
/*
 * 首页组件
 * 包含头部导航、主体内容和搜索对话框
 * 使用 BEM 命名规范
 * 采用绿色主题 - 主色：#4CAF50，浅色：#E8F5E9，深色：#2E7D32
 */

.home {
  /* 主容器样式 */
  min-height: 100vh; /* 确保页面至少占满整个视口高度 */
  background-color: #fafefe; /* 极浅背景色提供舒适阅读体验 */

  /* 页面头部 */
  &__header {
    height: 64px; /* 固定头部高度 */
    padding: 0 32px; /* 左右内边距 */
    display: flex; /* 使用弹性布局 */
    align-items: center; /* 垂直居中 */
    justify-content: space-between; /* 两端对齐 */
    border-bottom: 1px solid #e8f5e9; /* 浅绿色底部边框 */
    background-color: #ffffff; /* 白色背景 */
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.05); /* 轻微阴影提升层次感 */

    /* 头部左侧区域 */
    &-left {
      flex-shrink: 0; /* 防止logo被压缩 */
    }

    /* 头部右侧区域 */
    &-right {
      display: flex; /* 使用弹性布局 */
      align-items: center; /* 垂直居中对齐 */
      gap: 16px; /* 子元素之间的间距 */
      flex: 1; /* 占据剩余空间 */
      justify-content: flex-end; /* 右对齐 */
    }
  }

  /* Logo文字 */
  &__logo {
    font-size: 22px;
    font-weight: 600;
    color: #2e7d32; /* 深绿色突出品牌标识 */
    cursor: pointer;
    user-select: none;
    white-space: nowrap; /* 防止文字换行 */
    transition: color 0.3s ease; /* 平滑过渡效果 */

    /* 悬停效果 */
    &:hover {
      color: #4caf50; /* 主绿色 */
    }
  }

  /* 搜索框容器 */
  &__search {
    flex: 1; /* 搜索框容器占据剩余空间 */
    max-width: 280px; /* 最大宽度限制 */
    min-width: 40px; /* 减小最小宽度 */
    margin-left: 16px; /* 与logo保持距离 */

    /* 悬停效果 */
    &:hover {
      .home__search-input {
        background-color: #f1f8e9; /* 浅绿色背景增强交互感 */
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.1); /* 轻微阴影提升层次感 */
      }
    }
  }

  /* 搜索输入框 */
  &__search-input {
    display: flex; /* 搜索框内部使用弹性布局 */
    align-items: center; /* 搜索框内部元素垂直居中 */
    width: 100%; /* 搜索框宽度填充容器 */
    height: 36px; /* 搜索框固定高度 */
    padding: 0 12px; /* 左右内边距 */
    border-radius: 8px; /* 圆角边框 */
    background-color: #f5f5f5; /* 浅灰色背景 */
    transition: all 0.3s ease; /* 平滑过渡效果 */
    cursor: pointer; /* 鼠标指针样式 */
  }

  /* 搜索图标 */
  &__search-icon {
    flex-shrink: 0; /* 防止图标被压缩 */
    font-size: 16px; /* 搜索图标大小 */
    color: #66bb6a; /* 绿色图标 */
    margin-right: 8px; /* 图标右侧间距 */
  }

  /* 搜索输入元素 */
  &__search-input input {
    flex: 1; /* 输入框占据剩余空间 */
    width: 0; /* 强制输入框从0开始计算宽度 */
    min-width: 0; /* 防止输入框溢出 */
    border: none; /* 移除输入框边框 */
    outline: none; /* 移除输入框轮廓 */
    background: none; /* 移除输入框背景 */
    font-size: 14px; /* 输入框字体大小 */
    color: #424242; /* 深灰色文字 */

    /* 占位符样式 */
    &::placeholder {
      color: #78909c; /* 浅灰色占位符 */
    }
  }

  /* 快捷键显示 */
  &__shortcut {
    flex-shrink: 0; /* 防止快捷键被压缩 */
    font-size: 12px; /* 快捷键文本大小 */
    color: #2e7d32; /* 深绿色快捷键文本 */
    background-color: #e8f5e9; /* 浅绿色背景 */
    padding: 2px 6px; /* 快捷键内边距 */
    border-radius: 4px; /* 快捷键圆角 */
    border: 1px solid #c8e6c9; /* 浅绿色边框 */
    font-weight: 500; /* 稍微加粗 */
  }

  /* GitHub链接 */
  &__github {
    display: flex; /* 使用弹性布局 */
    align-items: center; /* 垂直居中对齐 */
    height: 36px; /* 与搜索框保持相同高度 */
    flex-shrink: 0; /* 防止图标被压缩 */
    transition: transform 0.3s ease; /* 平滑过渡 */

    /* 悬停效果 */
    &:hover {
      transform: translateY(-2px) scale(1.05); /* 上浮并轻微放大 */
    }
  }

  /* GitHub图标 */
  &__github-icon {
    width: 24px; /* 图标宽度 */
    height: 24px; /* 图标高度 */
    cursor: pointer; /* 鼠标指针样式 */
    opacity: 0.85; /* 稍微降低不透明度 */
  }

  /* 主体内容 */
  &__main {
    padding: 80px 20px; /* 上下左右内边距 */
    max-width: 1200px; /* 最大宽度 */
    margin: 0 auto; /* 水平居中 */
  }

  /* 英雄区域 */
  &__hero {
    text-align: center; /* 文本居中 */
  }

  /* 主标题 */
  &__title {
    font-size: 48px; /* 大号字体突出标题 */
    font-weight: 700; /* 粗体强调 */
    color: #2e7d32; /* 深绿色文字 */
    margin-bottom: 24px; /* 下方间距 */
    letter-spacing: -0.5px; /* 字母间距稍微紧凑 */
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* 轻微文字阴影增强立体感 */
  }

  /* 描述文字 */
  &__description {
    font-size: 20px; /* 较大字体提升可读性 */
    color: #66bb6a; /* 中绿色文字 */
    max-width: 600px; /* 控制文本宽度提升可读性 */
    margin: 0 auto 64px; /* 上下间距，水平居中 */
    line-height: 1.5; /* 行高提升可读性 */
  }

  /* 特性区域 */
  &__features {
    display: grid; /* 使用网格布局 */
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    padding: 0 16px;
  }

  /* 单个特性卡片 */
  &__feature {
    padding: 32px; /* 内边距 */
    background: linear-gradient(145deg, #ffffff 0%, #f9fdf9 100%);
    border-radius: 16px; /* 圆角边框 */
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.08); /* 绿色阴影增强立体感 */
    transition: all 0.3s ease; /* 平滑过渡效果 */
    border: 1px solid #e8f5e9;

    /* 悬停效果 */
    &:hover {
      transform: translateY(-4px);
      border-color: #4caf50;
      background: linear-gradient(145deg, #ffffff 0%, #f1f8e9 100%);
    }

    /* 标题样式 */
    h3 {
      font-size: 22px; /* 较大字体突出标题 */
      font-weight: 600; /* 粗体强调 */
      color: #2e7d32; /* 深绿色文字 */
      margin-bottom: 16px; /* 下方间距 */
    }

    /* 段落样式 */
    p {
      font-size: 16px; /* 标准字体大小 */
      color: #4d4d4d; /* 深灰色文字 */
      line-height: 1.6; /* 行高提升可读性 */
      margin-bottom: 8px; /* 下方间距 */
    }
  }

  /* 特性图标 */
  &__feature-icon {
    font-size: 36px; /* 大图标尺寸 */
    color: #4caf50; /* 主绿色图标 */
    margin-bottom: 24px; /* 下方间距 */
    background-color: #f1f8e9; /* 浅绿色背景 */
    width: 72px; /* 固定宽度 */
    height: 72px; /* 固定高度 */
    border-radius: 50%; /* 圆形 */
    display: flex; /* 弹性布局 */
    align-items: center; /* 垂直居中 */
    justify-content: center; /* 水平居中 */
    margin-left: auto; /* 水平居中 */
    margin-right: auto; /* 水平居中 */
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15); /* 轻微阴影 */
    transition: all 0.3s ease; /* 平滑过渡 */

    /* 特性卡片悬停时图标效果 */
    .home__feature:hover & {
      transform: scale(1.1) rotate(10deg); /* 放大并旋转 */
      background-color: #e8f5e9; /* 背景色加深 */
    }
  }

  /* 特性注释文字 */
  &__feature-note {
    font-size: 13px; /* 小字体 */
    color: #78909c; /* 浅灰色文字 */
    margin-top: 12px; /* 上方间距 */
    font-style: italic; /* 斜体 */

    /* 高亮的注释文字 */
    &--highlight {
      color: #4caf50; /* 主绿色文字 */
      font-weight: 500; /* 加粗 */
    }
  }

  /* 开始按钮 */
  &__button {
    position: relative; /* 为子元素定位提供参考 */
    display: inline-block; /* 行内块元素 */
    padding: 20px 40px; /* 内边距 */
    font-size: 18px; /* 字体大小 */
    font-weight: 600; /* 粗体 */
    color: #fff; /* 白色文字 */
    background: #4caf50; /* 主绿色背景 */
    border-radius: 12px; /* 圆角边框 */
    text-decoration: none; /* 移除下划线 */
    overflow: hidden; /* 隐藏溢出内容 */
    cursor: pointer; /* 鼠标指针样式 */
    transition: all 0.3s ease; /* 平滑过渡效果 */
    box-shadow: 0 6px 30px -10px #4caf50; /* 绿色阴影 */
    border: none; /* 无边框 */

    /* 悬停效果 */
    &:hover {
      transform: translateY(-2px); /* 上浮效果 */
      box-shadow: 0 10px 40px -10px #4caf50; /* 增强阴影 */
      background: #43a047; /* 稍微深一点的绿色 */

      /* 发光滑动效果 */
      &::before {
        left: 100%; /* 移动至右侧 */
      }

      /* 液体动效 */
      .home__button-liquid {
        top: -120px; /* 上移 */
      }

      /* 文字效果增强 */
      .home__button-text {
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 1) 0%,
          rgba(255, 255, 255, 0.9) 50%,
          rgba(255, 255, 255, 0.7) 100%
        );
        background-clip: text;
        -webkit-background-clip: text;
      }
    }

    /* 点击效果 */
    &:active {
      transform: scale(0.98) translateY(0); /* 轻微缩小 */
      box-shadow: 0 5px 20px -10px #4caf50; /* 减弱阴影 */
    }

    /* 发光滑动效果 */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%; /* 初始位置在左侧 */
      width: 100%;
      height: 100%;
      background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      transition: 0.5s ease; /* 平滑过渡 */
    }
  }

  /* 按钮文字 */
  &__button-text {
    position: relative;
    z-index: 1; /* 确保文字在顶层 */
    color: rgba(255, 255, 255, 0.9);
    font-weight: 700;
    text-transform: uppercase; /* 大写字母 */
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0.8) 50%,
      rgba(255, 255, 255, 0.6) 100%
    );
    background-clip: text; /* 文字填充背景 */
    -webkit-background-clip: text;
    color: transparent; /* 透明文字显示背景 */
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3)); /* 文字阴影 */
  }

  /* 液体动效 */
  &__button-liquid {
    position: absolute;
    top: -80px; /* 初始位置 */
    left: 0;
    width: 200px;
    height: 200px;
    background: #66bb6a; /* 中绿色 */
    box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.3); /* 内阴影 */
    transition: 0.5s; /* 平滑过渡 */

    /* 液体波浪效果 - 前波浪 */
    &::before {
      content: '';
      position: absolute;
      width: 200%;
      height: 200%;
      top: 0;
      left: 50%;
      transform: translate(-50%, -75%);
      background: #fff;
      border-radius: 45%; /* 椭圆形状 */
      animation: liquid-wave1 5s linear infinite; /* 应用动画 */
    }

    /* 液体波浪效果 - 后波浪 */
    &::after {
      content: '';
      position: absolute;
      width: 200%;
      height: 200%;
      top: 0;
      left: 50%;
      transform: translate(-50%, -75%);
      background: #fff;
      border-radius: 40%; /* 稍微不同的椭圆形状 */
      animation: liquid-wave2 10s linear infinite; /* 应用不同速度的动画 */
    }
  }

  /* 遮罩层 */
  &__overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色背景 */
    display: flex;
    justify-content: center;
    z-index: 1000; /* 确保在最上层 */
    backdrop-filter: blur(3px); /* 背景模糊效果 */
  }

  /* 对话框容器 */
  &__dialog {
    margin-top: 15vh; /* 距顶部距离 */
    width: 640px; /* 固定宽度 */
    max-width: 95vw; /* 响应式限制 */
  }

  /* 特性列表样式 */
  &__feature-list {
    list-style: none;
    padding: 0;
    margin: 16px 0 0 0;

    li {
      position: relative;
      padding-left: 20px;
      margin-bottom: 8px;
      color: #4d4d4d;
      font-size: 14px;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        background-color: #4caf50;
        border-radius: 50%;
      }

      &:hover {
        color: #2e7d32;
        transform: translateX(4px);
        transition: all 0.3s ease;
      }
    }
  }
}

/* 液体波浪动画1 */
@keyframes liquid-wave1 {
  0% {
    transform: translate(-50%, -75%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -75%) rotate(360deg);
  }
}

/* 液体波浪动画2 */
@keyframes liquid-wave2 {
  0% {
    transform: translate(-50%, -75%) rotate(0deg);
  }
  100% {
    transform: translate(-50%, -75%) rotate(-360deg);
  }
}

/* 过渡动画 - 淡入淡出效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
