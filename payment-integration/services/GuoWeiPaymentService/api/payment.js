/**
 * 国卫支付业务接口编写文件
 */

import request from './axios'
import { PAYMENT, VERSION } from '../../../config/apiTypes'

// 国卫支付-创建支付订单
export const createPayOrderApi = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/createPayOrder`, params, {
    timeout: 60 * 1000,
  })
}

// 国卫支付-支付订单状态查询接口
export const queryPayOrderResultApi = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/queryPayOrderResult`, params, {
    cancelExceptionMsgTip: true, // 不弹出错误框
  })
}

// 国卫支付-订单关闭
export const closePayOrderApi = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/closePayOrder`, params)
}

// 国卫支付订单退款对接接口
export const refundPayOrderApi = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/refundPayOrder`, params)
}

// 国卫支付订单退款结果查询接口
export const queryRefundOrderResultApi = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/queryRefundOrderResult`, params)
}
