/**
 * 支付开关码定义
 * @description 定义各种功能开关和配置项
 */

/**
 * 系统开关码定义
 * @description 对应HAIC系统中的开关配置
 */
export const PAYMENT_SWITCH_CODES = {
  PAYMENT_TYPE: 'SETT034', // 聚合支付平台 1.讯飞水滴支付；2.国卫统一支付，默认1.讯飞水滴支付
  PAYMENT_ENABLED: 'SETT009', // 是否启用聚合支付 0.否；1.是，默认0.否
}

/**
 * 支付类型开关值
 */
export const PAYMENT_TYPE_SWITCHES = {
  // 飞水滴支付
  // SHUIDI_PAYMENT: '1',

  // 国卫统一支付
  GUOWEI_PAYMENT: '2',
  // 源启统一支付
  YUANQI_PAYMENT: '3',
}

/**
 * 支付类型开关值
 */
export const PAYMENT_WAY_SWITCHES = {
  // 线上支付
  ONLINE: '1',

  // 线下支付
  OFFLINE: '2',
}

/**
 * 是否开启聚合支付
 */
export const PAYMENT_ENABLED_SWITCHES = {
  // 开启
  ENABLED: '1',

  // 不开启
  DISABLED: '0',
}

/**
 * 环境类型开关
 */
export const ENVIRONMENT_SWITCHES = {
  // 开发环境
  DEVELOPMENT: 'development',
  // 测试环境
  TEST: 'test',
  // 生产环境
  PRODUCTION: 'production',
}

/**
 * 日志级别开关
 */
export const LOG_LEVEL_SWITCHES = {
  // 调试
  DEBUG: 'debug',
  // 信息
  INFO: 'info',
  // 警告
  WARN: 'warn',
  // 错误
  ERROR: 'error',
  // 关闭
  OFF: 'off',
}

/**
 * 缓存策略开关
 */
export const CACHE_STRATEGY_SWITCHES = {
  // 内存缓存
  MEMORY: 'memory',
  // 本地存储
  LOCAL_STORAGE: 'localStorage',
  // 会话存储
  SESSION_STORAGE: 'sessionStorage',
  // 无缓存
  NO_CACHE: 'none',
}
