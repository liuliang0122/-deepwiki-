/**
 * 日志工具类
 * @description 提供统一的日志记录功能，支持不同级别和格式化输出
 */

import { LOG_LEVEL_SWITCHES } from '../constants/switchCodes.js'

class Logger {
  /**
   * 构造函数
   * @param {string} name - 日志器名称
   * @param {Object} options - 配置选项
   */
  constructor(name, options = {}) {
    this.name = name
    this.level = options.level || LOG_LEVEL_SWITCHES.INFO
    this.enableConsole = options.enableConsole !== false
    this.enableStorage = options.enableStorage || false
    this.maxStorageSize = options.maxStorageSize || 1000
    this.storageKey = options.storageKey || 'payment_logs'
    this.formatter = options.formatter || this.defaultFormatter.bind(this)

    // 日志级别优先级
    this.levelPriority = {
      [LOG_LEVEL_SWITCHES.DEBUG]: 0,
      [LOG_LEVEL_SWITCHES.INFO]: 1,
      [LOG_LEVEL_SWITCHES.WARN]: 2,
      [LOG_LEVEL_SWITCHES.ERROR]: 3,
      [LOG_LEVEL_SWITCHES.OFF]: 4,
    }

    // 初始化存储
    if (this.enableStorage) {
      this.initStorage()
    }
  }

