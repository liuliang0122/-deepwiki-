/**
 * 支付弹窗管理器
 * @description 框架内部的弹窗管理，业务应用无需感知
 * @file payment-integration/managers/DialogManager.js
 */

import EventEmitter from '../utils/EventEmitter.js'
import Logger from '../utils/Logger.js'

class DialogManager extends EventEmitter {
  constructor() {
    super()
    this.logger = new Logger('DialogManager')
    this.activeDialogs = new Map()
    this.dialogContainer = null
    this.Vue = null
    this.UniversalPaymentDialog = null
    this.dialogPromises = new Map()
  }

  /**
   * 获取单例
   */
  static getInstance() {
    if (!DialogManager.instance) {
      DialogManager.instance = new DialogManager()
    }
    return DialogManager.instance
  }

  /**
   * 初始化弹窗管理器
   * @param {Vue} Vue - Vue构造函数
   * @param {VueComponent} UniversalPaymentDialog - 弹窗组件
   */
  initialize(Vue, UniversalPaymentDialog) {
    this.Vue = Vue
    this.UniversalPaymentDialog = UniversalPaymentDialog
    this.logger.info('DialogManager initialized')
  }

  /**
   * 检查是否已初始化
   */
  checkInitialized() {
    if (!this.Vue || !this.UniversalPaymentDialog) {
      throw new Error(
        'DialogManager not initialized. Please call DialogManager.getInstance().initialize(Vue, UniversalPaymentDialog) first.'
      )
    }
  }

