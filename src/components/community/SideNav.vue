<script setup lang="ts">
/**
 * Community V2 · SideNav
 * 左栏 56px 图标导航。点击跳路由,通过 useRouter 直接跳转。
 * 视觉规范:logo + 主导航 + 分隔线 + 个人/设置。
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PixelIcon from './PixelIcon.vue';

type NavItem = {
  key: string;
  to: string;
  icon: 'home' | 'community' | 'trophy' | 'crown' | 'users' | 'wallet' | 'user' | 'settings';
  label: string;
  matchSection?: string;
};

const route = useRoute();
const router = useRouter();

const top: NavItem[] = [
  { key: 'home', to: '/submit', icon: 'home', label: '首页', matchSection: 'submit' },
  { key: 'community', to: '/community', icon: 'community', label: '社区', matchSection: 'community' },
  { key: 'leaderboard', to: '/leaderboard', icon: 'trophy', label: '排行榜', matchSection: 'leaderboard' },
  { key: 'guilds', to: '/guilds', icon: 'crown', label: '工会', matchSection: 'guilds' },
  { key: 'circles', to: '/circles', icon: 'users', label: '圈子', matchSection: 'circles' },
  { key: 'wallet', to: '/profile/wallet', icon: 'wallet', label: '钱包', matchSection: 'wallet' }
];

const bottom: NavItem[] = [
  { key: 'profile', to: '/profile', icon: 'user', label: '个人', matchSection: 'profile' },
  { key: 'about', to: '/about', icon: 'settings', label: '关于', matchSection: 'about' }
];

const activeKey = computed(() => {
  const sec = typeof route.meta.section === 'string' ? route.meta.section : '';
  return [...top, ...bottom].find((item) => item.matchSection === sec)?.key ?? '';
});

const go = (item: NavItem) => {
  if (route.path !== item.to) {
    void router.push(item.to);
  }
};
</script>

<template>
  <nav class="side-nav" aria-label="主导航">
    <div class="nav-logo" aria-hidden="true">
      <PixelIcon name="fish" :size="22" />
    </div>
    <button
      v-for="item in top"
      :key="item.key"
      type="button"
      class="nav-item"
      :class="{ active: activeKey === item.key }"
      :title="item.label"
      :aria-label="item.label"
      :aria-current="activeKey === item.key ? 'page' : undefined"
      @click="go(item)"
    >
      <PixelIcon :name="item.icon" :size="20" />
    </button>
    <div class="nav-divider" />
    <button
      v-for="item in bottom"
      :key="item.key"
      type="button"
      class="nav-item"
      :class="{ active: activeKey === item.key }"
      :title="item.label"
      :aria-label="item.label"
      @click="go(item)"
    >
      <PixelIcon :name="item.icon" :size="20" />
    </button>
  </nav>
</template>

<style scoped>
.side-nav {
  position: sticky;
  top: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  background: var(--color-bg-card);
  /* v1.2:外框软化,不再用会被主题覆盖到黑色的 token */
  border: 1.5px solid var(--v2-border-card);
  border-radius: var(--radius-md);
  box-shadow: var(--v2-shadow-flat-md);
  padding: var(--space-3) var(--space-2);
}
.nav-logo {
  width: 40px;
  height: 40px;
  margin: 0 auto var(--space-1);
  background: var(--color-primary);
  border: 1.5px solid var(--v2-border-emphasis);
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  color: var(--color-primary-text);
}
.nav-divider {
  height: 1px;
  margin: var(--space-2) var(--space-1);
  background: var(--v2-divider);
}
.nav-item {
  width: 40px;
  height: 40px;
  margin: 0 auto;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1.5px solid transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  position: relative;
}
.nav-item:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-base);
}
.nav-item.active {
  background: var(--color-accent-mint);
  border-color: var(--v2-border-emphasis);
  color: var(--color-primary-text);
}
.nav-item.active::after {
  content: '';
  position: absolute;
  left: -10px;
  top: 8px;
  width: 3px;
  height: 24px;
  /* v1.2:active 指示条改为柔和暖米灰,不再用纯黑 */
  background: var(--v2-border-emphasis);
  border-radius: 1.5px;
}

@media (max-width: 720px) {
  .side-nav {
    position: static;
    flex-direction: row;
    overflow-x: auto;
    padding: var(--space-2) var(--space-3);
  }
  .nav-divider {
    display: none;
  }
  .nav-logo {
    margin: 0;
  }
  .nav-item.active::after {
    left: 8px;
    top: auto;
    bottom: -10px;
    width: 24px;
    height: 3px;
  }
}
</style>
