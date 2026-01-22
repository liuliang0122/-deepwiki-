/**
 * 支付组件统一导出
 */

// 支付弹窗管理器
export { default as PaymentDialogManager } from './payment-dialog-manager.vue'

// 默认导出所有组件
export default {
  PaymentDialogManager: () => import('./payment-dialog-manager.vue'),
}
