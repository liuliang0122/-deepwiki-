<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :width="dialogConfig.width"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    custom-class="universal-payment-dialog"
    :show-close="false"
  >
    <div class="universal-payment-dialog__content">
      <div class="universal-payment-dialog__title">
        <img class="logo-img" src="../assets/img/logo.png" alt="" />
        <p class="title-text" :class="paymentStatus.type">{{ paymentStatus.text }}</p>
        <el-input
          v-show="currentStatus === PAYMENT_STATUS.PASSIVE_INIT && !isActiveMode"
          autofocus
          ref="payQRCodeInput"
          v-model="payQRCode"
          placeholder="请用扫码枪扫码"
          @change="handlePayQRCodeChange"
        />
      </div>

      <!-- 支付二维码/条码区域 -->
      <div v-if="isShowQrcode" class="universal-payment-dialog__qrcode">
        <div class="qrcode-container corner-border">
          <!-- 这里可以集成二维码组件 -->
          <el-image class="qrcode-img" v-if="qrCodeUrl" :src="qrCodeUrl" fit="cover">
            <div slot="placeholder" class="image-slot">加载中<span class="dot">...</span></div>
          </el-image>
          <div class="qrcode-img" v-loading="!qrCodeUrl" v-else>
            加载中<span class="dot">...</span>
          </div>
          <!-- 右上角和左下角需要额外的HTML元素 -->
          <div class="corner-tr"></div>
          <div class="corner-bl"></div>
        </div>
        <div class="qrcode-text">请患者扫描此收款码</div>
      </div>

      <!-- 自定义插槽 -->
      <slot name="custom-content" :payment-info="paymentInfo" :status="currentStatus"></slot>
    </div>

    <div slot="footer" class="universal-payment-dialog__footer">
      <!-- 动态操作按钮 -->
      <template v-for="action in currentActions">
        <el-button
          :key="action.key"
          :type="action.type"
          :plain="action.plain || false"
          :loading="action.loading"
          :disabled="action.disabled"
          @click="handleAction(action)"
        >
          {{ action.label }}
        </el-button>
      </template>
    </div>
    <div
      v-if="timeLeft && (currentStatus === PAYMENT_STATUS.PROCESSING || isShowQrcode)"
      class="countdown-text"
    >
      {{ timeLeft }}s
    </div>
  </el-dialog>
</template>

<script>
import QRCode from 'qrcode'
import { PAYMENT_STATUS, PAYMENT_TYPES, SCAN_MODES } from '../constants/paymentTypes.js'

// 常量定义
const AUTO_CLOSE_DELAY = 3000 // 自动关闭延迟时间（毫秒）
const INIT_EVENT_DELAY = 50 // 初始化事件延迟时间（毫秒）
const TIMER_INTERVAL = 1000 // 定时器间隔（毫秒）

/**
 * 通用支付弹窗组件
 * 支持多种支付场景和状态处理
 */