  /**
   * 初始化存储
   */
  initStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const existingLogs = localStorage.getItem(this.storageKey)
        if (!existingLogs) {
          localStorage.setItem(this.storageKey, JSON.stringify([]))
        }
      }
    } catch (error) {
      console.warn('Failed to initialize log storage:', error)
      this.enableStorage = false
    }
  }

  /**
   * 默认格式化器
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Array} args - 额外参数
   * @returns {string} 格式化后的日志
   */
  defaultFormatter(level, message, args) {
    const timestamp = new Date().toISOString()
    const argsStr = args.length > 0 ? ` ${JSON.stringify(args)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] [${this.name}] ${message}${argsStr}`
  }

  /**
   * 检查是否应该记录日志
   * @param {string} level - 日志级别
   * @returns {boolean} 是否应该记录
   */
  shouldLog(level) {
    const currentPriority = this.levelPriority[this.level] || 0
    const messagePriority = this.levelPriority[level] || 0
    return messagePriority >= currentPriority
  }

  /**
   * 记录日志
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  log(level, message, ...args) {
    if (!this.shouldLog(level)) {
      return
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      name: this.name,
      message,
      args,
    }

    // 控制台输出
    if (this.enableConsole) {
      const formattedMessage = this.formatter(level, message, args)
      this.outputToConsole(level, formattedMessage, args)
    }

    // 存储到本地
    if (this.enableStorage) {
      this.saveToStorage(logEntry)
    }
  }

  /**
   * 输出到控制台
   * @param {string} level - 日志级别
   * @param {string} formattedMessage - 格式化消息
   * @param {Array} args - 额外参数
   */
  outputToConsole(level, formattedMessage, args) {
    switch (level) {
      case LOG_LEVEL_SWITCHES.DEBUG:
        console.debug(formattedMessage, ...args)
        break
      case LOG_LEVEL_SWITCHES.INFO:
        console.info(formattedMessage, ...args)
        break
      case LOG_LEVEL_SWITCHES.WARN:
        console.warn(formattedMessage, ...args)
        break
      case LOG_LEVEL_SWITCHES.ERROR:
        console.error(formattedMessage, ...args)
        break
      default:
        console.log(formattedMessage, ...args)
    }
  }

  /**
   * 保存到本地存储
   * @param {Object} logEntry - 日志条目
   */
  saveToStorage(logEntry) {
    try {
      if (typeof localStorage === 'undefined') {
        return
      }

      const logs = JSON.parse(localStorage.getItem(this.storageKey) || '[]')
      logs.push(logEntry)

      // 限制存储大小
      if (logs.length > this.maxStorageSize) {
        logs.splice(0, logs.length - this.maxStorageSize)
      }

      localStorage.setItem(this.storageKey, JSON.stringify(logs))
    } catch (error) {
      console.warn('Failed to save log to storage:', error)
    }
  }

  /**
   * 调试日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  debug(message, ...args) {
    this.log(LOG_LEVEL_SWITCHES.DEBUG, message, ...args)
  }

  /**
   * 信息日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  info(message, ...args) {
    this.log(LOG_LEVEL_SWITCHES.INFO, message, ...args)
  }

  /**
   * 警告日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  warn(message, ...args) {
    this.log(LOG_LEVEL_SWITCHES.WARN, message, ...args)
  }

  /**
   * 错误日志
   * @param {string} message - 日志消息
   * @param {...any} args - 额外参数
   */
  error(message, ...args) {
    this.log(LOG_LEVEL_SWITCHES.ERROR, message, ...args)
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别
   */
  setLevel(level) {
    if (this.levelPriority.hasOwnProperty(level)) {
      this.level = level
    } else {
      this.warn(`Invalid log level: ${level}`)
    }
  }

  /**
   * 获取日志级别
   * @returns {string} 当前日志级别
   */
  getLevel() {
    return this.level
  }

  /**
   * 清除存储的日志
   */
  clearStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.storageKey)
        this.initStorage()
      }
    } catch (error) {
      console.warn('Failed to clear log storage:', error)
    }
  }

  /**
   * 获取存储的日志
   * @returns {Array} 日志数组
   */
  getStoredLogs() {
    try {
      if (typeof localStorage !== 'undefined') {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]')
      }
    } catch (error) {
      console.warn('Failed to get stored logs:', error)
    }
    return []
  }

  /**
   * 导出日志
   * @param {Object} options - 导出选项
   * @returns {string} 导出的日志内容
   */
  exportLogs(options = {}) {
    const logs = this.getStoredLogs()
    const { format = 'json', filter } = options

    let filteredLogs = logs
    if (filter && typeof filter === 'function') {
      filteredLogs = logs.filter(filter)
    }

    switch (format) {
      case 'json':
        return JSON.stringify(filteredLogs, null, 2)
      case 'text':
        return filteredLogs
          .map((log) => this.formatter(log.level, log.message, log.args))
          .join('\n')
      case 'csv':
        const headers = 'timestamp,level,name,message,args\n'
        const rows = filteredLogs
          .map((log) => {
            const args = JSON.stringify(log.args).replace(/"/g, '""')
            return `"${log.timestamp}","${log.level}","${log.name}","${log.message}","${args}"`
          })
          .join('\n')
        return headers + rows
      default:
        return JSON.stringify(filteredLogs, null, 2)
    }
  }

  /**
   * 创建子日志器
   * @param {string} childName - 子日志器名称
   * @returns {Logger} 子日志器实例
   */
  child(childName) {
    return new Logger(`${this.name}:${childName}`, {
      level: this.level,
      enableConsole: this.enableConsole,
      enableStorage: this.enableStorage,
      maxStorageSize: this.maxStorageSize,
      storageKey: this.storageKey,
      formatter: this.formatter,
    })
  }

  /**
   * 记录性能日志
   * @param {string} operation - 操作名称
   * @param {Function} fn - 要执行的函数
   * @returns {any} 函数执行结果
   */
  async performance(operation, fn) {
    const startTime = performance.now()
    this.debug(`Starting operation: ${operation}`)

    try {
      const result = await fn()
      const endTime = performance.now()
      const duration = endTime - startTime

      this.info(`Operation completed: ${operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        success: true,
      })

      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime

      this.error(`Operation failed: ${operation}`, {
        duration: `${duration.toFixed(2)}ms`,
        error: error.message,
        success: false,
      })

      throw error
    }
  }
}

// 创建默认日志器实例
const defaultLogger = new Logger('PaymentSystem')

// 导出默认实例和类
export default Logger
export { defaultLogger }
