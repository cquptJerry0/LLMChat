<script setup lang="ts">
import { md } from '@/utils/markdown';
import { computed } from 'vue';
// 定义 props
const props = defineProps<{
  content: string
}>()
// 渲染 Markdown
const renderedContent = computed(() => {
  if (!props.content) return ''
  return md.render(props.content)
})
</script>

<template>
  <div class="markdown-render" v-html="renderedContent"></div>
</template>

<style lang="scss" scoped>
.markdown-render {
  :deep(p) {
    margin: 0.5em 0;
    line-height: 1.6;
  }

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  :deep(code) {
    font-family: monospace;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }

  :deep(pre) {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    margin: 1em 0;

    code {
      background-color: transparent;
      padding: 0;
      border-radius: 0;
    }
  }

  :deep(a) {
    color: var(--primary-color);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  :deep(ul), :deep(ol) {
    padding-left: 2em;
    margin: 0.5em 0;
  }

  :deep(li) {
    margin: 0.3em 0;
  }

  :deep(blockquote) {
    border-left: 4px solid var(--border-color-base);
    padding-left: 1em;
    margin: 1em 0;
    color: var(--text-secondary);
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;

    th, td {
      border: 1px solid var(--border-color-base);
      padding: 8px;
    }

    th {
      background-color: var(--background-color-base);
    }
  }
}
</style>
