# Payment Integration 聚合支付集成框架

## 📖 简介

`payment-integration` 是一个专为医疗系统设计的聚合支付集成框架，提供统一的支付接口，支持多种聚合支付平台（国卫、讯飞水滴等），简化支付业务的集成和开发。

## ✨ 特性

- 🎯 **统一接口**：提供统一的支付 API，屏蔽不同支付平台的差异
- 🔌 **多平台支持**：支持国卫聚合支付、讯飞水滴支付等多种聚合支付平台
- 🏥 **医疗场景**：针对门诊挂号、门诊收费、住院预交金、住院结算等医疗场景优化
- 🛡️ **错误处理**：完善的错误处理和重试机制
- 📊 **事件驱动**：基于事件驱动的架构，支持支付状态监听
- 🎨 **弹窗管理**：内置支付弹窗组件，支持 Vue 集成
- 📝 **日志记录**：完整的日志记录功能，便于问题排查
- ⚙️ **配置管理**：支持从系统开关动态获取配置

## 📦 安装

```bash
# 在项目根目录下安装依赖
pnpm install
```

## 🚀 快速开始

### 基础使用

```javascript
import PaymentManager from '@custom-third-src/payment-integration'

// 获取支付管理器实例
const manager = PaymentManager.getInstance()

// 初始化（首次使用会自动初始化）
await manager.init()

// 创建支付订单
const result = await manager.createPayment({
  orderId: 'ORDER20231010001',
  patientId: 'PATIENT001',
  amount: 100.5,
  paymentType: 'qr_code',
  description: '门诊挂号费',
})

console.log('支付创建成功:', result)
```

### Vue 组件集成

```vue
<template>
  <div>
    <el-button @click="handlePayment" :loading="loading"> 发起支付 </el-button>
  </div>
</template>

<script>
import PaymentManager from '@custom-third-src/payment-integration'

export default {
  name: 'PaymentComponent',
  data() {
    return {
      paymentManager: null,
      loading: false,
    }
  },
  async created() {
    // 获取支付管理器实例
    this.paymentManager = PaymentManager.getInstance()

    // 初始化
    await this.paymentManager.init()

    // 监听支付事件
    this.paymentManager.on('payment:created', this.handlePaymentCreated)
    this.paymentManager.on('error', this.handlePaymentError)
  },
  beforeDestroy() {
    // 移除事件监听
    if (this.paymentManager) {
      this.paymentManager.off('payment:created', this.handlePaymentCreated)
      this.paymentManager.off('error', this.handlePaymentError)
    }
  },
  methods: {
    async handlePayment() {
      try {
        this.loading = true
        const result = await this.paymentManager.createPayment({
          orderId: 'ORDER001',
          patientId: 'PATIENT001',
          amount: 100.5,
          paymentType: 'qr_code',
          description: '门诊挂号费',
        })
        this.$message.success('支付创建成功')
      } catch (error) {
        this.$message.error(`支付失败: ${error.message}`)
      } finally {
        this.loading = false
      }
    },
    handlePaymentCreated(data) {
      console.log('支付已创建:', data)
    },
    handlePaymentError(error) {
      console.error('支付错误:', error)
    },
  },
}
</script>
```

## 📚 API 文档

### PaymentManager

支付管理器，提供统一的支付接口。

#### 方法

##### `getInstance()`

获取单例实例。

```javascript
const manager = PaymentManager.getInstance()
```

##### `init(options)`

初始化管理器。

**参数：**

- `options` (Object, 可选)
  - `force` (Boolean): 是否强制重新初始化
  - `Vue` (Constructor): Vue 构造函数（用于弹窗组件）
  - `UniversalPaymentDialog` (Component): 支付弹窗组件

**返回：** `Promise<Object>` 配置对象

```javascript
await manager.init({
  force: false,
  Vue: Vue,
})
```

##### `isAggregatedPaymentEnabled(paymentData)`

判断是否开启聚合支付。

**参数：**

- `paymentData` (Object, 可选): 支付数据（用于业务层判断）

**返回：** `Promise<Boolean>` 是否开启聚合支付

```javascript
const isEnabled = await manager.isAggregatedPaymentEnabled({
  orderId: 'ORDER001',
  amount: 100.5,
})
```

