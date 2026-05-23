import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import ResultPage from '../pages/ResultPage.vue';
import LeaderboardPage from '../pages/LeaderboardPage.vue';
import ProfilePage from '../pages/ProfilePage.vue';
import ProtectionPage from '../pages/ProtectionPage.vue';
import CommunityPage from '../pages/CommunityPage.vue';
import TopicDetailPage from '../pages/TopicDetailPage.vue';
import GuildsPage from '../pages/GuildsPage.vue';
import GuildDetailPage from '../pages/GuildDetailPage.vue';
import CirclesPage from '../pages/CirclesPage.vue';
import CircleDetailPage from '../pages/CircleDetailPage.vue';
import GroupsPage from '../pages/GroupsPage.vue';
import GroupDetailPage from '../pages/GroupDetailPage.vue';
import WalletPage from '../pages/WalletPage.vue';
import NotFoundPage from '../pages/NotFoundPage.vue';
import { fetchAdminMe } from '../services/adminApi';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/community' },
  { path: '/submit', name: 'home', component: HomePage, meta: { section: 'submit' } },
  { path: '/result', name: 'result', component: ResultPage, meta: { section: 'result' } },
  { path: '/leaderboard', name: 'leaderboard', component: LeaderboardPage, meta: { section: 'leaderboard' } },
  { path: '/profile', name: 'profile', component: ProfilePage, meta: { section: 'profile' } },
  { path: '/users/:username', name: 'user-profile', component: () => import('../pages/UserProfilePage.vue'), meta: { section: 'profile' } },
  { path: '/profile/wallet', name: 'wallet', component: WalletPage, meta: { section: 'wallet' } },
  { path: '/protection', name: 'protection', component: ProtectionPage, meta: { section: 'safety' } },
  { path: '/community', name: 'community', component: CommunityPage, meta: { section: 'community' } },
  { path: '/records/:id', name: 'record-share', component: () => import('../pages/RecordSharePage.vue'), meta: { section: 'community' } },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('../pages/NotificationsPage.vue'),
    meta: { section: 'notifications', requiresAuth: true }
  },
  { path: '/topics/:slug', name: 'topic-detail', component: TopicDetailPage, meta: { section: 'community' } },
  { path: '/guilds', name: 'guilds', component: GuildsPage, meta: { section: 'guilds' } },
  { path: '/guilds/:id', name: 'guild-detail', component: GuildDetailPage, meta: { section: 'guilds' } },
  { path: '/circles', name: 'circles', component: CirclesPage, meta: { section: 'circles' } },
  { path: '/circles/:id', name: 'circle-detail', component: CircleDetailPage, meta: { section: 'circles' } },
  { path: '/groups', name: 'groups', component: GroupsPage, meta: { section: 'groups' } },
  { path: '/groups/:id', name: 'group-detail', component: GroupDetailPage, meta: { section: 'groups' } },
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
  { path: '/404', name: 'not-found', component: NotFoundPage, meta: { section: 'not-found' } },
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

router.beforeEach(async (to) => {
  const legacyKey = to.hash.replace(/^#\/?/, '');
  const path = legacyHashRoutes[legacyKey];
  if (path) {
    return { path, replace: true };
  }
  if (to.meta.requiresAdmin) {
    try {
      await fetchAdminMe();
    } catch {
      return { path: '/admin/login', query: { redirect: to.fullPath } };
    }
  }
  if (to.path === '/admin/login') {
    try {
      await fetchAdminMe();
      return { path: '/admin/dashboard' };
    } catch {
      return true;
    }
  }
  if (to.meta.requiresAuth && !localStorage.getItem('gongwei-yuwang-token')) {
    return { path: '/', replace: true };
  }
  return true;
});

export default router;
