declare module 'markdown-it-link-attributes' {
  import MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginWithOptions<{
    attrs: Record<string, string>
  }>
  export default plugin
}