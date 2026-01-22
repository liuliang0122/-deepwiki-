/**
 * 支付错误类
 * @description 统一的错误处理类
 */

import { ERROR_CODES, ERROR_MESSAGES } from '../constants/errorCodes.js'

/**
 * 支付错误类
 * @extends Error
 */
class PaymentError extends Error {
  /**
   * @param {string} message - 错误消息
   * @param {number} code - 错误码
   * @param {Object} [context] - 错误上下文
   */
  constructor(message, code = ERROR_CODES.SYSTEM_ERROR, context = {}) {
    super(message)
    this.name = 'PaymentError'
    this.code = code
    this.context = context
    this.timestamp = new Date().toISOString()

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError)
    }
  }

  /**
   * 创建系统错误
   * @param {string} message - 错误消息
   * @param {Object} [context] - 错误上下文
   * @returns {PaymentError}
   */
  static systemError(message, context) {
    return new PaymentError(message, ERROR_CODES.SYSTEM_ERROR, context)
  }

  /**
   * 创建网络错误
   * @param {string} message - 错误消息
   * @param {Object} [context] - 错误上下文
   * @returns {PaymentError}
   */
  static networkError(message, context) {
    return new PaymentError(message, ERROR_CODES.NETWORK_ERROR, context)
  }

  /**
   * 创建参数错误
   * @param {string} message - 错误消息
   * @param {Object} [context] - 错误上下文
   * @returns {PaymentError}
   */
  static invalidParams(message, context) {
    return new PaymentError(message, ERROR_CODES.PARAM_ERROR, context)
  }

  /**
   * 创建业务错误
   * @param {string} message - 错误消息
   * @param {Object} [context] - 错误上下文
   * @returns {PaymentError}
   */
  static businessError(message, context) {
    return new PaymentError(message, ERROR_CODES.BUSINESS_ERROR, context)
  }

  /**
   * 创建配置错误
   * @param {string} message - 错误消息
   * @param {Object} [context] - 错误上下文
   * @returns {PaymentError}
   */
  static createConfigError(message, context) {
    return new PaymentError(message, ERROR_CODES.CONFIG_ERROR, context)
  }

  /**
   * 创建参数错误(详细)
   * @param {string} message - 错误消息
   * @param {string} [paramName] - 参数名称
   * @param {any} [paramValue] - 参数值
   * @returns {PaymentError}
   */
  static createParamError(message, paramName, paramValue) {
    return new PaymentError(message, ERROR_CODES.PARAM_ERROR, {
      paramName,
      paramValue,
    })
  }

  /**
   * 从错误码创建错误
   * @param {number} code - 错误码
   * @param {Object} [context] - 错误上下文
   * @returns {PaymentError}
   */
  static fromCode(code, context) {
    const message = ERROR_MESSAGES[code] || '未知错误'
    return new PaymentError(message, code, context)
  }

  /**
   * 转换为普通对象
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }

  /**
   * 转换为用户友好的消息
   * @returns {string}
   */
  toUserMessage() {
    // 优先使用上下文中的用户消息
    if (this.context && this.context.userMessage) {
      return this.context.userMessage
    }

    // 使用错误码对应的消息
    return ERROR_MESSAGES[this.code] || this.message || '操作失败，请重试'
  }

  /**
   * 判断是否为可重试错误
   * @returns {boolean}
   */
  isRetryable() {
    return [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.TIMEOUT_ERROR,
      ERROR_CODES.SYSTEM_ERROR,
    ].includes(this.code)
  }

  /**
   * 判断是否为用户错误（需要用户处理）
   * @returns {boolean}
   */
  isUserError() {
    return this.code >= 2000 && this.code < 3000
  }
}

export default PaymentError
