/**
 * 聚合支付模块主入口
 * @description 统一导出支付相关的管理器、常量和工具函数
 */

// 导出管理器
export { default as PaymentManager } from './managers/PaymentManager.js'
export { default as ErrorManager } from './managers/ErrorManager.js'

// 导出工厂
export { default as PaymentFactory } from './factories/PaymentFactory.js'

// 导出配置和工具
export { default as PaymentConfig } from './utils/PaymentConfig.js'
export { default as Logger } from './utils/Logger.js'
export { default as EventEmitter } from './utils/EventEmitter.js'

// 导出错误类
export { default as PaymentError } from './utils/PaymentError.js'

// 导出全局访问工具
export {
  getGlobalVue,
  getSwitchModule,
  getPreferenceItem,
  isGlobalEnvironmentAvailable,
} from './utils/GlobalAccessor.js'

export { PAYMENT_TYPE_SWITCHES } from './constants/switchCodes.js'

export { BUSINESS_TYPES, PAYMENT_STATUS } from './constants/paymentTypes.js'
