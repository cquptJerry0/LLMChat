export class LRUCache<K, V> {
  private capacity: number
  private cache: Map<K, V>
  private keys: K[]

  constructor(capacity: number) {
    this.capacity = capacity
    this.cache = new Map<K, V>()
    this.keys = []
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined

    // 更新访问顺序
    this.keys = this.keys.filter(k => k !== key)
    this.keys.push(key)

    return this.cache.get(key)
  }

  set(key: K, value: V): void {
    // 如果已存在，先移除旧的访问记录
    if (this.cache.has(key)) {
      this.keys = this.keys.filter(k => k !== key)
    }

    // 添加新的键值对和访问记录
    this.cache.set(key, value)
    this.keys.push(key)

    // 如果超出容量，删除最久未使用的项
    this.trim()
  }

  delete(key: K): boolean {
    if (!this.cache.has(key)) return false

    this.cache.delete(key)
    this.keys = this.keys.filter(k => k !== key)
    return true
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  private trim(): void {
    while (this.keys.length > this.capacity) {
      const oldest = this.keys.shift()
      if (oldest !== undefined) {
        this.cache.delete(oldest)
      }
    }
  }

  // 获取所有溢出的键（超出容量的部分）
  getOverflowKeys(): K[] {
    if (this.keys.length <= this.capacity) return []
    return this.keys.slice(0, this.keys.length - this.capacity)
  }

  // 获取最常用的N个项
  getTopN(n: number): [K, V][] {
    const count = Math.min(n, this.keys.length)
    return this.keys.slice(-count).map(key => [key, this.cache.get(key)!])
  }

  clear(): void {
    this.cache.clear()
    this.keys = []
  }

  size(): number {
    return this.cache.size
  }
}
