/**
 * 支付基类
 * @description 定义支付服务的通用接口和基础功能
 */

import PaymentError from '../utils/PaymentError.js'
import { defaultLogger } from '../utils/Logger.js'
import { ERROR_CODES } from '../constants/errorCodes.js'
import EventEmitter from '../utils/EventEmitter.js'

class BasePaymentService extends EventEmitter {
  /**
   * 构造函数
   * @param {Object} config - 服务配置
   */
  constructor(config = {}) {
    super()
    this.config = {
      timeout: 30000,
      retryTimes: 3,
      retryDelay: 1000,
      ...config,
    }
    this.logger = defaultLogger.child('PaymentService')
    this.requestId = 0
  }

  /**
   * 处理支付(需要子类实现)
   * @param {Object} _paymentData - 支付数据
   * @returns {Promise<Object>} 处理结果
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  async processPayment(_paymentData) {
    throw new PaymentError('Method not implemented: processPayment', ERROR_CODES.SYSTEM_ERROR)
  }

  /**
   * 创建支付订单（需要子类实现）
   * @param {Object} params - 支付参数
   * @returns {Promise<Object>} 支付结果
   * @abstract
   */
  async createPayment(params) {
    throw new PaymentError('Method not implemented: createPayment', ERROR_CODES.SYSTEM_ERROR)
  }

  /**
   * 查询支付订单（需要子类实现）
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 支付状态
   * @abstract
   */
  async queryPaymentStatus(params) {
    throw new PaymentError('Method not implemented: queryPaymentStatus', ERROR_CODES.SYSTEM_ERROR)
  }

  /**
   * 退款（需要子类实现）
   * @param {Object} params - 退款参数
   * @returns {Promise<Object>} 退款结果
   * @abstract
   */
  async refund(params) {
    throw new PaymentError('Method not implemented: refund', ERROR_CODES.SYSTEM_ERROR)
  }

  /**
   * 取消订单（需要子类实现）
   * @param {Object} params - 取消参数
   * @returns {Promise<Object>} 取消结果
   * @abstract
   */
  async cancelPayment(params) {
    throw new PaymentError('Method not implemented: cancelPayment', ERROR_CODES.SYSTEM_ERROR)
  }

  /**
   * 关闭订单（需要子类实现）
   * @param {Object} params - 关闭参数
   * @returns {Promise<Object>} 关闭结果
   * @abstract
   */
  async closePayment(params) {
    throw new PaymentError('Method not implemented: closePayment', ERROR_CODES.SYSTEM_ERROR)
  }

  /**
   * 销毁服务实例
   */
  destroy() {
    this.config = null
    this.logger = null
  }
}

export default BasePaymentService
