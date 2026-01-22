/**
 * Vue 集成示例
 * @description 展示如何在 Vue 项目中使用支付模块
 */

import PaymentManager from '../index.js'

/**
 * Vue 组件示例
 */
export default {
  name: 'payment-component',

  data() {
    return {
      // 支付管理器实例
      paymentManager: null,

      // 支付表单数据
      paymentForm: {
        orderId: '',
        patientId: '',
        amount: 0,
        description: '',
      },

      // 支付结果
      paymentResult: null,

      // 加载状态
      loading: false,

      // 错误信息
      errorMessage: '',
    }
  },

  async created() {
    // 获取支付管理器实例
    this.paymentManager = PaymentManager.getInstance()

    // 初始化
    try {
      await this.paymentManager.init()
      console.log('支付管理器初始化成功')
    } catch (error) {
      console.error('支付管理器初始化失败:', error)
      this.errorMessage = `初始化失败: ${error.message}`
    }

    // 监听支付事件
    this.setupEventListeners()
  },

  beforeDestroy() {
    // 移除事件监听
    if (this.paymentManager) {
      this.paymentManager.off('payment:created', this.handlePaymentCreated)
      this.paymentManager.off('error', this.handlePaymentError)
      this.paymentManager.off('loading', this.handleLoading)
    }
  },

  methods: {
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
      // 监听支付创建事件
      this.paymentManager.on('payment:created', this.handlePaymentCreated)

      // 监听错误事件
      this.paymentManager.on('error', this.handlePaymentError)

      // 监听加载状态
      this.paymentManager.on('loading', this.handleLoading)
    },

    /**
     * 处理支付创建事件
     */
    handlePaymentCreated(data) {
      console.log('支付已创建:', data)
      this.paymentResult = data.result

      // 如果是二维码支付，可以显示二维码
      if (data.result.qrCode) {
        this.showQrCode(data.result.qrCode)
      }
    },

    /**
     * 处理错误事件
     */
    handlePaymentError(error) {
      console.error('支付错误:', error)
      this.errorMessage = error.message
      this.$message.error(`支付失败: ${error.message}`)
    },

    /**
     * 处理加载状态
     */
    handleLoading(isLoading) {
      this.loading = isLoading
    },

    /**
     * 创建支付
     */
    async createPayment() {
      try {
        this.errorMessage = ''

        // 验证表单
        if (!this.validateForm()) {
          return
        }

        // 创建支付
        const result = await this.paymentManager.createPayment({
          orderId: this.paymentForm.orderId,
          patientId: this.paymentForm.patientId,
          amount: parseFloat(this.paymentForm.amount),
          paymentType: 'qr_code',
          description: this.paymentForm.description,
        })

        this.$message.success('支付创建成功')
        return result
      } catch (error) {
        console.error('创建支付失败:', error)
        this.$message.error(`创建支付失败: ${error.message}`)
      }
    },

    /**
     * 查询支付状态
     */
    async queryPayment(paymentId) {
      try {
        const result = await this.paymentManager.queryPayment({
          paymentId,
        })

        this.$message.info(`支付状态: ${result.status}`)
        return result
      } catch (error) {
        console.error('查询支付失败:', error)
        this.$message.error(`查询支付失败: ${error.message}`)
      }
    },

    /**
     * 退款
     */
    async refund(paymentId, amount) {
      try {
        await this.$confirm('确定要退款吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })

        const result = await this.paymentManager.refund({
          paymentId,
          amount,
          reason: '用户申请退款',
        })

        this.$message.success('退款成功')
        return result
      } catch (error) {
        if (error === 'cancel') {
          return
        }
        console.error('退款失败:', error)
        this.$message.error(`退款失败: ${error.message}`)
      }
    },

    /**
     * 验证表单
     */
    validateForm() {
      if (!this.paymentForm.orderId) {
        this.$message.warning('请输入订单号')
        return false
      }

      if (!this.paymentForm.patientId) {
        this.$message.warning('请输入患者ID')
        return false
      }

      if (!this.paymentForm.amount || this.paymentForm.amount <= 0) {
        this.$message.warning('请输入有效的支付金额')
        return false
      }

      return true
    },

    /**
     * 显示二维码
     */
    showQrCode(qrCode) {
      // 这里可以使用弹窗显示二维码
      console.log('显示二维码:', qrCode)
      // 可以集成 qrcode.vue 或其他二维码库
    },

    /**
     * 获取支付统计
     */
    getPaymentStats() {
      const stats = this.paymentManager.getStats()
      console.log('支付统计:', stats)
      return stats
    },
  },
}

