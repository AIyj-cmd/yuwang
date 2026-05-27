import type {
  AdminQueueResponse,
  AnnouncementsResponse,
  AuthResponse,
  CheckinSummary,
  CircleDetailResponse,
  CirclesResponse,
  CommunityFeedResponse,
  CommunityOverviewResponse,
  FeedResponse,
  FeedRecord,
  GroupChallengeResponse,
  GroupDetailResponse,
  GroupsResponse,
  GuildActionResponse,
  GuildDetailResponse,
  GuildMembersResponse,
  GuildMutationResponse,
  GuildRankingRow,
  GuildsResponse,
  GuildTasksResponse,
  LeaderboardResponse,
  MeResponse,
  OptionsResponse,
  PopularTopicsResponse,
  ProfileResponse,
  ShareCard,
  SocialResponse,
  StatsResponse,
  SuggestionResponse,
  SubmitResponse,
  TopicDetailResponse,
  WalletResponse,
  WalletTransactionsResponse
} from './types';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : '请求失败';
    throw new Error(message);
  }
  return data as T;
};

const headers = (token?: string | null) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export const fetchOptions = async (): Promise<OptionsResponse> => {
  return parseResponse<OptionsResponse>(await fetch('/api/options'));
};

export const fetchStats = async (): Promise<StatsResponse> => {
  return parseResponse<StatsResponse>(await fetch('/api/stats'));
};

export const fetchAnnouncements = async (): Promise<AnnouncementsResponse> => {
  return parseResponse<AnnouncementsResponse>(await fetch('/api/announcements'));
};

export const submitSuggestion = async (payload: Record<string, unknown>, token?: string | null): Promise<SuggestionResponse> => {
  return parseResponse<SuggestionResponse>(
    await fetch('/api/suggestions', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload)
    })
  );
};

export const fetchCheckin = async (token: string): Promise<CheckinSummary> => {
  return parseResponse<CheckinSummary>(await fetch('/api/checkins/me', { headers: { Authorization: `Bearer ${token}` } }));
};

export const submitCheckin = async (note: string, token: string): Promise<CheckinSummary> => {
  return parseResponse<CheckinSummary>(
    await fetch('/api/checkins', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ note })
    })
  );
};

export const fetchLeaderboard = async (board: string, keyword: string): Promise<LeaderboardResponse> => {
  const query = new URLSearchParams({ board });
  if (keyword.trim()) query.set('keyword', keyword.trim());
  return parseResponse<LeaderboardResponse>(await fetch(`/api/leaderboards?${query.toString()}`));
};

export const submitRecord = async (payload: Record<string, unknown>, token?: string | null): Promise<SubmitResponse> => {
  return parseResponse<SubmitResponse>(
    await fetch('/api/records', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload)
    })
  );
};

export const registerUser = async (payload: Record<string, unknown>): Promise<AuthResponse> => {
  return parseResponse<AuthResponse>(
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    })
  );
};

export const loginUser = async (payload: Record<string, unknown>): Promise<AuthResponse> => {
  return parseResponse<AuthResponse>(
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    })
  );
};

export const fetchMe = async (token?: string | null): Promise<MeResponse> => {
  return parseResponse<MeResponse>(await fetch('/api/auth/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
};

export const fetchWallet = async (token: string): Promise<WalletResponse> => {
  return parseResponse<WalletResponse>(await fetch('/api/wallet/me', { headers: { Authorization: `Bearer ${token}` } }));
};

export const fetchWalletTransactions = async (token: string, page = 1): Promise<WalletTransactionsResponse> => {
  const query = new URLSearchParams({ page: String(page), page_size: '30' });
  return parseResponse<WalletTransactionsResponse>(await fetch(`/api/wallet/transactions?${query.toString()}`, { headers: { Authorization: `Bearer ${token}` } }));
};

export const updateMe = async (payload: Record<string, unknown>, token: string): Promise<MeResponse> => {
  return parseResponse<MeResponse>(
    await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify(payload)
    })
  );
};

export const fetchProfile = async (username: string): Promise<ProfileResponse> => {
  return parseResponse<ProfileResponse>(await fetch(`/api/users/${encodeURIComponent(username)}`));
};

export const fetchSocial = async (recordId: number, token?: string | null): Promise<SocialResponse> => {
  return parseResponse<SocialResponse>(
    await fetch(`/api/records/${recordId}/social`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

export const toggleInteraction = async (
  recordId: number,
  payload: { action: 'like' | 'favorite' | 'vote'; active: boolean },
  token: string
): Promise<SocialResponse> => {
  return parseResponse<SocialResponse>(
    await fetch(`/api/records/${recordId}/interactions`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload)
    })
  );
};

export const postComment = async (recordId: number, content: string, token: string): Promise<SocialResponse> => {
  return parseResponse<SocialResponse>(
    await fetch(`/api/records/${recordId}/comments`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ content })
    })
  );
};

