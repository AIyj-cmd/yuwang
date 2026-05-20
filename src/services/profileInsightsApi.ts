import type { ProfileInsightsResponse } from '../types';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : '请求失败';
    throw new Error(message);
  }
  return data as T;
};

export const fetchProfileInsights = async (username: string): Promise<ProfileInsightsResponse> => {
  return parseResponse<ProfileInsightsResponse>(await fetch(`/api/users/${encodeURIComponent(username)}/insights`));
};
