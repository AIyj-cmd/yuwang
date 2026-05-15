import { ref } from 'vue';
import type { NotificationItem } from '../types';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationApi';

export const useNotifications = (getToken: () => string | null | undefined, onChanged?: () => Promise<void> | void) => {
  const notifications = ref<NotificationItem[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const loading = ref(false);
  const error = ref('');

  const loadNotifications = async (nextPage = page.value) => {
    const token = getToken();
    if (!token) {
      notifications.value = [];
      total.value = 0;
      return;
    }
    loading.value = true;
    error.value = '';
    try {
      const response = await fetchNotifications(token, nextPage, pageSize.value);
      notifications.value = response.notifications;
      total.value = response.total;
      page.value = response.page;
      pageSize.value = response.pageSize;
    } catch (err) {
      notifications.value = [];
      total.value = 0;
      error.value = err instanceof Error ? err.message : '通知加载失败。';
    } finally {
      loading.value = false;
    }
  };

  const markRead = async (id: number) => {
    const token = getToken();
    if (!token) return;
    await markNotificationRead(token, id);
    await loadNotifications(page.value);
    await onChanged?.();
  };

  const markAllRead = async () => {
    const token = getToken();
    if (!token) return;
    await markAllNotificationsRead(token);
    await loadNotifications(page.value);
    await onChanged?.();
  };

  return {
    notifications,
    total,
    page,
    pageSize,
    loading,
    error,
    loadNotifications,
    markRead,
    markAllRead
  };
};