export default {
  name: 'UniversalPaymentDialog',
  props: {
    // 是否显示
    visible: {
      type: Boolean,
      default: false,
    },
    // 是否医保支付
    isInsuranceCharge: {
      type: Boolean,
      default: false,
    },

    // 支付信息
    paymentInfo: {
      type: Object,
      required: true,
      validator: (value) => {
        return value.chargeInfoId
      },
    },

    // 弹窗配置
    config: {
      type: Object,
      default: () => ({}),
    },

    // 是否自动轮询
    autoPolling: {
      type: Boolean,
      default: true,
    },

    // 轮询间隔(毫秒)
    pollingInterval: {
      type: Number,
      default: 3000,
    },
  },

  data() {
    return {
      PAYMENT_STATUS,
      scanMode: SCAN_MODES.PASSIVE,
      qrCodeUrl: '',
      dialogVisible: false,
      payQRCode: '',
      loading: false,
      error: null,
      pollingTimer: null,
      currentStatus: PAYMENT_STATUS.PASSIVE_INIT,
      actionLoadingMap: {},
      timer: null,
      timeLeft: 60, // 60秒倒计时
      isQuerying: false, // 🔧 新增：防止并发查询
      isDestroyed: false, // 🔧 新增：标记组件是否已销毁
      clickListenerAdded: false, // 🔧 新增：标记是否已添加点击监听器
      initTimeout: null, // 🔧 新增：保存初始化定时器引用
      queryTimeout: null, // 🔧 新增：保存查询定时器引用
      closeTimeout: null, // 🔧 新增：保存关闭定时器引用
    }
  },

  computed: {
    /**
     * 弹窗配置(合并默认配置)
     */
    dialogConfig() {
      const defaultConfig = this.getDefaultConfig()
      return {
        ...defaultConfig,
        ...this.config,
      }
    },

    /*
     * 支付场景
     */
    scene() {
      return this.paymentInfo.payType || PAYMENT_TYPES.GUOWEI
    },

    /**
     * 是否显示二维码
     */
    isActiveMode() {
      return this.scanMode === SCAN_MODES.ACTIVE
    },

    /**
     * 当前支付状态显示信息
     */
    paymentStatus() {
      // 🔧 优化：提前计算主扫默认文案，避免在computed中调用methods
      const activeDefaultText = `${this.isInsuranceCharge ? '医保结算成功' : '统一支付结算'}`

      const statusMap = {
        [PAYMENT_STATUS.PASSIVE_INIT]: {
          text: `${this.isInsuranceCharge ? '医保结算成功,' : '统一支付结算,'}请患者扫码支付`,
          type: 'info',
          icon: 'el-icon-time',
        },
        [PAYMENT_STATUS.ACTIVE_INIT]: {
          text: activeDefaultText,
          type: 'info',
          icon: 'el-icon-time',
        },
        [PAYMENT_STATUS.WAITING]: {
          text: '等待支付',
          type: 'warning',
          icon: 'el-icon-time',
        },
        [PAYMENT_STATUS.PENDING]: {
          text: this.isActiveMode ? activeDefaultText : '扫码成功，统一平台支付中...',
          type: 'warning',
          icon: 'el-icon-time',
        },
        [PAYMENT_STATUS.PROCESSING]: {
          text: this.isActiveMode ? activeDefaultText : '扫码成功，统一平台支付中...',
          type: 'info',
          icon: 'el-icon-loading',
        },
        [PAYMENT_STATUS.SUCCESS]: {
          text: '统一平台支付成功，HIS结算中...',
          type: 'success',
          icon: 'el-icon-success',
        },
        [PAYMENT_STATUS.FAILED]: {
          text: '统一平台支付失败',
          type: 'danger',
          icon: 'el-icon-error',
        },
        [PAYMENT_STATUS.CANCELLED]: {
          text: '等待支付',
          type: 'info',
          icon: 'el-icon-close',
        },
        [PAYMENT_STATUS.TIMEOUT]: {
          text: '支付超时',
          type: 'warning',
          icon: 'el-icon-warning',
        },
      }
      return statusMap[this.currentStatus]
    },

    /**
     * 当前状态下可用的操作按钮
     */
    currentActions() {
      const actions = this.getActionsForStatus(this.currentStatus)
      return actions.map((action) => ({
        ...action,
        loading: this.actionLoadingMap[action.key] || false,
      }))
    },

    /**
     * 是否显示二维码
     */
    isShowQrcode() {
      const showPayStatus = [
        PAYMENT_STATUS.ACTIVE_INIT,
        PAYMENT_STATUS.PROCESSING,
        PAYMENT_STATUS.PENDING,
      ]
      return this.isActiveMode && showPayStatus.includes(this.currentStatus)
    },
  },

  watch: {
    visible: {
      handler(val) {
        this.dialogVisible = val
        if (val) {
          // 🔧 先清理之前的资源，避免快速切换时的竞态条件
          this.cleanup()
          // 重置销毁标记
          this.isDestroyed = false
          this.initPayment()
        } else {
          this.cleanup()
        }
      },
      immediate: true,
    },

    currentStatus(newStatus, oldStatus) {
      this.$emit('status-change', {
        from: oldStatus,
        to: newStatus,
        paymentInfo: this.paymentInfo,
      })

      // 自动处理终态
      if (this.isFinalStatus(newStatus)) {
        this.handleFinalStatus(newStatus)
      }

      // 🔧 优化：简化轮询控制逻辑
      if (this.isActiveMode) {
        if (this.isShowQrcode) {
          this.startTimer()
          this.startPolling()
        } else {
          this.stopPolling()
          this.timeLeft = this.dialogConfig.countdown
          this.stopTimer()
        }
      } else {
        // 被扫模式
        if (newStatus === PAYMENT_STATUS.PASSIVE_INIT) {
          this.$nextTick(() => {
            this.focusScannerInput()
          })
        }

        if (newStatus === PAYMENT_STATUS.PROCESSING) {
          this.startTimer()
          this.startPolling()
        } else {
          this.stopPolling()
          this.timeLeft = this.dialogConfig.countdown
          this.stopTimer()
        }
      }
    },
  },

  beforeDestroy() {
    // 🔧 标记组件已销毁
    this.isDestroyed = true

    // 清理事件监听器
    this.removeClickListener()

    // 清理定时器和轮询
    this.cleanup()
  },

  methods: {
    /**
     * 获取默认配置
     */
    getDefaultConfig() {
      const configMap = {
        [PAYMENT_TYPES.GUOWEI]: {
          width: '600px',
          countdown: 60,
        },
      }
      return configMap[this.scene] || { width: '600px', countdown: 60 }
    },

    // 获取主扫默认文案
    getActiveDefaultText() {
      return `${this.isInsuranceCharge ? '医保结算成功' : '统一支付结算'}`
    },

    // 开始倒计时
    startTimer() {
      if (this.timeLeft > 0) {
        this.stopTimer()

        // 🔧 检查组件是否已销毁
        if (this.isDestroyed) {
          return
        }

        this.timer = setInterval(() => {
          // 🔧 每次倒计时前检查组件是否已销毁
          if (this.isDestroyed) {
            this.stopTimer()
            return
          }

          if (this.timeLeft > 0) {
            this.timeLeft--
          } else {
            this.stopTimer()
            this.stopPolling()
          }
        }, TIMER_INTERVAL)
      }
    },

    // 获取主扫默认按钮
    getActiveDefaultActions() {
      return [
        {
          key: 'cancel',
          label: '取消支付',
          plain: true,
          type: 'primary',
          handler: this.handleCancelPayment,
        },
        {
          key: 'refresh',
          label: '刷新支付码',
          type: 'primary',
          handler: this.handleRefreshQrCode,
        },
        {
          key: 'query',
          label: '刷新结果',
          type: 'primary',
          handler: this.handleQueryStatus,
        },
      ]
    },

    // 更新二维码URL
    updateQRCodeUrl(url) {
      if (url) {
        this.generateQRCode(url)
      }
    },

    // 🔧 优化：生成二维码时检查组件状态
    async generateQRCode(url) {
      if (!url) {
        this.qrCodeUrl = ''
        return
      }

      try {
        // 生成二维码
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        })

        // 🔧 检查组件是否已销毁
        if (!this.isDestroyed) {
          this.qrCodeUrl = qrCodeDataUrl
        }
      } catch (err) {
        // 二维码生成失败时清空 URL
        if (!this.isDestroyed) {
          this.qrCodeUrl = ''
        }
        // 开发环境才输出，避免生产环境泄露信息
        if (process.env.NODE_ENV === 'development') {
          console.error('生成二维码失败:', err)
        }
      }
    },

    // 扫码枪扫码
    async handlePayQRCodeChange() {
      this.updateStatus(PAYMENT_STATUS.PROCESSING)
      this.$emit('create-payment', {
        paymentInfo: {
          ...this.paymentInfo,
          payQRCode: this.payQRCode,
        },
      })
      this.payQRCode = ''
    },

    /**
     * 获取不同状态下的操作按钮
     */
    getActionsForStatus(status) {
      const actionsMap = {
        [PAYMENT_STATUS.PASSIVE_INIT]: [
          {
            key: 'close',
            label: '取消支付',
            type: 'primary',
            handler: this.handlePendingStatus,
          },
        ],
        [PAYMENT_STATUS.ACTIVE_INIT]: this.getActiveDefaultActions(),
        [PAYMENT_STATUS.WAITING]: [
          {
            key: 'close',
            label: '放弃支付',
            plain: true,
            type: 'danger',
            handler: this.handleAbandonPayment,
          },
          {
            key: 'retry',
            label: '重新支付',
            type: 'primary',
            handler: this.handleRetryPayment,
          },
        ],
        [PAYMENT_STATUS.PROCESSING]: this.isActiveMode
          ? this.getActiveDefaultActions()
          : [
              {
                key: 'cancel',
                label: '取消支付',
                plain: true,
                type: 'primary',
                handler: this.handleCancelPayment,
              },
              {
                key: 'query',
                label: '刷新结果',
                type: 'primary',
                handler: this.handleQueryStatus,
              },
            ],
        [PAYMENT_STATUS.PENDING]: this.isActiveMode
          ? this.getActiveDefaultActions()
          : [
              {
                key: 'cancel',
                label: '取消支付',
                plain: true,
                type: 'primary',
                handler: this.handleCancelPayment,
              },
              {
                key: 'query',
                label: '刷新结果',
                type: 'primary',
                handler: this.handleQueryStatus,
              },
            ],
        [PAYMENT_STATUS.SUCCESS]: [],
        [PAYMENT_STATUS.CANCELLED]: [
          {
            key: 'close',
            label: '放弃支付',
            plain: true,
            type: 'danger',
            handler: this.handleAbandonPayment,
          },
          {
            key: 'retry',
            label: '重新支付',
            type: 'primary',
            handler: this.handleRetryPayment,
          },
        ],
        [PAYMENT_STATUS.CLOSED]: [
          {
            key: 'close',
            label: '放弃支付',
            plain: true,
            type: 'danger',
            handler: this.handleAbandonPayment,
          },
          {
            key: 'retry',
            label: '重新支付',
            type: 'primary',
            handler: this.handleRetryPayment,
          },
        ],
        [PAYMENT_STATUS.FAILED]: [
          {
            key: 'close',
            label: '返回等待支付',
            type: 'primary',
            handler: this.handlePendingStatus,
          },
        ],
        [PAYMENT_STATUS.TIMEOUT]: [
          {
            key: 'close',
            label: '返回等待支付',
            type: 'primary',
            handler: this.handlePendingStatus,
          },
        ],
      }
      return actionsMap[status] || []
    },

    /**
     * 初始化支付
     */
    async initPayment() {
      this.loading = true
      this.error = null
      this.isDestroyed = false // 🔧 重置销毁标记
      this.isQuerying = false // 🔧 重置查询标记
      this.timeLeft = this.dialogConfig.countdown
      this.scanMode = this.paymentInfo.payScanMode || SCAN_MODES.PASSIVE
      const defaultStatus = this.isActiveMode
        ? PAYMENT_STATUS.ACTIVE_INIT
        : PAYMENT_STATUS.PASSIVE_INIT
      this.updateStatus(defaultStatus)

      try {
        // 🔧 清理之前的初始化定时器
        if (this.initTimeout) {
          clearTimeout(this.initTimeout)
          this.initTimeout = null
        }

        // 开始轮询(如果启用)
        if (this.autoPolling) {
          this.startPolling()
        }

        // 🔧 保存定时器引用以便清理
        this.initTimeout = setTimeout(() => {
          if (this.isDestroyed) return // 🔧 检查组件是否已销毁

          this.$emit('init-dialog', this.paymentInfo)

          // 🔧 只在被扫模式下添加点击监听器
          if (!this.isActiveMode) {
            this.$nextTick(() => {
              this.focusScannerInput()
            })
            // 添加点击监听器（避免重复添加）
            this.addClickListener()
          }

          this.initTimeout = null
        }, INIT_EVENT_DELAY)
      } catch (error) {
        this.error = error.message || '初始化失败'
        if (process.env.NODE_ENV === 'development') {
          console.error('Payment init error:', error)
        }
      } finally {
        this.loading = false
      }
    },

    // 🔧 新增：添加点击监听器（避免重复添加）
    addClickListener() {
      if (!this.clickListenerAdded) {
        document.addEventListener('click', this.focusScannerInput)
        this.clickListenerAdded = true
      }
    },

    // 🔧 新增：移除点击监听器
    removeClickListener() {
      if (this.clickListenerAdded) {
        document.removeEventListener('click', this.focusScannerInput)
        this.clickListenerAdded = false
      }
    },

    // 聚焦到扫码输入框
    focusScannerInput() {
      if (!this.isDestroyed && this.$refs.payQRCodeInput) {
        this.$refs.payQRCodeInput.focus()
      }
    },

    /**
     * 开始轮询支付状态
     */
    startPolling() {
      this.stopPolling()

      // 🔧 检查组件是否已销毁
      if (this.isDestroyed) {
        return
      }

      this.pollingTimer = setInterval(() => {
        // 🔧 每次轮询前检查组件是否已销毁
        if (this.isDestroyed) {
          this.stopPolling()
          return
        }
        this.queryPaymentStatus(true)
      }, this.pollingInterval)
    },

    /**
     * 停止轮询
     */
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },

    /**
     * 🔧 优化：查询支付状态（防止并发）
     * @param {boolean} silent - 是否静默查询(不显示loading)
     */
    async queryPaymentStatus(silent = false) {
      // 🔧 检查组件是否已销毁
      if (this.isDestroyed) {
        return
      }

      // 防止并发查询
      if (this.isQuerying) {
        return
      }

      this.isQuerying = true

      try {
        if (!silent) {
          this.setActionLoading('query', true)
        }

        this.$emit('query-status', {
          paymentInfo: this.paymentInfo,
        })
      } finally {
        // 🔧 清理之前的查询定时器
        if (this.queryTimeout) {
          clearTimeout(this.queryTimeout)
        }

        // 延迟重置查询标记，避免过于频繁的查询
        this.queryTimeout = setTimeout(() => {
          if (!this.isDestroyed) {
            this.isQuerying = false
          }
          this.queryTimeout = null
        }, 500)
      }
    },

    /**
     * 更新支付状态
     */
    updateStatus(status) {
      if (status && status !== this.currentStatus) {
        this.currentStatus = status
      }
    },

    /**
     * 判断是否为终态
     */
    isFinalStatus(status) {
      return [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.ABANDONED].includes(status)
    },

    /**
     * 处理终态
     */
    handleFinalStatus(status) {
      // 停止轮询
      this.stopPolling()

      // 触发终态事件
      this.$emit('final-status', {
        status,
        paymentInfo: this.paymentInfo,
      })

      // 自动关闭(成功状态)
      if (status === PAYMENT_STATUS.SUCCESS) {
        // 🔧 清理之前的关闭定时器
        if (this.closeTimeout) {
          clearTimeout(this.closeTimeout)
        }

        // 🔧 保存定时器引用以便清理
        this.closeTimeout = setTimeout(() => {
          if (!this.isDestroyed) {
            this.handleCloseDialog()
          }
          this.closeTimeout = null
        }, AUTO_CLOSE_DELAY)
      }
    },

    /**
     * 处理操作按钮点击
     */
    async handleAction(action) {
      if (action.disabled || action.loading) {
        return
      }

      if (typeof action.handler === 'function') {
        await action.handler()
      }
    },

    /**
     * 设置操作按钮loading状态
     */
    setActionLoading(key, loading) {
      this.$set(this.actionLoadingMap, key, loading)
    },

    /**
     * 查询状态按钮处理
     */
    async handleQueryStatus() {
      this.queryPaymentStatus()
    },

    /**
     * 取消支付按钮处理
     */
    async handleCancelPayment() {
      this.stopPolling()
      this.setActionLoading('cancel', true)
      this.$emit('cancel-payment', {
        paymentInfo: this.paymentInfo,
      })
    },

    /**
     * 重新支付按钮处理
     */
    async handleRetryPayment() {
      // 重新初始化
      this.setActionLoading('retry', true)
      this.$emit('retry-payment', {
        paymentInfo: this.paymentInfo,
      })
      // 🔧 等待初始化完成，避免竞态条件
      await this.initPayment()
    },

    /**
     * 关闭弹窗
     */
    handleCloseDialog() {
      this.dialogVisible = false
      this.$emit('update:visible', false)
    },

    /**
     * 刷新支付码
     */
    handleRefreshQrCode() {
      this.stopPolling()
      this.setActionLoading('refresh', true)
      this.$emit('refresh-qrcode', {
        paymentInfo: this.paymentInfo,
      })
    },

    /**
     * 放弃支付按钮处理
     */
    async handleAbandonPayment() {
      try {
        await this.$confirm('确定要放弃支付吗?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '继续支付',
          type: 'warning',
        })
        this.$emit('abandon-payment', {
          paymentInfo: this.paymentInfo,
        })
        this.updateStatus(PAYMENT_STATUS.ABANDONED)
      } finally {
        this.setActionLoading('close', false)
      }
    },

    /**
     * 弹窗关闭事件
     */
    handleClose() {
      if (this.loading) {
        return
      }

      // 非终态时需要确认
      if (!this.isFinalStatus(this.currentStatus)) {
        this.handleCancelPayment()
      } else {
        this.handleCloseDialog()
      }
    },

    /**
     * 重新加载
     */
    reload() {
      this.initPayment()
    },

    /**
     * 格式化金额
     */
    formatAmount(amount) {
      if (!amount && amount !== 0) return '0.00'
      return (Number(amount) / 100).toFixed(2)
    },

    /**
     * 🔧 优化：清理资源
     */
    cleanup() {
      try {
        // 确保定时器被清理
        this.stopTimer()
        // 确保轮询被停止
        this.stopPolling()
        // 🔧 清理所有 setTimeout 定时器
        if (this.initTimeout) {
          clearTimeout(this.initTimeout)
          this.initTimeout = null
        }
        if (this.queryTimeout) {
          clearTimeout(this.queryTimeout)
          this.queryTimeout = null
        }
        if (this.closeTimeout) {
          clearTimeout(this.closeTimeout)
          this.closeTimeout = null
        }
        // 移除点击监听器
        this.removeClickListener()
        // 清空加载状态映射
        this.actionLoadingMap = {}
        // 清空其他引用
        this.qrCodeUrl = ''
        this.payQRCode = ''
        this.error = null
        // 重置查询标记
        this.isQuerying = false
      } catch (error) {
        // 容错处理：确保清理过程不会抛出异常
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in cleanup', error)
        }
      }
    },

    stopTimer() {
      if (this.timer) {
        try {
          clearInterval(this.timer)
        } catch (error) {
          // 容错处理：如果清理定时器失败，只记录错误
          if (process.env.NODE_ENV === 'development') {
            console.warn('清理定时器失败:', error)
          }
        } finally {
          this.timer = null
        }
      }
    },

    // 返回等待操作支付页面
    handlePendingStatus() {
      this.updateStatus(PAYMENT_STATUS.WAITING)
    },
  },
}
</script>