export const fetchShareCard = async (recordId: number, token?: string | null): Promise<ShareCard> => {
  return parseResponse<ShareCard>(
    await fetch(`/api/records/${recordId}/share-card`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

export const shareRecord = async (recordId: number, action: 'generate' | 'copy_text' | 'share_link' = 'generate'): Promise<ShareCard> => {
  return parseResponse<ShareCard>(
    await fetch(`/api/records/${recordId}/share-card`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action })
    })
  );
};

export const fetchAdminQueue = async (token: string): Promise<AdminQueueResponse> => {
  return parseResponse<AdminQueueResponse>(await fetch('/api/admin/review-queue', { headers: { Authorization: `Bearer ${token}` } }));
};

export const reviewRecord = async (recordId: number, status: string, reviewNote: string, token: string): Promise<{ record: unknown }> => {
  return parseResponse<{ record: unknown }>(
    await fetch(`/api/admin/records/${recordId}/review`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ status, reviewNote })
    })
  );
};

export const reviewComment = async (commentId: number, status: string, reviewNote: string, token: string): Promise<{ comments: unknown[] }> => {
  return parseResponse<{ comments: unknown[] }>(
    await fetch(`/api/admin/comments/${commentId}/review`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ status, reviewNote })
    })
  );
};

export const fetchCommunityFeed = async (filter: string, token?: string | null): Promise<CommunityFeedResponse> => {
  const query = new URLSearchParams({ filter });
  return parseResponse<CommunityFeedResponse>(
    await fetch(`/api/community/feed?${query.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

// Community Home V2: overview (right rail data + feature flags + my stats).
// Visitor token-less call returns myStats: null; logged-in returns current user only.
export const fetchCommunityOverview = async (token?: string | null): Promise<CommunityOverviewResponse> => {
  return parseResponse<CommunityOverviewResponse>(
    await fetch('/api/community/overview', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

export const fetchPopularTopics = async (): Promise<PopularTopicsResponse> => {
  return parseResponse<PopularTopicsResponse>(await fetch('/api/topics/popular'));
};

export const fetchTopicDetail = async (slug: string, token?: string | null, filter = 'latest'): Promise<TopicDetailResponse> => {
  const query = new URLSearchParams({ filter });
  return parseResponse<TopicDetailResponse>(
    await fetch(`/api/topics/${encodeURIComponent(slug)}?${query.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

export const likeRecord = async (recordId: number, token: string): Promise<{ record: FeedRecord }> => {
  return parseResponse<{ record: FeedRecord }>(
    await fetch(`/api/records/${recordId}/like`, {
      method: 'POST',
      headers: headers(token),
      body: '{}'
    })
  );
};

export const nominateLegend = async (recordId: number, token: string): Promise<{ record: FeedRecord }> => {
  return parseResponse<{ record: FeedRecord }>(
    await fetch(`/api/records/${recordId}/nominate-legend`, {
      method: 'POST',
      headers: headers(token),
      body: '{}'
    })
  );
};

export const commentRecord = async (recordId: number, content: string, token: string): Promise<{ record: FeedRecord }> => {
  return parseResponse<{ record: FeedRecord }>(
    await fetch(`/api/records/${recordId}/comment`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ content })
    })
  );
};

export const reportRecord = async (recordId: number, reason: string, token: string): Promise<{ ok: boolean; record: FeedRecord }> => {
  return parseResponse<{ ok: boolean; record: FeedRecord }>(
    await fetch(`/api/records/${recordId}/report`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ reason })
    })
  );
};

