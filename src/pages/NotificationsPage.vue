<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle, Bell, CheckCheck, ExternalLink } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
import { useAppContext } from '../appContext';
import { useNotifications } from '../composables/useNotifications';
import type { NotificationItem } from '../types';

const router = useRouter();
const {
  authToken,
  copy,
  currentUser,
  notificationUnreadCount,
  openProfileRecord,
  refreshNotificationUnreadCount,
  t,
  announcements,
  loadAnnouncements,
  translatedAnnouncement
} = useAppContext();

const { notifications, total, loading, error, loadNotifications, markRead, markAllRead } = useNotifications(
  () => authToken.value,
  refreshNotificationUnreadCount
);

const unreadCount = computed(() => Number(notificationUnreadCount?.value ?? 0));

const targetText = (item: NotificationItem) => {
  if (item.targetType === 'record') return copy('\u67e5\u770b\u8bb0\u5f55', 'View record');
  if (item.targetType === 'wallet_transaction') return copy('\u67e5\u770b\u9322\u5305', 'View wallet');
  if (item.targetType === 'group') return copy('\u67e5\u770b\u5c0f\u7ec4', 'View group');
  return copy('\u67e5\u770b\u76f8\u5173\u5185\u5bb9', 'View target');
};

const openTarget = async (item: NotificationItem) => {
  if (!item.isRead) await markRead(item.id);
  if (item.targetType === 'record' && item.targetId) {
    await openProfileRecord(item.targetId);
    return;
  }
  if (item.targetType === 'wallet_transaction') {
    await router.push('/profile/wallet');
    return;
  }
  if (item.targetType === 'group' && item.targetId) {
    await router.push(`/groups/${item.targetId}`);
  }
};

onMounted(() => {
  void loadNotifications();
  void loadAnnouncements();
});
</script>
<template>
  <section class="workspace single-view notifications-page">
    <aside class="right-rail">
      <PxCard class="panel notifications-panel">
        <template #header>
          <div class="panel-title between">
            <span><Bell :size="18" /> {{ copy('通知中心', 'Notifications') }}</span>
            <button v-if="currentUser && unreadCount > 0" class="profile-toggle-button" type="button" @click="markAllRead">
              <CheckCheck :size="14" /> {{ copy('全部已读', 'Mark all read') }}
            </button>
          </div>
        </template>

        <div v-if="!currentUser" class="empty-list">{{ t('needLogin') }}</div>
        <template v-else>
          <div class="module-intro">
            <strong>{{ copy(`还有 ${unreadCount} 条未读`, `${unreadCount} unread`) }}</strong>
            <span>{{ copy('站内通知只记录互动、鱼鳞、审核和小组目标，不会发送邮件、短信或浏览器推送。', 'In-app notifications only cover interactions, Fish Scale, reviews, and group goals. No email, SMS, or Web Push.') }}</span>
          </div>

          <div v-if="loading" class="loading-line">{{ copy('通知加载中...', 'Loading notifications...') }}</div>
          <p v-else-if="error" class="error-line">{{ error }}</p>
          <div v-else-if="notifications.length" class="notification-list">
            <article v-for="item in notifications" :key="item.id" class="notification-card" :class="{ unread: !item.isRead }">
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.body }}</span>
                <small>{{ new Date(item.createdAt).toLocaleString() }} · {{ item.isRead ? copy('已读', 'Read') : copy('未读', 'Unread') }}</small>
              </div>
              <div class="notification-actions">
                <button v-if="!item.isRead" type="button" @click="markRead(item.id)">{{ copy('标记已读', 'Mark read') }}</button>
                <button v-if="item.targetType && item.targetId !== null" type="button" @click="openTarget(item)">
                  <ExternalLink :size="14" /> {{ targetText(item) }}
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty-list">{{ copy('暂无通知，鱼塘风平浪静。', 'No notifications yet. The pond is calm.') }}</div>
          <p v-if="total > notifications.length" class="scope-note">{{ copy('第一版每次展示最近 20 条通知。', 'The first version shows the latest 20 notifications.') }}</p>
        </template>
      </PxCard>
    </aside>

    <!-- 公告集合在通知中心 -->
    <aside class="right-rail">
      <PxCard class="panel announcements-panel">
        <template #header>
          <div class="panel-title between">
            <span><AlertTriangle :size="18" /> {{ t('announcements') }}</span>
            <button class="profile-toggle-button" type="button" @click="loadAnnouncements">{{ copy('刷新公告', 'Refresh') }}</button>
          </div>
        </template>
        <div v-if="announcements.length" class="announcement-list">
          <article v-for="item in announcements" :key="item.id" class="module-section announcement-item">
            <div class="profile-section-head">
              <strong>{{ translatedAnnouncement(item).title }}</strong>
              <small>{{ item.createdAt }} · {{ item.level }}</small>
            </div>
            <p class="module-copy">{{ translatedAnnouncement(item).body }}</p>
          </article>
        </div>
        <div v-else class="empty-list">{{ copy('暂时没有公告，鱼塘风平浪静。', 'No announcements for now. The pond is calm.') }}</div>
      </PxCard>
    </aside>
  </section>
</template>
