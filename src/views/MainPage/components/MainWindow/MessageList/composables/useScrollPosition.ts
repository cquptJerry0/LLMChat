import { ref } from 'vue'

export function useScrollPosition() {
    const shouldAutoScroll = ref(true)
    const scrollThreshold = 100

    const handleScroll = (data: {
        scrollTop: number
        scrollHeight: number
        clientHeight: number
    }) => {
        const { scrollTop, scrollHeight, clientHeight } = data
        const distanceToBottom = scrollHeight - scrollTop - clientHeight
        shouldAutoScroll.value = distanceToBottom < scrollThreshold
    }

    const scrollToBottom = () => {
        // 由VirtualScroller组件实现
        const virtualScroller = document.querySelector('.virtual-scroller')
        if (virtualScroller) {
            virtualScroller.scrollTop = virtualScroller.scrollHeight
        }
    }

    const scrollToMessage = (messageId: string) => {
        // TODO: 实现滚动到指定消息的逻辑
        console.log('Scroll to message:', messageId)
    }

    return {
        shouldAutoScroll,
        handleScroll,
        scrollToBottom,
        scrollToMessage
    }
}
