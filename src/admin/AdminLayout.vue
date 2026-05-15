<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import {
  Bell,
  Bot,
  CircleDot,
  ClipboardList,
  FileText,
  Gauge,
  Hash,
  History,
  LogOut,
  MessageSquare,
  Settings,
  ShieldAlert,
  Users,
  Warehouse
} from 'lucide-vue-next';
import { adminLogout, fetchAdminMe } from '../services/adminApi';

const router = useRouter();
const username = ref('');

const navItems = [
  { to: '/admin/dashboard', label: '数据概览', icon: Gauge },
  { to: '/admin/records', label: '摸鱼记录', icon: FileText },
  { to: '/admin/reports', label: '举报处理', icon: Bell },
  { to: '/admin/comments', label: '评论管理', icon: MessageSquare },
  { to: '/admin/users', label: '用户管理', icon: Users },
  { to: '/admin/wallets', label: '鱼鳞钱包', icon: Users },
  { to: '/admin/transactions', label: '鱼鳞流水', icon: History },
  { to: '/admin/topics', label: '话题管理', icon: Hash },
  { to: '/admin/guilds', label: '工会管理', icon: Warehouse },
  { to: '/admin/circles', label: '圈子管理', icon: CircleDot },
  { to: '/admin/groups', label: '小组管理', icon: ClipboardList },
  { to: '/admin/safety', label: '安全配置', icon: ShieldAlert },
  { to: '/admin/ai-prompts', label: 'AI Prompt 管理', icon: Bot },
  { to: '/admin/settings', label: '站点配置', icon: Settings },
  { to: '/admin/audit-logs', label: '操作日志', icon: History }
] as const;

const logout = async () => {
  await adminLogout().catch(() => undefined);
  await router.push('/admin/login');
};

onMounted(async () => {
  const me = await fetchAdminMe().catch(() => null);
  username.value = me?.user.username ?? '';
});
</script>

<template>
  <main class="admin-shell">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <span>管</span>
        <div>
          <strong>后台管理</strong>
          <small>Gongwei Yuwang Admin</small>
        </div>
      </div>

      <nav class="admin-nav" aria-label="后台导航">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to">
          <component :is="item.icon" :size="16" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <section class="admin-main">
      <header class="admin-topbar">
        <div>
          <strong>工位鱼王管理后台</strong>
          <small>审核、举报、配置和操作日志</small>
        </div>
        <div class="admin-topbar-actions">
          <span>{{ username || 'admin' }}</span>
          <button type="button" class="admin-button" @click="logout">
            <LogOut :size="15" />
            退出
          </button>
        </div>
      </header>

      <RouterView />
    </section>
  </main>
</template>