##### `createPayment(params)`

创建支付订单。

**参数：**

- `params` (Object): 支付参数
  - `orderId` (String): 订单 ID
  - `patientId` (String): 患者 ID
  - `amount` (Number): 支付金额
  - `paymentType` (String): 支付类型
  - `description` (String): 支付描述

**返回：** `Promise<Object>` 支付结果

```javascript
const result = await manager.createPayment({
  orderId: 'ORDER001',
  patientId: 'PATIENT001',
  amount: 100.5,
  paymentType: 'qr_code',
  description: '门诊挂号费',
})
```

##### `queryPaymentStatus(params)`

查询支付状态。

**参数：**

- `params` (Object): 查询参数
  - `paymentId` (String): 支付 ID
  - `orderId` (String, 可选): 订单 ID

**返回：** `Promise<Object>` 支付状态

```javascript
const status = await manager.queryPaymentStatus({
  paymentId: 'PAY123456',
})
```

##### `refund(params)`

发起退款。

**参数：**

- `params` (Object): 退款参数
  - `paymentId` (String): 支付 ID
  - `amount` (Number): 退款金额
  - `reason` (String): 退款原因

**返回：** `Promise<Object>` 退款结果

```javascript
const result = await manager.refund({
  paymentId: 'PAY123456',
  amount: 100.5,
  reason: '用户申请退款',
})
```

##### `refundResult(params)`

查询退款结果。

**参数：**

- `params` (Object): 退款查询参数
  - `refundId` (String): 退款 ID
  - `paymentId` (String): 支付 ID

**返回：** `Promise<Object>` 退款结果

```javascript
const result = await manager.refundResult({
  refundId: 'REFUND123456',
})
```

##### `cancelPayment(params)`

取消支付订单。

**参数：**

- `params` (Object): 取消参数
  - `paymentId` (String): 支付 ID
  - `orderId` (String, 可选): 订单 ID

**返回：** `Promise<Object>` 取消结果

```javascript
const result = await manager.cancelPayment({
  paymentId: 'PAY123456',
})
```

##### `closePayment(params)`

关闭支付订单。

**参数：**

- `params` (Object): 关闭参数
  - `paymentId` (String): 支付 ID
  - `orderId` (String, 可选): 订单 ID

**返回：** `Promise<Object>` 关闭结果

```javascript
const result = await manager.closePayment({
  paymentId: 'PAY123456',
})
```

##### `reloadConfig()`

重新加载配置（从系统开关获取最新配置）。

**返回：** `Promise<Object>` 配置对象

```javascript
const config = await manager.reloadConfig()
```

##### `getStats()`

获取管理器统计信息。

**返回：** `Object` 统计信息

```javascript
const stats = manager.getStats()
// {
//   initialized: true,
//   loading: false,
//   hasError: false,
//   config: { ... },
//   errors: { ... },
//   events: { ... },
//   timestamp: '2023-10-10T12:00:00.000Z'
// }
```

##### `getConfig()`

获取当前配置。

**返回：** `Object` 配置对象

```javascript
const config = manager.getConfig()
```

##### `getPaymentService()`

获取支付服务实例。

**返回：** `BasePaymentService` 支付服务实例

```javascript
const service = manager.getPaymentService()
```

##### `isLoading()`

获取当前加载状态。

**返回：** `Boolean` 是否正在加载

```javascript
const loading = manager.isLoading()
```

##### `getLastError()`

获取最后一次错误。

**返回：** `Error|null` 最后一次错误

```javascript
const error = manager.getLastError()
```

##### `destroy()`

清理资源。

```javascript
manager.destroy()
```

#### 事件

PaymentManager 继承自 EventEmitter，支持以下事件：

- `initialized`: 初始化完成
- `paymentCreated`: 支付创建成功
- `paymentSuccess`: 支付成功
- `paymentError`: 支付错误
- `paymentCancelled`: 支付取消
- `paymentClosed`: 支付关闭
- `refundSuccess`: 退款成功
- `refundError`: 退款错误
- `refundResultSuccess`: 退款结果查询成功
- `refundResultError`: 退款结果查询错误
- `config:reloaded`: 配置重新加载
- `loading`: 加载状态变化
- `error`: 错误事件

