import type {
  AdminAuditLog,
  AdminAiPrompt,
  AdminAiPromptTestResponse,
  AdminComment,
  AdminDashboardResponse,
  AdminEntity,
  AdminFishScaleTransaction,
  AdminListResponse,
  AdminRecord,
  AdminReport,
  AdminSafetyResponse,
  AdminSensitiveWord,
  AdminSettings,
  AdminTopic,
  AdminUserRow,
  AdminWalletRow,
  AdminUserSession
} from '../types/admin';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : '请求失败';
    throw new Error(message);
  }
  return data as T;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.toString();
};

const requestJson = async <T>(url: string, options: RequestInit = {}): Promise<T> =>
  parseResponse<T>(
    await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    })
  );

export const adminLogin = (payload: { username: string; password: string }) =>
  requestJson<{ user: AdminUserSession }>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const adminLogout = () => requestJson<{ ok: boolean }>('/api/admin/auth/logout', { method: 'POST' });

export const fetchAdminMe = () => requestJson<{ user: AdminUserSession; expiresAt: string }>('/api/admin/auth/me');

export const fetchAdminDashboard = () => requestJson<AdminDashboardResponse>('/api/admin/dashboard/summary');

export const fetchAdminRecords = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminRecord, 'records'>>(`/api/admin/records?${buildQuery(params)}`);

export const fetchAdminRecord = (id: number) =>
  requestJson<{
    record: AdminRecord;
    reports: AdminReport[];
    comments: AdminComment[];
    guild: unknown;
    circles: unknown[];
    topics: AdminTopic[];
    groups: unknown[];
    auditLogs: AdminAuditLog[];
  }>(`/api/admin/records/${id}`);

