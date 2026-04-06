/**
 * 聊天输入框组件
 */
Component({
  properties: {
    // 输入框内容
    value: {
      type: String,
      value: ''
    },
    // 是否禁用发送按钮
    disabled: {
      type: Boolean,
      value: false
    },
    // 占位符
    placeholder: {
      type: String,
      value: '请输入消息...'
    },
  },

  data: {
    // 内部输入值
    innerValue: '',
    // 是否聚焦
    focused: false
  },

  methods: {
    /**
     * 输入事件
     */
    onInput(e) {
      const value = e.detail.value;
      this.setData({ innerValue: value });
      this.triggerEvent('input', { value });
    },

    /**
     * 聚焦事件
     */
    onFocus() {
      this.setData({ focused: true });
      this.triggerEvent('focus');
    },

    /**
     * 失焦事件
     */
    onBlur() {
      this.setData({ focused: false });
      this.triggerEvent('blur');
    },

    /**
     * 发送消息
     */
    onSend() {
      const value = this.data.innerValue.trim();
      if (value && !this.data.disabled) {
        this.triggerEvent('send', { value });
        this.setData({ innerValue: '' });
      }
    },

    /**
     * 确认发送（键盘完成按钮）
     */
    onConfirm(e) {
      const value = e.detail.value.trim();
      if (value && !this.data.disabled) {
        this.triggerEvent('send', { value });
        this.setData({ innerValue: '' });
      }
    },

    /**
     * 清空输入
     */
    clear() {
      this.setData({ innerValue: '' });
      this.triggerEvent('input', { value: '' });
    }
  }
});