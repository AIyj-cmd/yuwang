import type {
  BADGE_DEFINITIONS,
  CREATIVITY_LEVELS,
  DISGUISES,
  DURATIONS,
  LEADERBOARD_TYPES,
  RISKS,
  SLACKING_TYPES,
  SUPPORTED_LOCALES,
  TITLE_LEVELS
} from '../shared/scoring';

export type OptionsResponse = {
  slackingTypes: typeof SLACKING_TYPES;
  durations: typeof DURATIONS;
  durationScoreRules: typeof DURATIONS;
  risks: typeof RISKS;
  disguises: typeof DISGUISES;
  creativityLevels: typeof CREATIVITY_LEVELS;
  leaderboardTypes: typeof LEADERBOARD_TYPES;
  titleLevels: typeof TITLE_LEVELS;
  sensitiveTerms: string[];
  maxActivityTextLength: number;
  maxDescriptionLength: number;
  safetyNotice: string;
  badges: typeof BADGE_DEFINITIONS;
  supportedLocales: typeof SUPPORTED_LOCALES;
};

export type User = {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  locale: string;
  isAdmin: boolean;
  guildId: number | null;
  createdAt: string;
};

export type Badge = {
  key: string;
  label: string;
  description: string;
  unlocked: boolean;
};

export type Topic = {
  id: number;
  name: string;
  slug: string;
  usage_count: number;
  status: 'active' | 'hidden';
  created_at: string;
  updated_at?: string;
};

export type RecordTopic = {
  id: number;
  record_id: number;
  topic_id: number;
  created_at: string;
};

export type RecordSummary = {
  id: number;
  userId?: number | null;
  username?: string;
  nickname: string;
  slackingType: string;
  slackingTypeId: string;
  slackingTypeGroup: string;
  slackingTypeLabel: string;
  activityText: string;
  activityTags: string[];
  topics: Topic[];
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
  status: string;
  reviewNote: string;
  visibility: string;
  likeCount: number;
  favoriteCount: number;
  voteCount: number;
  legendNominationCount: number;
  legendSelected?: boolean;
  reportCount: number;
  commentCount: number;
  shareCount: number;
  guildId: number | null;
  guildContribution: number;
  scoreVersion: string;
  createdAt: string;
  breakdown: {
    baseScore: number;
    durationScore: number;
    durationBaseScore: number;
    durationMultiplier: number;
    riskMultiplier: number;
    disguiseBonus: number;
    creativityBonus: number;
  };
};

export type FishScaleWallet = {
  id: number;
  userId: number;
  fishScaleBalance: number;
  fishScaleTotalEarned: number;
  fishScaleTotalSpent: number;
  level: string;
  createdAt: string;
  updatedAt: string;
};

export type FishScaleTransaction = {
  id: number;
  userId: number;
  amount: number;
  type: string;
  reason: string;
  relatedType: string;
  relatedId: number | null;
  balanceAfter: number;
  createdAt: string;
};

export type FishScaleReward = {
  baseAmount: number;
  firstSubmissionBonus: number;
  awardedAmount: number;
  transactions: FishScaleTransaction[];
  wallet: FishScaleWallet;
  message: string;
};

export type WalletResponse = {
  wallet: FishScaleWallet;
  recentTransactions: FishScaleTransaction[];
  notice: string;
};

export type WalletTransactionsResponse = {
  transactions: FishScaleTransaction[];
  total: number;
  page: number;
  pageSize: number;
};

export type FeedTag = {
  id: number;
  name: string;
  slug: string;
};

export type FeedRecord = RecordSummary & {
  tags: FeedTag[];
  guild: null | {
    id: number;
    name: string;
    slug: string;
    icon: string;
  };
  viewer: {
    liked: boolean;
    legendNominated: boolean;
    reported: boolean;
  };
};

export type LeaderboardRow = {
  id: number;
  rank: number;
  nickname: string;
  username?: string;
  score: number;
  metricLabel: string;
  title: string;
  description: string;
  slackingType: string;
  activityText: string;
  risk: string;
  createdAt: string;
  likeCount: number;
  favoriteCount: number;
  voteCount: number;
  commentCount: number;
  count?: number;
};