  /**
   * 打开支付弹窗
   * @param {Object} options - 弹窗配置
   * @param {Object} options.paymentInfo - 支付信息
   * @param {Object} options.config - 弹窗配置
   * @param {boolean} options.autoPolling - 是否自动轮询
   * @param {number} options.pollingInterval - 轮询间隔
   * @returns {Object} 弹窗控制对象
   * @returns {VueComponent} returns.instance - Vue组件实例
   * @returns {string} returns.dialogId - 弹窗ID
   * @returns {Function} returns.close - 关闭弹窗的方法
   * @returns {Function} returns.waitForResult - 异步方法，返回Promise，等待弹窗终止状态
   */
  async openPaymentDialog(options, nodeId) {
    this.checkInitialized()

    const {
      strategy,
      paymentInfo,
      config = {},
      autoPolling = false,
      pollingInterval = 3000,
      isInsuranceCharge = false,
    } = options

    const dialogKey = this._getDialogKey(paymentInfo)

    // 如果已存在相同key的弹窗，返回已存在的实例
    if (this.dialogPromises.has(dialogKey)) {
      this.logger.warn('Dialog already opened, reuse existing instance', {
        dialogKey,
        chargeInfoId: paymentInfo.chargeInfoId,
      })
      const existingDialog = this.dialogPromises.get(dialogKey)
      return existingDialog
    }

    const dialogId = `payment-dialog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    this.logger.info('Opening payment dialog', {
      dialogId,
      chargeInfoId: paymentInfo.chargeInfoId,
    })

    // 创建 Promise 的 resolve/reject 控制器
    let resolvePromise = null
    let rejectPromise = null
    let isResolved = false

    const dialogPromise = new Promise((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject
    })

    let dialogInstance = null

    try {
      // 创建弹窗实例
      dialogInstance = await this._createVueDialogInstance(
        {
          dialogId,
          strategy,
          paymentInfo,
          config,
          autoPolling,
          pollingInterval,
          isInsuranceCharge,
        },
        nodeId
      )

      // 缓存弹窗实例和策略的关联
      this.activeDialogs.set(dialogId, {
        instance: dialogInstance,
        strategy,
        paymentInfo,
        resolvePromise,
        rejectPromise,
      })
    } catch (error) {
      this.logger.error('Failed to create dialog instance', error)
      this.dialogPromises.delete(dialogKey)
      if (rejectPromise) {
        rejectPromise(error)
      }
      throw error
    }

    // 监听弹窗完成事件
    const handleFinalStatus = (data) => {
      if (isResolved) return
      isResolved = true
      this.logger.info('Dialog final status', data)
      if (resolvePromise) {
        resolvePromise(data)
      }
      this._cleanupDialog(dialogId)
      this.dialogPromises.delete(dialogKey)
    }

    const handleClose = (data) => {
      if (isResolved) return
      isResolved = true
      this.logger.info('Dialog closed', data)
      if (resolvePromise) {
        resolvePromise(data || { status: 'cancelled' })
      }
      this._cleanupDialog(dialogId)
      this.dialogPromises.delete(dialogKey)
    }

    dialogInstance.$once('final-status', handleFinalStatus)
    dialogInstance.$once('close', handleClose)

    // 创建返回对象
    const dialogController = {
      instance: dialogInstance,
      dialogId,
      /**
       * 关闭弹窗
       * @param {Object} result - 可选的关闭结果数据
       */
      close: (result) => {
        if (isResolved) {
          this.logger.warn('Dialog already closed', { dialogId })
          return
        }
        this.logger.info('Manually closing dialog', { dialogId })

        // 触发关闭事件
        if (dialogInstance && typeof dialogInstance.$emit === 'function') {
          dialogInstance.$emit('close', result || { status: 'cancelled' })
        } else {
          // 如果实例已销毁，直接 resolve
          handleClose(result || { status: 'cancelled' })
        }
      },
      /**
       * 等待弹窗终止状态
       * @returns {Promise<Object>} 弹窗的最终状态
       */
      waitForResult: () => {
        return dialogPromise
      },
    }

    // 缓存控制器对象
    this.dialogPromises.set(dialogKey, dialogController)

    return dialogController
  }

  /**
   * 创建 Vue 组件实例
   * @private
   */
  _createVueDialogInstance(options, nodeId) {
    const { isInsuranceCharge, paymentInfo, config, autoPolling, pollingInterval } = options

    const DialogComponent = this.Vue.extend(this.UniversalPaymentDialog)

    const instance = new DialogComponent({
      propsData: {
        visible: true,
        paymentInfo,
        config,
        autoPolling,
        pollingInterval,
        isInsuranceCharge,
      },
    })

    // 绑定策略方法到弹窗事件
    // this._bindStrategyMethods(instance, strategy)

    // 挂载组件
    instance.$mount()

    // 优化 DOM 查找：使用缓存或更高效的查找方式
    let haicContainer = document.body.querySelector(nodeId || '#haic-spa-outpatient-container')
    // 如果找不到容器，使用 body 作为后备
    if (!haicContainer) {
      this.logger.warn('Container #haic-spa-outpatient-container not found, using body as fallback')
      haicContainer = document.body
    }
    haicContainer.appendChild(instance.$el)

    return instance
  }

  /**
   * 清理弹窗实例
   * @private
   */
  _cleanupDialog(dialogId) {
    const dialogData = this.activeDialogs.get(dialogId)
    if (!dialogData || !dialogData.instance) {
      return
    }

    const { instance, strategy } = dialogData

    try {
      // 调用服务层的清理方法（如果存在）
      if (strategy && typeof strategy._unbindDialogEvents === 'function') {
        try {
          strategy._unbindDialogEvents(instance)
          this.logger.debug('Service layer events cleaned up', { dialogId })
        } catch (error) {
          this.logger.warn('Failed to cleanup service layer events', { dialogId, error })
        }
      }

      // 移除所有事件监听
      try {
        instance.$off()
      } catch (error) {
        this.logger.warn('Failed to remove all event listeners', { dialogId, error })
      }

      // 清理定时器（如果组件有定时器）
      if (instance.stopPolling && typeof instance.stopPolling === 'function') {
        try {
          instance.stopPolling()
        } catch (error) {
          this.logger.warn('Failed to stop polling', { dialogId, error })
        }
      }

      if (instance.stopTimer && typeof instance.stopTimer === 'function') {
        try {
          instance.stopTimer()
        } catch (error) {
          this.logger.warn('Failed to stop timer', { dialogId, error })
        }
      }

      // 延迟销毁，等待动画完成
      const ANIMATION_DELAY = 300 // 动画延迟时间（毫秒）
      const cleanupTimer = setTimeout(() => {
        try {
          if (instance.$el && instance.$el.parentNode) {
            instance.$el.parentNode.removeChild(instance.$el)
          }
          if (instance.$destroy && typeof instance.$destroy === 'function') {
            instance.$destroy()
          }
        } catch (error) {
          this.logger.error('Failed to destroy dialog instance', { dialogId, error })
        }
      }, ANIMATION_DELAY)

      // 保存清理定时器引用，以便在需要时取消
      if (!dialogData.cleanupTimer) {
        dialogData.cleanupTimer = cleanupTimer
      }

      // 从缓存中移除
      this.activeDialogs.delete(dialogId)

      this.logger.debug('Dialog cleaned up', { dialogId })
    } catch (error) {
      this.logger.error('Error in _cleanupDialog', { dialogId, error })
      // 即使清理失败，也要从缓存中移除，避免内存泄漏
      this.activeDialogs.delete(dialogId)
    }
  }

  /**
   * 根据dialogId获取弹窗控制器
   * @param {string} dialogId - 弹窗ID
   * @returns {Object|null} 弹窗控制器对象
   */
  getDialogController(dialogId) {
    const dialogData = this.activeDialogs.get(dialogId)
    if (!dialogData) {
      return null
    }

    // 从 dialogPromises 中查找对应的控制器
    for (const [, controller] of this.dialogPromises.entries()) {
      if (controller.dialogId === dialogId) {
        return controller
      }
    }
    return null
  }

  /**
   * 根据策略和支付信息生成唯一键
   * @private
   */
  _getDialogKey(paymentInfo = {}) {
    const uniqueId = paymentInfo.chargeInfoId
    return `${uniqueId}`
  }

  /**
   * 关闭指定弹窗
   * @param {string} dialogId - 弹窗ID
   * @param {Object} result - 可选的关闭结果数据
   */
  closeDialog(dialogId, result) {
    this.logger.info('Closing dialog', { dialogId })

    // 尝试通过控制器关闭
    const controller = this.getDialogController(dialogId)
    if (controller && typeof controller.close === 'function') {
      controller.close(result)
      return
    }

    // 如果没有找到控制器，直接清理
    this._cleanupDialog(dialogId)
  }

  /**
   * 清理所有弹窗
   */
  closeAllDialogs() {
    this.logger.info('Closing all dialogs')

    // 通过控制器关闭所有弹窗
    const controllers = Array.from(this.dialogPromises.values())
    controllers.forEach((controller) => {
      if (controller && typeof controller.close === 'function') {
        controller.close({ status: 'cancelled' })
      }
    })

    // 清理所有缓存
    const dialogIds = Array.from(this.activeDialogs.keys())
    dialogIds.forEach((dialogId) => {
      this._cleanupDialog(dialogId)
    })

    // 清空所有 Promise 缓存
    this.dialogPromises.clear()
  }

  /**
   * 获取活跃弹窗数量
   */
  getActiveDialogCount() {
    return this.activeDialogs.size
  }

  /**
   * 清理资源
   */
  destroy() {
    this.logger.info('Destroying dialog manager')
    try {
      // 关闭所有弹窗
      this.closeAllDialogs()

      // 清理所有定时器
      this.activeDialogs.forEach((dialogData, dialogId) => {
        if (dialogData.cleanupTimer) {
          try {
            clearTimeout(dialogData.cleanupTimer)
          } catch (error) {
            this.logger.warn('Failed to clear cleanup timer', { dialogId, error })
          }
        }
      })

      // 移除所有事件监听器
      this.removeAllListeners()

      // 清空所有缓存
      this.activeDialogs.clear()
      this.dialogPromises.clear()

      // 清空引用
      this.Vue = null
      this.UniversalPaymentDialog = null
      this.dialogContainer = null
    } catch (error) {
      this.logger.error('Error in destroy', error)
    }
  }
}

export default DialogManager
