/**
 * 支付配置管理
 * @description 从系统配置中心获取和管理支付配置
 */

import {
  PAYMENT_TYPE_SWITCHES,
  PAYMENT_SWITCH_CODES,
  ENVIRONMENT_SWITCHES,
} from '../constants/switchCodes.js'
import { getSwitchModule, getPreferenceItem } from './GlobalAccessor.js'
import { defaultLogger } from './Logger.js'

const logger = defaultLogger.child('PaymentConfig')
/**
 * 配置管理类
 */

class PaymentConfig {
  constructor() {
    // 保留最后一次成功获取的配置用于容错
    this.lastSuccessConfig = null
  }

  /**
   * 获取配置实例（单例模式）
   * @returns {PaymentConfig} 配置实例
   */
  static getInstance() {
    if (!PaymentConfig.instance) {
      PaymentConfig.instance = new PaymentConfig()
    }
    return PaymentConfig.instance
  }

  /**
   * 静态方法获取配置
   * @returns {Promise<Object>} 配置对象
   * @note 不再支持缓存，每次都获取最新配置
   */
  static async getConfig() {
    const instance = PaymentConfig.getInstance()
    return await instance.loadConfig()
  }

  /**
   * 加载配置
   * @returns {Promise<Object>} 配置对象
   */
  async loadConfig() {
    try {
      // 🚀 从系统开关获取最新配置
      const config = await this.fetchFromSystemSwitches()
      config.payScanMode = getPreferenceItem('PAY_SCAN_MODE')

      // 💾 保存最后一次成功的配置用于容错
      this.lastSuccessConfig = config

      return config
    } catch (error) {
      // 使用 Logger 记录错误信息
      logger.error('获取配置失败', error)

      // 🛡️ 如果有上次成功的配置，返回上次的配置；否则返回默认配置
      if (this.lastSuccessConfig) {
        logger.warn('使用上次成功获取的配置')
        return this.lastSuccessConfig
      }

      logger.warn('使用默认配置')
      return PaymentConfig.getFallbackConfig()
    }
  }

  /**
   * 从系统开关获取配置
   * @returns {Promise<Object>} 配置对象
   */
  async fetchFromSystemSwitches() {
    // 获取系统开关模块
    const switchModule = getSwitchModule()
    if (!switchModule) {
      throw new Error('HAIC系统开关模块不可用')
    }

    // 🎯 并行获取所有系统开关配置
    // 并行获取是否开启聚合支付的系统开关值
    const [paymentType, paymentEnabled] = await Promise.all([
      switchModule.getSwitchValue(PAYMENT_SWITCH_CODES.PAYMENT_TYPE),
      switchModule.getSwitchValue(PAYMENT_SWITCH_CODES.PAYMENT_ENABLED),
    ])

    // 🚀 构建完整配置对象
    // 处理系统开关返回的数据格式（可能是对象格式，需要提取实际值）
    const extractSwitchValue = (switchData, defaultValue) => {
      if (typeof switchData === 'string') {
        return switchData
      }
      if (typeof switchData === 'object' && switchData !== null) {
        // 如果是对象格式，提取第一个值
        const values = Object.values(switchData)
        return values.length > 0 ? values[0] : defaultValue
      }
      return defaultValue
    }

    const normalizedPaymentType = extractSwitchValue(
      paymentType,
      PAYMENT_TYPE_SWITCHES.GUOWEI_PAYMENT
    )
    const normalizedPaymentEnabled = extractSwitchValue(
      paymentEnabled,
      PAYMENT_TYPE_SWITCHES.DISABLED
    )
    return {
      // 核心配置
      paymentType: normalizedPaymentType,
      paymentEnabled: normalizedPaymentEnabled,
      _source: 'systemSwitches',
    }
  }

  /**
   * 获取上次成功获取的配置（用于调试和监控）
   * @returns {Object|null} 上次成功的配置或null
   */
  getLastSuccessConfig() {
    return this.lastSuccessConfig
  }

  /**
   * 解析布尔值开关
   * @param {string|boolean|object|number} switchValue - 开关值
   * @returns {boolean} 布尔值
   */
  static parseBooleanSwitch(switchValue) {
    // 处理对象格式的开关值
    if (typeof switchValue === 'object' && switchValue !== null) {
      const values = Object.values(switchValue)
      switchValue = values.length > 0 ? values[0] : false
    }

    // 处理基础类型
    if (typeof switchValue === 'boolean') {
      return switchValue
    }

    if (typeof switchValue === 'string') {
      return switchValue.toLowerCase() === 'true' || switchValue === '1'
    }

    if (typeof switchValue === 'number') {
      return switchValue === 1
    }

    // 其他情况返回false
    return false
  }

  /**
   * 获取环境类型
   * @returns {string} 环境类型
   */
  static getEnvironment() {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
      return process.env.NODE_ENV
    }
    return ENVIRONMENT_SWITCHES.PRODUCTION
  }

  /**
   * 是否调试模式
   * @returns {boolean} 是否调试模式
   */
  static isDebugMode() {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'development' || process.env.INVOICE_DEBUG === 'true'
    }
    return false
  }

  /**
   * 获取备用配置（当系统开关不可用时）
   * @returns {Object} 备用配置
   */
  static getFallbackConfig() {
    return {
      paymentType: PAYMENT_TYPE_SWITCHES.GUOWEI_PAYMENT,
      paymentEnabled: PAYMENT_TYPE_SWITCHES.DISABLED,
    }
  }
}

export default PaymentConfig