```javascript
// 监听事件
manager.on('paymentCreated', (data) => {
  console.log('支付已创建:', data)
})

manager.on('error', (error) => {
  console.error('支付错误:', error)
})

// 移除监听
manager.off('paymentCreated', handler)
```

## 🏗️ 架构设计

### 目录结构

```
payment-integration/
├── components/              # Vue 组件
│   ├── payment-dialog-manager.vue
│   └── index.js
├── config/                 # 配置文件
│   └── apiTypes.js
├── constants/              # 常量定义
│   ├── errorCodes.js
│   ├── paymentTypes.js
│   └── switchCodes.js
├── examples/               # 使用示例
│   ├── basic-usage.js
│   └── vue-integration.js
├── factories/              # 工厂类
│   ├── PaymentFactory.js
│   └── StrategyFactory.js
├── managers/               # 管理器
│   ├── DialogManager.js
│   ├── ErrorManager.js
│   ├── PaymentConfigRegistry.js
│   └── PaymentManager.js
├── services/               # 支付服务
│   ├── BasePaymentService.js
│   └── GuoWeiPaymentService/
├── types/                  # 类型定义
│   ├── common.js
│   ├── index.js
│   └── payment.js
├── utils/                  # 工具类
│   ├── EventEmitter.js
│   ├── GlobalAccessor.js
│   ├── Logger.js
│   ├── PaymentConfig.js
│   └── PaymentError.js
├── index.js                # 入口文件
└── package.json
```

### 核心组件

#### PaymentManager

支付管理器，协调各个模块，提供统一的支付业务接口。

- 单例模式，确保全局唯一实例
- 自动初始化配置和服务
- 提供统一的支付 API
- 支持事件监听和状态管理

#### ErrorManager

错误管理器，提供统一的错误处理和重试机制。

- 错误分类和处理
- 自动重试机制
- 错误统计和上报

#### PaymentFactory

支付服务工厂，根据配置创建对应的支付服务实例。

- 支持多种支付平台
- 动态创建服务实例
- 配置驱动

#### DialogManager

弹窗管理器，管理支付弹窗的显示和隐藏。

- Vue 组件集成
- 弹窗生命周期管理
- 多实例支持

## 🔧 配置说明

### 系统开关配置

框架通过系统开关获取配置，支持的开关代码：

- `PAYMENT_TYPE_SWITCHES`: 支付类型开关
- `PAYMENT_ENABLED_SWITCHES`: 支付功能开关

### 支付类型

支持的支付类型（通过系统开关配置）：

- `guowei`: 国卫聚合支付
- `xunfei_shuidi`: 讯飞水滴聚合支付

### 支付状态

```javascript
import { PAYMENT_STATUS } from '@custom-third-src/payment-integration'

// 支付状态常量
PAYMENT_STATUS.PENDING // 待支付
PAYMENT_STATUS.PROCESSING // 支付中
PAYMENT_STATUS.SUCCESS // 支付成功
PAYMENT_STATUS.FAILED // 支付失败
PAYMENT_STATUS.CANCELLED // 已取消
PAYMENT_STATUS.CLOSED // 已关闭
PAYMENT_STATUS.REFUNDING // 退款中
PAYMENT_STATUS.REFUNDED // 已退款
```

### 业务类型

```javascript
import { BUSINESS_TYPES } from '@custom-third-src/payment-integration'

// 业务类型常量
BUSINESS_TYPES.OUTPATIENT_REGISTER // 门诊挂号
BUSINESS_TYPES.OUTPATIENT_CHARGE // 门诊收费
BUSINESS_TYPES.INPATIENT_PREPAY // 住院预交金
BUSINESS_TYPES.INPATIENT_CHARGE // 住院结算
```

## 📝 使用示例

### 示例 1：创建支付订单

```javascript
import PaymentManager from '@custom-third-src/payment-integration'

async function createPayment() {
  const manager = PaymentManager.getInstance()
  await manager.init()

  try {
    const result = await manager.createPayment({
      orderId: 'ORDER20231010001',
      patientId: 'PATIENT001',
      amount: 100.5,
      paymentType: 'qr_code',
      description: '门诊挂号费',
    })
    console.log('支付创建成功:', result)
  } catch (error) {
    console.error('支付创建失败:', error)
  }
}
```

