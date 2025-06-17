declare module 'vue-virtual-scroll-list' {
  import { DefineComponent } from 'vue'
  const VirtualList: DefineComponent<{
    dataKey: string | ((item: any) => string)
    dataSources: any[]
    dataComponent: any
    keeps?: number
    extraProps?: object
    estimateSize?: number
    direction?: 'vertical' | 'horizontal'
    start?: number
    offset?: number
    topThreshold?: number
    bottomThreshold?: number
    pageMode?: boolean
    rootTag?: string
    wrapTag?: string
    wrapClass?: string
    wrapStyle?: object
    itemTag?: string
    itemClass?: string
    itemClassAdd?: (index: number) => string
    itemStyle?: object
    headerTag?: string
    headerClass?: string
    headerStyle?: object
    footerTag?: string
    footerClass?: string
    footerStyle?: object
    itemScopedSlots?: object
  }>
  export default VirtualList
}
