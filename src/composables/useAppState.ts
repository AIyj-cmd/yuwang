import { computed, reactive, ref } from 'vue';
import {
  BADGE_DEFINITIONS,
  CREATIVITY_LEVELS,
  DISGUISES,
  DURATIONS,
  LEADERBOARD_TYPES,
  MAX_ACTIVITY_TEXT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  RISKS,
  SAFETY_NOTICE,
  SLACKING_TYPES,
  SUPPORTED_LOCALES,
  TITLE_LEVELS
} from '../../shared/scoring';
import { MAX_TOPICS_PER_RECORD, RECOMMENDED_TOPICS, normalizeTopicName, validateTopicName } from '../../shared/topics';
import { leaderboardTranslations } from '../i18n/messages';
import type { UseLocaleReturn } from '../i18n/useLocale';
import type {
  AdminQueueResponse,
  Announcement,
  Badge,
  CheckinSummary,
  CircleDetailResponse,
  CirclesResponse,
  FeedRecord,
  GroupDetailResponse,
  GroupsResponse,
  GuildDetailResponse,
  GuildsResponse,
  LeaderboardRow,
  OptionsResponse,
  ProfileResponse,
  ShareCard,
  SocialResponse,
  StatsResponse,
  SubmitResponse,
  Topic,
  User as AppUser,
  WalletResponse,
  WalletTransactionsResponse
} from '../types';

