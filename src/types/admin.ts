export type AdminStatus = 'published' | 'pending' | 'hidden' | 'rejected';

export type AdminUserSession = {
  username: string;
};

export type AdminRecord = {
  id: number;
  userId: number | null;
  username: string;
  nickname: string;
  slackingType: string;
  slackingTypeLabel: string;
  activityText: string;
  activityTags: string[];
  duration: string;
  durationLabel: string;
  risk: string;
  riskLabel: string;
  disguise: string;
  disguiseLabel: string;
  creativity: string;
  creativityLabel: string;
  storyText: string;
  description: string;
  durationScore: number;
  score: number;
  title: string;
  systemComment: string;
  status: AdminStatus;
  reviewNote: string;
  visibility: string;
  sensitiveFlags: string[];
  reviewedBy: string;
  reviewedAt: string;
  hiddenReason: string;
  likeCount: number;
  favoriteCount: number;
  voteCount: number;
  legendNominationCount: number;
  legendSelected: boolean;
  reportCount: number;
  commentCount: number;
  shareCount: number;
  scoreVersion: string;
  createdAt: string;
  updatedAt: string;
  breakdown: import('../../shared/aiJudgeTypes').ScoreBreakdown;
};

export type AdminWalletRow = {
  userId: number;
  username: string;
  displayName: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  level: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminFishScaleTransaction = {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  amount: number;
  type: string;
  reason: string;
  relatedType: string;
  relatedId: number | null;
  balanceAfter: number;
  createdAt: string;
};

export type AdminComment = {
  id: number;
  recordId: number;
  userId: number;
  username: string;
  nickname: string;
  content: string;
  status: AdminStatus;
  reviewNote: string;
  sensitiveFlags: string[];
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminReport = {
  id: number;
  targetType: string;
  targetId: number;
  userId: number;
  username: string;
  nickname: string;
  reason: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected';
  adminNote: string;
  resolvedBy: string;
  resolvedAt: string;
  createdAt: string;
};

export type AdminAuditLog = {
  id: number;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeJson: string;
  afterJson: string;
  ip: string;
  userAgent: string;
  createdAt: string;
};

export type AdminDashboardSummary = {
  todayRecords: number;
  todayComments: number;
  pendingRecords: number;
  pendingReports: number;
  hiddenContent: number;
  totalUsers: number;
  totalRecords: number;
  totalComments: number;
  totalGuilds: number;
  totalCircles: number;
  totalGroups: number;
  totalInteractions: number;
};

export type AdminDashboardResponse = {
  summary: AdminDashboardSummary;
  latestPendingRecords: AdminRecord[];
  latestReports: AdminReport[];
  recentAuditLogs: AdminAuditLog[];
  viewer: AdminUserSession;
};

export type AdminListResponse<T, K extends string> = {
  total: number;
  page: number;
  pageSize: number;
} & Record<K, T[]>;

export type AdminUserRow = {
  id: number;
  username: string;
  displayName: string;
  status: 'active' | 'muted' | 'banned';
  muteUntil: string;
  banReason: string;
  isAdmin: boolean;
  recordCount: number;
  totalScore: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminEntity = {
  id: number;
  name: string;
  slug?: string;
  description: string;
  icon?: string;
  status: 'active' | 'inactive' | 'hidden' | 'banned';
  ownerUserId?: number | null;
  createdByUserId?: number | null;
  source?: 'official' | 'user' | string;
  joinPolicy?: 'open' | string;
  memberCount: number;
  recordCount?: number;
  totalContribution?: number;
  level?: string;
  visibility?: string;
  ownerUsername?: string;
  ownerNickname?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminTopic = {
  id: number;
  name: string;
  slug: string;
  usageCount: number;
  status: 'active' | 'hidden';
  createdAt: string;
  updatedAt: string;
};

export type AdminSensitiveWord = {
  id?: number;
  word: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminSettings = {
  communityOpen: boolean;
  commentsOpen: boolean;
  groupCreationOpen: boolean;
  legendNominationOpen: boolean;
  commentMaxLength: number;
  descriptionMaxLength: number;
  defaultRecordStatus: 'published' | 'pending';
  safetyNotice: string;
};

export type AdminSafetyResponse = {
  sensitiveWords: AdminSensitiveWord[];
  rules: AdminSettings;
  flags: {
    records: unknown[];
    comments: unknown[];
  };
};

export type AdminAiPrompt = {
  id: number;
  key: string;
  name: string;
  content: string;
  description: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  lastTestedAt: string;
};

export type AdminAiPromptTestResponse = {
  rawJson: string;
  aiJson: unknown;
  zod: {
    success: boolean;
    fallback: boolean;
    fallbackReason: string;
  };
  breakdown: import('../../shared/aiJudgeTypes').ScoreBreakdown;
  comment: string;
  fallback: boolean;
  fallbackReason: string;
};
