/**
 * 支付业务管理器
 * @description 协调各个模块，提供统一的支付业务接口
 */

import ErrorManager from './ErrorManager.js'
import PaymentFactory from '../factories/PaymentFactory.js'
import PaymentConfig from '../utils/PaymentConfig.js'
import EventEmitter from '../utils/EventEmitter.js'
import Logger from '../utils/Logger.js'
import DialogManager from './DialogManager.js'
import UniversalPaymentDialog from '../components/payment-dialog-manager.vue'
import { PAYMENT_TYPE_SWITCHES, PAYMENT_ENABLED_SWITCHES } from '../constants/switchCodes.js'

class PaymentManager extends EventEmitter {
  constructor() {
    super()
    this.errorManager = new ErrorManager()
    this.config = null
    this.paymentService = null
    this.paymentStrategy = null
    this.logger = new Logger('PaymentManager')
    this.initialized = false
    this.dialogManager = DialogManager.getInstance()
    this.dialogInitialized = false

    // 简单的状态标志
    this.loading = false
    this.lastError = null
  }

  /**
   * 获取单例实例
   * @returns {PaymentManager} 管理器实例
   */
  static getInstance() {
    if (!PaymentManager.instance) {
      PaymentManager.instance = new PaymentManager()
    }
    return PaymentManager.instance
  }

  /**
   * 初始化管理器
   * @param {Object} [options] - 初始化选项
   * @param {boolean} [options.force] - 是否强制重新初始化
   * @returns {Promise<Object>} 配置对象
   */
  async init(options = {}) {
    if (this.initialized && !options.force) {
      return this.config
    }

    try {
      this.logger.info('Initializing payment manager', options)

      // 加载配置（从系统开关获取最新配置）
      this.config = await PaymentConfig.getConfig()
      // 检查 paymentType 是否在支持的支付类型中 创建支付服务
      const supportedPaymentTypes = Object.values(PAYMENT_TYPE_SWITCHES)
      const isPaymentTypeSupported = supportedPaymentTypes.includes(this.config.paymentType)
      if (isPaymentTypeSupported) {
        this.paymentService = PaymentFactory.create(this.config.paymentType, this.config)
      } else {
        throw new Error('Payment type not supported')
      }
      // 初始化支付弹窗管理器
      this._initializeDialogManager(options)

      // 设置错误处理
      this.setupErrorHandling()

      this.initialized = true
      this.logger.info('Payment manager initialized successfully', {
        paymentChannel: this.config.paymentChannel,
        paymentScene: this.config.paymentScene,
      })

      // 触发初始化完成事件
      this.emit('initialized', {
        config: this.config,
        timestamp: new Date().toISOString(),
      })

      return this.config
    } catch (error) {
      this.logger.error('Failed to initialize payment manager', error)
      const managedError = this.errorManager.handleError(error, { operation: 'init' })
      this.emit('error', managedError)
      throw managedError
    }
  }

  /**
   * 判断是否开启聚合支付
   * @description 先检查基础配置，再调用 service 层进行业务判断，返回最终结果
   * @param {Object} [paymentData] - 支付数据（可选，用于业务层判断）
   * @returns {Promise<boolean>} 是否开启聚合支付
   */
  async isAggregatedPaymentEnabled(paymentData) {
    try {
      // 确保已初始化配置
      await this.ensureInitialized()

      if (!this.config) {
        this.logger.warn('Config not available for aggregated payment check')
        return false
      }

      // 第一步：检查基础配置
      // 检查 paymentEnabled 是否开启
      const isPaymentEnabled = this.config.paymentEnabled === PAYMENT_ENABLED_SWITCHES.ENABLED

      // 如果基础配置不满足，直接返回 false
      if (!isPaymentEnabled) {
        this.logger.debug('Base config check failed for aggregated payment', {
          paymentEnabled: this.config.paymentEnabled,
          paymentType: this.config.paymentType,
          isPaymentEnabled,
        })
        return false
      }

      // 第二步：如果提供了 paymentData，调用 service 层进行业务判断
      if (paymentData && this.paymentService) {
        // 检查 service 是否实现了业务判断方法
        if (typeof this.paymentService.isAggregatedPaymentEnabled === 'function') {
          const isBusinessEnabled = await this.paymentService.isAggregatedPaymentEnabled(
            paymentData
          )
          this.logger.debug('Business check result for aggregated payment', {
            isBusinessEnabled,
            paymentData,
          })
          return isBusinessEnabled
        }
      }

      // 如果没有提供 paymentData 或 service 未实现业务判断方法，只返回基础配置检查结果
      this.logger.debug('Aggregated payment enabled check (base config only)', {
        paymentEnabled: this.config.paymentEnabled,
        paymentType: this.config.paymentType,
        hasPaymentData: !!paymentData,
        hasBusinessCheck: typeof this.paymentService?.isAggregatedPaymentEnabled === 'function',
      })

      return false
    } catch (error) {
      this.logger.error('Failed to check aggregated payment status', error)
      // 发生错误时默认返回 false，确保业务逻辑的安全性
      return false
    }
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    // 注册自定义错误处理器
    this.errorManager.registerHandler('PaymentBusinessError', (error, context) => {
      return this.errorManager.handleError(error, {
        ...context,
        module: 'PaymentManager',
      })
    })
  }

