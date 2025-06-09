<script setup>
import { ref } from 'vue'
// import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import { WarningFilled } from '@element-plus/icons-vue'

const chatStore = useChatStore()
const dialogVisible = ref(false)
const inputTitle = ref('')
const currentConversationId = ref(null)
const dialogType = ref('edit') // 新增：区分对话框类型（edit/delete）

// 打开对话框
const openDialog = (conversationId, type = 'edit') => {
  currentConversationId.value = conversationId
  dialogType.value = type

  if (type === 'edit') {
    const conversation = chatStore.conversations.find((c) => c.id === conversationId)
    inputTitle.value = conversation?.title || ''
  }

  dialogVisible.value = true
}

// 确认操作
const handleConfirm = () => {
  if (dialogType.value === 'edit') {
    if (!inputTitle.value.trim()) {
      // ElMessage.warning('标题不能为空')
      return
    }
    chatStore.updateConversationTitle(currentConversationId.value, inputTitle.value.trim())
    // ElMessage.success('修改成功')
  } else {
    chatStore.deleteConversation(currentConversationId.value)
    // ElMessage.success('删除成功')
  }
  dialogVisible.value = false
  inputTitle.value = ''
}

// 取消操作
const handleCancel = () => {
  dialogVisible.value = false
  inputTitle.value = ''
}

// 导出方法供父组件调用
defineExpose({
  openDialog,
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogType === 'edit' ? '编辑对话名称' : '确定删除对话?'"
    width="30%"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <!-- 编辑模式显示输入框 -->
    <template v-if="dialogType === 'edit'">
      <el-input v-model="inputTitle" placeholder="请输入对话名称" maxlength="50" />
    </template>
    <!-- 删除模式显示警告文本 -->
    <template v-else>
      <div class="dialog-edit__warning">
        <el-icon class="dialog-edit__warning-icon"><WarningFilled /></el-icon>
        <span>删除后，聊天记录将不可恢复。</span>
      </div>
    </template>

    <template #footer>
      <span class="dialog-edit__footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button :type="dialogType === 'edit' ? 'primary' : 'danger'" @click="handleConfirm">
          {{ dialogType === 'edit' ? '确定' : '删除' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
/*
 * 对话框编辑组件
 * 用于编辑对话标题或删除对话
 * 使用 BEM 命名规范: dialog-edit 作为块名
 */

.dialog-edit {
  /* 对话框底部按钮容器 */
  &__footer {
    display: flex; /* 采用弹性布局实现按钮水平排列 */
    justify-content: flex-end; /* 按钮靠右对齐，符合常见对话框布局习惯 */
    gap: 12px; /* 按钮之间的间距，提供合适的空间防止误触 */
  }

  /* 删除警告信息容器 */
  &__warning {
    display: flex; /* 采用弹性布局让图标和文本水平排列 */
    align-items: center; /* 垂直居中对齐，使视觉效果更加整洁 */
    gap: 8px; /* 图标与文本之间的间距，提供良好的视觉分隔 */
    color: #606266; /* 文本采用中性灰色，不过于强调但保持可读性 */

    /* 警告图标样式 */
    &-icon {
      color: #ed3336; /* 警告图标使用红色，传达删除操作的风险 */
      font-size: 20px; /* 图标尺寸适中，确保足够引人注意但不过分夸张 */
    }
  }
}
</style>
