import type { RelatedRecordsResponse, SearchResponse } from '../types';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : '请求失败';
    throw new Error(message);
  }
  return data as T;
};

const authHeaders = (token?: string | null): HeadersInit => (token ? { Authorization: `Bearer ${token}` } : {});

export const searchContent = async (query: string, token?: string | null): Promise<SearchResponse> => {
  const params = new URLSearchParams({ q: query });
  return parseResponse<SearchResponse>(await fetch(`/api/search?${params.toString()}`, { headers: authHeaders(token) }));
};

export const fetchRelatedRecords = async (recordId: number, token?: string | null): Promise<RelatedRecordsResponse> => {
  return parseResponse<RelatedRecordsResponse>(
    await fetch(`/api/records/${recordId}/related`, { headers: authHeaders(token) })
  );
};
