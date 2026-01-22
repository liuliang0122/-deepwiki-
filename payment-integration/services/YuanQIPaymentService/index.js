/**
 * 源启支付服务
 * @description 源启支付的具体实现
 */

import BasePaymentService from '../BasePaymentService.js'
import PaymentError from '../../utils/PaymentError.js'
import { yuanQiCallApi } from './api/paymentUtil.js'
import { PAYMENT_STATUS } from '../../constants/paymentTypes.js'
import { PAYMENT_WAY_SWITCHES, PAYMENT_TYPE_SWITCHES } from '../../constants/switchCodes.js'
class YuanqiPaymentService extends BasePaymentService {
  constructor(config = {}) {
    // 合并默认配置
    const finalConfig = { ...config }
    super(finalConfig)
    this.revertHandler = null
  }

  /**
   * 处理支付
   * @param {Object} _paymentData - 支付数据
   * @returns {Promise<Object>} 处理结果
   * @abstract
   */
  async processPayment(paymentData) {
    this.logger.info('Processing Yuanqi payment', {
      chargeInfoId: paymentData?.chargeInfoId,
      orderAmount: paymentData?.orderAmount,
    })
    try {
      const chargeParams = {
        chargeInfoId: paymentData.chargeInfoId, //结算id
        orderAmount: paymentData?.orderAmount || 0, //收费金额
        businessType: paymentData?.businessType, //业务场景
        payScanMode: '2',
        payType: this.config.paymentType,
      }
      // 发起收费
      const res = await yuanQiCallApi('preCreatePayOrder', chargeParams, '发起收费')
      // 创建结算失败的冲正方法
      this.revertHandler = async () => {
        const refundParams = {
          chargeInfoId: paymentData.chargeInfoId, //结算id
          refundAmount: paymentData?.orderAmount, //收费金额
          businessType: paymentData?.businessType, //业务场景
          payScanMode: '2',
          payType: this.config.paymentType,
        }
        try {
          const res = await yuanQiCallApi('preRefundPayOrder', refundParams, '发起退费')
          await yuanQiCallApi(
            'sufRefundPayOrder',
            { ...refundParams, result: JSON.stringify(res) },
            '确认退费'
          )
        } catch (cancelError) {
          this.logger.error('Failed to rollback Yuanqi payment order', cancelError)
        }
      }
      try {
        // 确认收费
        await yuanQiCallApi(
          'sufCreatePayOrder',
          { ...chargeParams, result: JSON.stringify(res) },
          '确认收费'
        )
      } catch (error) {
        // 确认收费失败的话需要冲正
        this.revertHandler()
        throw new Error(error?.message || '确认收费失败')
      }

      return {
        finalStatus: PAYMENT_STATUS.SUCCESS,
        revertHandler: this.revertHandler,
      }
    } catch (error) {
      this.logger.error('Payment process failed', {
        error: error?.message,
        chargeInfoId: paymentData?.chargeInfoId,
      })
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
    this.logger.info('Processing Yuanqi refund', params)

    try {
      if (!params.refundAmount || params.refundAmount <= 0) {
        throw PaymentError.createParamError(
          '退款金额必须大于0',
          'refundAmount',
          params.refundAmount
        )
      }
      const refundParams = {
        chargeInfoId: params?.chargeInfoId, //结算id
        refundAmount: params?.refundAmount, //退款金额
        businessType: params?.businessType, //业务场景
        payScanMode: '2',
        payType: this.config.paymentType,
      }
      // 发起退费
      const res = await yuanQiCallApi('preRefundPayOrder', refundParams, '发起退费')
      // 确认退费
      await yuanQiCallApi(
        'sufRefundPayOrder',
        { ...refundParams, result: JSON.stringify(res) },
        '确认退费'
      )
    } catch (error) {
      this.logger.error('Refund failed', error)
      throw error
    }
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

      // 检查当前支付类型是否为源启支付
      if (this.config.paymentType !== PAYMENT_TYPE_SWITCHES.YUANQI_PAYMENT) {
        this.logger.debug('Payment type is not Yuanqipayment, aggregated payment disabled', {
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
    return 'YuanqiPaymentService'
  }
}

export default YuanqiPaymentService