  /**
   * 初始化支付弹窗管理器
   * @param {Object} options - 初始化选项
   */
  _initializeDialogManager(options = {}) {
    if (this.dialogInitialized) return

    const runtimeWindow = typeof window !== 'undefined' ? window : undefined
    const vueCtor =
      options.Vue ||
      options.vue ||
      (runtimeWindow?.__haicApp__?.__TOOLKITS__?.Vue ?? runtimeWindow?.Vue ?? null)
    const dialogComponent =
      options.UniversalPaymentDialog || options.dialogComponent || UniversalPaymentDialog

    if (!vueCtor) {
      this.logger.warn('Vue constructor not found, skip dialog manager initialization temporarily')
      return
    }

    try {
      this.dialogManager.initialize(vueCtor, dialogComponent)
      this.dialogInitialized = true
      this.logger.info('Dialog manager initialized successfully')
    } catch (error) {
      this.logger.error('Dialog manager initialization failed', error)
    }
  }

  /**
   * 确保已初始化
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init({ force: true })
    }
  }

  /**
   * 通用支付处理
   * @deprecated
   * @param {Object} paymentData - 支付数据
   * @returns {Promise<Object>} 支付结果
   */
  async processPayment(
    paymentData,
    isInsuranceCharge = false,
    dialogNodeId = '#haic-spa-outpatient-container'
  ) {
    this.logger.warn(
      'processPayment is deprecated, use processOutpatientPayment or processInpatientPayment instead'
    )

    await this.ensureInitialized()

    this.loading = true
    this.lastError = null

    try {
      this.logger.info('Processing payment', {
        orderId: paymentData?.orderId,
        amount: paymentData?.amount,
      })

      // 使用错误管理器执行，但直接抛出原始异常
      const result = await this.errorManager.executeWithRetry(
        () => this.paymentService.processPayment(paymentData, isInsuranceCharge, dialogNodeId),
        {
          context: { operation: 'processPayment', paymentData, isInsuranceCharge },
          errorType: 'BusinessError',
          throwOriginal: true, // 直接抛出原始错误，不经过错误处理
        }
      )

      this.logger.info('Payment processed successfully', result)
      this.emit('paymentSuccess', result)

      return result
    } catch (error) {
      this.logger.error('Payment processing failed', error)
      this.lastError = error
      this.emit('paymentError', error)
      throw error
    } finally {
      this.loading = false
    }
  }

  /**
   * 创建支付订单
   * @param {Object} params - 支付参数
   * @returns {Promise<Object>} 支付结果
   */
  async createPayment(params) {
    await this.ensureInitialized()

    try {
      this.logger.info('Creating payment order', params)

      const result = await this.errorManager.executeWithRetry(
        () => this.paymentService.createPayment(params),
        {
          context: { operation: 'createPayment', params },
          errorType: 'NetworkError',
        }
      )

      this.logger.info('Payment order created', result)
      this.emit('paymentCreated', result)

      return result
    } catch (error) {
      this.logger.error('Failed to create payment order', error)
      this.emit('paymentError', error)
      throw error
    }
  }

  /**
   * 查询支付状态
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 支付状态
   */
  async queryPaymentStatus(params) {
    await this.ensureInitialized()

    try {
      this.logger.info('Querying payment status', params)

      const result = await this.errorManager.executeWithRetry(
        () => this.paymentService.queryPaymentStatus(params),
        {
          context: { operation: 'queryPaymentStatus', params },
          errorType: 'NetworkError',
        }
      )

      this.logger.info('Payment status queried', result)
      return result
    } catch (error) {
      this.logger.error('Failed to query payment status', error)
      throw error
    }
  }

  /**
   * 退款
   * @param {Object} params - 退款参数
   * @returns {Promise<Object>} 退款结果
   */
  async refund(params) {
    await this.ensureInitialized()

    try {
      this.logger.info('Processing refund', params)
      const result = await this.errorManager.executeWithRetry(
        () => this.paymentService.refund(params),
        {
          context: { operation: 'refund', params },
          errorType: 'BusinessError',
        }
      )

      this.logger.info('Refund processed', result)
      this.emit('refundSuccess', result)

      return result
    } catch (error) {
      this.logger.error('Failed to process refund', error)
      this.emit('refundError', error)
      throw error
    }
  }

