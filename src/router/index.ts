import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { fetchAdminMe } from '../services/adminApi';
import { fetchMe } from '../api';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/community' },
  { path: '/submit', name: 'home', component: () => import('../pages/HomePage.vue'), meta: { section: 'submit' } },
  { path: '/result', name: 'result', component: () => import('../pages/ResultPage.vue'), meta: { section: 'result' } },
  { path: '/leaderboard', name: 'leaderboard', component: () => import('../pages/LeaderboardPage.vue'), meta: { section: 'leaderboard' } },
  { path: '/profile', name: 'profile', component: () => import('../pages/ProfilePage.vue'), meta: { section: 'profile' } },
  { path: '/users/:username', name: 'user-profile', component: () => import('../pages/UserProfilePage.vue'), meta: { section: 'profile' } },
  { path: '/profile/wallet', name: 'wallet', component: () => import('../pages/WalletPage.vue'), meta: { section: 'wallet' } },
  { path: '/protection', name: 'protection', component: () => import('../pages/ProtectionPage.vue'), meta: { section: 'safety' } },
  { path: '/community', name: 'community', component: () => import('../pages/CommunityPage.vue'), meta: { section: 'community' } },
  { path: '/records/:id', name: 'record-share', component: () => import('../pages/RecordSharePage.vue'), meta: { section: 'community' } },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('../pages/NotificationsPage.vue'),
    meta: { section: 'notifications', requiresAuth: true }
  },
  { path: '/topics/:slug', name: 'topic-detail', component: () => import('../pages/TopicDetailPage.vue'), meta: { section: 'community' } },
  { path: '/guilds', name: 'guilds', component: () => import('../pages/GuildsPage.vue'), meta: { section: 'guilds' } },
  { path: '/guilds/:id', name: 'guild-detail', component: () => import('../pages/GuildDetailPage.vue'), meta: { section: 'guilds' } },
  {
    path: '/my-guild',
    name: 'my-guild',
    component: () => import('../pages/MyGuildPage.vue'),
    meta: { section: 'guilds', requiresAuth: true }
  },
  { path: '/circles', name: 'circles', component: () => import('../pages/CirclesPage.vue'), meta: { section: 'circles' } },
  { path: '/circles/:id', name: 'circle-detail', component: () => import('../pages/CircleDetailPage.vue'), meta: { section: 'circles' } },
  { path: '/groups', name: 'groups', component: () => import('../pages/GroupsPage.vue'), meta: { section: 'groups' } },
  { path: '/groups/:id', name: 'group-detail', component: () => import('../pages/GroupDetailPage.vue'), meta: { section: 'groups' } },
  { path: '/about', name: 'about', component: () => import('../pages/AboutPage.vue'), meta: { section: 'about' } },
  { path: '/feedback', name: 'feedback', component: () => import('../pages/FeedbackPage.vue'), meta: { section: 'feedback' } },
  { path: '/announcements', name: 'announcements', component: () => import('../pages/AnnouncementsPage.vue'), meta: { section: 'announcements' } },
  { path: '/checkin', name: 'checkin', component: () => import('../pages/CheckinPage.vue'), meta: { section: 'checkin' } },
  { path: '/admin/login', name: 'admin-login', component: () => import('../admin/AdminLoginPage.vue'), meta: { adminPublic: true, adminStandalone: true } },
  {
    path: '/admin',
    component: () => import('../admin/AdminLayout.vue'),
    redirect: '/admin/dashboard',
    meta: { requiresAdmin: true, adminStandalone: true },
    children: [
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('../admin/AdminDashboardPage.vue') },
      { path: 'records', name: 'admin-records', component: () => import('../admin/AdminRecordsPage.vue') },
      { path: 'records/:id', name: 'admin-record-detail', component: () => import('../admin/AdminRecordDetailPage.vue') },
      { path: 'reports', name: 'admin-reports', component: () => import('../admin/AdminReportsPage.vue') },
      { path: 'comments', name: 'admin-comments', component: () => import('../admin/AdminCommentsPage.vue') },
      { path: 'users', name: 'admin-users', component: () => import('../admin/AdminUsersPage.vue') },
      { path: 'wallets', name: 'admin-wallets', component: () => import('../admin/AdminWalletsPage.vue') },
      { path: 'transactions', name: 'admin-transactions', component: () => import('../admin/AdminTransactionsPage.vue') },
      { path: 'topics', name: 'admin-topics', component: () => import('../admin/AdminTopicsPage.vue') },
      { path: 'guilds', name: 'admin-guilds', component: () => import('../admin/AdminGuildsPage.vue') },
      { path: 'circles', name: 'admin-circles', component: () => import('../admin/AdminCirclesPage.vue') },
      { path: 'groups', name: 'admin-groups', component: () => import('../admin/AdminGroupsPage.vue') },
      { path: 'safety', name: 'admin-safety', component: () => import('../admin/AdminSafetyPage.vue') },
      { path: 'ai-prompts', name: 'admin-ai-prompts', component: () => import('../admin/AdminAiPromptsPage.vue') },
      { path: 'settings', name: 'admin-settings', component: () => import('../admin/AdminSettingsPage.vue') },
      { path: 'audit-logs', name: 'admin-audit-logs', component: () => import('../admin/AdminAuditLogsPage.vue') }
    ]
  },
  { path: '/404', name: 'not-found', component: () => import('../pages/NotFoundPage.vue'), meta: { section: 'not-found' } },
  { path: '/:pathMatch(.*)*', redirect: '/404' }
];

