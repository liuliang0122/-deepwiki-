/**
 * 支付相关类型定义
 * @description TypeScript 风格的类型注释（JSDoc）
 */

/**
 * @typedef {Object} PaymentOrderParams
 * @property {string} orderId - 订单ID
 * @property {number} amount - 支付金额（分）
 * @property {string} paymentType - 支付类型
 * @property {string} [businessType] - 业务类型
 * @property {string} [subject] - 订单标题
 * @property {string} [body] - 订单描述
 * @property {string} [notifyUrl] - 异步通知地址
 * @property {string} [returnUrl] - 同步返回地址
 * @property {number} [timeout] - 超时时间（毫秒）
 * @property {Object} [extraParams] - 额外参数
 */

/**
 * @typedef {Object} PaymentOrderResult
 * @property {string} chargeInfoId - 支付ID
 * @property {string} orderId - 订单ID
 * @property {string} tradeNo - 交易流水号
 * @property {number} amount - 支付金额
 * @property {string} status - 支付状态
 * @property {string} [payUrl] - 支付链接
 * @property {string} [qrCode] - 二维码内容
 * @property {string} [paymentData] - 支付数据（用于SDK）
 * @property {string} createTime - 创建时间
 * @property {Object} [extraData] - 额外数据
 */

/**
 * @typedef {Object} PaymentQueryParams
 * @property {string} chargeInfoId - 支付ID
 * @property {string} [orderId] - 订单ID
 */

/**
 * @typedef {Object} PaymentQueryResult
 * @property {string} chargeInfoId - 支付ID
 * @property {string} orderId - 订单ID
 * @property {string} tradeNo - 交易流水号
 * @property {number} amount - 支付金额
 * @property {string} status - 支付状态
 * @property {string} [buyerAccount] - 买家账号
 * @property {string} [payTime] - 支付时间
 * @property {string} createTime - 创建时间
 * @property {Object} [extraData] - 额外数据
 */

/**
 * @typedef {Object} RefundParams
 * @property {string} chargeInfoId - 支付ID
 * @property {string} orderId - 订单ID
 * @property {number} refundAmount - 退款金额（分）
 * @property {string} reason - 退款原因
 * @property {string} [refundId] - 退款ID（可选，不传则自动生成）
 * @property {string} [notifyUrl] - 异步通知地址
 */

/**
 * @typedef {Object} RefundResult
 * @property {string} refundId - 退款ID
 * @property {string} chargeInfoId - 支付ID
 * @property {string} orderId - 订单ID
 * @property {number} refundAmount - 退款金额
 * @property {string} status - 退款状态
 * @property {string} [refundTime] - 退款时间
 * @property {string} createTime - 创建时间
 */

/**
 * @typedef {Object} PaymentNotifyData
 * @property {string} chargeInfoId - 支付ID
 * @property {string} orderId - 订单ID
 * @property {string} tradeNo - 交易流水号
 * @property {string} status - 支付状态
 * @property {number} amount - 支付金额
 * @property {string} [buyerAccount] - 买家账号
 * @property {string} payTime - 支付时间
 * @property {Object} [extraData] - 额外数据
 */

/**
 * @typedef {Object} PaymentConfig
 * @property {string} paymentChannel - 支付渠道
 * @property {string} paymentScene - 支付场景
 * @property {string} paymentEnv - 支付环境
 * @property {Object} alipay - 支付宝配置
 * @property {Object} wechat - 微信配置
 * @property {Object} unionpay - 银联配置
 * @property {string} autoRefund - 自动退款开关
 * @property {string} paymentNotify - 支付通知开关
 * @property {number} timeout - 超时时间
 * @property {number} retryCount - 重试次数
 * @property {number} retryDelay - 重试延迟
 */

export default {
  // 类型仅用于 JSDoc 注释
}
