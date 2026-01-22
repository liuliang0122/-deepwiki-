/**
 * 错误管理器
 * @description 统一处理支付模块的错误，提供错误分类、处理和恢复机制
 */

import PaymentError from '../utils/PaymentError.js'
import { ERROR_CODES } from '../constants/errorCodes.js'
import { defaultLogger } from '../utils/Logger.js'

class ErrorManager {
  constructor() {
    this.errorHandlers = new Map()
    this.errorHistory = []
    this.maxHistorySize = 20
    this.logger = defaultLogger.child('ErrorManager')
    this.retryStrategies = new Map()

    // 错误码到错误类型的映射表
    this.errorCodeMapping = this.createErrorCodeMapping()

    // 设置默认错误处理器
    this.setupDefaultHandlers()
    // 设置默认重试策略
    this.setupDefaultRetryStrategies()
  }

  /**
   * 创建错误码映射表
   * @returns {Map} 错误码到错误类型的映射
   */
  createErrorCodeMapping() {
    const mapping = new Map()

    // 网络错误映射
    mapping.set(ERROR_CODES.NETWORK_ERROR, 'NetworkError')
    mapping.set(ERROR_CODES.REQUEST_TIMEOUT, 'NetworkError')
    mapping.set(ERROR_CODES.CONNECTION_FAILED, 'NetworkError')
    mapping.set(ERROR_CODES.TIMEOUT_ERROR, 'NetworkError')

    // 配置错误映射
    mapping.set(ERROR_CODES.CONFIG_ERROR, 'ConfigError')
    mapping.set(ERROR_CODES.INVALID_CONFIG, 'ConfigError')
    mapping.set(ERROR_CODES.MISSING_CONFIG, 'ConfigError')
    mapping.set(ERROR_CODES.CONFIG_LOAD_FAILED, 'ConfigError')

    // 业务错误映射
    mapping.set(ERROR_CODES.BUSINESS_ERROR, 'BusinessError')
    mapping.set(ERROR_CODES.PAYMENT_FAILED, 'BusinessError')
    mapping.set(ERROR_CODES.REFUND_FAILED, 'BusinessError')

    // 参数错误映射
    mapping.set(ERROR_CODES.PARAM_ERROR, 'ParamError')
    mapping.set(ERROR_CODES.MISSING_REQUIRED_PARAM, 'ParamError')
    mapping.set(ERROR_CODES.INVALID_PARAM_TYPE, 'ParamError')
    mapping.set(ERROR_CODES.INVALID_PARAM_VALUE, 'ParamError')
    mapping.set(ERROR_CODES.INVALID_PARAMS, 'ParamError')

    // 权限错误映射
    mapping.set(ERROR_CODES.PERMISSION_ERROR, 'PermissionError')
    mapping.set(ERROR_CODES.ACCESS_DENIED, 'PermissionError')
    mapping.set(ERROR_CODES.TOKEN_EXPIRED, 'PermissionError')
    mapping.set(ERROR_CODES.INVALID_TOKEN, 'PermissionError')

    // 系统错误映射
    mapping.set(ERROR_CODES.SYSTEM_ERROR, 'SystemError')
    mapping.set(ERROR_CODES.UNKNOWN_ERROR, 'SystemError')
    mapping.set(ERROR_CODES.INTERNAL_ERROR, 'SystemError')
    mapping.set(ERROR_CODES.RESOURCE_NOT_FOUND, 'SystemError')
    mapping.set(ERROR_CODES.SERVICE_ERROR, 'SystemError')
    mapping.set(ERROR_CODES.SERVICE_UNAVAILABLE, 'SystemError')
    mapping.set(ERROR_CODES.SERVICE_TIMEOUT, 'SystemError')
    mapping.set(ERROR_CODES.INVALID_SERVICE_TYPE, 'SystemError')

    return mapping
  }