<style lang="scss" scoped>
::v-deep .el-dialog__header {
  display: none !important;
}
::v-deep .el-dialog__body {
  padding: 40px 20px 20px;
}
.universal-payment-dialog {
  &__content {
    display: flex;
    justify-content: center;
    gap: 20px;
  }

  &__title {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .title-text {
      font-size: 22px;
      margin: 24px;
    }
  }

  &__qrcode {
    position: relative;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    margin-left: 20px;
    .qrcode-container {
      display: flex;
      align-items: center;
      justify-content: center;
      .qrcode-img {
        width: 200px;
        height: 200px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .image-slot {
        display: flex;
        justify-items: center;
      }
    }
    .qrcode-text {
      font-size: 16px;
      margin-top: 16px;
    }
    /* 四角相同颜色边框的实现 */
    .corner-border {
      position: relative;
      padding: 8px;
      background: white;
      border-radius: 8px;
    }

    /* 左上角和右下角 */
    .corner-border::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 20px;
      height: 20px;
      border-top: 3px solid var(--color-primary-6, #3363ff);
      border-left: 3px solid var(--color-primary-6, #3363ff);
      border-radius: 8px 0 0 0;
    }

    /* 右上角和左下角 */
    .corner-border::after {
      content: '';
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      border-bottom: 3px solid var(--color-primary-6, #3363ff);
      border-right: 3px solid var(--color-primary-6, #3363ff);
      border-radius: 0 0 8px 0;
    }

    .corner-border .corner-tr {
      position: absolute;
      top: 0;
      right: 0;
      width: 20px;
      height: 20px;
      border-top: 3px solid var(--color-primary-6, #3363ff);
      border-right: 3px solid var(--color-primary-6, #3363ff);
      border-radius: 0 8px 0 0;
    }

    .corner-border .corner-bl {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 20px;
      height: 20px;
      border-bottom: 3px solid var(--color-primary-6, #3363ff);
      border-left: 3px solid var(--color-primary-6, #3363ff);
      border-radius: 0 0 0 8px;
    }
  }

  .danger {
    color: #f56c6c;
  }

  &__loading,
  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
    color: #909399;

    i {
      font-size: 48px;
    }

    span,
    p {
      font-size: 14px;
    }
  }

  &__error {
    color: #f56c6c;
  }
  &__footer {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .countdown-text {
    position: absolute;
    bottom: 20px;
    right: 20px;
    font-size: 14px;
    color: var(--color-primary-6, #3363ff);
  }
}
</style>
