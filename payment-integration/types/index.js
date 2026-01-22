/**
 * 类型定义统一导出
 * @description 导出所有类型定义，便于统一使用
 */

// 支付相关类型
export {
  PaymentQueryResult,
  RefundParams,
  RefundResult,
  PaymentNotifyData,
  PaymentConfig,
} from './payment.js'

// 注意: common.js 中的类型使用 JSDoc @typedef 定义
// 其他文件可通过 JSDoc 引用: @typedef {import('./types/common').SubscribeOptions}