  /**
   * 设置默认错误处理器
   */
  setupDefaultHandlers() {
    // 网络错误处理器
    this.errorHandlers.set('NetworkError', (error, context) => {
      const paymentError = new PaymentError(
        '网络连接失败，请检查网络设置',
        ERROR_CODES.NETWORK_ERROR,
        {
          originalError: error,
          context,
          retryable: true,
          userMessage: '网络连接异常，请稍后重试',
        }
      )

      this.logger.warn('Network error handled', {
        originalMessage: error.message,
        context,
      })

      return paymentError
    })

    // 业务错误处理器
    this.errorHandlers.set('BusinessError', (error, context) => {
      const paymentError = new PaymentError(
        error.message || '业务处理失败',
        ERROR_CODES.BUSINESS_ERROR,
        {
          originalError: error,
          context,
          retryable: false,
          userMessage: error.userMessage || error.message || '操作失败，请重试',
        }
      )

      this.logger.warn('Business error handled', {
        originalMessage: error.message,
        context,
      })

      return paymentError
    })

    // 配置错误处理器
    this.errorHandlers.set('ConfigError', (error, context) => {
      const paymentError = new PaymentError(
        '系统配置错误，请联系管理员',
        ERROR_CODES.CONFIG_ERROR,
        {
          originalError: error,
          context,
          retryable: false,
          userMessage: '系统配置异常，请联系技术支持',
        }
      )

      this.logger.error('Config error handled', {
        originalMessage: error.message,
        context,
      })

      return paymentError
    })
    // 参数错误处理器
    this.errorHandlers.set('ParamError', (error, context) => {
      const paymentError = new PaymentError(error.message || '参数错误', ERROR_CODES.PARAM_ERROR, {
        originalError: error,
        context,
        retryable: false,
        userMessage: '输入参数有误，请检查后重试',
      })

      this.logger.warn('Param error handled', {
        originalMessage: error.message,
        context,
      })

      return paymentError
    })

    // 权限错误处理器
    this.errorHandlers.set('PermissionError', (error, context) => {
      const paymentError = new PaymentError('权限不足', ERROR_CODES.PERMISSION_ERROR, {
        originalError: error,
        context,
        retryable: false,
        userMessage: '您没有执行此操作的权限',
      })

      this.logger.warn('Permission error handled', {
        originalMessage: error.message,
        context,
      })

      return paymentError
    })

    // 系统错误处理器
    this.errorHandlers.set('SystemError', (error, context) => {
      const paymentError = new PaymentError('系统错误', ERROR_CODES.SYSTEM_ERROR, {
        originalError: error,
        context,
        retryable: true,
        userMessage: '系统异常，请稍后重试',
      })

      this.logger.error('System error handled', {
        originalMessage: error.message,
        context,
      })

      return paymentError
    })

    this.logger.info('Default error handlers setup completed')
  }

  /**
   * 设置默认重试策略
   */
  setupDefaultRetryStrategies() {
    // 网络错误重试策略
    this.retryStrategies.set('NetworkError', {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitter: true,
    })

    // 系统错误重试策略
    this.retryStrategies.set('SystemError', {
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 8000,
      backoffFactor: 2,
      jitter: false,
    })

    this.logger.info('Default retry strategies setup completed')
  }

  /**
   * 处理错误
   * @param {Error} error - 原始错误
   * @param {Object} [context] - 错误上下文
   * @returns {PaymentError} 处理后的错误
   */
  handleError(error, context = {}) {
    try {
      if (error instanceof PaymentError) {
        this.recordError(error, context)
        return error
      }

      // 根据错误类型选择处理器
      const errorType = this.getErrorType(error)
      const handler = this.errorHandlers.get(errorType)

      let processedError
      if (handler) {
        processedError = handler(error, context)
      } else {
        // 默认错误处理
        processedError = new PaymentError(error.message || '未知错误', ERROR_CODES.UNKNOWN_ERROR, {
          originalError: error,
          context,
          retryable: false,
          userMessage: '操作失败，请重试',
        })
      }

      // 记录错误
      this.recordError(processedError, context)

      return processedError
    } catch (handlerError) {
      this.logger.error('Error in error handler', {
        originalError: error.message,
        handlerError: handlerError.message,
        context,
      })

      // 创建一个基本的错误对象
      const fallbackError = new PaymentError('错误处理失败', ERROR_CODES.INTERNAL_ERROR, {
        originalError: error,
        handlerError,
        context,
      })

      this.recordError(fallbackError, context)
      return fallbackError
    }
  }