const legacyHashRoutes: Record<string, string> = {
  submit: '/submit',
  result: '/result',
  leaderboard: '/leaderboard',
  profile: '/profile',
  wallet: '/profile/wallet',
  protection: '/protection',
  safety: '/protection',
  community: '/community',
  notifications: '/notifications',
  guilds: '/guilds',
  circles: '/circles',
  groups: '/groups'
};

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

/* ------------------------------------------------------------------
 * Admin auth promise cache — avoids duplicate fetchAdminMe() calls
 * when parent /admin redirect triggers a second navigation.
 * ------------------------------------------------------------------ */
let adminAuthPromise: Promise<boolean> | null = null;
let adminAuthExpiresAt = 0;
const ADMIN_AUTH_TTL_MS = 5000;

const verifyAdminAuth = async (): Promise<boolean> => {
  const now = Date.now();
  if (adminAuthPromise && now < adminAuthExpiresAt) {
    return adminAuthPromise;
  }
  adminAuthExpiresAt = now + ADMIN_AUTH_TTL_MS;
  adminAuthPromise = fetchAdminMe()
    .then(() => true)
    .catch(() => false);
  return adminAuthPromise;
};

/* ------------------------------------------------------------------
 * User auth promise cache — light validation for requiresAuth routes.
 * ------------------------------------------------------------------ */
let userAuthPromise: Promise<boolean> | null = null;
let userAuthExpiresAt = 0;
const USER_AUTH_TTL_MS = 30000;

const verifyUserAuth = async (): Promise<boolean> => {
  const token = localStorage.getItem('gongwei-yuwang-token');
  if (!token) return false;

  const now = Date.now();
  if (userAuthPromise && now < userAuthExpiresAt) {
    return userAuthPromise;
  }

  userAuthExpiresAt = now + USER_AUTH_TTL_MS;
  userAuthPromise = fetchMe(token)
    .then(() => true)
    .catch(() => {
      localStorage.removeItem('gongwei-yuwang-token');
      return false;
    });

  return userAuthPromise;
};

router.beforeEach(async (to) => {
  const legacyKey = to.hash.replace(/^#\/?/, '');
  const path = legacyHashRoutes[legacyKey];
  if (path) {
    return { path, replace: true };
  }

  if (to.meta.requiresAdmin) {
    const ok = await verifyAdminAuth();
    if (!ok) {
      return { path: '/admin/login', query: { redirect: to.fullPath } };
    }
  }

  if (to.path === '/admin/login') {
    const ok = await verifyAdminAuth();
    if (ok) {
      return { path: '/admin/dashboard' };
    }
    return true;
  }

  if (to.meta.requiresAuth) {
    const ok = await verifyUserAuth();
    if (!ok) {
      return { path: '/', replace: true };
    }
  }

  return true;
});

export default router;
