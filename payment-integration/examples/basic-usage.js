/**
 * 基础使用示例
 * @description 展示支付模块的基本使用方法
 */

import PaymentManager from '../index.js'

/**
 * 示例1：创建支付
 */
async function example1CreatePayment() {
  try {
    // 获取支付管理器实例
    const manager = PaymentManager.getInstance()

    // 初始化（首次使用会自动初始化，也可以手动调用）
    await manager.init()

    // 创建支付
    const result = await manager.createPayment({
      orderId: 'ORDER20231010001',
      patientId: 'PATIENT001',
      amount: 100.5,
      paymentType: 'qr_code',
      description: '门诊挂号费',
    })

    console.log('支付创建成功:', result)
    // 返回示例:
    // {
    //   paymentId: 'PAY123456',
    //   orderId: 'ORDER20231010001',
    //   qrCode: 'https://...',
    //   status: 'pending',
    //   ...
    // }

    return result
  } catch (error) {
    console.error('支付创建失败:', error)
    throw error
  }
}

/**
 * 示例2：查询支付状态
 */
async function example2QueryPayment() {
  try {
    const manager = PaymentManager.getInstance()

    // 查询支付状态
    const result = await manager.queryPayment({
      paymentId: 'PAY123456',
    })

    console.log('支付状态:', result.status)
    // status 可能的值: pending, processing, success, failed, cancelled, refunded

    return result
  } catch (error) {
    console.error('查询支付失败:', error)
    throw error
  }
}

/**
 * 示例3：退款
 */
async function example3Refund() {
  try {
    const manager = PaymentManager.getInstance()

    // 发起退款
    const result = await manager.refund({
      paymentId: 'PAY123456',
      amount: 100.5,
      reason: '用户申请退款',
    })

    console.log('退款成功:', result)

    return result
  } catch (error) {
    console.error('退款失败:', error)
    throw error
  }
}

/**
 * 示例4：批量支付
 */
async function example4BatchPayment() {
  try {
    const manager = PaymentManager.getInstance()

    // 准备多个支付订单
    const paymentList = [
      {
        orderId: 'ORDER001',
        patientId: 'PATIENT001',
        amount: 50.0,
        paymentType: 'qr_code',
      },
      {
        orderId: 'ORDER002',
        patientId: 'PATIENT002',
        amount: 100.0,
        paymentType: 'qr_code',
      },
    ]

    // 批量创建支付（并发数为2）
    const results = await manager.batchPayment(paymentList, { concurrency: 2 })

    console.log('批量支付结果:', results)

    return results
  } catch (error) {
    console.error('批量支付失败:', error)
    throw error
  }
}

/**
 * 示例5：监听支付事件
 */
function example5ListenEvents() {
  const manager = PaymentManager.getInstance()

  // 监听支付创建事件
  manager.on('payment:created', (data) => {
    console.log('支付已创建:', data)
  })

  // 监听支付取消事件
  manager.on('payment:cancelled', (data) => {
    console.log('支付已取消:', data)
  })

  // 监听支付退款事件
  manager.on('payment:refunded', (data) => {
    console.log('支付已退款:', data)
  })

  // 监听错误事件
  manager.on('error', (error) => {
    console.error('支付错误:', error)
  })

  // 监听加载状态
  manager.on('loading', (isLoading) => {
    console.log('加载状态:', isLoading)
  })
}

/**
 * 示例6：获取统计信息
 */
async function example6GetStats() {
  const manager = PaymentManager.getInstance()

  // 获取统计信息
  const stats = manager.getStats()

  console.log('支付模块统计信息:', stats)
  // 返回示例:
  // {
  //   initialized: true,
  //   loading: false,
  //   hasError: false,
  //   config: { paymentType: '1', version: 'v1.0', ... },
  //   errors: { total: 0, byCode: {}, byType: {} },
  //   events: { listenerCount: 3, eventNames: ['payment:created', ...] },
  //   timestamp: '2023-10-10T12:00:00.000Z'
  // }

  return stats
}

/**
 * 示例7：重新加载配置
 */
async function example7ReloadConfig() {
  try {
    const manager = PaymentManager.getInstance()

    // 重新加载配置（从系统开关获取最新配置）
    const config = await manager.reloadConfig()

    console.log('配置已重新加载:', config)

    return config
  } catch (error) {
    console.error('重新加载配置失败:', error)
    throw error
  }
}

/**
 * 示例8：判断是否开启支付功能
 */
async function example8CheckPaymentEnabled() {
  const manager = PaymentManager.getInstance()

  // 异步判断
  const isEnabled = await manager.isPaymentEnabled()
  console.log('支付功能是否开启:', isEnabled)

  // 同步判断（需要先初始化）
  await manager.init()
  const isEnabledSync = manager.isPaymentEnabledSync()
  console.log('支付功能是否开启（同步）:', isEnabledSync)

  return isEnabled
}

// 导出示例函数
export {
  example1CreatePayment,
  example2QueryPayment,
  example3Refund,
  example4BatchPayment,
  example5ListenEvents,
  example6GetStats,
  example7ReloadConfig,
  example8CheckPaymentEnabled,
}

