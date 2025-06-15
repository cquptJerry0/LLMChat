// 导入ESLint核心配置
import js from '@eslint/js'
// 导入Vue插件，用于检查Vue单文件组件
import pluginVue from 'eslint-plugin-vue'
// 导入Prettier跳过格式化配置，避免ESLint和Prettier的格式化规则冲突
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
// 导入TypeScript ESLint插件，提供TypeScript特定的lint规则
import typescript from '@typescript-eslint/eslint-plugin'
// 导入TypeScript解析器，用于解析TypeScript代码
import typescriptParser from '@typescript-eslint/parser'

// 定义ESLint配置数组，每个对象代表一个配置
export default [
  // 定义需要进行lint检查的文件类型
  {
    name: 'app/files-to-lint', // 配置名称，方便调试和识别
    files: ['**/*.{js,mjs,jsx,ts,tsx,vue}'], // 匹配所有JavaScript、TypeScript和Vue文件
  },

  // 定义需要忽略的文件和目录
  {
    name: 'app/files-to-ignore', // 配置名称
    ignores: [
      '**/dist/**',     // 忽略构建输出目录
      '**/dist-ssr/**', // 忽略SSR构建输出目录
      '**/node_modules/**', // 忽略node_modules目录
      '**/coverage/**', // 忽略测试覆盖率报告目录
    ],
  },

  // 应用JavaScript推荐配置
  js.configs.recommended, // 包含基本的JavaScript最佳实践规则

  // 应用Vue配置
  ...pluginVue.configs['flat/vue3-recommended'], // 替换原来的 flat/essential
  {
    files: ['**/*.vue'],
    rules: {
      'vue/script-setup-uses-vars': 'error',
      'vue/no-setup-props-destructure': 'off'
    }
  },

  // TypeScript文件的特定配置
  {
    files: ['**/*.{ts,tsx,vue}'], // 应用于所有TypeScript和Vue文件
    languageOptions: {
      parser: typescriptParser, // 使用TypeScript解析器
      parserOptions: {
        ecmaVersion: 'latest', // 使用最新的ECMAScript版本
        sourceType: 'module',  // 将代码视为ES模块
      },
    },
    plugins: {
      '@typescript-eslint': typescript, // 注册TypeScript ESLint插件
    },
    rules: {
      // 应用TypeScript推荐规则集
      ...typescript.configs.recommended.rules, // 包含类型检查等TypeScript特定规则
    },
  },

  // 应用Prettier跳过格式化配置
  // 这确保ESLint不会应用与Prettier冲突的格式化规则
  skipFormatting,
]