export const fetchGuilds = async (token?: string | null): Promise<GuildsResponse> => {
  return parseResponse<GuildsResponse>(await fetch('/api/guilds', { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
};

export const fetchGuild = async (id: number, token?: string | null): Promise<GuildDetailResponse> => {
  return parseResponse<GuildDetailResponse>(await fetch(`/api/guilds/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
};

export const fetchGuildRanking = async (
  id: number,
  token?: string | null
): Promise<{ rows: GuildRankingRow[] }> => {
  return parseResponse<{ rows: GuildRankingRow[] }>(
    await fetch(`/api/guilds/${id}/ranking`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

export const fetchGuildMembers = async (
  id: number,
  token?: string | null
): Promise<GuildMembersResponse> => {
  return parseResponse<GuildMembersResponse>(
    await fetch(`/api/guilds/${id}/members`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

export const fetchGuildTasks = async (
  id: number,
  token?: string | null
): Promise<GuildTasksResponse> => {
  return parseResponse<GuildTasksResponse>(
    await fetch(`/api/guilds/${id}/tasks`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  );
};

export const joinGuild = async (id: number, token: string): Promise<{ guild: GuildsResponse['guilds'][number] }> => {
  return parseResponse<{ guild: GuildsResponse['guilds'][number] }>(
    await fetch(`/api/guilds/${id}/join`, {
      method: 'POST',
      headers: headers(token),
      body: '{}'
    })
  );
};

// 工会经营 v1：用户创建工会（消耗 50 鱼鳞，创建者自动成为会长）。
export const createGuild = async (
  payload: { name: string; description: string; icon: string },
  token: string
): Promise<GuildMutationResponse> => {
  return parseResponse<GuildMutationResponse>(
    await fetch('/api/guilds', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload)
    })
  );
};

// 工会经营 v1：会长修改自己创建的用户工会资料。
export const updateGuild = async (
  id: number,
  payload: { name?: string; description?: string; icon?: string },
  token: string
): Promise<GuildMutationResponse> => {
  return parseResponse<GuildMutationResponse>(
    await fetch(`/api/guilds/${id}`, {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify(payload)
    })
  );
};

// 工会经营 v1：普通成员退出工会（会长不能直接退出）。
export const leaveGuild = async (id: number, token: string): Promise<GuildActionResponse> => {
  return parseResponse<GuildActionResponse>(
    await fetch(`/api/guilds/${id}/leave`, {
      method: 'POST',
      headers: headers(token),
      body: '{}'
    })
  );
};

// 工会经营 v1：会长移除工会中的普通成员。
export const removeGuildMember = async (
  id: number,
  userId: number,
  token: string
): Promise<GuildActionResponse> => {
  return parseResponse<GuildActionResponse>(
    await fetch(`/api/guilds/${id}/members/${userId}/remove`, {
      method: 'POST',
      headers: headers(token),
      body: '{}'
    })
  );
};

export const fetchCircles = async (token?: string | null): Promise<CirclesResponse> => {
  return parseResponse<CirclesResponse>(await fetch('/api/circles', { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
};

export const fetchCircle = async (id: number, token?: string | null): Promise<CircleDetailResponse> => {
  return parseResponse<CircleDetailResponse>(await fetch(`/api/circles/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
};

export const joinCircle = async (id: number, token: string): Promise<CircleDetailResponse> => {
  return parseResponse<CircleDetailResponse>(
    await fetch(`/api/circles/${id}/join`, {
      method: 'POST',
      headers: headers(token),
      body: '{}'
    })
  );
};

export const fetchCircleFeed = async (id: number, token?: string | null): Promise<FeedResponse> => {
  return parseResponse<FeedResponse>(await fetch(`/api/circles/${id}/feed`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }));
};

export const fetchGroups = async (token: string): Promise<GroupsResponse> => {
  return parseResponse<GroupsResponse>(await fetch('/api/groups/my', { headers: { Authorization: `Bearer ${token}` } }));
};

export const createGroup = async (payload: Record<string, unknown>, token: string): Promise<{ group: GroupsResponse['groups'][number] }> => {
  return parseResponse<{ group: GroupsResponse['groups'][number] }>(
    await fetch('/api/groups', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(payload)
    })
  );
};

export const joinGroupByCode = async (inviteCode: string, token: string): Promise<{ group: GroupsResponse['groups'][number] }> => {
  return parseResponse<{ group: GroupsResponse['groups'][number] }>(
    await fetch('/api/groups/join-by-code', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ inviteCode })
    })
  );
};

export const fetchGroup = async (id: number, token: string): Promise<GroupDetailResponse> => {
  return parseResponse<GroupDetailResponse>(await fetch(`/api/groups/${id}`, { headers: { Authorization: `Bearer ${token}` } }));
};

export const fetchGroupFeed = async (id: number, token: string): Promise<FeedResponse> => {
  return parseResponse<FeedResponse>(await fetch(`/api/groups/${id}/feed`, { headers: { Authorization: `Bearer ${token}` } }));
};

export const startGroupChallenge = async (groupId: number, challengeName: string, token: string): Promise<GroupChallengeResponse> => {
  return parseResponse<GroupChallengeResponse>(
    await fetch(`/api/groups/${groupId}/challenges`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ challengeName })
    })
  );
};

export const fetchAvatarPolicy = async (token: string): Promise<{ maxSizeBytes: number; allowedMimeTypes: string[]; allowedExtensions: string[]; maxUploadsPerDay: number }> => {
  return parseResponse<{ maxSizeBytes: number; allowedMimeTypes: string[]; allowedExtensions: string[]; maxUploadsPerDay: number }>(
    await fetch('/api/auth/me/avatar-policy', { headers: { Authorization: `Bearer ${token}` } })
  );
};

export const uploadAvatar = async (file: File, token: string): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await fetch('/api/auth/me/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.message === 'string' ? data.message : '上传失败');
  }
  return data as { avatarUrl: string };
};

export const deleteAvatar = async (token: string): Promise<{ ok: boolean }> => {
  return parseResponse<{ ok: boolean }>(
    await fetch('/api/auth/me/avatar', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
  );
};
