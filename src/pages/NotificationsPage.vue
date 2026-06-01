<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  Coins,
  ExternalLink,
  Heart,
  MessageCircle,
  ShieldAlert,
  Star,
  Trophy
} from 'lucide-vue-next';
import { PxButton, PxCard, PxTag } from '@mmt817/pixel-ui';
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

const typeIcon = (type: string) => {
  if (type === 'record_like') return Heart;
  if (type === 'record_comment') return MessageCircle;
  if (type === 'record_legend') return Star;
  if (type === 'wallet_reward') return Coins;
  if (type === 'record_review') return ShieldAlert;
  if (type === 'group_goal_completed') return Trophy;
  return Bell;
};

const typeLabel = (type: string) => {
  if (type === 'record_like') return copy('点赞', 'Like');
  if (type === 'record_comment') return copy('评论', 'Comment');
  if (type === 'record_legend') return copy('传奇', 'Legend');
  if (type === 'wallet_reward') return copy('奖励', 'Reward');
  if (type === 'record_review') return copy('审核', 'Review');
  if (type === 'group_goal_completed') return copy('目标', 'Goal');
  return copy('系统', 'System');
};

const levelTagType = (level: string): 'warning' | 'danger' | 'info' | 'primary' => {
  if (level === 'critical' || level === 'urgent') return 'danger';
  if (level === 'warning') return 'warning';
  if (level === 'info') return 'info';
  return 'primary';
};

const formatTime = (raw: string) => {
  try {
    return new Date(raw).toLocaleString();
  } catch {
    return raw;
  }
};

const targetText = (item: NotificationItem) => {
  if (item.targetType === 'record') return copy('查看记录', 'View record');
  if (item.targetType === 'wallet_transaction') return copy('查看钱包', 'View wallet');
  if (item.targetType === 'group') return copy('查看小组', 'View group');
  return copy('查看相关内容', 'View target');
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
  <section class="workspace notifications-page">
    <!-- 左侧：通知列表 -->
    <aside class="left-rail">
      <PxCard class="panel notifications-panel">
        <template #header>
          <div class="panel-title between">
            <span><Bell :size="18" /> {{ copy('通知中心', 'Notifications') }}</span>
            <PxButton
              v-if="currentUser && unreadCount > 0"
              type="primary"
              size="small"
              @click="markAllRead"
            >
              <CheckCheck :size="14" />
              {{ copy('全部已读', 'Mark all read') }}
            </PxButton>
          </div>
        </template>

        <div v-if="!currentUser" class="empty-list">{{ t('needLogin') }}</div>
        <template v-else>
          <!-- 像素统计面板 -->
          <div class="pixel-stats-bar">
            <div class="pixel-stat">
              <span class="pixel-stat-number">{{ unreadCount }}</span>
              <span class="pixel-stat-label">{{ copy('未读', 'Unread') }}</span>
            </div>
            <div class="pixel-stat">
              <span class="pixel-stat-number">{{ notifications.length }}</span>
              <span class="pixel-stat-label">{{ copy('本页', 'Page') }}</span>
            </div>
            <div class="pixel-stat">
              <span class="pixel-stat-number">{{ total }}</span>
              <span class="pixel-stat-label">{{ copy('总计', 'Total') }}</span>
            </div>
          </div>

          <div class="module-intro">
            <strong>{{ copy(`站内通知只记录互动、鱼鳞、审核和小组目标。`, 'In-app notifications only.') }}</strong>
            <span>{{ copy('不会发送邮件、短信或浏览器推送。', 'No email, SMS, or Web Push.') }}</span>
          </div>

          <div v-if="loading" class="loading-line">{{ copy('通知加载中...', 'Loading notifications...') }}</div>
          <p v-else-if="error" class="error-line">{{ error }}</p>

          <div v-else-if="notifications.length" class="notification-list">
            <article
              v-for="item in notifications"
              :key="item.id"
              class="notification-card"
              :class="{ unread: !item.isRead }"
            >
              <div class="notification-icon" :class="`type-${item.type}`">
                <component :is="typeIcon(item.type)" :size="16" />
              </div>
              <div class="notification-main">
                <div class="notification-head">
                  <strong>{{ item.title }}</strong>
                  <PxTag v-if="!item.isRead" type="danger" size="small" effect="plain">
                    {{ copy('未读', 'Unread') }}
                  </PxTag>
                  <PxTag v-else type="info" size="small" effect="plain">
                    {{ copy('已读', 'Read') }}
                  </PxTag>
                </div>
                <span class="notification-body-text">{{ item.body }}</span>
                <div class="notification-meta-row">
                  <small>{{ formatTime(item.createdAt) }}</small>
                  <span class="notification-type-label">{{ typeLabel(item.type) }}</span>
                </div>
              </div>
              <div class="notification-actions">
                <PxButton
                  v-if="!item.isRead"
                  type="base"
                  size="small"
                  plain
                  @click="markRead(item.id)"
                >
                  <CheckCheck :size="12" />
                  {{ copy('已读', 'Read') }}
                </PxButton>
                <PxButton
                  v-if="item.targetType && item.targetId !== null"
                  type="primary"
                  size="small"
                  plain
                  @click="openTarget(item)"
                >
                  <ExternalLink :size="12" />
                  {{ targetText(item) }}
                </PxButton>
              </div>
            </article>
          </div>

          <div v-else class="empty-list">
            {{ copy('暂无通知，鱼塘风平浪静。', 'No notifications yet. The pond is calm.') }}
          </div>

          <p v-if="total > notifications.length" class="scope-note">
            {{ copy('每次展示最近 20 条通知。', 'Showing the latest 20 notifications.') }}
          </p>
        </template>
      </PxCard>
    </aside>

    <!-- 右侧：公告集合 -->
    <aside class="right-rail">
      <PxCard class="panel announcements-panel">
        <template #header>
          <div class="panel-title between">
            <span><AlertTriangle :size="18" /> {{ t('announcements') }}</span>
            <PxButton type="base" size="small" plain @click="loadAnnouncements">
              {{ copy('刷新公告', 'Refresh') }}
            </PxButton>
          </div>
        </template>

        <div v-if="announcements.length" class="announcement-list">
          <article v-for="item in announcements" :key="item.id" class="announcement-card">
            <div class="announcement-head">
              <strong>{{ translatedAnnouncement(item).title }}</strong>
              <PxTag :type="levelTagType(item.level)" size="small" effect="plain">
                {{ item.level }}
              </PxTag>
            </div>
            <p class="announcement-body">{{ translatedAnnouncement(item).body }}</p>
            <small class="announcement-time">{{ item.createdAt }}</small>
          </article>
        </div>
        <div v-else class="empty-list">
          {{ copy('暂时没有公告，鱼塘风平浪静。', 'No announcements for now. The pond is calm.') }}
        </div>
      </PxCard>
    </aside>
  </section>
</template>
