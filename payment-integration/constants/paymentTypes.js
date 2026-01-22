/**
 * 聚合支付类型和状态常量
 * @description 定义聚合支付相关的所有枚举类型
 * @note 本框架专注于聚合支付平台,支付宝/微信等渠道通过聚合平台接入
 */

/**
 * 聚合支付平台类型
 * @description 支持的聚合支付平台
 */
export const PAYMENT_TYPES = {
  /** 国卫聚合支付 */
  GUOWEI: 'guowei',
}

/**
 * 支付状态常量
 */
export const PAYMENT_STATUS = {
  /** 被扫支付 初始化 */
  PASSIVE_INIT: '-100',
  /** 主扫支付 初始化 */
  ACTIVE_INIT: '-101',
  /** 等待-待操作 */
  WAITING: '-200',
  /** 待支付 */
  PENDING: '10',
  /** 支付中 */
  PROCESSING: '11',
  /** 支付成功 */
  SUCCESS: '20',
  /** 支付失败 */
  FAILED: '30',
  /** 已取消 */
  CANCELLED: '50',
  /** 已关闭 */
  CLOSED: '31',
  /** 退款中 */
  REFUNDING: '33',
  /** 已退款 */
  REFUNDED: '32',
  /** 超时 */
  TIMEOUT: '40',
  /** 放弃 */
  ABANDONED: '-99',
}

/**
 * 扫码模式
 * @description 聚合支付支持的扫码模式
 */
export const SCAN_MODES = {
  /** 主扫模式: 患者扫描收银台二维码 */
  ACTIVE: '1',
  /** 被扫模式: 收银员扫描患者付款码 */
  PASSIVE: '2',
}

/**
 * 退款状态
 */
export const REFUND_STATUS = {
  PROCESSING: '1', // 退款中
  SUCCESS: '2', // 退款成功
  FAILED: '3', // 退款失败
}

/**
 * 业务类型（医疗场景）
 */
export const BUSINESS_TYPES = {
  // 门诊挂号
  OUTPATIENT_REGISTER: '1',
  // 门诊收费
  OUTPATIENT_CHARGE: '2',
  // 住院预交金
  INPATIENT_PREPAY: '3',
  // 住院结算
  INPATIENT_CHARGE: '4',
  // 其他
  OTHER: '5',
}

/**
 * 支付环境
 */
export const PAYMENT_ENV = {
  PRODUCTION: 'production', // 生产环境
  SANDBOX: 'sandbox', // 沙箱环境
  MOCK: 'mock', // 模拟环境
}

/**
 * 验证支付类型是否有效
 * @param {string} type - 支付类型
 * @returns {boolean}
 */
export function isValidPaymentType(type) {
  return Object.values(PAYMENT_TYPES).includes(type)
}

/**
 * 验证支付状态是否有效
 * @param {string} status - 支付状态
 * @returns {boolean}
 */
export function isValidPaymentStatus(status) {
  return Object.values(PAYMENT_STATUS).includes(status)
}

export default {
  PAYMENT_TYPES,
  PAYMENT_STATUS,
  SCAN_MODES,
  REFUND_STATUS,
  BUSINESS_TYPES,
  PAYMENT_ENV,
  isValidPaymentType,
  isValidPaymentStatus,
}
