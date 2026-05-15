import type { NotificationsResponse, NotificationUnreadCountResponse } from '../types';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : '请求失败';
    throw new Error(message);
  }
  return data as T;
};

const authHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

export const fetchNotifications = async (token: string, page = 1, pageSize = 20): Promise<NotificationsResponse> => {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return parseResponse<NotificationsResponse>(await fetch(`/api/notifications?${query.toString()}`, { headers: authHeaders(token) }));
};

export const fetchNotificationUnreadCount = async (token: string): Promise<NotificationUnreadCountResponse> => {
  return parseResponse<NotificationUnreadCountResponse>(await fetch('/api/notifications/unread-count', { headers: authHeaders(token) }));
};

export const markNotificationRead = async (token: string, id: number): Promise<{ ok: boolean }> => {
  return parseResponse<{ ok: boolean }>(
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: authHeaders(token),
      body: '{}'
    })
  );
};

export const markAllNotificationsRead = async (token: string): Promise<{ ok: boolean }> => {
  return parseResponse<{ ok: boolean }>(
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: authHeaders(token),
      body: '{}'
    })
  );
};
