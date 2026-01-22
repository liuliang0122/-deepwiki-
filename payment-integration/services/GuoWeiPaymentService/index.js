/**
 * 国卫支付服务
 * @description 国卫支付的具体实现
 */

import BasePaymentService from '../BasePaymentService.js'
import PaymentError from '../../utils/PaymentError.js'
import DialogManager from '../../managers/DialogManager.js'
import { SCAN_MODES, PAYMENT_STATUS } from '../../constants/paymentTypes.js'
import { PAYMENT_WAY_SWITCHES, PAYMENT_TYPE_SWITCHES } from '../../constants/switchCodes.js'
import {
  createPayOrderApi,
  queryPayOrderResultApi,
  closePayOrderApi,
  refundPayOrderApi,
  queryRefundOrderResultApi,
} from './api/payment.js'
import { getPreferenceItem } from '../../utils/GlobalAccessor.js'
class GuoweiPaymentService extends BasePaymentService {
  // ===== 静态常量定义 =====
  /**
   * 构造函数
   * @param {Object} config - 服务配置
   */
  constructor(config = {}) {
    // 合并默认配置
    const finalConfig = {
      ...config,
    }
    super(finalConfig)
    this.dialogManager = DialogManager.getInstance()
    this.revertHandler = null
    this.payOrderNo = ''
    // 保存当前弹窗实例和事件处理器引用，用于清理
    this.currentDialogInstance = null
    this.eventHandlers = {}
  }

  // ===== 实时配置获取方法 =====

  /**
   * 处理支付
   * @param {Object} _paymentData - 支付数据
   * @returns {Promise<Object>} 处理结果
   * @abstract
   */
  async processPayment(paymentData, isInsuranceCharge, nodeId) {
    this.logger.info('Processing Guowei payment', {
      chargeInfoId: paymentData?.chargeInfoId,
      orderAmount: paymentData?.orderAmount,
    })
    try {
      // 验证支付数据
      if (!this.validate(paymentData)) {
        throw PaymentError.createParamError('支付数据验证失败', 'paymentData', paymentData)
      }
      this.config.payScanMode = getPreferenceItem('PAY_SCAN_MODE', SCAN_MODES.PASSIVE)
      let dialogResult = null
      paymentData.payScanMode = this.config.payScanMode
      paymentData.payType = this.config.paymentType

      // 显示支付弹窗（主扫和被扫模式都使用同一个方法）
      dialogResult = await this.showPaymentDialog(paymentData, isInsuranceCharge, nodeId)

      // 等待用户支付完成返回结果
      this.logger.info('Payment process completed', {
        status: dialogResult?.status,
        chargeInfoId: paymentData?.chargeInfoId,
      })
      return {
        ...dialogResult,
        finalStatus: dialogResult.status,
        revertHandler: this.revertHandler,
      }
    } catch (error) {
      this.logger.error('Payment process failed', {
        error: error.message,
        chargeInfoId: paymentData?.chargeInfoId,
      })
      // 确保错误时也清理资源
      if (this.currentDialogInstance) {
        try {
          this._unbindDialogEvents(this.currentDialogInstance)
          this.currentDialogInstance = null
        } catch (cleanupError) {
          this.logger.warn('Failed to cleanup on payment error', cleanupError)
        }
      }
      throw error
    }
  }

  /**
   * 创建支付订单
   * @param {Object} params - 支付参数
   * @returns {Promise<Object>} 支付结果
   * @abstract
   */
  async createPayment(paymentInfo) {
    this.logger.info('Creating Guowei payment order', paymentInfo)
    try {
      paymentInfo.payScanMode = this.config.payScanMode
      const response = await createPayOrderApi(paymentInfo)
      const responseData = response?.data || {}
      const data = response?.data || null
      if (data?.code && data.code !== '200') {
        throw new Error(data?.message || data?.msg || '创建支付订单失败')
      }
      // 使用可选链和空值合并，避免访问 null 的属性
      this.payOrderNo = data?.data?.payOrderNo ?? ''
      if (!this.payOrderNo) {
        throw new Error('支付订单号获取失败')
      }
      this.revertHandler = async () => {
        try {
          const refundParams = this.getPayApiParams(paymentInfo)
          await this.refund({
            ...refundParams,
            refundAmount: paymentInfo.orderAmount,
          })
        } catch (cancelError) {
          this.logger.error('Failed to rollback Guowei payment order', cancelError)
        }
      }
      return {
        message: responseData?.msg || responseData?.message,
        rawResponse: data?.data || {},
      }
    } catch (error) {
      this.logger.error('Payment process failed', error)
      throw error
    }
  }

