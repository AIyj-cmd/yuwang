<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardCheck,
  Coins,
  Crown,
  Globe,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Send,
  Sparkles,
  Star,
  User,
  X
} from 'lucide-vue-next';
import UserAvatar from '../UserAvatar.vue';
import { PxButton, PxInput } from '@mmt817/pixel-ui';
import ThemeSwitcher from '../ThemeSwitcher.vue';
import { useAppContext } from '../../appContext';

const route = useRoute();
const router = useRouter();

const {
  activeSection,
  authForm,
  authMode,
  authPanelOpen,
  changeLocale,
  currentUser,
  handleAuth,
  locale,
  logout,
  notificationUnreadCount,
  options,
  pendingReviewCount,
  stats,
  t,
  copy,
  translatedLocaleLabel
} = useAppContext();

const authPanelOpenRef = authPanelOpen as import('vue').Ref<boolean>;

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

type NavItem = {
  id: string;
  icon: typeof Send;
  zh: string;
  en: string;
};

const primaryNavItems: readonly NavItem[] = [
  { id: 'community', icon: MessageCircle, zh: '社区', en: 'Feed' },
  { id: 'guilds', icon: Crown, zh: '工会', en: 'Guilds' },
  { id: 'circles', icon: Star, zh: '圈子', en: 'Circles' },
  { id: 'groups', icon: User, zh: '小组', en: 'Groups' },
  { id: 'leaderboard', icon: BarChart3, zh: '排行', en: 'Ranks' },
  { id: 'about', icon: BadgeCheck, zh: '关于我们', en: 'About' }
] as const;

const moreNavItems: readonly NavItem[] = [] as const;

const moreSectionIds = new Set<string>(moreNavItems.map((item) => item.id));
const isMoreActive = computed(() => moreSectionIds.has(activeSection.value));

const navLabel = (item: NavItem) => (locale.value === 'en-US' ? item.en : item.zh);

const mobileMenuOpen = ref(false);
const moreMenuOpen = ref(false);
const accountMenuOpen = ref(false);
const topNavRef = ref<HTMLElement | null>(null);

/* 账户面板本地状态：仅承载“这一次”登录/注册操作的反馈，
   不直接渲染全局 errorMessage/statusMessage，避免跨页消息残留。 */
const authError = ref('');
const authPending = ref(false);

const clearAuthFeedback = () => {
  authError.value = '';
  authPending.value = false;
};

const closeMenus = () => {
  mobileMenuOpen.value = false;
  moreMenuOpen.value = false;
  accountMenuOpen.value = false;
};

