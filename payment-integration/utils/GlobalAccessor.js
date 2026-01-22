/**
 * 全局变量安全访问工具
 * @description 提供安全的全局变量访问方法，避免运行时错误
 */

import { defaultLogger } from './Logger.js'

const logger = defaultLogger.child('GlobalAccessor')

/**
 * 安全获取全局 Vue 构造函数
 * @returns {Function|null} Vue 构造函数或 null
 */
export function getGlobalVue() {
  try {
    if (typeof window === 'undefined') {
      logger.warn('window is undefined, cannot access global Vue')
      return null
    }

    const vue = window?.__haicApp__?.__TOOLKITS__?.Vue || null

    if (!vue) {
      logger.warn('Global Vue constructor not found')
    }

    return vue
  } catch (error) {
    logger.error('Failed to access global Vue', error)
    return null
  }
}

/**
 * 安全获取系统开关模块
 * @returns {Object|null} 开关模块或 null
 */
export function getSwitchModule() {
  try {
    if (typeof window === 'undefined') {
      logger.warn('window is undefined, cannot access switch module')
      return null
    }

    if (!window.__haicApp__) {
      logger.warn('HAIC app context not found')
      return null
    }

    if (typeof window.__haicApp__.getContext !== 'function') {
      logger.warn('getContext method not available')
      return null
    }

    const switchModule = window.__haicApp__.getContext('switchModule')

    if (!switchModule || typeof switchModule.getSwitchValue !== 'function') {
      logger.warn('switchModule not available or invalid')
      return null
    }

    return switchModule
  } catch (error) {
    logger.error('Failed to access switch module', error)
    return null
  }
}

/**
 * 安全获取偏好设置
 * @param {string} key - 偏好设置键名
 * @param {any} defaultValue - 默认值
 * @returns {any} 偏好设置值或默认值
 */
export function getPreferenceItem(key, defaultValue = null) {
  try {
    if (typeof window === 'undefined') {
      return defaultValue
    }

    const vue = getGlobalVue()
    if (!vue || !vue.prototype?.$preferenceSetDme?.getItem) {
      return defaultValue
    }

    return vue.prototype.$preferenceSetDme.getItem(key) || defaultValue
  } catch (error) {
    logger.warn('Failed to get preference item', { key, error })
    return defaultValue
  }
}

/**
 * 检查全局环境是否可用
 * @returns {boolean} 是否可用
 */
export function isGlobalEnvironmentAvailable() {
  try {
    return (
      typeof window !== 'undefined' &&
      window.__haicApp__ !== undefined &&
      typeof window.__haicApp__.getContext === 'function'
    )
  } catch {
    return false
  }
}

export default {
  getGlobalVue,
  getSwitchModule,
  getPreferenceItem,
  isGlobalEnvironmentAvailable,
}
