// 公共的支付工具
import * as apiPayment from './payment.js'
const isClient = !!window.CefClient

// 源启支付客户端日志记录
const paymentLogger = (inParam, outParam) => {
  try {
    // 入参string化
    const inMessage = typeof inParam === 'string' ? inParam : JSON.stringify(inParam)
    // 返参string化
    const outMessage = typeof outParam === 'string' ? outParam : JSON.stringify(outParam)
    //
    const message = `【源启支付日志】: 入参: ${inMessage} 反参: ${outMessage}`
    if (!isClient) {
      console.log(message)
    } else {
      window?.dragonSdk?.sdkInstance?.clientUtil?.writeLog(message)
    }
  } catch (error) {
    // 不抛出异常
    console.error('logger error >>> ', error)
  }
}

/**
 * 源启调用方法
 */
export const yuanQiCallApi = async (apiName, params, msg) => {
  // 调用后端接口获取报文
  const result = await apiPayment[apiName](params)
  const data = result?.data || {}
  // 验证响应数据
  if (data?.code && data?.code !== '200' && !data?.data?.requestParams) {
    throw new Error(data?.message || data?.msg || `${msg}失败`)
  }
  // 用获取的报文去调用源启
  const res = await postOrgineTerminalService(data?.data?.requestParams)
  return res
}

/**
 * 源启终端服务 HTTP 调用工具方法
 */
export const postOrgineTerminalService = async (data = null) => {
  // 从配置、环境变量或默认值获取URL
  const baseUrl = 'http://localhost:10001/OrgineTerminal/OrginePowerWCAService'
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      'X-Requested-With': 'XMLHttpRequest',

      body: JSON.stringify(data),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`源启端口连接错误: ${response?.status} ${response?.statusText}`)
      }
      return response.json()
    })
    paymentLogger(data, res)
    if (res?.result?.code !== 'success') {
      throw new Error(res?.result?.msg || '请求失败')
    }
    return res
  } catch (error) {
    paymentLogger(data, error?.message || error)
    throw new Error(`源启终端服务调用失败: ${error?.message || error}`)
  }
}