export const useAppState = ({ locale, translatedTitle }: Pick<UseLocaleReturn, 'locale' | 'translatedTitle'>) => {
const defaultOptions: OptionsResponse = {
  slackingTypes: SLACKING_TYPES,
  durations: DURATIONS,
  durationScoreRules: DURATIONS,
  risks: RISKS,
  disguises: DISGUISES,
  creativityLevels: CREATIVITY_LEVELS,
  leaderboardTypes: LEADERBOARD_TYPES,
  titleLevels: TITLE_LEVELS,
  sensitiveTerms: [],
  maxActivityTextLength: MAX_ACTIVITY_TEXT_LENGTH,
  maxDescriptionLength: MAX_DESCRIPTION_LENGTH,
  safetyNotice: SAFETY_NOTICE,
  badges: BADGE_DEFINITIONS,
  supportedLocales: SUPPORTED_LOCALES
};

const options = ref<OptionsResponse>(defaultOptions);
const activeBoard = ref('today');
const filterKeyword = ref('');
const leaderboardRows = ref<LeaderboardRow[]>([]);
const lastResult = ref<SubmitResponse | null>(null);
const stats = ref<StatsResponse | null>(null);
const loading = ref(false);
const leaderboardLoading = ref(false);
const errorMessage = ref('');
const statusMessage = ref('');

const token = ref(localStorage.getItem('gongwei-yuwang-token'));
const currentUser = ref<AppUser | null>(null);
const badges = ref<Badge[]>([]);
const authMode = ref<'login' | 'register'>('login');
const authPanelOpen = ref(false);
const profile = ref<ProfileResponse | null>(null);
const walletData = ref<WalletResponse | null>(null);
const walletTransactions = ref<WalletTransactionsResponse | null>(null);
const notificationUnreadCount = ref(0);
const adminQueue = ref<AdminQueueResponse | null>(null);
const social = ref<SocialResponse | null>(null);
const shareCard = ref<ShareCard | null>(null);
const selectedRecordId = ref<number | null>(null);
const commentText = ref('');
const showAllBadges = ref(false);
const communityFilter = ref<'latest' | 'hot' | 'high' | 'legendary'>('latest');
const communityRecords = ref<FeedRecord[]>([]);
const communityLoading = ref(false);
const popularTopics = ref<Topic[]>([]);
const topicDraft = ref('');
const topicError = ref('');
const guildsData = ref<GuildsResponse | null>(null);
const selectedGuild = ref<GuildDetailResponse | null>(null);
const circlesData = ref<CirclesResponse | null>(null);
const selectedCircle = ref<CircleDetailResponse | null>(null);
const circleFeed = ref<FeedRecord[]>([]);
const groupsData = ref<GroupsResponse | null>(null);
const selectedGroup = ref<GroupDetailResponse | null>(null);
const groupFeed = ref<FeedRecord[]>([]);
const feedCommentDrafts = reactive<Record<number, string>>({});
const announcements = ref<Announcement[]>([]);
const checkin = ref<CheckinSummary | null>(null);
const checkinNote = ref('');
const feedbackSubmitted = ref(false);
const feedbackLoading = ref(false);
const groupForm = reactive({
  name: '',
  description: '',
  visibility: 'public'
});
const inviteCode = ref('');

const feedbackForm = reactive({
  category: 'feature',
  content: '',
  contact: ''
});

const authForm = reactive({
  username: '',
  password: '',
  displayName: ''
});

const profileForm = reactive({
  displayName: '',
  bio: ''
});

const form = reactive({
  nickname: locale.value === 'en-US' ? 'Anonymous Fish' : '匿名鱼',
  activityText: '',
  duration: DURATIONS[1].key,
  risk: RISKS[1].key,
  disguise: DISGUISES[0].key,
  creativity: CREATIVITY_LEVELS[0].key,
  description: '',
  topics: [] as string[],
  anonymized: false,
  publishToCommunity: true,
  privateOnly: false,
  groupIds: [] as number[]
});

const sensitiveHits = computed(() => {
  const text = `${form.nickname} ${form.activityText} ${form.description}`.toLowerCase();
  return options.value.sensitiveTerms.filter((term) => text.includes(term.toLowerCase()));
});

const activityTextRemaining = computed(() => options.value.maxActivityTextLength - form.activityText.length);
const descriptionRemaining = computed(() => options.value.maxDescriptionLength - form.description.length);
const canSubmit = computed(
  () =>
    !loading.value &&
    form.activityText.trim().length >= 2 &&
    activityTextRemaining.value >= 0 &&
    form.description.trim().length >= 2 &&
    descriptionRemaining.value >= 0 &&
    sensitiveHits.value.length === 0 &&
    form.anonymized
);
const canQuickSubmit = computed(
  () =>
    !loading.value &&
    form.activityText.trim().length >= 2 &&
    activityTextRemaining.value >= 0 &&
    !!form.duration &&
    form.anonymized
);
const topicSuggestions = computed(() => {
  const seen = new Set<string>();
  return [...RECOMMENDED_TOPICS, ...popularTopics.value.map((topic) => topic.name)].filter((name) => {
    const key = name.toLocaleLowerCase('zh-CN');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});
const localizedLeaderboardTypes = computed(() =>
  options.value.leaderboardTypes.map((board) => ({
    ...board,
    label: locale.value === 'en-US' ? leaderboardTranslations[board.key]?.label ?? board.label : board.label,
    description: locale.value === 'en-US' ? leaderboardTranslations[board.key]?.description ?? board.description : board.description
  }))
);
const selectedBoard = computed(() => localizedLeaderboardTypes.value.find((board) => board.key === activeBoard.value));
const selectedRecord = computed(() => social.value?.record ?? lastResult.value?.record ?? null);
const allProfileBadges = computed<Badge[]>(() => {
  if (badges.value.length) return badges.value;
  if (profile.value?.badges.length) return profile.value.badges;
  return options.value.badges.map((badge) => ({ ...badge, unlocked: false }));
});
const unlockedBadges = computed(() => allProfileBadges.value.filter((badge) => badge.unlocked));
const pendingReviewCount = computed(() => (adminQueue.value?.records.length ?? 0) + (adminQueue.value?.comments.length ?? 0));
const pendingRecordCount = computed(() => adminQueue.value?.records.length ?? 0);
const pendingCommentCount = computed(() => adminQueue.value?.comments.length ?? 0);
const leaderboardResultCount = computed(() => leaderboardRows.value.length);
const joinedGroups = computed(() => groupsData.value?.groups ?? []);
const selectedCircleRecords = computed(() => circleFeed.value);
const selectedGroupRecords = computed(() => groupFeed.value);
const displayedBadges = computed(() => {
  const source = allProfileBadges.value;
  return showAllBadges.value ? source : source.filter((badge) => badge.unlocked).slice(0, 4);
});
const currentProfileTitle = computed(() => {
  const total = profile.value?.totalScore ?? 0;
  const title = TITLE_LEVELS.find((level) => total >= level.min && total <= level.max)?.title ?? TITLE_LEVELS[0].title;
  return translatedTitle(title);
});

const formatLevelRange = (level: (typeof TITLE_LEVELS)[number]) => (Number.isFinite(level.max) ? `${level.min}-${level.max}` : `${level.min}+`);
const isCurrentLevel = (level: (typeof TITLE_LEVELS)[number]) => {
  const total = profile.value?.totalScore ?? 0;
  return total >= level.min && total <= level.max;
};

const setError = (message: string) => {
  errorMessage.value = message;
  statusMessage.value = '';
};

const setStatus = (message: string) => {
  statusMessage.value = message;
  errorMessage.value = '';
};

const translatedMetric = (row: LeaderboardRow) => {
  if (locale.value !== 'en-US') return row.metricLabel;
  if (activeBoard.value === 'legendary') return `Legend nominations ${row.voteCount} ? ${row.count ?? 0} records`;
  if (activeBoard.value === 'disguise') return `Disguise bonus ? ${row.count ?? 0} records`;
  return `Total ${row.score.toFixed(1)} ? ${row.count ?? 0} records`;
};

const addTopic = (rawTopic: string) => {
  const normalized = normalizeTopicName(rawTopic);
  const duplicate = form.topics.some((topic) => topic.toLocaleLowerCase('zh-CN') === normalized.toLocaleLowerCase('zh-CN'));
  if (duplicate) {
    topicDraft.value = '';
    topicError.value = '';
    return;
  }
  if (form.topics.length >= MAX_TOPICS_PER_RECORD) {
    topicError.value = `每条记录最多添加 ${MAX_TOPICS_PER_RECORD} 个话题。`;
    return;
  }
  const validation = validateTopicName(normalized, options.value.sensitiveTerms);
  if (!validation.ok) {
    topicError.value = validation.message;
    return;
  }
  form.topics.push(validation.name);
  topicDraft.value = '';
  topicError.value = '';
};

const addTopicFromDraft = () => {
  addTopic(topicDraft.value);
};

const removeTopic = (topicName: string) => {
  form.topics = form.topics.filter((topic) => topic !== topicName);
  topicError.value = '';
};

const isTopicSelected = (topicName: string) =>
  form.topics.some((topic) => topic.toLocaleLowerCase('zh-CN') === normalizeTopicName(topicName).toLocaleLowerCase('zh-CN'));

return {
  defaultOptions,
  options,
  activeBoard,
  filterKeyword,
  leaderboardRows,
  lastResult,
  stats,
  loading,
  leaderboardLoading,
  errorMessage,
  statusMessage,
  token,
  currentUser,
  badges,
  authMode,
  authPanelOpen,
  profile,
  walletData,
  walletTransactions,
  notificationUnreadCount,
  adminQueue,
  social,
  shareCard,
  selectedRecordId,
  commentText,
  showAllBadges,
  communityFilter,
  communityRecords,
  communityLoading,
  popularTopics,
  topicDraft,
  topicError,
  guildsData,
  selectedGuild,
  circlesData,
  selectedCircle,
  circleFeed,
  groupsData,
  selectedGroup,
  groupFeed,
  feedCommentDrafts,
  announcements,
  checkin,
  checkinNote,
  feedbackSubmitted,
  feedbackLoading,
  groupForm,
  inviteCode,
  feedbackForm,
  authForm,
  profileForm,
  form,
  sensitiveHits,
  activityTextRemaining,
  descriptionRemaining,
  canSubmit,
  canQuickSubmit,
  topicSuggestions,
  localizedLeaderboardTypes,
  selectedBoard,
  selectedRecord,
  allProfileBadges,
  unlockedBadges,
  pendingReviewCount,
  pendingRecordCount,
  pendingCommentCount,
  leaderboardResultCount,
  joinedGroups,
  selectedCircleRecords,
  selectedGroupRecords,
  displayedBadges,
  currentProfileTitle,
  translatedMetric,
  formatLevelRange,
  isCurrentLevel,
  setError,
  setStatus,
  addTopic,
  addTopicFromDraft,
  removeTopic,
  isTopicSelected
};
};

export type AppState = ReturnType<typeof useAppState>;