  /**
   * 验证支付数据
   * @param {Object} paymentData - 支付数据
   * @returns {boolean} 是否有效
   */
  validate(paymentData) {
    if (!paymentData) {
      return false
    }

    // 国卫支付必须包含的字段
    const requiredFields = ['businessType', 'chargeInfoId', 'orderAmount']
    const hasRequired = requiredFields.every((field) => paymentData[field])

    return hasRequired
  }
  /**
   * 查询支付订单 合支付结果
   * @param {Object} params - 查询参数
   * @param {string} params.orderId - 订单ID
   * @param {string} params.guoweiOrderNo - 国卫订单
   * @returns {Promise<Object>} 支付状态
   */
  async queryPaymentStatus(paymentInfo) {
    try {
      const queryParams = this.getPayApiParams(paymentInfo)
      // 调用查询接口
      const result = await queryPayOrderResultApi(queryParams)
      const data = result?.data || null
      if (data?.code && data.code !== '200') {
        throw new Error(data?.message || data?.msg || '查询支付订单失败')
      }
      return data
    } catch (error) {
      this.logger.error('Payment query failed', error)
      throw error
    }
  }

  /**
   * 退款
   * @param {Object} params - 退款参数
   * @param {string} params.invoiceId - 需要退款的发票id
   * @param {number} params.refundAmount - 退款金额
   * @param {string} [params.payScanMode] - 扫码模式
   * @param {string} [params.payType] - 支付类型
   * @returns {Promise<Object>} 退款结果
   */
  async refund(params) {
    this.logger.info('Processing Guowei refund', params)

    try {
      // 验证必要参数
      if (!params.chargeInfoId) {
        throw PaymentError.createParamError('结算ID不能为空', 'chargeInfoId')
      }

      if (!params.refundAmount || params.refundAmount <= 0) {
        throw PaymentError.createParamError(
          '退款金额必须大于0',
          'refundAmount',
          params.refundAmount
        )
      }
      params.payType = this.config.paymentType
      params.payScanMode = params.payScanMode || this.config.payScanMode

      // 调用退款接口
      const result = await refundPayOrderApi(params)
      await this.refundResult(params)

      this.logger.info('Refund completed', result)
      return result
    } catch (error) {
      this.logger.error('Refund failed', error)
      throw error
    }
  }

  /**
   * 退款结果查询
   * @param {Object} params - 退款参数
   * @param {string} params.invoiceId - 需要退款的发票id
   * @param {number} params.refundAmount - 退款金额
   * @param {string} [params.payScanMode] - 扫码模式
   * @param {string} [params.payType] - 支付类型
   * @returns {Promise<Object>} 退款结果
   */
  async refundResult(params) {
    this.logger.info('Processing Guowei refund result query', params)

    try {
      // 验证必要参数
      if (!params.chargeInfoId) {
        throw PaymentError.createParamError('结算ID不能为空', 'chargeInfoId')
      }

      if (!params.refundAmount || params.refundAmount <= 0) {
        throw PaymentError.createParamError(
          '退款金额必须大于0',
          'refundAmount',
          params.refundAmount
        )
      }
      params.payType = this.config.paymentType
      // 调用退款结果查询接口
      const result = await queryRefundOrderResultApi(params)

      this.logger.info('Refund completed', result)
      return result
    } catch (error) {
      this.logger.error('Refund failed', error)
      throw error
    }
  }

  /**
   * 取消订单 -关闭支付订单
   * @param {Object} params - 取消参数
   * @param {string} params.orderId - 订单ID
   * @param {string} [params.cancelReason] - 取消原因
   * @returns {Promise<Object>} 取消结果
   */
  async cancelPayment(params) {
    this.logger.info('Cancelling Guowei payment', params)

    try {
      const queryParams = this.getPayApiParams(params)
      // 调用查询（国卫使用关闭接口实现取消）
      const paymentResult = await this.queryPaymentStatus(queryParams)
      const data = paymentResult?.data || {}
      let result = null
      if (!data.paymentStatus) {
        return result
      } else if (data.paymentStatus === PAYMENT_STATUS.SUCCESS) {
        // 已付款调用付款退款接口
        queryParams.refundAmount = params.orderAmount
        result = await this.refund(queryParams)
      } else if (
        data.paymentStatus === PAYMENT_STATUS.PENDING ||
        data.paymentStatus === PAYMENT_STATUS.PROCESSING
      ) {
        // 调用关闭接口（国卫使用关闭接口实现取消）
        result = await closePayOrderApi(queryParams)
      }
      this.logger.info('Payment cancelled', result)
      return result
    } catch (error) {
      this.logger.error('Payment cancellation failed', error)
      throw error
    }
  }

