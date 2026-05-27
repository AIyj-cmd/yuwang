<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useLocale } from './i18n/useLocale';
import { useAppActions } from './composables/useAppActions';
import { useAppBootstrap } from './composables/useAppBootstrap';
import { provideAppContext } from './composables/useAppProvider';
import { useAppState } from './composables/useAppState';
import TopNav from './components/layout/TopNav.vue';

const route = useRoute();
const router = useRouter();
const localeContext = useLocale();
const state = useAppState(localeContext);

const activeSection = computed(() =>
  typeof route.meta.section === 'string' ? route.meta.section : 'submit'
);
const isAdminStandalone = computed(() => route.meta.adminStandalone === true);

const sectionRouteMap: Record<string, string> = {
  submit: '/submit',
  result: '/result',
  leaderboard: '/leaderboard',
  profile: '/profile',
  notifications: '/notifications',
  wallet: '/profile/wallet',
  safety: '/protection',
  protection: '/protection',
  community: '/community',
  guilds: '/guilds',
  circles: '/circles',
  groups: '/groups',
  about: '/about',
  feedback: '/feedback',
  announcements: '/announcements',
  checkin: '/checkin',
  admin: '/admin',
  social: '/result'
};

const jumpToSection = (id: string) => {
  void router.push(sectionRouteMap[id] ?? '/');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const actions = useAppActions({ state, localeContext, router, jumpToSection });

provideAppContext({ activeSection, actions, localeContext, state });
useAppBootstrap({ activeSection, actions, state });

const { locale } = localeContext;

watch(
  locale,
  (val) => {
    document.documentElement.lang = val === 'en-US' ? 'en' : 'zh-CN';
  },
  { immediate: true }
);
</script>

<template>
  <RouterView v-if="isAdminStandalone" />
  <div v-else class="app-shell">
    <TopNav />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