  /**
   * 获取错误类型
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  getErrorType(error) {
    // 1. 优先使用错误码映射表（最精确）
    if (error.code && this.errorCodeMapping.has(error.code)) {
      return this.errorCodeMapping.get(error.code)
    }

    // 2. 检查错误名称
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'NetworkError'
    }

    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return 'NetworkError'
    }

    // 3. 检查HTTP状态码
    if (error.status) {
      if (error.status >= 400 && error.status < 500) {
        return 'BusinessError'
      }
      if (error.status >= 500) {
        return 'SystemError'
      }
    }

    // 4. 基于错误消息的关键字判断（最后的备选方案）
    const message = error.message?.toLowerCase() || ''

    if (message.includes('网络') || message.includes('network')) {
      return 'NetworkError'
    }

    if (message.includes('权限') || message.includes('permission')) {
      return 'PermissionError'
    }

    if (message.includes('配置') || message.includes('config')) {
      return 'ConfigError'
    }

    if (message.includes('参数') || message.includes('param')) {
      return 'ParamError'
    }

    // 5. 默认返回系统错误
    return 'SystemError'
  }

  /**
   * 记录错误
   * @param {PaymentError} error - 错误对象
   * @param {Object} context - 错误上下文
   */
  recordError(error, context) {
    const errorRecord = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      error: error.toJSON(),
      context,
      handled: true,
    }

    // 添加到历史记录
    this.errorHistory.push(errorRecord)

    // 限制历史记录大小（使用 splice 直接删除，避免数组拷贝）
    if (this.errorHistory.length > this.maxHistorySize) {
      // 删除最旧的记录
      const deleteCount = this.errorHistory.length - this.maxHistorySize
      this.errorHistory.splice(0, deleteCount)
    }

