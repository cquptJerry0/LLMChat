# LLM-Chat-Box 2.0

一个现代化的大型语言模型聊天界面，基于Vue 3和Vite构建，提供流畅的流式响应体验。

## 核心特性

- **流式响应控制**：支持暂停、恢复、中止生成的完整流程控制
- **双主题模式**：内置明亮和暗黑主题切换
- **会话管理**：支持多会话创建和切换
- **持久化存储**：自动保存会话和设置
- **Markdown渲染**：支持代码高亮和格式化显示
- **响应式设计**：适配不同设备屏幕

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI组件**：Element Plus
- **状态管理**：Pinia
- **样式处理**：SCSS

## 项目结构

```
src/
├── assets/        # 静态资源
├── components/    # 通用组件
├── composables/   # 组合式API
├── constants/     # 常量定义
├── router/        # 路由配置
├── services/      # API服务
├── stores/        # 状态管理
├── styles/        # 全局样式
├── types/         # 类型定义
├── utils/         # 工具函数
└── views/         # 页面视图
```

## 流控制架构

项目实现了完整的流控制架构，包括：

- **StreamControl**：流控制器，负责流的生命周期管理
- **StreamStore**：流状态存储，管理状态和持久化
- **ConversationControl**：会话控制器，处理消息管理
- **检查点系统**：支持状态保存和恢复

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 后续开发计划

- 优化移动端体验
- 增加文件上传功能