  /**
   * 关闭订单
   * @param {Object} params - 关闭参数
   * @param {string} params.orderId - 订单ID
   * @returns {Promise<Object>} 关闭结果
   */
  async closePayment(params) {
    this.logger.info('Closing Guowei payment', params)

    try {
      // 获取必要参数
      const queryParams = this.getPayApiParams(params)

      // 调用关闭接口
      const result = await closePayOrderApi(queryParams)

      this.logger.info('Payment closed', result)
      return result
    } catch (error) {
      this.logger.error('Payment close failed', error)
      throw error
    }
  }

  /**
   * 获取弹窗配置
   * @returns {Object} 弹窗配置
   */
  getDialogConfig() {
    let width = '500px'
    if (this.config.payScanMode === SCAN_MODES.ACTIVE) {
      width = '580px'
    }
    return {
      title: '扫码支付',
      width,
      showPolling: true,
      autoClose: true,
      closeDelay: 2000,
    }
  }

  /**
   * 显示支付弹窗（使用 DialogManager）
   * @param {Object} paymentInfo - 支付信息
   * @returns {Promise<Object>} 弹窗处理结果
   */
  async showPaymentDialog(paymentInfo, isInsuranceCharge, nodeId) {
    this.logger.info('Showing payment dialog via DialogManager', paymentInfo)
    try {
      // 使用 DialogManager 打开弹窗，返回控制器对象
      const dialogController = await this.dialogManager.openPaymentDialog(
        {
          strategy: this, // 传递策略实例
          paymentInfo,
          config: this.getDialogConfig(),
          autoPolling: paymentInfo.payScanMode === SCAN_MODES.ACTIVE ? true : false,
          pollingInterval: this.config.pollingInterval || 3000,
          isInsuranceCharge,
        },
        nodeId
      )

      // 获取弹窗实例
      const dialogInstance = dialogController.instance
      // 保存弹窗实例引用，用于后续清理
      this.currentDialogInstance = dialogInstance

      // 延迟绑定事件，确保弹窗先显示，避免阻塞渲染
      // 使用 Vue 实例的 $nextTick 确保 DOM 更新完成后再绑定事件
      if (dialogInstance && typeof dialogInstance.$nextTick === 'function') {
        await dialogInstance.$nextTick()
      } else {
        // 如果 $nextTick 不可用，使用 setTimeout 延迟执行
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      this._bindDialogEvents(dialogInstance, paymentInfo)

      // 等待弹窗完成并返回结果
      const result = await dialogController.waitForResult()
      this.logger.info('Dialog completed', result)

      // 弹窗关闭后清理事件监听器
      this._unbindDialogEvents(dialogInstance)
      this.currentDialogInstance = null

      return result
    } catch (error) {
      this.logger.error('Dialog error', error)
      // 发生错误时也要清理事件监听器
      if (this.currentDialogInstance) {
        try {
          this._unbindDialogEvents(this.currentDialogInstance)
        } catch (cleanupError) {
          this.logger.error('Failed to cleanup dialog events on error', cleanupError)
        }
        this.currentDialogInstance = null
      }
      throw error
    }
  }

  /**
   * 绑定弹窗事件处理器
   * @private
   * @param {VueComponent} dialogInstance - 弹窗实例
   * @param {Object} paymentInfo - 支付信息
   */
  _bindDialogEvents(dialogInstance, paymentInfo) {
    if (!dialogInstance || typeof dialogInstance.$on !== 'function') {
      this.logger.error('Invalid dialog instance for binding events')
      return
    }

    try {
      // 初始化事件处理器
      const initDialogHandler = async () => {
        this.logger.debug('Dialog init', { chargeInfoId: paymentInfo?.chargeInfoId })
        try {
          if (paymentInfo.payScanMode === SCAN_MODES.ACTIVE) {
            const { rawResponse } = await this.createPayment(paymentInfo)
            if (rawResponse?.payUrl && dialogInstance.updateQRCodeUrl) {
              dialogInstance.updateQRCodeUrl(rawResponse.payUrl)
            }
          }
        } catch (error) {
          this.logger.error('Dialog init failed', error)
          if (dialogInstance.updateStatus) {
            dialogInstance.updateStatus(PAYMENT_STATUS.FAILED)
          }
        }
      }
      dialogInstance.$on('init-dialog', initDialogHandler)
      this.eventHandlers['init-dialog'] = initDialogHandler

      // 查询状态事件处理器
      const queryStatusHandler = async () => {
        try {
          const result = await this.queryPaymentStatus(paymentInfo)
          const data = result?.data || {}
          if (dialogInstance.updateStatus) {
            dialogInstance.updateStatus(data.paymentStatus)
          }
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('query', false)
          }
        } catch (error) {
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('query', false)
          }
          this.logger.error('Query status error', error)
        }
      }
      dialogInstance.$on('query-status', queryStatusHandler)
      this.eventHandlers['query-status'] = queryStatusHandler

      // 取消支付事件处理器
      const cancelPaymentHandler = async () => {
        try {
          await this.cancelPayment(paymentInfo)
          if (dialogInstance.updateStatus) {
            dialogInstance.updateStatus(PAYMENT_STATUS.WAITING)
          }
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('cancel', false)
          }
        } catch (error) {
          this.logger.error('Cancel payment error', error)
          if (dialogInstance.updateStatus) {
            dialogInstance.updateStatus(PAYMENT_STATUS.WAITING)
          }
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('cancel', false)
          }
        }
      }
      dialogInstance.$on('cancel-payment', cancelPaymentHandler)
      this.eventHandlers['cancel-payment'] = cancelPaymentHandler

      // 重试支付事件处理器
      const retryPaymentHandler = async () => {
        try {
          await this.cancelPayment(paymentInfo)
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('retry', false)
          }
        } catch (error) {
          this.logger.error('Retry payment error', error)
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('retry', false)
          }
        }
      }
      dialogInstance.$on('retry-payment', retryPaymentHandler)
      this.eventHandlers['retry-payment'] = retryPaymentHandler

      // 放弃支付事件处理器
      const abandonPaymentHandler = async () => {
        try {
          await this.cancelPayment(paymentInfo)
        } catch (error) {
          this.logger.error('Abandon payment error', error)
        }
      }
      dialogInstance.$on('abandon-payment', abandonPaymentHandler)
      this.eventHandlers['abandon-payment'] = abandonPaymentHandler

      // 刷新支付码事件处理器
      const refreshQrcodeHandler = async ({ paymentInfo: refreshPaymentInfo }) => {
        try {
          await this.cancelPayment(refreshPaymentInfo || paymentInfo)
          const { rawResponse } = await this.createPayment(refreshPaymentInfo || paymentInfo)
          if (rawResponse?.payUrl && dialogInstance.updateQRCodeUrl) {
            dialogInstance.updateQRCodeUrl(rawResponse.payUrl)
          }
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('refresh', false)
          }
        } catch (error) {
          if (dialogInstance.setActionLoading) {
            dialogInstance.setActionLoading('refresh', false)
          }
          this.logger.error('Refresh qrcode error', error)
          if (dialogInstance.updateStatus) {
            dialogInstance.updateStatus(PAYMENT_STATUS.FAILED)
          }
        }
      }
      dialogInstance.$on('refresh-qrcode', refreshQrcodeHandler)
      this.eventHandlers['refresh-qrcode'] = refreshQrcodeHandler

      // 创建支付订单事件处理器
      const createPaymentHandler = async ({ paymentInfo: createPaymentInfo }) => {
        try {
          await this.createPayment(createPaymentInfo || paymentInfo)
        } catch (error) {
          this.logger.error('Create payment error', error)
          if (dialogInstance.updateStatus) {
            dialogInstance.updateStatus(PAYMENT_STATUS.FAILED)
          }
        }
      }
      dialogInstance.$on('create-payment', createPaymentHandler)
      this.eventHandlers['create-payment'] = createPaymentHandler
    } catch (error) {
      this.logger.error('Failed to bind dialog events', error)
      // 如果绑定失败，清理已绑定的事件
      this._unbindDialogEvents(dialogInstance)
      throw error
    }
  }

  /**
   * 解绑弹窗事件处理器
   * @private
   * @param {VueComponent} dialogInstance - 弹窗实例
   */
  _unbindDialogEvents(dialogInstance) {
    if (!dialogInstance) {
      return
    }

    try {
      // 移除所有绑定的事件监听器
      Object.keys(this.eventHandlers).forEach((eventName) => {
        const handler = this.eventHandlers[eventName]
        if (handler && typeof dialogInstance.$off === 'function') {
          try {
            dialogInstance.$off(eventName, handler)
            this.logger.debug(`Unbound event listener: ${eventName}`)
          } catch (error) {
            this.logger.warn(`Failed to unbind event listener: ${eventName}`, error)
          }
        }
      })

      // 如果组件实例还存在，移除所有事件监听器（兜底清理）
      if (dialogInstance && typeof dialogInstance.$off === 'function') {
        try {
          // 移除所有可能的事件监听器
          const eventNames = [
            'init-dialog',
            'query-status',
            'cancel-payment',
            'retry-payment',
            'abandon-payment',
            'refresh-qrcode',
            'create-payment',
            'final-status',
            'close',
          ]
          eventNames.forEach((eventName) => {
            dialogInstance.$off(eventName)
          })
        } catch (error) {
          this.logger.warn('Failed to remove all event listeners', error)
        }
      }

      // 清空事件处理器引用
      this.eventHandlers = {}
    } catch (error) {
      this.logger.error('Error in _unbindDialogEvents', error)
    }
  }

  // 获取支付接口参数
  getPayApiParams(params) {
    const { chargeInfoId, payScanMode, payType } = params
    const queryParams = {
      chargeInfoId,
      payOrderNo: this.payOrderNo || '',
      payScanMode: payScanMode || this.config.payScanMode,
      payType: payType || this.config.paymentType,
    }
    return queryParams
  }

  /**
   * 判断是否开启聚合支付（业务层判断）
   * @description 在基础配置检查通过后，进行业务层面的判断
   * @param {Object} paymentData - 支付数据
   * @param {string} paymentData.payType - 支付方式
   * @param {string} paymentData.onlineType - 线上支付类型
   * @param {number|string} paymentData.thirdSelfPayAmount - 自付金额
   * @returns {Promise<boolean>} 是否开启聚合支付
   */
  async isAggregatedPaymentEnabled(paymentData) {
    try {
      // 业务层判断：检查支付数据是否满足业务条件
      if (!paymentData) {
        this.logger.debug('Payment data is empty, aggregated payment disabled')
        return false
      }

      const { payType, onlineType, thirdSelfPayAmount } = paymentData

      // 检查自付金额是否大于0
      if (Number(thirdSelfPayAmount) <= 0) {
        this.logger.debug('Third self pay amount is invalid, aggregated payment disabled', {
          thirdSelfPayAmount,
        })
        return false
      }

      // 检查支付方式是否为线上支付
      if (payType !== PAYMENT_WAY_SWITCHES.ONLINE) {
        this.logger.debug('Pay type is not online, aggregated payment disabled', {
          payType,
        })
        return false
      }

      // 检查线上支付类型是否存在
      if (!onlineType) {
        this.logger.debug('Online type is empty, aggregated payment disabled')
        return false
      }

      // 检查当前支付类型是否为国卫支付
      if (this.config.paymentType !== PAYMENT_TYPE_SWITCHES.GUOWEI_PAYMENT) {
        this.logger.debug('Payment type is not Guowei payment, aggregated payment disabled', {
          paymentType: this.config.paymentType,
        })
        return false
      }

      this.logger.debug('Business check passed for aggregated payment', {
        payType,
        onlineType,
        thirdSelfPayAmount,
        paymentType: this.config.paymentType,
      })

      return true
    } catch (error) {
      this.logger.error('Failed to check aggregated payment status in service', error)
      // 发生错误时默认返回 false，确保业务逻辑的安全性
      return false
    }
  }

  /**
   * 获取服务名称
   * @returns {string} 服务名称
   */
  getServiceName() {
    return 'GuoWeiPaymentService'
  }
}

export default GuoweiPaymentService
