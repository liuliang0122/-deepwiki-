/**
 * 支付服务工厂
 * @description 创建聚合支付策略实例(国卫、水滴等聚合支付平台)
 * @note 本框架专注于聚合支付平台接入,不直接对接支付宝、微信等支付渠道
 */

import { PAYMENT_TYPE_SWITCHES } from '../constants/switchCodes.js'
import PaymentError from '../utils/PaymentError.js'
import GuoweiPaymentService from '../services/GuoWeiPaymentService/index.js'
import YuanqiPaymentService from '../services/YuanQIPaymentService/index.js'
import { defaultLogger } from '../utils/Logger.js'

/**
 * 聚合支付策略工厂类
 * @description 统一创建聚合支付平台的实例
 */
class PaymentFactory {
  constructor() {
    this.logger = defaultLogger.child('PaymentFactory')
    // 服务实例缓存（key: `${paymentType}:${version}`，value: service instance）
    this.serviceCache = new Map()
  }

  /**
   * 获取工厂实例
   * @returns {PaymentFactory} 工厂实例
   */
  static getInstance() {
    if (!PaymentFactory.instance) {
      PaymentFactory.instance = new PaymentFactory()
    }
    return PaymentFactory.instance
  }

  /**
   * 创建支付服务
   * @param {string} paymentType - 支付类型（从后端配置获取）
   * @param {Object} config - 配置对象
   * @returns {BasePaymentService} 支付服务实例
   */
  static create(paymentType, config = {}) {
    const factory = PaymentFactory.getInstance()
    return factory.createService(paymentType, config)
  }

  /**
   * 创建服务实例
   * @param {string} paymentType - 支付类型
   * @param {Object} config - 配置
   * @returns {BasePaymentService} 服务实例
   */
  createService(paymentType, config = {}) {
    try {
      this.logger.info('Creating payment service', { paymentType })

      // 基本参数验证
      if (!paymentType || typeof paymentType !== 'string') {
        throw PaymentError.createParamError('支付类型必须是非空字符串', 'paymentType', paymentType)
      }

      // 检查缓存
      const cacheKey = paymentType // 简化缓存键,直接使用paymentType
      if (this.serviceCache.has(cacheKey) && config.useCache !== false) {
        this.logger.debug('Returning cached service', { cacheKey })
        return this.serviceCache.get(cacheKey)
      }

      // 根据 paymentType 获取服务类
      const ServiceClass = this.getServiceClassByType(paymentType)

      // 创建服务实例
      const service = new ServiceClass({
        ...config,
        paymentType,
      })

      // 缓存服务实例
      if (config.useCache !== false) {
        this.serviceCache.set(cacheKey, service)
      }

      this.logger.info('Payment service created successfully', {
        paymentType,
        serviceName: service.getServiceName(),
      })

      return service
    } catch (error) {
      this.logger.error('Failed to create payment service', {
        paymentType,
        error: error.message,
      })

      throw PaymentError.createConfigError(`创建支付服务失败: ${error.message}`, {
        paymentType,
        config,
        originalError: error,
      })
    }
  }

  /**
   * 根据支付类型获取服务类
   * @param {string} paymentType - 支付类型
   * @returns {Function} 服务类构造函数
   */
  getServiceClassByType(paymentType) {
    // 根据 paymentType 直接映射到对应的服务类
    switch (paymentType) {
      case PAYMENT_TYPE_SWITCHES.GUOWEI_PAYMENT:
        // '2' - 国卫支付
        return GuoweiPaymentService
      case PAYMENT_TYPE_SWITCHES.YUANQI_PAYMENT:
        // '3' - 源启统一支付
        return YuanqiPaymentService

      // 预留：其他厂商支持
      // case PAYMENT_TYPE_SWITCHES.OTHER_ELECTRONIC:
      //   // '3' - 其他支付方式
      //   return OtherPaymentService

      default:
        throw PaymentError.createConfigError(`不支持的支付类型: ${paymentType}`, { paymentType })
    }
  }

  /**
   * 检查服务是否已缓存
   * @param {string} paymentType - 支付类型
   * @returns {boolean} 是否已缓存
   */
  hasCache(paymentType) {
    return this.serviceCache.has(paymentType)
  }

  /**
   * 获取已缓存的服务
   * @param {string} paymentType - 支付类型
   * @returns {BasePaymentService|null} 缓存的服务实例
   */
  getCachedService(paymentType) {
    return this.serviceCache.get(paymentType) || null
  }

  /**
   * 清理指定服务的缓存
   * @param {string} paymentType - 支付类型
   */
  clearServiceCache(paymentType) {
    const service = this.serviceCache.get(paymentType)

    if (service) {
      // 销毁服务实例
      if (typeof service.destroy === 'function') {
        service.destroy()
      }
      this.serviceCache.delete(paymentType)
      this.logger.info('Service cache cleared', { paymentType })
    }
  }

  /**
   * 清理所有缓存
   */
  clearAllCache() {
    this.serviceCache.forEach((service) => {
      if (typeof service.destroy === 'function') {
        service.destroy()
      }
    })
    this.serviceCache.clear()
    this.logger.info('All service cache cleared')
  }

  /**
   * 获取支持的支付类型列表
   * @returns {Array} 支持的支付类型
   */
  getSupportedPaymentTypes() {
    return [
      {
        type: PAYMENT_TYPE_SWITCHES.GUOWEI_PAYMENT,
        name: '国卫统一支付',
        description: '国卫统一支付服务',
      },
      {
        type: PAYMENT_TYPE_SWITCHES.YUANQI_PAYMENT,
        name: '源启统一支付',
        description: '源启统一支付服务',
      },
      // 预留：其他厂商
      // {
      //   type: PAYMENT_TYPE_SWITCHES.OTHER_ELECTRONIC,
      //   name: '其他方式支付',
      //   description: '其他支付服务',
      // },
    ]
  }

  /**
   * 检查是否支持指定支付类型
   * @param {string} paymentType - 支付类型
   * @returns {boolean} 是否支持
   */
  isPaymentTypeSupported(paymentType) {
    try {
      this.getServiceClassByType(paymentType)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return {
      cacheSize: this.serviceCache.size,
      cacheKeys: Array.from(this.serviceCache.keys()),
      supportedTypes: this.getSupportedPaymentTypes().map((t) => t.type),
    }
  }

  /**
   * 销毁工厂实例
   */
  destroy() {
    this.clearAllCache()
    this.logger.info('Payment factory destroyed')
  }
}

export default PaymentFactory
