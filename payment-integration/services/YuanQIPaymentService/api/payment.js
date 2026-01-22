/**
 * 源启支付业务接口编写文件
 */

import request from './axios'
import { PAYMENT, VERSION } from '../../../config/apiTypes'

// 源启结算(获取报文)
export const preCreatePayOrder = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/preCreatePayOrder`, params)
}

// 源启结算(保存报文)
export const sufCreatePayOrder = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/sufCreatePayOrder`, params)
}

// 源启退费确认(获取报文)
export const preRefundPayOrder = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/preRefundPayOrder`, params)
}

// 源启退费确认(保存报文)
export const sufRefundPayOrder = (params) => {
  return request.post(`/${PAYMENT}/${VERSION}/settlement/payment/sufRefundPayOrder`, params)
}