export type LeaderboardResponse = {
  board: string;
  label: string;
  rows: LeaderboardRow[];
};

export type SubmitResponse = {
  record: RecordSummary;
  todayRank: number;
  cumulativeScore: number;
  title: string;
  systemComment: string;
  fishScaleReward: FishScaleReward | null;
  safety?: {
    level: string;
    sensitiveTerms: string[];
    warnings: string[];
  };
  leaderboards: Record<string, LeaderboardRow[]>;
};

export type StatsResponse = {
  totalRecords: number;
  totalScore: string;
  topScore: string;
  todayRecords: number;
};

export type Announcement = {
  id: number;
  title: string;
  body: string;
  level: string;
  createdAt: string;
};

export type AnnouncementsResponse = {
  announcements: Announcement[];
};

export type SuggestionResponse = {
  id: number;
  status: string;
  safety?: {
    level: string;
    sensitiveTerms: string[];
    warnings: string[];
  };
};

export type CheckinSummary = {
  today: string;
  checkedToday: boolean;
  total: number;
  streak: number;
  lastDate: string;
  note: string;
  alreadyChecked?: boolean;
};

export type Comment = {
  id: number;
  recordId: number;
  userId: number;
  username: string;
  nickname: string;
  content: string;
  status: string;
  reviewNote: string;
  createdAt: string;
};

export type ShareCard = {
  title: string;
  subtitle: string;
  body: string;
  shareText: string;
};

export type SocialResponse = {
  record: RecordSummary;
  viewer: {
    liked: boolean;
    favorited: boolean;
    voted: boolean;
  };
  comments: Comment[];
  shareCard: ShareCard;
};

export type CommunityFeedResponse = {
  filter: string;
  records: FeedRecord[];
  safetyNotice: string;
};

export type PopularTopicsResponse = {
  topics: Topic[];
};

export type TopicDetailResponse = {
  topic: Topic;
  records: FeedRecord[];
  popularTopics: Topic[];
};

export type Guild = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  totalContribution: number;
  memberCount: number;
  level: string;
  joined: boolean;
};

export type GuildRankingRow = {
  rank: number;
  userId: number;
  username: string;
  nickname: string;
  contribution: number;
};

export type GuildsResponse = {
  myGuild: Guild | null;
  guilds: Guild[];
  ranking: GuildRankingRow[];
};

export type GuildDetailResponse = {
  guild: Guild;
  records: FeedRecord[];
};

export type Circle = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  memberCount: number;
  recordCount: number;
  joined: boolean;
  boards: string[];
};

export type CirclesResponse = {
  recommended: Circle[];
  hot: Circle[];
  joined: Circle[];
  circles: Circle[];
};

export type CircleDetailResponse = {
  circle: Circle;
};

export type FeedResponse = {
  records: FeedRecord[];
};

export type Group = {
  id: number;
  name: string;
  description: string;
  visibility: string;
  inviteCode: string;
  ownerUserId: number;
  memberCount: number;
  joined: boolean;
  role: string;
  nicknameTitle: string;
  createdAt: string;
};

export type GroupChallenge = {
  name: string;
  condition: string;
  reward: string;
};

export type GroupsResponse = {
  groups: Group[];
  challenges: GroupChallenge[];
};

export type GroupDetailResponse = {
  group: Group;
  members: unknown[];
  challenges: GroupChallenge[];
};

export type GroupChallengeResponse = {
  ok: boolean;
  challenge: GroupChallenge;
  wallet: FishScaleWallet;
  transaction: FishScaleTransaction | null;
  message: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type MeResponse = {
  user: User | null;
  badges: Badge[];
};

export type ProfileResponse = {
  user: User;
  totalScore: number;
  badges: Badge[];
  records: RecordSummary[];
};

export type AdminQueueResponse = {
  records: RecordSummary[];
  comments: Comment[];
};
