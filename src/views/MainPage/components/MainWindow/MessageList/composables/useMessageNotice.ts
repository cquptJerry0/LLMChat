import { ref, computed, type Ref } from 'vue'

export function useMessageNotice(shouldAutoScroll: Ref<boolean>) {
  const newMessageCount = ref(0)
  const hasNewMessage = ref(false)

  const showNewMessageNotice = computed(() => {
    return hasNewMessage.value && !shouldAutoScroll.value
  })

  const handleNewMessage = () => {
    if (!shouldAutoScroll.value) {
      newMessageCount.value++
      hasNewMessage.value = true
    }
  }

  const resetNotice = () => {
    newMessageCount.value = 0
    hasNewMessage.value = false
  }

  return {
    newMessageCount,
    hasNewMessage,
    showNewMessageNotice,
    handleNewMessage,
    resetNotice
  }
}
