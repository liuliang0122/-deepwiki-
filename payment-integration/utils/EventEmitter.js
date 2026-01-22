/**
 * 事件发射器
 * @description 提供事件监听和发射功能，用于模块间的松耦合通信
 */

class EventEmitter {
  constructor() {
    this.events = new Map()
    this.maxListeners = 10
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function')
    }

    if (!this.events.has(event)) {
      this.events.set(event, [])
    }

    const listeners = this.events.get(event)

    // 检查监听器数量限制
    if (listeners.length >= this.maxListeners) {
      console.warn(
        `Warning: Possible EventEmitter memory leak detected. ${listeners.length} listeners added for event "${event}". Use setMaxListeners() to increase limit.`
      )
    }

    listeners.push(callback)

    // 返回取消监听函数
    return () => {
      this.off(event, callback)
    }
  }

  /**
   * 监听事件（只触发一次）
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args)
      this.off(event, onceWrapper)
    }

    return this.on(event, onceWrapper)
  }

  /**
   * 取消监听事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    if (!this.events.has(event)) {
      return
    }

    const listeners = this.events.get(event)
    const index = listeners.indexOf(callback)

    if (index !== -1) {
      listeners.splice(index, 1)
    }

    // 如果没有监听器了，删除事件
    if (listeners.length === 0) {
      this.events.delete(event)
    }
  }

  /**
   * 发射事件
   * @param {string} event - 事件名称
   * @param {...any} args - 事件参数
   * @returns {boolean} 是否有监听器处理了事件
   */
  emit(event, ...args) {
    if (!this.events.has(event)) {
      return false
    }

    const listeners = this.events.get(event).slice() // 复制数组，避免在回调中修改原数组

    listeners.forEach((callback) => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error)
        // 发射错误事件
        this.emit('error', error, event)
      }
    })

    return listeners.length > 0
  }

  /**
   * 移除所有监听器
   * @param {string} [event] - 事件名称，如果不提供则移除所有事件的监听器
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }

  /**
   * 获取事件的监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    if (!this.events.has(event)) {
      return 0
    }
    return this.events.get(event).length
  }

  /**
   * 获取事件的所有监听器
   * @param {string} event - 事件名称
   * @returns {Array} 监听器数组
   */
  listeners(event) {
    if (!this.events.has(event)) {
      return []
    }
    return this.events.get(event).slice() // 返回副本
  }

  /**
   * 获取所有事件名称
   * @returns {Array} 事件名称数组
   */
  eventNames() {
    return Array.from(this.events.keys())
  }

  /**
   * 设置最大监听器数量
   * @param {number} n - 最大监听器数量
   */
  setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0 || isNaN(n)) {
      throw new Error('n must be a non-negative number')
    }
    this.maxListeners = n
  }

  /**
   * 获取最大监听器数量
   * @returns {number} 最大监听器数量
   */
  getMaxListeners() {
    return this.maxListeners
  }

  /**
   * 在指定事件前添加监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  prependListener(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function')
    }

    if (!this.events.has(event)) {
      this.events.set(event, [])
    }

    const listeners = this.events.get(event)
    listeners.unshift(callback)

    return () => {
      this.off(event, callback)
    }
  }

  /**
   * 在指定事件前添加一次性监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  prependOnceListener(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args)
      this.off(event, onceWrapper)
    }

    return this.prependListener(event, onceWrapper)
  }

  /**
   * 异步发射事件
   * @param {string} event - 事件名称
   * @param {...any} args - 事件参数
   * @returns {Promise<boolean>} 是否有监听器处理了事件
   */
  async emitAsync(event, ...args) {
    if (!this.events.has(event)) {
      return false
    }

    const listeners = this.events.get(event).slice()
    const promises = listeners.map(async (callback) => {
      try {
        await callback(...args)
      } catch (error) {
        console.error(`Error in async event listener for "${event}":`, error)
        this.emit('error', error, event)
      }
    })

    await Promise.all(promises)
    return listeners.length > 0
  }

  /**
   * 创建命名空间事件发射器
   * @param {string} namespace - 命名空间
   * @returns {Object} 命名空间事件发射器
   */
  namespace(namespace) {
    return {
      on: (event, callback) => this.on(`${namespace}:${event}`, callback),
      once: (event, callback) => this.once(`${namespace}:${event}`, callback),
      off: (event, callback) => this.off(`${namespace}:${event}`, callback),
      emit: (event, ...args) => this.emit(`${namespace}:${event}`, ...args),
      emitAsync: (event, ...args) => this.emitAsync(`${namespace}:${event}`, ...args),
    }
  }
}

export default EventEmitter