    this.logger.debug('Error recorded', {
      errorId: errorRecord.id,
      errorCode: error.code,
      context,
    })
  }

  /**
   * 生成错误ID
   * @returns {string} 错误ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 注册错误处理器
   * @param {string} errorType - 错误类型
   * @param {Function} handler - 处理器函数
   */
  registerHandler(errorType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function')
    }

    this.errorHandlers.set(errorType, handler)
    this.logger.info('Error handler registered', { errorType })
  }

  /**
   * 移除错误处理器
   * @param {string} errorType - 错误类型
   */
  removeHandler(errorType) {
    if (this.errorHandlers.has(errorType)) {
      this.errorHandlers.delete(errorType)
      this.logger.info('Error handler removed', { errorType })
    }
  }

  /**
   * 注册重试策略
   * @param {string} errorType - 错误类型
   * @param {Object} strategy - 重试策略
   */
  registerRetryStrategy(errorType, strategy) {
    this.retryStrategies.set(errorType, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      jitter: false,
      ...strategy,
    })
    this.logger.info('Retry strategy registered', { errorType, strategy })
  }

  /**
   * 获取重试策略
   * @param {string} errorType - 错误类型
   * @returns {Object|null} 重试策略
   */
  getRetryStrategy(errorType) {
    return this.retryStrategies.get(errorType) || null
  }

  /**
   * 计算重试延迟
   * @param {string} errorType - 错误类型
   * @param {number} attempt - 重试次数
   * @returns {number} 延迟时间（毫秒）
   */
  calculateRetryDelay(errorType, attempt) {
    const strategy = this.getRetryStrategy(errorType)
    if (!strategy) {
      return 1000 // 默认延迟
    }

    let delay = strategy.baseDelay * Math.pow(strategy.backoffFactor, attempt - 1)
    delay = Math.min(delay, strategy.maxDelay)

    // 添加抖动
    if (strategy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }

    return Math.floor(delay)
  }

  /**
   * 执行带重试的操作
   * @param {Function} operation - 操作函数
   * @param {Object} [options] - 选项
   * @param {boolean} [options.throwOriginal=false] - 是否直接抛出原始错误，不经过错误处理
   * @returns {Promise<any>} 操作结果
   */
  async executeWithRetry(operation, options = {}) {
    const { context = {}, errorType = 'SystemError', throwOriginal = false } = options
    const strategy = this.getRetryStrategy(errorType)

    if (!strategy) {
      // 没有重试策略，直接执行
      try {
        return await operation()
      } catch (error) {
        // 如果设置了 throwOriginal，直接抛出原始错误
        if (throwOriginal) {
          throw error
        }
        throw this.handleError(error, context)
      }
    }

    let lastError = null
    for (let attempt = 1; attempt <= strategy.maxRetries + 1; attempt++) {
      try {
        if (attempt > 1) {
          const delay = this.calculateRetryDelay(errorType, attempt - 1)
          this.logger.info('Retrying operation', { attempt, delay, errorType })
          await this.delay(delay)
        }

        return await operation()
      } catch (error) {
        lastError = error

        // 如果设置了 throwOriginal，直接抛出原始错误（不进行重试）
        if (throwOriginal) {
          throw error
        }

        const processedError = this.handleError(error, { ...context, attempt })

        // 如果不可重试或已达到最大重试次数，抛出错误
        if (!processedError.isRetryable() || attempt > strategy.maxRetries) {
          throw processedError
        }

        this.logger.warn('Operation failed, will retry', {
          attempt,
          error: error.message,
          errorType,
        })
      }
    }

    // 理论上不会到达这里，但为了安全起见
    if (throwOriginal && lastError) {
      throw lastError
    }
    throw this.handleError(lastError, context)
  }

  /**
   * 延迟执行
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 获取错误历史
   * @param {Object} [filter] - 过滤条件
   * @returns {Array} 错误历史记录
   */
  getErrorHistory(filter = {}) {
    let history = [...this.errorHistory]

    // 应用过滤条件
    if (filter.errorType) {
      history = history.filter((record) => this.getErrorType(record.error) === filter.errorType)
    }

    if (filter.since) {
      const sinceTime = new Date(filter.since).getTime()
      history = history.filter((record) => new Date(record.timestamp).getTime() >= sinceTime)
    }

    if (filter.limit) {
      history = history.slice(-filter.limit)
    }

    return history
  }

  /**
   * 清除错误历史
   * @param {Object} [filter] - 过滤条件
   */
  clearErrorHistory(filter = {}) {
    if (!filter || Object.keys(filter).length === 0) {
      this.errorHistory = []
      this.logger.info('All error history cleared')
    } else {
      const originalLength = this.errorHistory.length
      this.errorHistory = this.errorHistory.filter((record) => {
        if (filter.errorType && this.getErrorType(record.error) === filter.errorType) {
          return false
        }
        if (filter.before) {
          const beforeTime = new Date(filter.before).getTime()
          if (new Date(record.timestamp).getTime() < beforeTime) {
            return false
          }
        }
        return true
      })

      const clearedCount = originalLength - this.errorHistory.length
      this.logger.info('Error history cleared by filter', { clearedCount, filter })
    }
  }

  /**
   * 获取错误统计
   * @param {Object} [options] - 选项
   * @returns {Object} 错误统计
   */
  getErrorStats(options = {}) {
    const { since } = options
    let history = this.errorHistory

    if (since) {
      const sinceTime = new Date(since).getTime()
      history = history.filter((record) => new Date(record.timestamp).getTime() >= sinceTime)
    }

    const stats = {
      total: history.length,
      byType: {},
      byCode: {},
      recent: history.slice(-10),
      timestamp: new Date().toISOString(),
    }

    history.forEach((record) => {
      const errorType = this.getErrorType(record.error)
      const errorCode = record.error.code

      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1
      stats.byCode[errorCode] = (stats.byCode[errorCode] || 0) + 1
    })

    return stats
  }

  /**
   * 销毁错误管理器
   */
  destroy() {
    this.errorHandlers.clear()
    this.retryStrategies.clear()
    this.errorHistory = []
    this.logger.info('Error manager destroyed')
  }
}

export default ErrorManager
