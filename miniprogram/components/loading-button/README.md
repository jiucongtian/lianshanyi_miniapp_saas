# Loading Button 防重复点击按钮组件

## 功能特性

- 自动防重复点击
- 加载状态显示
- 可自定义按钮文本和加载文本
- 支持所有 TDesign Button 组件的属性
- 提供手动控制加载状态的方法

## 使用方法

### 1. 在页面 JSON 中引入组件

```json
{
  "usingComponents": {
    "loading-button": "/components/loading-button/index"
  }
}
```

### 2. 在 WXML 中使用

```xml
<loading-button
  theme="primary"
  size="large"
  block="{{true}}"
  disabled="{{!isFormValid}}"
  button-text="提交"
  loading-text="提交中..."
  prevent-duplicate="{{true}}"
  bind:tap="onSubmit"
/>
```

### 3. 在 JS 中处理事件

```javascript
Page({
  async onSubmit(e) {
    // 获取按钮组件引用
    const buttonComponent = this.selectComponent('loading-button');
    
    try {
      // 执行业务逻辑
      await this.doSomething();
      
      // 成功时组件会自动重置状态
    } catch (error) {
      // 错误时手动重置按钮状态
      if (buttonComponent) {
        buttonComponent.reset();
      }
    }
  }
});
```

## 属性说明

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| theme | String | 'primary' | 按钮主题 |
| size | String | 'medium' | 按钮尺寸 |
| block | Boolean | false | 是否块级按钮 |
| disabled | Boolean | false | 是否禁用 |
| buttonText | String | '按钮' | 按钮文本 |
| loadingText | String | '处理中...' | 加载中的文本 |
| customClass | String | '' | 自定义样式类 |
| preventDuplicate | Boolean | true | 是否启用防重复点击 |
| cooldownTime | Number | 1000 | 防重复点击的冷却时间（毫秒） |

## 方法说明

| 方法名 | 说明 | 参数 |
|--------|------|------|
| startLoading() | 开始加载状态 | 无 |
| stopLoading() | 结束加载状态 | 无 |
| reset() | 重置按钮状态 | 无 |

## 事件说明

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| tap | 按钮点击事件 | { loading: boolean } |

## 使用场景

1. 表单提交按钮
2. 确认操作按钮
3. 需要防重复点击的任何按钮
4. 需要显示加载状态的异步操作按钮

## 注意事项

1. 组件会自动处理防重复点击，无需手动管理
2. 在错误情况下需要手动调用 `reset()` 方法重置状态
3. 组件基于 TDesign Button，支持所有 TDesign Button 的属性
4. 建议在异步操作完成后让组件自动重置，只有在错误时才手动重置
