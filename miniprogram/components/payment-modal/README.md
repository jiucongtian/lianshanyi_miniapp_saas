# PaymentModal 支付弹窗组件

## 功能说明

统一的支付流程弹窗组件，用于显示支付过程中的各种状态提示。

## 使用方法

### 1. 在页面 JSON 中注册组件

```json
{
  "usingComponents": {
    "payment-modal": "../../components/payment-modal/index"
  }
}
```

### 2. 在页面 WXML 中使用组件

```xml
<payment-modal 
  show="{{showPaymentModal}}" 
  text="{{paymentModalText}}"
></payment-modal>
```

### 3. 在页面 JS 中初始化数据

```javascript
Page({
  data: {
    showPaymentModal: false,
    paymentModalText: '支付中...'
  }
});
```

### 4. 在 Controller 中使用基类方法

所有继承自 `BaseController` 的控制器都可以直接使用以下方法：

```javascript
// 显示支付弹窗
this._showPaymentModal('创建订单中...');
this._showPaymentModal('支付中...');
this._showPaymentModal('确认订单...');

// 隐藏支付弹窗
this._hidePaymentModal();
```

## 属性说明

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| show | Boolean | false | 是否显示弹窗 |
| text | String | '支付中...' | 弹窗显示的文字 |

## 注意事项

1. **基类方法**：`_showPaymentModal()` 和 `_hidePaymentModal()` 已经在 `BaseController` 中实现，所有控制器都可以直接使用
2. **数据绑定**：组件通过 `showPaymentModal` 和 `paymentModalText` 两个数据字段控制显示
3. **样式隔离**：组件使用样式隔离，不会影响页面样式
4. **自动恢复**：页面重新显示时，如果正在支付中，会自动恢复弹窗显示

## 示例

### FunctionController 中的使用

```javascript
// 开始支付流程
this._showPaymentModal('创建订单中...');

// 订单创建成功，调起支付
this._showPaymentModal('调起支付中...');

// 支付调起成功
this._showPaymentModal('支付中...');

// 查询订单状态
this._showPaymentModal('确认订单...');

// 支付完成
this._hidePaymentModal();
```

