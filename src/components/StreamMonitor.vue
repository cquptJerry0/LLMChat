<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useStreamStore } from '@/stores/stream'
import { ElProgress, ElButton, ElDivider, ElTag } from 'element-plus'
import { StreamStatus } from '@/types/stream'
import type { StreamState } from '@/types/stream'

const streamStore = useStreamStore()

// 活跃流任务
const streams = computed(() => streamStore.streams)
const activeStreams = computed(() => {
  const result = new Map<string, StreamState>()
  streams.value.forEach((stream, id) => {
    if (stream.status === StreamStatus.STREAMING || stream.status === StreamStatus.PAUSED) {
      result.set(id, stream)
    }
  })
  return result
})
const activeStreamsEntries = computed(() => Array.from(activeStreams.value.entries()))

// 统计信息
const completedCount = ref(0)
const failedCount = ref(0)
const averageSpeed = ref(0)

// 刷新统计信息
const refreshStats = () => {
  // 计算已完成的流数量
  let completed = 0
  let failed = 0

  streams.value.forEach(stream => {
    if (stream.status === StreamStatus.COMPLETED) {
      completed++
    } else if (stream.status === StreamStatus.ERROR) {
      failed++
    }
  })

  completedCount.value = completed
  failedCount.value = failed

  // 计算平均速度
  if (activeStreamsEntries.value.length > 0) {
    let totalSpeed = 0
    activeStreamsEntries.value.forEach(([_, stream]) => {
      // 这里假设 stream 有 speed 属性，如果没有可以调整
      const speed = stream.lastCompletionTokens /
        ((stream.pauseTime || Date.now()) - stream.startTime) * 1000 || 0
      totalSpeed += speed
    })
    averageSpeed.value = Math.round(totalSpeed / activeStreamsEntries.value.length)
  } else {
    averageSpeed.value = 0
  }
}

// 自动刷新统计信息
let refreshInterval: number | null = null

onMounted(() => {
  refreshStats()
  refreshInterval = window.setInterval(() => {
    refreshStats()
  }, 2000) as unknown as number
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (refreshInterval !== null) {
    clearInterval(refreshInterval)
  }
})

// 流控制方法
const pauseStream = (id: string) => {
  const messageId = id.replace('stream_', '')
  streamStore.pauseStream(messageId)
}

const resumeStream = (id: string) => {
  const messageId = id.replace('stream_', '')
  streamStore.resumeStream(messageId)
}

const cancelStream = (id: string) => {
  const messageId = id.replace('stream_', '')
  // 设置为错误状态，相当于取消
  streamStore.setStreamError(messageId, '用户取消')
}

// 格式化时间戳
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

// 计算流进度百分比
const calculateProgress = (stream: StreamState) => {
  // 这里可以根据实际情况计算进度
  // 如果没有明确的进度信息，可以根据时间估算
  if (stream.status === StreamStatus.COMPLETED) return 100

  const duration = (stream.pauseTime || Date.now()) - stream.startTime
  const maxDuration = 30000 // 假设最长30秒
  return Math.min(Math.round((duration / maxDuration) * 100), 99)
}

// 获取流状态标签
const getStatusTag = (stream: StreamState): { type: 'primary' | 'success' | 'warning' | 'danger' | 'info', label: string } => {
  if (stream.status === StreamStatus.ERROR) return { type: 'danger', label: '错误' }
  if (stream.status === StreamStatus.PAUSED) return { type: 'warning', label: '已暂停' }
  if (stream.status === StreamStatus.COMPLETED) return { type: 'success', label: '已完成' }
  return { type: 'primary', label: '生成中' }
}
</script>

<template>
  <div class="stream-monitor-panel">
    <div class="header">
      <h3>流状态监控</h3>
      <el-button size="small" @click="refreshStats">刷新</el-button>
    </div>

    <div class="stats">
      <div class="stat-item">
        <span class="label">活跃:</span>
        <span class="value">{{ activeStreams.size }}</span>
      </div>
      <div class="stat-item">
        <span class="label">已完成:</span>
        <span class="value">{{ completedCount }}</span>
      </div>
      <div class="stat-item">
        <span class="label">失败:</span>
        <span class="value">{{ failedCount }}</span>
      </div>
      <div class="stat-item">
        <span class="label">平均速度:</span>
        <span class="value">{{ averageSpeed }} 字/秒</span>
      </div>
    </div>

    <el-divider content-position="center">活跃流任务</el-divider>

    <div class="active-streams" v-if="activeStreamsEntries.length > 0">
      <div v-for="[id, stream] in activeStreamsEntries" :key="id" class="stream-item">
        <div class="stream-header">
          <div class="stream-id">{{ stream.messageId }}</div>
          <el-tag :type="getStatusTag(stream).type" size="small">
            {{ getStatusTag(stream).label }}
          </el-tag>
        </div>

        <div class="stream-info">
          <div class="info-item">
            <span class="label">开始时间:</span>
            <span>{{ formatTime(stream.startTime) }}</span>
          </div>
          <div class="info-item">
            <span class="label">内容长度:</span>
            <span>{{ stream.accumulatedContent.length }} 字符</span>
          </div>
        </div>

        <div class="stream-progress">
          <el-progress
            :percentage="calculateProgress(stream)"
            :status="stream.status === StreamStatus.ERROR ? 'exception' : (stream.status === StreamStatus.PAUSED ? 'warning' : '')"
          />
        </div>

        <div class="stream-actions">
          <el-button
            size="small"
            @click="pauseStream(id)"
            :disabled="stream.status !== StreamStatus.STREAMING"
          >
            暂停
          </el-button>
          <el-button
            size="small"
            @click="resumeStream(id)"
            :disabled="stream.status !== StreamStatus.PAUSED"
          >
            恢复
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="cancelStream(id)"
            :disabled="stream.status === StreamStatus.COMPLETED || stream.status === StreamStatus.ERROR"
          >
            取消
          </el-button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>当前没有活跃的流任务</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.stream-monitor-panel {
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-item {
  background: var(--el-fill-color-light);
  padding: 8px;
  border-radius: 4px;
  text-align: center;

  .label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .value {
    font-weight: bold;
    color: var(--el-color-primary);
    margin-left: 4px;
  }
}

.stream-item {
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stream-id {
  font-size: 12px;
  font-family: monospace;
  color: var(--el-text-color-secondary);
}

.stream-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;

  .info-item {
    .label {
      color: var(--el-text-color-secondary);
      margin-right: 4px;
    }
  }
}

.stream-progress {
  margin-bottom: 12px;
}

.stream-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.empty-state {
  text-align: center;
  padding: 20px 0;
  color: var(--el-text-color-secondary);
}
</style>