### 示例 2：查询支付状态

```javascript
async function queryPaymentStatus() {
  const manager = PaymentManager.getInstance()

  try {
    const status = await manager.queryPaymentStatus({
      paymentId: 'PAY123456',
    })
    console.log('支付状态:', status)
  } catch (error) {
    console.error('查询支付状态失败:', error)
  }
}
```

### 示例 3：退款处理

```javascript
async function processRefund() {
  const manager = PaymentManager.getInstance()

  try {
    const result = await manager.refund({
      paymentId: 'PAY123456',
      amount: 100.5,
      reason: '用户申请退款',
    })
    console.log('退款成功:', result)
  } catch (error) {
    console.error('退款失败:', error)
  }
}
```

### 示例 4：事件监听

```javascript
function setupEventListeners() {
  const manager = PaymentManager.getInstance()

  // 监听支付创建事件
  manager.on('paymentCreated', (data) => {
    console.log('支付已创建:', data)
  })

  // 监听支付成功事件
  manager.on('paymentSuccess', (data) => {
    console.log('支付成功:', data)
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
```

### 示例 5：判断是否开启聚合支付

```javascript
async function checkPaymentEnabled() {
  const manager = PaymentManager.getInstance()

  // 检查是否开启聚合支付
  const isEnabled = await manager.isAggregatedPaymentEnabled({
    orderId: 'ORDER001',
    amount: 100.5,
  })

  if (isEnabled) {
    console.log('聚合支付已开启')
    // 执行支付逻辑
  } else {
    console.log('聚合支付未开启')
    // 使用其他支付方式
  }
}
```

更多示例请参考 `examples/` 目录下的示例文件。

## 🛠️ 开发指南

### 扩展支付服务

如果需要添加新的支付平台支持，需要：

1. 创建支付服务类，继承 `BasePaymentService`
2. 实现必要的接口方法
3. 在 `PaymentFactory` 中注册新的支付类型

```javascript
import BasePaymentService from '../services/BasePaymentService.js'

class CustomPaymentService extends BasePaymentService {
  async createPayment(params) {
    // 实现创建支付逻辑
  }

  async queryPaymentStatus(params) {
    // 实现查询支付状态逻辑
  }

  // ... 其他方法
}
```

### 自定义错误处理

```javascript
import ErrorManager from '@custom-third-src/payment-integration'

const errorManager = new ErrorManager()

// 注册自定义错误处理器
errorManager.registerHandler('CustomError', (error, context) => {
  // 自定义错误处理逻辑
  return {
    code: error.code,
    message: error.message,
    ...context,
  }
})
```

## ⚠️ 注意事项

1. **初始化**：首次使用前必须调用 `init()` 方法初始化管理器
2. **单例模式**：PaymentManager 使用单例模式，全局只有一个实例
3. **事件清理**：在组件销毁时记得移除事件监听，避免内存泄漏
4. **错误处理**：所有异步操作都应该使用 try-catch 进行错误处理
5. **配置更新**：配置通过系统开关获取，如需更新配置可调用 `reloadConfig()`

## 🐛 问题排查

### 常见问题

1. **初始化失败**

   - 检查系统开关配置是否正确
   - 检查支付类型是否支持
   - 查看控制台错误日志

2. **支付创建失败**

   - 检查支付参数是否完整
   - 检查网络连接
   - 查看错误信息

3. **事件监听不生效**
   - 确认事件名称是否正确
   - 确认监听器是否已注册
   - 检查事件是否已触发

### 日志调试

框架提供完整的日志功能，可以通过 Logger 查看详细日志：

```javascript
import Logger from '@custom-third-src/payment-integration'

const logger = new Logger('CustomModule')
logger.info('信息日志')
logger.warn('警告日志')
logger.error('错误日志', error)
```

## 📄 许可证

ISC

## 👥 贡献者

医疗系统架构师团队

## 📞 联系方式

如有问题或建议，请联系医疗系统架构师团队。
