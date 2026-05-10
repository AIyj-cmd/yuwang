<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LogIn, ShieldAlert } from 'lucide-vue-next';
import { adminLogin } from '../services/adminApi';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const error = ref('');
const form = reactive({
  username: '',
  password: ''
});

const submit = async () => {
  loading.value = true;
  error.value = '';
  try {
    await adminLogin(form);
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/dashboard');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    loading.value = false;
    form.password = '';
  }
};
</script>

<template>
  <main class="admin-login-shell">
    <section class="admin-login-card">
      <div class="admin-login-mark">
        <ShieldAlert :size="28" />
      </div>
      <h1>管理后台登录</h1>
      <p>仅限已配置的管理员账号访问。后台登录使用 httpOnly cookie，不在浏览器本地存储 token。</p>

      <form class="admin-form" @submit.prevent="submit">
        <label>
          <span>管理员账号</span>
          <input v-model="form.username" autocomplete="username" required />
        </label>
        <label>
          <span>管理员密码</span>
          <input v-model="form.password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="admin-button primary" :disabled="loading">
          <LogIn :size="16" />
          {{ loading ? '登录中' : '登录' }}
        </button>
      </form>

      <p v-if="error" class="admin-error">{{ error }}</p>
    </section>
  </main>
</template>
