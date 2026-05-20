<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  Coins,
  Crown,
  Hash,
  Inbox,
  Languages,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  User,
  X
} from 'lucide-vue-next';
import { PxButton, PxInput } from '@mmt817/pixel-ui';
import ThemeSwitcher from './components/ThemeSwitcher.vue';
import type { MessageKey } from './i18n/useLocale';
import { useLocale } from './i18n/useLocale';
import { useAppActions } from './composables/useAppActions';
import { useAppBootstrap } from './composables/useAppBootstrap';
import { provideAppContext } from './composables/useAppProvider';
import { useAppState } from './composables/useAppState';

const route = useRoute();
const router = useRouter();
const localeContext = useLocale();
const state = useAppState(localeContext);

const sectionRouteMap: Record<string, string> = {
  submit: '/',
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

const activeSection = computed(() => (typeof route.meta.section === 'string' ? route.meta.section : 'submit'));
const isAdminStandalone = computed(() => route.meta.adminStandalone === true);

// Primary nav: shown directly on the top bar.
const primaryNavItems = [
  { id: 'submit', icon: Send, labelKey: 'submitRecord' },
  { id: 'leaderboard', icon: BarChart3, labelKey: 'leaderboard' },
  { id: 'community', icon: MessageCircle, labelKey: 'community' },
  { id: 'guilds', icon: Crown, labelKey: 'guilds' },
  { id: 'circles', icon: Star, labelKey: 'circles' },
  { id: 'groups', icon: User, labelKey: 'groups' }
] as const satisfies readonly {
  id: string;
  icon: typeof Inbox;
  labelKey: MessageKey;
}[];

// "More" menu: secondary entries grouped behind a dropdown so the top bar stays tidy.
const moreNavItems = [
  { id: 'checkin', icon: Check, labelKey: 'checkin' },
  { id: 'announcements', icon: AlertTriangle, labelKey: 'announcements' },
  { id: 'safety', icon: ShieldAlert, labelKey: 'safety' },
  { id: 'about', icon: BadgeCheck, labelKey: 'about' },
  { id: 'feedback', icon: MessageCircle, labelKey: 'feedback' }
] as const satisfies readonly {
  id: string;
  icon: typeof Inbox;
  labelKey: MessageKey;
}[];

const moreSectionIds = new Set<string>(moreNavItems.map((item) => item.id));
const isMoreActive = computed(() => moreSectionIds.has(activeSection.value));

const jumpToSection = (id: string) => {
  void router.push(sectionRouteMap[id] ?? '/');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const actions = useAppActions({ state, localeContext, router, jumpToSection });

provideAppContext({ activeSection, actions, localeContext, state });
useAppBootstrap({ activeSection, actions, state });

const { copy, locale, t, translatedLocaleLabel } = localeContext;
const { authForm, authMode, currentUser, notificationUnreadCount, options, pendingReviewCount, stats } = state;
const { changeLocale, handleAuth, logout, startNewRecord } = actions;

// Local-only UI state for the new top navigation.
const mobileMenuOpen = ref(false);
const moreMenuOpen = ref(false);
const accountMenuOpen = ref(false);
const topNavRef = ref<HTMLElement | null>(null);

const closeMenus = () => {
  mobileMenuOpen.value = false;
  moreMenuOpen.value = false;
  accountMenuOpen.value = false;
};

const navigateTo = (id: string) => {
  closeMenus();
  jumpToSection(id);
};

const handleNewRecord = () => {
  closeMenus();
  startNewRecord();
};

const handleLogout = () => {
  closeMenus();
  logout();
};

const onAuthSubmit = async () => {
  await handleAuth();
  if (state.currentUser.value) {
    closeMenus();
  }
};

// Close menus whenever the route changes.
watch(activeSection, () => {
  closeMenus();
});

const handleDocumentClick = (event: MouseEvent) => {
  if (!moreMenuOpen.value && !accountMenuOpen.value && !mobileMenuOpen.value) return;
  const root = topNavRef.value;
  if (!root) return;
  if (event.target instanceof Node && root.contains(event.target)) return;
  closeMenus();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeMenus();
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <RouterView v-if="isAdminStandalone" />
  <div v-else class="app-shell" :class="{ 'menu-open': mobileMenuOpen }">
    <header
      ref="topNavRef"
      class="top-nav"
      :class="{ 'menu-open': mobileMenuOpen }"
      :aria-label="copy('顶部导航', 'Top navigation')"
    >
      <div class="top-nav-bar">
        <button
          type="button"
          class="top-brand"
          :title="copy('回到首页', 'Back to home')"
          @click="navigateTo('submit')"
        >
          <span class="brand-mark" aria-hidden="true">{{ copy('鱼', 'Y') }}</span>
          <span class="brand-text">
            <strong>{{ copy('工位鱼王', 'Gongwei Yuwang') }}</strong>
            <small>{{ copy('MVP · 摸鱼上榜站', 'MVP · Slack Log') }}</small>
          </span>
        </button>

        <nav class="primary-nav" :aria-label="copy('主导航', 'Primary navigation')">
          <button
            v-for="item in primaryNavItems"
            :key="`primary-${item.id}`"
            type="button"
            class="nav-link"
            :class="{ active: activeSection === item.id, cta: item.id === 'submit' }"
            @click="navigateTo(item.id)"
          >
            <component :is="item.icon" :size="15" />
            <span>{{ t(item.labelKey) }}</span>
          </button>

          <div class="more-wrap" :class="{ open: moreMenuOpen }">
            <button
              type="button"
              class="nav-link more-trigger"
              :class="{ active: isMoreActive }"
              :aria-expanded="moreMenuOpen"
              aria-haspopup="menu"
              @click.stop="moreMenuOpen = !moreMenuOpen"
            >
              <Sparkles :size="15" />
              <span>{{ copy('更多', 'More') }}</span>
              <ChevronDown :size="14" />
            </button>
            <div v-if="moreMenuOpen" class="dropdown-panel more-panel" role="menu">
              <button
                v-for="item in moreNavItems"
                :key="`more-${item.id}`"
                type="button"
                class="dropdown-item"
                :class="{ active: activeSection === item.id }"
                role="menuitem"
                @click="navigateTo(item.id)"
              >
                <component :is="item.icon" :size="15" />
                <span>{{ t(item.labelKey) }}</span>
              </button>
              <button
                v-if="currentUser?.isAdmin"
                type="button"
                class="dropdown-item admin-item"
                :class="{ active: activeSection === 'admin' }"
                role="menuitem"
                @click="navigateTo('admin')"
              >
                <ClipboardCheck :size="15" />
                <span>{{ copy('待审', 'Review') }}</span>
                <em v-if="pendingReviewCount > 0">{{ pendingReviewCount }}</em>
              </button>
            </div>
          </div>
        </nav>

        <div class="top-aside">
          <button
            type="button"
            class="aside-cta"
            :title="copy('新建记录', 'New record')"
            @click="handleNewRecord"
          >
            <Send :size="14" />
            <span>{{ copy('上榜', 'Submit') }}</span>
          </button>

          <button
            v-if="currentUser"
            type="button"
            class="aside-icon"
            :class="{ active: activeSection === 'notifications' }"
            :title="t('notifications')"
            :aria-label="t('notifications')"
            @click="navigateTo('notifications')"
          >
            <Bell :size="16" />
            <em v-if="notificationUnreadCount > 0" class="dot-badge">
              {{ notificationUnreadCount > 99 ? '99+' : notificationUnreadCount }}
            </em>
          </button>

          <div class="aside-theme">
            <ThemeSwitcher :locale="locale" />
          </div>

          <label class="lang-picker">
            <Languages :size="14" />
            <select v-model="locale" :aria-label="t('language')" @change="changeLocale">
              <option v-for="item in options.supportedLocales" :key="item.key" :value="item.key">
                {{ translatedLocaleLabel(item.key, item.label) }}
              </option>
            </select>
          </label>

          <div class="account-wrap" :class="{ open: accountMenuOpen }">
            <button
              type="button"
              class="account-trigger"
              :aria-expanded="accountMenuOpen"
              aria-haspopup="menu"
              @click.stop="accountMenuOpen = !accountMenuOpen"
            >
              <User :size="16" />
              <span class="account-name">
                {{ currentUser ? currentUser.displayName : copy('登录 / 注册', 'Sign In') }}
              </span>
              <ChevronDown :size="14" />
            </button>

            <div v-if="accountMenuOpen" class="dropdown-panel account-panel" role="menu">
              <template v-if="currentUser">
                <div class="account-summary">
                  <div class="account-avatar" aria-hidden="true">{{ (currentUser.displayName?.[0] ?? '鱼').toUpperCase() }}</div>
                  <div class="account-summary-text">
                    <strong>{{ currentUser.displayName }}</strong>
                    <small>@{{ currentUser.username }}<span v-if="currentUser.isAdmin"> · Admin</span></small>
                  </div>
                </div>
                <button type="button" class="dropdown-item" :class="{ active: activeSection === 'profile' }" role="menuitem" @click="navigateTo('profile')">
                  <User :size="15" />
                  <span>{{ t('profile') }}</span>
                </button>
                <button type="button" class="dropdown-item" :class="{ active: activeSection === 'wallet' }" role="menuitem" @click="navigateTo('wallet')">
                  <Coins :size="15" />
                  <span>{{ t('wallet') }}</span>
                </button>
                <button type="button" class="dropdown-item" :class="{ active: activeSection === 'notifications' }" role="menuitem" @click="navigateTo('notifications')">
                  <Bell :size="15" />
                  <span>{{ t('notifications') }}</span>
                  <em v-if="notificationUnreadCount > 0">{{ notificationUnreadCount }}</em>
                </button>
                <button v-if="currentUser?.isAdmin" type="button" class="dropdown-item admin-item" :class="{ active: activeSection === 'admin' }" role="menuitem" @click="navigateTo('admin')">
                  <ClipboardCheck :size="15" />
                  <span>{{ copy('待审审核', 'Review Queue') }}</span>
                  <em v-if="pendingReviewCount > 0">{{ pendingReviewCount }}</em>
                </button>
                <button type="button" class="dropdown-item danger" role="menuitem" @click="handleLogout">
                  <LogOut :size="15" />
                  <span>{{ t('logout') }}</span>
                </button>
              </template>
              <template v-else>
                <div class="account-auth">
                  <div class="auth-tabs">
                    <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">{{ t('login') }}</button>
                    <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">{{ t('register') }}</button>
                  </div>
                  <PxInput v-model="authForm.username" :placeholder="t('username')" clearable />
                  <PxInput v-model="authForm.password" :placeholder="t('password')" type="password" />
                  <PxInput v-if="authMode === 'register'" v-model="authForm.displayName" :placeholder="t('displayName')" clearable />
                  <PxButton type="primary" size="small" @click="onAuthSubmit">
                    <LogIn :size="14" />
                    {{ authMode === 'register' ? t('register') : t('login') }}
                  </PxButton>
                  <p class="auth-hint">
                    {{ copy('登录后才能点赞、评论、组小组、上传徽章。', 'Sign in to like, comment, join groups, and earn badges.') }}
                  </p>
                </div>
              </template>
            </div>
          </div>

          <button
            type="button"
            class="mobile-toggle"
            :aria-label="mobileMenuOpen ? copy('关闭菜单', 'Close menu') : copy('展开菜单', 'Open menu')"
            :aria-expanded="mobileMenuOpen"
            @click.stop="mobileMenuOpen = !mobileMenuOpen"
          >
            <X v-if="mobileMenuOpen" :size="20" />
            <Menu v-else :size="20" />
          </button>
        </div>
      </div>

      <transition name="mobile-fade">
        <div v-if="mobileMenuOpen" class="mobile-menu" role="menu">
          <div class="mobile-section">
            <p class="mobile-section-title">{{ copy('功能', 'Main') }}</p>
            <button
              v-for="item in primaryNavItems"
              :key="`m-primary-${item.id}`"
              type="button"
              class="mobile-link"
              :class="{ active: activeSection === item.id }"
              @click="navigateTo(item.id)"
            >
              <component :is="item.icon" :size="16" />
              <span>{{ t(item.labelKey) }}</span>
            </button>
          </div>
          <div class="mobile-section">
            <p class="mobile-section-title">{{ copy('更多', 'More') }}</p>
            <button
              v-for="item in moreNavItems"
              :key="`m-more-${item.id}`"
              type="button"
              class="mobile-link"
              :class="{ active: activeSection === item.id }"
              @click="navigateTo(item.id)"
            >
              <component :is="item.icon" :size="16" />
              <span>{{ t(item.labelKey) }}</span>
            </button>
            <button
              v-if="currentUser?.isAdmin"
              type="button"
              class="mobile-link admin"
              :class="{ active: activeSection === 'admin' }"
              @click="navigateTo('admin')"
            >
              <ClipboardCheck :size="16" />
              <span>{{ copy('待审', 'Review') }} {{ pendingReviewCount }}</span>
            </button>
          </div>
          <div v-if="currentUser" class="mobile-section">
            <p class="mobile-section-title">{{ t('account') }}</p>
            <button type="button" class="mobile-link" :class="{ active: activeSection === 'profile' }" @click="navigateTo('profile')">
              <User :size="16" />
              <span>{{ t('profile') }}</span>
            </button>
            <button type="button" class="mobile-link" :class="{ active: activeSection === 'wallet' }" @click="navigateTo('wallet')">
              <Coins :size="16" />
              <span>{{ t('wallet') }}</span>
            </button>
            <button type="button" class="mobile-link" :class="{ active: activeSection === 'notifications' }" @click="navigateTo('notifications')">
              <Bell :size="16" />
              <span>{{ t('notifications') }}</span>
              <em v-if="notificationUnreadCount > 0">{{ notificationUnreadCount }}</em>
            </button>
            <button type="button" class="mobile-link danger" @click="handleLogout">
              <LogOut :size="16" />
              <span>{{ t('logout') }}</span>
            </button>
          </div>
          <div v-else class="mobile-section">
            <p class="mobile-section-title">{{ copy('登录 / 注册', 'Sign In') }}</p>
            <div class="account-auth mobile">
              <div class="auth-tabs">
                <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">{{ t('login') }}</button>
                <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">{{ t('register') }}</button>
              </div>
              <PxInput v-model="authForm.username" :placeholder="t('username')" clearable />
              <PxInput v-model="authForm.password" :placeholder="t('password')" type="password" />
              <PxInput v-if="authMode === 'register'" v-model="authForm.displayName" :placeholder="t('displayName')" clearable />
              <PxButton type="primary" size="small" @click="onAuthSubmit">
                <LogIn :size="14" />
                {{ authMode === 'register' ? t('register') : t('login') }}
              </PxButton>
            </div>
          </div>
          <div class="mobile-section mobile-tools">
            <p class="mobile-section-title">{{ copy('设置', 'Settings') }}</p>
            <div class="mobile-theme">
              <ThemeSwitcher :locale="locale" />
            </div>
            <label class="mobile-lang">
              <Languages :size="14" />
              <span>{{ t('language') }}</span>
              <select v-model="locale" @change="changeLocale">
                <option v-for="item in options.supportedLocales" :key="item.key" :value="item.key">
                  {{ translatedLocaleLabel(item.key, item.label) }}
                </option>
              </select>
            </label>
          </div>
          <div v-if="stats" class="mobile-stats">
            <div><strong>{{ stats.totalRecords }}</strong><span>{{ t('total') }}</span></div>
            <div><strong>{{ stats.todayRecords }}</strong><span>{{ t('today') }}</span></div>
            <div><strong>{{ stats.topScore }}</strong><span>{{ t('top') }}</span></div>
          </div>
        </div>
      </transition>

      <div v-if="stats" class="top-stats" aria-hidden="true">
        <span><Hash :size="12" />{{ t('total') }} <strong>{{ stats.totalRecords }}</strong></span>
        <span><Hash :size="12" />{{ t('today') }} <strong>{{ stats.todayRecords }}</strong></span>
        <span><Hash :size="12" />{{ t('top') }} <strong>{{ stats.topScore }}</strong></span>
      </div>
    </header>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