export const updateAdminRecordStatus = (id: number, payload: { action: string; reviewNote?: string; hiddenReason?: string }) =>
  requestJson<{ record: AdminRecord }>(`/api/admin/records/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const updateAdminRecord = (id: number, payload: Record<string, unknown>) =>
  requestJson<{ record: AdminRecord }>(`/api/admin/records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const updateAdminRecordLegend = (id: number, selected: boolean) =>
  requestJson<{ record: AdminRecord }>(`/api/admin/records/${id}/legend`, {
    method: 'PATCH',
    body: JSON.stringify({ selected })
  });

export const deleteAdminRecord = (id: number) => requestJson<{ ok: boolean }>(`/api/admin/records/${id}`, { method: 'DELETE' });

export const fetchAdminReports = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminReport, 'reports'>>(`/api/admin/reports?${buildQuery(params)}`);

export const updateAdminReportStatus = (id: number, payload: { status: string; adminNote?: string; hideTarget?: boolean }) =>
  requestJson<{ report: AdminReport }>(`/api/admin/reports/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const fetchAdminComments = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminComment, 'comments'>>(`/api/admin/comments?${buildQuery(params)}`);

export const updateAdminCommentStatus = (id: number, payload: { action: string; reviewNote?: string }) =>
  requestJson<{ comment: AdminComment }>(`/api/admin/comments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const deleteAdminComment = (id: number) => requestJson<{ ok: boolean }>(`/api/admin/comments/${id}`, { method: 'DELETE' });

export const fetchAdminTopics = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminTopic, 'topics'>>(`/api/admin/topics?${buildQuery(params)}`);

export const fetchAdminTopicRecords = (id: number) =>
  requestJson<{ topic: AdminTopic; records: AdminRecord[] }>(`/api/admin/topics/${id}/records`);

export const updateAdminTopic = (id: number, payload: { name: string }) =>
  requestJson<{ topic: AdminTopic }>(`/api/admin/topics/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const updateAdminTopicStatus = (id: number, status: 'active' | 'hidden') =>
  requestJson<{ topic: AdminTopic }>(`/api/admin/topics/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

export const fetchAdminUsers = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminUserRow, 'users'>>(`/api/admin/users?${buildQuery(params)}`);

export const updateAdminUserStatus = (id: number, payload: { status: string; muteUntil?: string; banReason?: string }) =>
  requestJson<{ user: AdminUserRow }>(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });

export const fetchAdminWallets = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminWalletRow, 'wallets'>>(`/api/admin/wallets?${buildQuery(params)}`);

export const adjustAdminWallet = (userId: number, payload: { amount: number; reason: string }) =>
  requestJson<{ wallet: AdminWalletRow; transaction: AdminFishScaleTransaction | null }>(`/api/admin/wallets/${userId}/adjust`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });

export const fetchAdminTransactions = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminFishScaleTransaction, 'transactions'>>(`/api/admin/transactions?${buildQuery(params)}`);

export const fetchAdminGuilds = () => requestJson<{ guilds: AdminEntity[] }>('/api/admin/guilds');
export const createAdminGuild = (payload: Record<string, unknown>) =>
  requestJson<{ guild: AdminEntity }>('/api/admin/guilds', { method: 'POST', body: JSON.stringify(payload) });
export const updateAdminGuild = (id: number, payload: Record<string, unknown>) =>
  requestJson<{ guild: AdminEntity }>(`/api/admin/guilds/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const updateAdminGuildStatus = (id: number, status: string) =>
  requestJson<{ guild: AdminEntity }>(`/api/admin/guilds/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const fetchAdminCircles = () => requestJson<{ circles: AdminEntity[] }>('/api/admin/circles');
export const createAdminCircle = (payload: Record<string, unknown>) =>
  requestJson<{ circle: AdminEntity }>('/api/admin/circles', { method: 'POST', body: JSON.stringify(payload) });
export const updateAdminCircle = (id: number, payload: Record<string, unknown>) =>
  requestJson<{ circle: AdminEntity }>(`/api/admin/circles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const updateAdminCircleStatus = (id: number, status: string) =>
  requestJson<{ circle: AdminEntity }>(`/api/admin/circles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const fetchAdminGroups = () => requestJson<{ groups: AdminEntity[] }>('/api/admin/groups');
export const updateAdminGroupStatus = (id: number, status: string) =>
  requestJson<{ group: AdminEntity }>(`/api/admin/groups/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const fetchAdminSafety = () => requestJson<AdminSafetyResponse>('/api/admin/safety');
export const saveAdminSensitiveWords = (words: AdminSensitiveWord[]) =>
  requestJson<{ sensitiveWords: AdminSensitiveWord[] }>('/api/admin/safety/sensitive-words', {
    method: 'PUT',
    body: JSON.stringify({ words })
  });
export const saveAdminSafetyRules = (payload: Partial<AdminSettings>) =>
  requestJson<{ rules: AdminSettings }>('/api/admin/safety/rules', { method: 'PUT', body: JSON.stringify(payload) });

export const fetchAdminAiPrompts = () => requestJson<{ prompts: AdminAiPrompt[] }>('/api/admin/ai-prompts');
export const fetchAdminAiPrompt = (key: string) =>
  requestJson<{ prompt: AdminAiPrompt; defaultContent: string }>(`/api/admin/ai-prompts/${encodeURIComponent(key)}`);
export const saveAdminAiPrompt = (key: string, payload: Partial<AdminAiPrompt> & { content: string }) =>
  requestJson<{ prompt: AdminAiPrompt }>(`/api/admin/ai-prompts/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
export const testAdminAiPrompt = (key: string, payload: Record<string, unknown>) =>
  requestJson<AdminAiPromptTestResponse>(`/api/admin/ai-prompts/${encodeURIComponent(key)}/test`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
export const restoreDefaultAdminAiPrompt = (key: string) =>
  requestJson<{ prompt: AdminAiPrompt; defaultContent: string }>(`/api/admin/ai-prompts/${encodeURIComponent(key)}/restore-default`, {
    method: 'POST'
  });

export const fetchAdminSettings = () => requestJson<{ settings: AdminSettings }>('/api/admin/settings');
export const saveAdminSettings = (payload: Partial<AdminSettings>) =>
  requestJson<{ settings: AdminSettings }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });

export const fetchAdminAuditLogs = (params: Record<string, string | number | undefined>) =>
  requestJson<AdminListResponse<AdminAuditLog, 'logs'>>(`/api/admin/audit-logs?${buildQuery(params)}`);