const navigateTo = (id: string) => {
  closeMenus();
  void router.push(sectionRouteMap[id] ?? '/');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleLogout = () => {
  closeMenus();
  logout();
};

const onAuthSubmit = async () => {
  if (authPending.value) return; // 防止重复提交
  authError.value = '';
  authPending.value = true;
  try {
    const result = await handleAuth();
    if (result.success) {
      closeMenus();
    } else {
      authError.value = result.message;
    }
  } finally {
    authPending.value = false;
  }
};

watch(activeSection, () => {
  closeMenus();
});

/* 统一入口：其他页面通过 openAuthPanel('login') 把信号置 true，
   这里负责打开账户面板并复位信号，默认停在登录态。 */
watch(authPanelOpenRef, (open) => {
  if (!open) return;
  mobileMenuOpen.value = false;
  moreMenuOpen.value = false;
  accountMenuOpen.value = true;
  clearAuthFeedback();
  authPanelOpenRef.value = false;
});

/* 打开账户面板（桌面下拉或移动菜单）时清空上一次的错误/挂起状态，
   保证不展示遗留消息。 */
watch([accountMenuOpen, mobileMenuOpen], ([account, mobile]) => {
  if (account || mobile) {
    clearAuthFeedback();
  }
});

/* 切换登录/注册 tab 时清空错误，避免注册错误泄漏到登录 tab，反之亦然。 */
watch(authMode, () => {
  authError.value = '';
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
        @click="navigateTo('community')"
      >
        <span class="brand-mark" aria-hidden="true">{{ copy('鱼', 'Y') }}</span>
        <span class="brand-name">{{ copy('工位鱼王', 'Yuwang') }}</span>
      </button>

      <nav class="primary-nav" :aria-label="copy('主导航', 'Primary navigation')">
        <button
          v-for="item in primaryNavItems"
          :key="`primary-${item.id}`"
          type="button"
          class="nav-link"
          :class="{ active: activeSection === item.id }"
          @click="navigateTo(item.id)"
        >
          <component :is="item.icon" :size="14" />
          <span>{{ navLabel(item) }}</span>
        </button>

        <div v-if="moreNavItems.length > 0 || currentUser?.isAdmin" class="more-wrap" :class="{ open: moreMenuOpen }">
          <button
            type="button"
            class="nav-link more-trigger"
            :class="{ active: isMoreActive }"
            :aria-expanded="moreMenuOpen"
            aria-haspopup="menu"
            @click.stop="moreMenuOpen = !moreMenuOpen"
          >
            <Sparkles :size="14" />
            <span>{{ copy('更多', 'More') }}</span>
            <ChevronDown :size="12" />
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
              <span>{{ navLabel(item) }}</span>
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

        <div class="account-wrap" :class="{ open: accountMenuOpen }">
          <button
            type="button"
            class="account-trigger"
            :aria-expanded="accountMenuOpen"
            aria-haspopup="menu"
            :title="currentUser ? currentUser.displayName : copy('登录 / 注册', 'Sign In')"
            @click.stop="accountMenuOpen = !accountMenuOpen"
          >
            <UserAvatar
              v-if="currentUser"
              :avatar-url="currentUser.avatarUrl"
              :avatar-seed="currentUser.avatarSeed"
              :display-name="currentUser.displayName"
              :size="28"
            />
            <span v-else class="account-avatar-mini" aria-hidden="true">{{ copy('登', 'IN') }}</span>
            <span class="account-name">
              {{ currentUser ? currentUser.displayName : copy('登录', 'Sign In') }}
            </span>
            <ChevronDown :size="12" />
          </button>

          <div v-if="accountMenuOpen" class="dropdown-panel account-panel" role="menu">
            <template v-if="currentUser">
              <div class="account-summary">
                <UserAvatar
                  :avatar-url="currentUser.avatarUrl"
                  :avatar-seed="currentUser.avatarSeed"
                  :display-name="currentUser.displayName"
                  :size="36"
                />
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
              <button v-if="currentUser?.isAdmin" type="button" class="dropdown-item admin-item" :class="{ active: activeSection === 'admin' }" role="menuitem" @click="navigateTo('admin')">
                <ClipboardCheck :size="15" />
                <span>{{ copy('待审审核', 'Review Queue') }}</span>
                <em v-if="pendingReviewCount > 0">{{ pendingReviewCount }}</em>
              </button>

              <div class="dropdown-divider" />

              <label class="dropdown-lang">
                <Globe :size="14" />
                <span>{{ t('language') }}</span>
                <select v-model="locale" @change="changeLocale">
                  <option v-for="item in options.supportedLocales" :key="item.key" :value="item.key">
                    {{ translatedLocaleLabel(item.key, item.label) }}
                  </option>
                </select>
              </label>

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
                <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
                <PxButton type="primary" size="small" :loading="authPending" :disabled="authPending" @click="onAuthSubmit">
                  <LogIn :size="14" />
                  {{ authPending
                    ? (authMode === 'register' ? copy('注册中…', 'Signing up…') : copy('登录中…', 'Signing in…'))
                    : (authMode === 'register' ? t('register') : t('login')) }}
                </PxButton>

                <div class="dropdown-divider" />

                <label class="dropdown-lang">
                  <Globe :size="14" />
                  <span>{{ t('language') }}</span>
                  <select v-model="locale" @change="changeLocale">
                    <option v-for="item in options.supportedLocales" :key="item.key" :value="item.key">
                      {{ translatedLocaleLabel(item.key, item.label) }}
                    </option>
                  </select>
                </label>
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
            <span>{{ navLabel(item) }}</span>
          </button>
        </div>
        <div v-if="moreNavItems.length > 0 || currentUser?.isAdmin" class="mobile-section">
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
            <span>{{ navLabel(item) }}</span>
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
            <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
            <PxButton type="primary" size="small" :loading="authPending" :disabled="authPending" @click="onAuthSubmit">
              <LogIn :size="14" />
              {{ authPending
                ? (authMode === 'register' ? copy('注册中…', 'Signing up…') : copy('登录中…', 'Signing in…'))
                : (authMode === 'register' ? t('register') : t('login')) }}
            </PxButton>
          </div>
        </div>
        <div class="mobile-section mobile-tools">
          <p class="mobile-section-title">{{ copy('设置', 'Settings') }}</p>
          <div class="mobile-theme">
            <ThemeSwitcher :locale="locale" />
          </div>
          <label class="mobile-lang">
            <Globe :size="14" />
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
  </header>
</template>
