<template>
  <div class="agreement-page">
    <van-nav-bar title="用户协议" left-arrow @click-left="router.back()" />

    <div class="content">
      <h2>连山易 用户服务协议</h2>
      <p class="update-time">更新时间：2024年1月1日</p>

      <h3>一、服务说明</h3>
      <p>连山易（以下简称"本平台"）提供基于中国传统命理文化的八字分析、卡牌解读、每日运势等服务。本平台所提供的内容仅供参考娱乐，不构成任何医疗、法律、财务等专业建议。</p>

      <h3>二、用户注册</h3>
      <p>用户注册时需提供真实、准确的信息。用户对账户安全负责，不得将账户转让给他人。如发现账户被盗用，请立即联系我们。</p>

      <h3>三、隐私保护</h3>
      <p>本平台重视您的隐私安全。我们收集的用户信息仅用于提供服务，不会向第三方出售或共享您的个人信息。您输入的出生信息将用于八字计算，存储于安全的数据库中。</p>

      <h3>四、使用规范</h3>
      <p>用户不得利用本平台进行任何违法违规活动，不得散布虚假信息或干扰其他用户的正常使用。本平台保留对违规账户进行封禁的权利。</p>

      <h3>五、免责声明</h3>
      <p>本平台提供的命理分析内容基于传统文化知识，仅供参考。对于用户根据本平台内容做出的决策，本平台不承担任何法律责任。请理性对待命理文化，保持科学的人生态度。</p>

      <h3>六、服务变更</h3>
      <p>本平台有权根据实际情况对服务内容进行调整。如有重大变更，将提前通知用户。继续使用本平台服务即视为接受变更内容。</p>

      <h3>七、联系我们</h3>
      <p>如您对本协议有任何疑问，可通过平台内的"意见反馈"功能联系我们。我们将在5个工作日内给予回复。</p>

      <p class="footer-note">本协议最终解释权归连山易所有。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.agreement-page { background: var(--color-bg); min-height: 100vh; }
.content {
  padding: 20px 16px 40px;
  color: var(--color-text);
  line-height: 1.8;
}
h2 {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 4px;
}
.update-time {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 13px;
  margin-bottom: 24px;
}
h3 {
  font-size: 15px;
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 8px;
  color: var(--color-primary);
}
p { font-size: 14px; color: var(--color-text); }
.footer-note {
  margin-top: 24px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
