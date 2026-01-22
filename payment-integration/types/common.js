/**
 * 通用类型定义
 * @description 模块中通用的类型定义
 */

/**
 * 状态监听选项
 * @typedef {Object} SubscribeOptions
 * @property {boolean} [immediate=false] - 是否立即触发
 * @property {Function} [filter] - 过滤函数
 */

/**
 * 错误过滤条件
 * @typedef {Object} ErrorFilter
 * @property {string} [errorType] - 错误类型
 * @property {string} [since] - 开始时间
 * @property {string} [before] - 结束时间
 * @property {number} [limit] - 限制数量
 */

/**
 * 统计信息
 * @typedef {Object} Stats
 * @property {boolean} initialized - 是否已初始化
 * @property {Object} [config] - 配置信息
 * @property {Object} state - 状态统计
 * @property {Object} errors - 错误统计
 * @property {Object} events - 事件统计
 * @property {string} timestamp - 时间戳
 */

/**
 * 配置对象
 * @typedef {Object} PaymentConfig
 * @property {string} paymentType - 支付类型
 * @property {string} version - 版本
 * @property {string} vendor - 厂商
 * @property {Object} printConfig - 打印配置
 * @property {string} environment - 环境
 * @property {boolean} debug - 是否调试模式
 * @property {Object} apiConfig - API配置
 * @property {Object} cacheConfig - 缓存配置
 * @property {Object} logConfig - 日志配置
 * @property {Object} businessConfig - 业务配置
 */

/**
 * 初始化选项
 * @typedef {Object} InitOptions
 * @property {boolean} [force=false] - 是否强制重新初始化
 */

/**
 * 事件数据
 * @typedef {Object} EventData
 * @property {string} type - 事件类型
 * @property {string|number} chargeInfoId - 结算ID
 * @property {Object} result - 结果数据
 * @property {string} timestamp - 时间戳
 */

/**
 * 错误对象
 * @typedef {Object} PaymentError
 * @property {string} name - 错误名称
 * @property {string} message - 错误消息
 * @property {string} code - 错误码
 * @property {Object} details - 错误详情
 * @property {string} timestamp - 时间戳
 * @property {string} stack - 错误堆栈
 */

/**
 * 日志级别
 * @typedef {string} LogLevel
 * @description 日志级别 ('debug' | 'info' | 'warn' | 'error')
 */

/**
 * 日志配置
 * @typedef {Object} LogConfig
 * @property {LogLevel} [level='info'] - 日志级别
 * @property {boolean} [console=true] - 是否输出到控制台
 * @property {boolean} [file=false] - 是否输出到文件
 * @property {string} [filename] - 日志文件名
 * @property {number} [maxSize] - 最大文件大小 (MB)
 * @property {number} [maxFiles] - 最大文件数量
 */

/**
 * 缓存配置
 * @typedef {Object} CacheConfig
 * @property {boolean} [enabled=true] - 是否启用缓存
 * @property {number} [maxSize=100] - 最大缓存数量
 * @property {number} [ttl=300000] - 缓存过期时间 (ms)
 * @property {string} [storage='memory'] - 存储类型 ('memory' | 'localStorage' | 'sessionStorage')
 */

/**
 * API配置
 * @typedef {Object} ApiConfig
 * @property {string} baseURL - 基础URL
 * @property {number} [timeout=30000] - 超时时间 (ms)
 * @property {number} [retries=3] - 重试次数
 * @property {Object} [headers] - 默认请求头
 * @property {Function} [interceptors] - 拦截器
 */

/**
 * 环境信息
 * @typedef {Object} Environment
 * @property {boolean} isBrowser - 是否为浏览器环境
 * @property {boolean} isNode - 是否为Node.js环境
 * @property {boolean} hasWebSocket - 是否支持WebSocket
 * @property {boolean} hasLocalStorage - 是否支持localStorage
 * @property {boolean} hasSessionStorage - 是否支持sessionStorage
 * @property {string} userAgent - 用户代理字符串
 * @property {string} timestamp - 时间戳
 */

/**
 * 模块信息
 * @typedef {Object} ModuleInfo
 * @property {string} name - 模块名称
 * @property {string} description - 模块描述
 * @property {string} version - 版本号
 * @property {string} author - 作者
 * @property {string} license - 许可证
 * @property {string} repository - 仓库地址
 * @property {string} bugs - 问题反馈地址
 * @property {Array<string>} keywords - 关键词
 * @property {Object} engines - 引擎要求
 * @property {Object} browser - 浏览器支持
 * @property {Array<string>} features - 功能特性
 * @property {Object} changelog - 更新日志
 */