  /**
   * 退款结果查询
   * @param {Object} params - 退款参数
   * @returns {Promise<Object>} 退款结果
   */
  async refundResult(params) {
    await this.ensureInitialized()

    try {
      this.logger.info('Processing refund', params)

      const result = await this.errorManager.executeWithRetry(
        () => this.paymentService.refundResult(params),
        {
          context: { operation: 'refundResult', params },
          errorType: 'BusinessError',
        }
      )

      this.logger.info('Refund processed', result)
      this.emit('refundResultSuccess', result)

      return result
    } catch (error) {
      this.logger.error('Failed to process refund', error)
      this.emit('refundResultError', error)
      throw error
    }
  }

  /**
   * 取消支付订单
   * @param {Object} params - 取消参数
   * @returns {Promise<Object>} 取消结果
   */
  async cancelPayment(params) {
    await this.ensureInitialized()

    try {
      this.logger.info('Cancelling payment order', params)

      const result = await this.paymentService.cancelPayment(params)

      this.logger.info('Payment order cancelled', result)
      this.emit('paymentCancelled', result)

      return result
    } catch (error) {
      this.logger.error('Failed to cancel payment order', error)
      throw error
    }
  }

  /**
   * 关闭支付订单
   * @param {Object} params - 关闭参数
   * @returns {Promise<Object>} 关闭结果
   */
  async closePayment(params) {
    await this.ensureInitialized()

    try {
      this.logger.info('Closing payment order', params)

      const result = await this.paymentService.closePayment(params)

      this.logger.info('Payment order closed', result)
      this.emit('paymentClosed', result)

      return result
    } catch (error) {
      this.logger.error('Failed to close payment order', error)
      throw error
    }
  }

  /**
   * 获取支付服务实例
   * @returns {BasePaymentService} 支付服务实例
   */
  getPaymentService() {
    return this.paymentService
  }

  /**
   * 获取配置信息
   * @returns {Object} 配置对象
   */
  getConfig() {
    return this.config
  }

  /**
   * 获取错误管理器
   * @returns {ErrorManager} 错误管理器实例
   */
  getErrorManager() {
    return this.errorManager
  }

  /**
   * 获取当前加载状态
   * @returns {boolean} 是否正在加载
   */
  isLoading() {
    return this.loading
  }

  /**
   * 获取最后一次错误
   * @returns {Error|null} 最后一次错误
   */
  getLastError() {
    return this.lastError
  }

  /**
   * 带状态管理的执行器
   * @param {Function} operation - 操作函数
   * @returns {Promise<any>} 操作结果
   */
  async executeWithState(operation) {
    try {
      this.loading = true
      this.lastError = null
      this.emit('loading', true)

      const result = await operation()
      return result
    } catch (error) {
      this.logger.error('Operation failed', error)

      const managedError = this.errorManager.handleError(error)
      this.lastError = managedError

      this.emit('error', managedError)

      throw managedError
    } finally {
      this.loading = false
      this.emit('loading', false)
    }
  }

  /**
   * 获取管理器统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      initialized: this.initialized,
      loading: this.loading,
      hasError: !!this.lastError,
      config: this.config
        ? {
            paymentType: this.config.paymentType,
            paymentChannel: this.config.paymentChannel,
            paymentScene: this.config.paymentScene,
          }
        : null,
      errors: this.errorManager.getErrorStats(),
      events: {
        listenerCount: this.listenerCount(),
        eventNames: this.eventNames(),
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 重新加载配置
   * @returns {Promise<Object>} 配置对象
   * @note 不再支持手动合并新配置，直接从系统开关重新获取最新配置
   */
  async reloadConfig() {
    this.logger.info('Reloading config')

    // 重新初始化（强制）
    this.initialized = false
    await this.init({ force: true })

    this.emit('config:reloaded', {
      config: this.config,
      timestamp: new Date().toISOString(),
    })

    return this.config
  }

  /**
   * 清理资源
   */
  destroy() {
    this.logger.info('Destroying payment manager')

    // 清理错误管理器
    this.errorManager.destroy()

    // 清理事件监听器
    this.removeAllListeners()

    // 清理服务实例
    if (this.paymentService && typeof this.paymentService.destroy === 'function') {
      this.paymentService.destroy()
    }

    // 重置状态
    this.initialized = false
    this.loading = false
    this.lastError = null
    this.config = null
    this.paymentService = null
    this.paymentStrategy = null

    this.logger.info('Payment manager destroyed')
  }
}

export default PaymentManager
