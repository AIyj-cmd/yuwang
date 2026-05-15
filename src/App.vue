<script setup lang="ts">
import { computed, onMounted, provide, reactive, ref, watch } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Check,
  ClipboardCheck,
  Coins,
  Crown,
  Heart,
  Inbox,
  Languages,
  LogIn,
  LogOut,
  MessageCircle,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Star,
  User
} from 'lucide-vue-next';
import { PxButton, PxCard, PxInput, PxTag } from '@mmt817/pixel-ui';
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
} from '../shared/scoring';
import {
  fetchAdminQueue,
  commentRecord,
  createGroup,
  fetchCircle,
  fetchCircleFeed,
  fetchCircles,
  fetchCommunityFeed,
  fetchAnnouncements,
  fetchCheckin,
  fetchLeaderboard,
  fetchGroup,
  fetchGroupFeed,
  fetchGroups,
  fetchGuild,
  fetchGuilds,
  fetchMe,
  fetchOptions,
  fetchPopularTopics,
  fetchProfile,
  fetchSocial,
  fetchStats,
  fetchWallet,
  fetchWalletTransactions,
  joinCircle,
  joinGroupByCode,
  joinGuild,
  likeRecord,
  loginUser,
  nominateLegend,
  postComment,
  reportRecord,
  registerUser,
  reviewComment,
  reviewRecord,
  shareRecord,
  startGroupChallenge,
  submitCheckin,
  submitSuggestion,
  submitRecord,
  toggleInteraction,
  updateMe
} from './api';
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
  User as AppUser,
  WalletResponse,
  WalletTransactionsResponse
} from './types';
import { appContextKey } from './appContext';
import { MAX_TOPICS_PER_RECORD, RECOMMENDED_TOPICS, normalizeTopicName, validateTopicName } from '../shared/topics';
import type { Topic } from './types';
import ThemeSwitcher from './components/ThemeSwitcher.vue';
import { fetchNotificationUnreadCount } from './services/notificationApi';

const messages = {
  'zh-CN': {
    mvpFeatures: 'MVP 功能',
    communitySystem: '社区系统',
    submitRecord: '摸鱼记录提交',
    scoreRule: 'Fish Power Score',
    result: '本次得分结果',
    leaderboard: '排行榜',
    community: '社区广场',
    guilds: '工会大厅',
    circles: '圈子广场',
    groups: '我的小组',
    levels: '等级称号',
    safety: '安全与内容保护',
    protection: '内容保护',
    account: 'MVP 功能',
    about: '关于我们',
    feedback: '提交建议',
    announcements: '公告',
    checkin: '签到',
    login: '登录',
    register: '注册',
    username: '用户名',
    password: '密码',
    displayName: '显示昵称',
    profile: '个人主页',
    notifications: '通知中心',
    wallet: '鱼鳞钱包',
    logout: '退出',
    save: '保存',
    language: '语言',
    badges: '徽章和成就',
    admin: '管理审核',
    emptyFuture: '后续功能区域预留',
    filter: '筛选昵称',
    nickname: '昵称',
    activityText: '摸鱼事项',
    duration: '持续时间',
    risk: '风险场景',
    disguise: '伪装方式',
    creativity: '创意等级',
    description: '摸鱼故事',
    anonymized: '我已匿名化所有内容，不包含真实公司、客户、证件、聊天记录或截图信息。',
    submit: '计算并上榜',
    reset: '重置',
    comments: '评论互动',
    addComment: '发布评论',
    share: '分享卡片',
    like: '点赞',
    favorite: '收藏',
    vote: '投票',
    needLogin: '需要登录后操作。',
    noRecord: '提交或选择一条记录后，这里会显示互动和分享卡。',
    noComments: '暂无评论。',
    pending: '待审核',
    approve: '通过',
    reject: '拒绝',
    noPending: '暂无待审核内容。',
    total: '总记录',
    today: '今日',
    top: '最高',
    unlocked: '已解锁',
    locked: '未解锁'
  },
  'en-US': {
    mvpFeatures: 'MVP Features',
    communitySystem: 'Social System',
    submitRecord: 'Submit Record',
    scoreRule: 'Fish Power Score',
    result: 'Result',
    leaderboard: 'Leaderboards',
    community: 'Community',
    guilds: 'Guilds',
    circles: 'Circles',
    groups: 'Groups',
    levels: 'Levels',
    safety: 'Safety & Guard',
    protection: 'Content Guard',
    account: 'MVP Features',
    about: 'About',
    feedback: 'Feedback',
    announcements: 'Announcements',
    checkin: 'Check In',
    login: 'Log In',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    displayName: 'Display Name',
    profile: 'Profile',
    notifications: 'Notifications',
    wallet: 'Fish Scale Wallet',
    logout: 'Log Out',
    save: 'Save',
    language: 'Language',
    badges: 'Badges',
    admin: 'Review',
    emptyFuture: 'Reserved for future features',
    filter: 'Filter nickname',
    nickname: 'Nickname',
    activityText: 'Activity',
    duration: 'Duration',
    risk: 'Risk',
    disguise: 'Disguise',
    creativity: 'Creativity',
    description: 'Story',
    anonymized: 'I confirm the content is anonymized and contains no real company, customer, ID, chat, or screenshot information.',
    submit: 'Score & Rank',
    reset: 'Reset',
    comments: 'Comments',
    addComment: 'Post Comment',
    share: 'Share Card',
    like: 'Like',
    favorite: 'Favorite',
    vote: 'Vote',
    needLogin: 'Log in to continue.',
    noRecord: 'Submit or select a record to see interactions and share card.',
    noComments: 'No comments yet.',
    pending: 'Pending',
    approve: 'Approve',
    reject: 'Reject',
    noPending: 'No pending items.',
    total: 'Total',
    today: 'Today',
    top: 'Top',
    unlocked: 'Unlocked',
    locked: 'Locked'
  }
} as const;

type Locale = keyof typeof messages;
type MessageKey = keyof (typeof messages)['zh-CN'];

const savedLocale = localStorage.getItem('gongwei-yuwang-locale') as Locale | null;
const locale = ref<Locale>(savedLocale === 'en-US' ? 'en-US' : 'zh-CN');
const t = (key: MessageKey) => messages[locale.value][key] ?? messages['zh-CN'][key];
const copy = (zh: string, en: string) => (locale.value === 'en-US' ? en : zh);
const route = useRoute();
const router = useRouter();

const optionTranslations: Record<string, string> = {
  'water-break': 'Water / restroom / refill',
  'phone-video': 'Phone or short videos',
  gossip: 'Chatting or office gossip',
  'shopping-food': 'Shopping or ordering food',
  'novel-comic-drama': 'Novels, comics, or shows',
  gaming: 'Gaming',
  nap: 'Nap or long lunch break',
  'learning-side-project': 'Paid learning / side project',
  'meeting-pretend': 'Pretending in a meeting',
  'auto-online': 'Automation or fake online',
  'whole-day-undetected': 'Whole day unnoticed',
  '0-10': '0-10 min',
  '10-30': '10-30 min',
  '30-60': '30-60 min',
  '1-2h': '1-2 hours',
  '2-4h': '2-4 hours',
  '4h-plus': 'Over 4 hours',
  '30分钟以下': 'Under 30 min',
  '30分钟-1小时': '30 min-1 hour',
  '1-2小时': '1-2 hours',
  '2-4小时': '2-4 hours',
  '4小时以上/全天': 'Over 4 hours / all day',
  'break-time': 'Break time',
  'work-time': 'Normal work time',
  'boss-nearby': 'Boss nearby',
  meeting: 'In a meeting',
  'screen-share': 'Screen sharing / remote meeting',
  'called-out': 'Called on and recovered',
  'window-switch': 'Fast window switching',
  'headset-meeting': 'Headset meeting disguise',
  'excel-ide': 'Excel or IDE camouflage',
  'multi-window': 'Multi-window cover',
  'busy-status': 'Busy status',
  'answer-while-slacking': 'Answered while slacking',
  normal: 'Normal',
  odd: 'A bit absurd',
  showtime: 'Very entertaining',
  'everyone-laughed': 'Made everyone laugh',
  legendary: 'Legendary move'
};

const titleTranslations: Record<string, string> = {
  小憩鱼苗: 'Micro Break Fry',
  短暂潜水员: 'Short Dive Specialist',
  灵魂离席者: 'Soul Away from Desk',
  半场失踪鱼: 'Half-Time Missing Fish',
  工位蒸发者: 'Desk Evaporator',
  今日鱼王候选: 'Today’s Fish King Candidate',
  小鱼苗: 'Tiny Fry',
  初级摸鱼员: 'Junior Slacker',
  熟练摸鱼工: 'Skilled Slacker',
  工位老油条: 'Desk Veteran',
  带薪摸鱼王: 'Paid Slacking King',
  终极鱼神: 'Ultimate Fish Deity',
  临时摸鱼组织: 'Temporary Slacking Crew',
  工位互助会: 'Desk Mutual Aid Club',
  带薪摸鱼工会: 'Paid Slacking Guild',
  大型办公地下组织: 'Large Office Underground',
  摸鱼总工会: 'Grand Slacking Guild'
};

const leaderboardTranslations: Record<string, { label: string; description: string }> = {
  today: { label: "Today's Slacking King", description: "Today's top aggregate score" },
  week: { label: 'Weekly Paid Slacking Board', description: 'Highest weekly aggregate score' },
  month: { label: 'Monthly Slacking Board', description: 'Highest monthly aggregate score' },
  season: { label: 'Season Fish King Board', description: 'Highest quarterly aggregate score' },
  disguise: { label: 'Camouflage Master Board', description: 'Highest disguise bonus total' },
  meeting: { label: 'Meeting Slacking Board', description: 'Meeting-related records' },
  legendary: { label: 'Legendary Fish Board', description: 'Community-nominated records' }
};

const badgeTranslations: Record<string, { label: string; description: string }> = {
  'first-catch': { label: 'First Catch', description: 'Submit your first record' },
  'power-200': { label: 'Over 200', description: 'Reach 200 Fish Power in one record' },
  'power-500': { label: 'High-Pressure Torpedo', description: 'Reach 500 Fish Power in one record' },
  'meeting-fish': { label: 'Meeting Diver', description: 'Submit a meeting-related record' },
  'disguise-master': { label: 'Camouflage Master', description: 'Reach 30 disguise bonus in one record' },
  'legend-voter': { label: 'Legend Witness', description: 'Vote for a legendary record' },
  'social-fish': { label: 'Break Room Speaker', description: 'Post an approved comment' }
};

const guildTranslations: Record<string, { name: string; description: string; level?: string }> = {
  'tea-room-expedition': { name: 'Break Room Expedition', description: 'A group that treats water refill routes like expeditions.' },
  'meeting-divers': { name: 'Meeting Divers', description: 'Specialists in staying underwater during meetings.' },
  'excel-camouflage': { name: 'Excel Camouflage Alliance', description: 'Everything can look productive through a spreadsheet.' },
  'paid-learning-lab': { name: 'Paid Learning Society', description: 'Turns working hours into self-improvement samples.' },
  'nap-extension': { name: 'Lunch Break Extension Committee', description: 'Studies the edge of a legal lunch break.' },
  'auto-online': { name: 'Auto Online Association', description: 'Keeps status lights and office moods stable.' }
};

const circleTranslations: Record<string, { name: string; description: string; boards?: string[] }> = {
  'meeting-fish': {
    name: 'Meeting Slacking Circle',
    description: 'For records about drifting through meetings.',
    boards: ['Meeting Diver of the Day', 'Best Fake Note Taker', 'Called On and Recovered']
  },
  'busy-camouflage': {
    name: 'Pretending Busy Circle',
    description: 'Window switching, IDE camouflage, and spreadsheet cover stories.',
    boards: ['Excel Camouflage Master', 'IDE Illusionist', 'Multi-window Cover Board']
  },
  'paid-learning': {
    name: 'Paid Learning Circle',
    description: 'For self-improvement records during paid time.',
    boards: ['Paid Self-Improvement Board', 'Work-time Reading Board', 'Mood Growth Board']
  },
  'life-admin': {
    name: 'Life Admin Circle',
    description: 'For delivery, dinner choices, and daily small errands.',
    boards: ['Life Admin of the Day', 'Dinner Research Board', 'Delivery Decision Board']
  },
  'short-video-dive': { name: 'Short Video Diving Circle', description: 'For short-video and phone drifting.', boards: ['Short Video Diver of the Day', 'Scrolled But Stayed at Desk'] },
  'tea-room-philosophy': { name: 'Break Room Philosophy Circle', description: 'For water refill and break-room thought experiments.', boards: ['Refill Philosopher', 'Break Room Expedition Board'] },
  'nap-extension': { name: 'Lunch Break Extension Circle', description: 'For naps, lunch breaks, and eye-closing research.', boards: ['Lunch Boundary Explorer', 'Stable Eye-Closed Employee'] },
  'auto-online': { name: 'Auto Online Circle', description: 'For fake online and status-light techniques.', boards: ['Status Light Illusion Board', 'Remote Online Watch'] },
  'worker-mood': { name: 'Worker Mood Circle', description: 'For recording modern office mental weather.', boards: ['Office Mood Weather', 'Stable Meltdown Watch'] },
  'legend-watch': { name: 'Legend Watch Room', description: 'For legendary candidates and entertainment value.', boards: ['Legend Candidates', 'Entertainment Watch'] }
};

const challengeTranslations: Record<string, { name: string; condition: string; reward: string }> = {
  '今天谁的精神状态最稳定？': { name: 'Who has the steadiest mood today?', condition: 'Submit an ordinary but funny record', reward: 'Stable Chaos Employee' },
  本周小组摸鱼王: { name: 'Weekly Group Fish King', condition: 'Highest weekly Fish Power Score', reward: 'Group Fish King' },
  最会伪装成员: { name: 'Best Camouflage Member', condition: 'Highest disguise bonus', reward: 'Window Switch Mage' }
};

const announcementTranslations: Record<number, { title: string; body: string }> = {
  1: {
    title: 'Social system is live',
    body: 'Community Plaza, Guild Hall, Circle Plaza, and My Groups are now connected. Keep records anonymous and do not submit real company or client information.'
  },
  2: {
    title: 'Leaderboards now aggregate by user',
    body: 'Leaderboards now summarize submissions and aggregate metrics by user or nickname instead of showing every single record.'
  },
  3: {
    title: 'Daily check-in is open',
    body: 'After signing in, you can check in from the MVP Features section and track your streak. Check-ins record playful mood only, not real workplace identity.'
  }
};

const systemCommentTranslations: Record<string, string> = {
  '只是短暂离开水面呼吸了一下。': 'Just surfaced briefly for air.',
  '这是一段合理但值得记录的精神游离。': 'A reasonable but record-worthy mental drift.',
  '你的灵魂已经离开工位一小段时间。': 'Your soul has been away from the desk for a while.',
  '半场失踪，但依然保持了表面稳定。': 'Absent for half a round, while the surface still looked stable.',
  '工位还在，人类活动迹象减少。': 'The desk remains; signs of human activity declined.',
  '今日鱼王候选，建议先确认自己还在上班。': 'Today’s Fish King candidate. First confirm you are still at work.',
  '系统判定：这条记录已进入传说区间。请确认它是匿名化后的娱乐描述，不要把真实工作细节带上船。':
    'System verdict: this record has entered legendary territory. Make sure it is anonymized entertainment and does not carry real work details.',
  '系统判定：被点名还能圆回来，反应速度值得写进工位民间故事，但现实里请优先完成正事。':
    'System verdict: getting called on and recovering is office folklore material, but in reality, prioritize actual work.',
  '系统判定：创意值爆表，像是茶水间会流传三个月的版本。记得别暴露任何真实身份。':
    'System verdict: high entertainment value. This could travel through the break room for months. Do not expose any real identity.',
  '系统判定：一边摸鱼一边答题，属于工位多线程。但系统仍建议适度休息，别挑战真实规章。':
    'System verdict: answering while slacking is desk-level multithreading. Still, take reasonable breaks and do not challenge real rules.',
  '系统判定：分数可观，节目效果稳定。请保持匿名、轻量、娱乐化。':
    'System verdict: solid score and stable entertainment value. Keep it anonymous, light, and playful.',
  '系统判定：一条轻量摸鱼样本已入库，精神状态记录完成。':
    'System verdict: a light slacking sample has been saved. Office mood record complete.'
};

const translatedOptionLabel = (key: string, fallback: string) => (locale.value === 'en-US' ? optionTranslations[key] ?? fallback : fallback);
const translatedTitle = (title: string) => (locale.value === 'en-US' ? titleTranslations[title] ?? title : title);
const translatedBadge = (badge: Badge) => (locale.value === 'en-US' ? badgeTranslations[badge.key] ?? badge : badge);
const translatedGuildName = (guild?: { slug?: string; name: string } | null) =>
  !guild ? '' : locale.value === 'en-US' ? guildTranslations[guild.slug ?? '']?.name ?? guild.name : guild.name;
const translatedGuildDescription = (guild?: { slug?: string; description: string } | null) =>
  !guild ? '' : locale.value === 'en-US' ? guildTranslations[guild.slug ?? '']?.description ?? guild.description : guild.description;
const translatedCircleName = (circle?: { slug?: string; name: string } | null) =>
  !circle ? '' : locale.value === 'en-US' ? circleTranslations[circle.slug ?? '']?.name ?? circle.name : circle.name;
const translatedCircleDescription = (circle?: { slug?: string; description: string } | null) =>
  !circle ? '' : locale.value === 'en-US' ? circleTranslations[circle.slug ?? '']?.description ?? circle.description : circle.description;
const translatedCircleBoards = (circle?: { slug?: string; boards: string[] } | null) =>
  locale.value === 'en-US' && circle ? circleTranslations[circle.slug ?? '']?.boards ?? circle.boards : circle?.boards ?? [];
const translatedChallenge = (challenge: { name: string; condition: string; reward: string }) =>
  locale.value === 'en-US' ? challengeTranslations[challenge.name] ?? challenge : challenge;
const translatedAnnouncement = (announcement: Announcement) =>
  locale.value === 'en-US' ? { ...announcement, ...(announcementTranslations[announcement.id] ?? {}) } : announcement;
const translatedSystemComment = (comment: string) => (locale.value === 'en-US' ? systemCommentTranslations[comment] ?? comment : comment);
const translatedMetric = (row: LeaderboardRow) => {
  if (locale.value !== 'en-US') return row.metricLabel;
  if (activeBoard.value === 'legendary') return `Legend nominations ${row.voteCount} · ${row.count ?? 0} records`;
  if (activeBoard.value === 'disguise') return `Disguise bonus · ${row.count ?? 0} records`;
  return `Total ${row.score.toFixed(1)} · ${row.count ?? 0} records`;
};
const translatedLocaleLabel = (key: string, fallback: string) => (locale.value === 'en-US' && key === 'zh-CN' ? 'Simplified Chinese' : fallback);

const sectionRouteMap: Record<string, string> = {
  submit: '/',
  result: '/result',
  leaderboard: '/leaderboard',
  profile: '/profile',
  notifications: '/notifications',
  wallet: '/profile/wallet',
  safety: '/protection',
  protection: '/protection',
  community: '/community',
  guilds: '/guilds',
  circles: '/circles',
  groups: '/groups',
  about: '/about',
  feedback: '/feedback',
  announcements: '/announcements',
  checkin: '/checkin',
  admin: '/admin',
  social: '/result'
};

const activeSection = computed(() => (typeof route.meta.section === 'string' ? route.meta.section : 'submit'));
const isAdminStandalone = computed(() => route.meta.adminStandalone === true);
const sidebarNavItems = [
  { id: 'checkin', icon: Check, labelKey: 'checkin' },
  { id: 'announcements', icon: AlertTriangle, labelKey: 'announcements' },
  { id: 'submit', icon: Inbox, labelKey: 'submitRecord' },
  { id: 'leaderboard', icon: BarChart3, labelKey: 'leaderboard' },
  { id: 'about', icon: BadgeCheck, labelKey: 'about' },
  { id: 'feedback', icon: MessageCircle, labelKey: 'feedback' },
  { id: 'safety', icon: ShieldAlert, labelKey: 'safety' }
] as const satisfies readonly {
  id: string;
  icon: typeof Inbox;
  labelKey: MessageKey;
}[];

const socialNavItems = [
  { id: 'community', icon: MessageCircle, labelKey: 'community', zhHint: '全站公共内容广场', enHint: 'Public content feed' },
  { id: 'guilds', icon: Crown, labelKey: 'guilds', zhHint: '身份归属 / 赛季竞争', enHint: 'Identity and competition' },
  { id: 'circles', icon: Star, labelKey: 'circles', zhHint: '主题兴趣聚合', enHint: 'Topic-based spaces' },
  { id: 'groups', icon: User, labelKey: 'groups', zhHint: '熟人 / 邀请空间', enHint: 'Small invite spaces' }
] as const satisfies readonly {
  id: string;
  icon: typeof Inbox;
  labelKey: MessageKey;
  zhHint: string;
  enHint: string;
}[];

const jumpToSection = (id: string) => {
  void router.push(sectionRouteMap[id] ?? '/');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

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
  autoCircles: true,
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

const loadLeaderboard = async () => {
  leaderboardLoading.value = true;
  try {
    const response = await fetchLeaderboard(activeBoard.value, filterKeyword.value);
    leaderboardRows.value = response.rows;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('排行榜加载失败', 'Failed to load leaderboards'));
  } finally {
    leaderboardLoading.value = false;
  }
};

const clearLeaderboardFilter = () => {
  filterKeyword.value = '';
  void loadLeaderboard();
};

const upsertFeedRecord = (record: FeedRecord) => {
  const replace = (rows: FeedRecord[]) => rows.map((item) => (item.id === record.id ? record : item));
  communityRecords.value = replace(communityRecords.value);
  circleFeed.value = replace(circleFeed.value);
  groupFeed.value = replace(groupFeed.value);
};

const loadCommunity = async () => {
  communityLoading.value = true;
  try {
    const response = await fetchCommunityFeed(communityFilter.value, token.value);
    communityRecords.value = response.records;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('社区广场加载失败', 'Failed to load community feed'));
  } finally {
    communityLoading.value = false;
  }
};

const loadPopularTopics = async () => {
  try {
    popularTopics.value = (await fetchPopularTopics()).topics;
  } catch {
    popularTopics.value = [];
  }
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

const openTopic = async (slug: string) => {
  await router.push(`/topics/${slug}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const loadGuilds = async () => {
  try {
    guildsData.value = await fetchGuilds(token.value);
    if (guildsData.value.myGuild) {
      selectedGuild.value = await fetchGuild(guildsData.value.myGuild.id, token.value);
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('工会大厅加载失败', 'Failed to load guild hall'));
  }
};

const handleJoinGuild = async (guildId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    await joinGuild(guildId, token.value);
    await Promise.all([loadMe(), loadGuilds()]);
    setStatus(copy('已切换工会，为新的组织贡献摸鱼能量。', 'Guild switched. Future records will contribute to the new guild.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('加入工会失败', 'Failed to join guild'));
  }
};

const loadCircles = async () => {
  try {
    circlesData.value = await fetchCircles(token.value);
    const first = selectedCircle.value?.circle ?? circlesData.value.joined[0] ?? circlesData.value.hot[0] ?? circlesData.value.circles[0];
    if (first) await selectCircle(first.id);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('圈子广场加载失败', 'Failed to load circles'));
  }
};

const selectCircle = async (circleId: number) => {
  try {
    const [detail, feed] = await Promise.all([fetchCircle(circleId, token.value), fetchCircleFeed(circleId, token.value)]);
    selectedCircle.value = detail;
    circleFeed.value = feed.records;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('圈子详情加载失败', 'Failed to load circle details'));
  }
};

const handleJoinCircle = async (circleId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    await joinCircle(circleId, token.value);
    await loadCircles();
    setStatus(copy('已加入圈子，这条鱼找到了同温层。', 'Joined the circle.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('加入圈子失败', 'Failed to join circle'));
  }
};

const loadGroups = async () => {
  if (!token.value) {
    groupsData.value = null;
    selectedGroup.value = null;
    groupFeed.value = [];
    form.groupIds = [];
    return;
  }
  try {
    groupsData.value = await fetchGroups(token.value);
    const allowedIds = new Set(groupsData.value.groups.map((group) => group.id));
    form.groupIds = form.groupIds.filter((id) => allowedIds.has(id));
    const first = selectedGroup.value?.group ?? groupsData.value.groups[0];
    if (first) await selectGroup(first.id);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('我的小组加载失败', 'Failed to load groups'));
  }
};

const selectGroup = async (groupId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const [detail, feed] = await Promise.all([fetchGroup(groupId, token.value), fetchGroupFeed(groupId, token.value)]);
    selectedGroup.value = detail;
    groupFeed.value = feed.records;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('小组详情加载失败', 'Failed to load group details'));
  }
};

const handleCreateGroup = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await createGroup({ ...groupForm }, token.value);
    groupForm.name = '';
    groupForm.description = '';
    groupForm.visibility = 'public';
    await loadGroups();
    await selectGroup(response.group.id);
    await loadWallet();
    setStatus(copy('小组已创建，已消耗 50 鱼鳞。请不要把真实公司名写进地下茶水间。', 'Group created. 50 Fish Scale spent. Do not use real company names.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('创建小组失败', 'Failed to create group'));
  }
};

const handleGroupChallenge = async (challengeName: string) => {
  if (!token.value) return setError(t('needLogin'));
  if (!selectedGroup.value) return setError(copy('请先选择一个小组。', 'Select a group first.'));
  try {
    const response = await startGroupChallenge(selectedGroup.value.group.id, challengeName, token.value);
    await loadWallet();
    setStatus(response.message || copy('小组挑战已发起，消耗 30 鱼鳞。', 'Group challenge started. 30 Fish Scale spent.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('发起小组挑战失败', 'Failed to start group challenge'));
  }
};

const handleJoinGroup = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await joinGroupByCode(inviteCode.value, token.value);
    inviteCode.value = '';
    await loadGroups();
    await selectGroup(response.group.id);
    setStatus(copy('已通过邀请码加入小组。', 'Joined the group by invite code.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('加入小组失败', 'Failed to join group'));
  }
};

const handleFeedLike = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await likeRecord(recordId, token.value);
    upsertFeedRecord(response.record);
    await Promise.all([loadLeaderboard(), loadGuilds().catch(() => undefined), loadWallet().catch(() => undefined)]);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('点赞失败', 'Failed to like record'));
  }
};

const handleFeedNominate = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await nominateLegend(recordId, token.value);
    upsertFeedRecord(response.record);
    await Promise.all([loadLeaderboard(), loadGuilds().catch(() => undefined), loadCircles().catch(() => undefined), loadWallet().catch(() => undefined)]);
    setStatus(copy('传奇提名已更新，若为新提名将消耗 10 鱼鳞。', 'Legend nomination updated. New nominations cost 10 Fish Scale.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('传奇提名失败', 'Failed to nominate legend'));
  }
};

const handleFeedComment = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  const content = (feedCommentDrafts[recordId] ?? '').trim();
  if (content.length < 2 || content.length > 120) {
    return setError(copy('评论需要 2-120 字，并且不要写真实公司、客户或聊天记录。', 'Comments must be 2-120 characters and contain no real company, client, or chat-record information.'));
  }
  try {
    const response = await commentRecord(recordId, content, token.value);
    feedCommentDrafts[recordId] = '';
    upsertFeedRecord(response.record);
    await loadSocial(recordId);
    await loadWallet();
    setStatus(copy('评论已发布。', 'Comment posted.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('评论失败', 'Failed to post comment'));
  }
};

const handleFeedReport = async (recordId: number) => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await reportRecord(recordId, copy('疑似包含未匿名化信息', 'Possibly contains non-anonymized information'), token.value);
    upsertFeedRecord(response.record);
    setStatus(copy('已提交举报，管理员会在审核队列里处理。', 'Report submitted for review.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('举报失败', 'Failed to report record'));
  }
};

const refreshStats = async () => {
  try {
    stats.value = await fetchStats();
  } catch {
    stats.value = null;
  }
};

const loadAnnouncements = async () => {
  try {
    const response = await fetchAnnouncements();
    announcements.value = response.announcements;
  } catch {
    announcements.value = [];
  }
};

const loadCheckin = async () => {
  if (!token.value) {
    checkin.value = null;
    return;
  }
  try {
    checkin.value = await fetchCheckin(token.value);
  } catch {
    checkin.value = null;
  }
};

const loadWallet = async () => {
  if (!token.value) {
    walletData.value = null;
    walletTransactions.value = null;
    return;
  }
  try {
    walletData.value = await fetchWallet(token.value);
    walletTransactions.value = await fetchWalletTransactions(token.value);
  } catch {
    walletData.value = null;
    walletTransactions.value = null;
  }
};

const refreshNotificationUnreadCount = async () => {
  if (!token.value) {
    notificationUnreadCount.value = 0;
    return;
  }
  try {
    notificationUnreadCount.value = (await fetchNotificationUnreadCount(token.value)).count;
  } catch {
    notificationUnreadCount.value = 0;
  }
};

const handleCheckin = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    checkin.value = await submitCheckin(checkinNote.value, token.value);
    checkinNote.value = '';
    setStatus(
      checkin.value.alreadyChecked
        ? copy('今天已经签到过了。', 'You have already checked in today.')
        : copy('签到成功，今天也把精神状态存档了。', 'Check-in complete. Today’s office mood is archived.')
    );
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('签到失败', 'Check-in failed'));
  }
};

const handleFeedbackSubmit = async () => {
  if (feedbackForm.content.trim().length < 5) {
    return setError(copy('建议至少需要 5 个字，尽量具体但不要写真实公司或客户信息。', 'Feedback needs at least 5 characters. Be specific, but do not include real company or client information.'));
  }
  feedbackLoading.value = true;
  try {
    const response = await submitSuggestion(
      {
        ...feedbackForm,
        nickname: currentUser.value?.displayName ?? form.nickname
      },
      token.value
    );
    feedbackForm.category = 'feature';
    feedbackForm.content = '';
    feedbackForm.contact = '';
    feedbackSubmitted.value = true;
    setStatus(response.status === 'pending' ? copy('建议已提交，因包含敏感提示会先进入审核。', 'Feedback submitted and queued for review.') : copy('建议已提交。', 'Feedback submitted.'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('提交建议失败', 'Failed to submit feedback'));
  } finally {
    feedbackLoading.value = false;
  }
};

const loadMe = async () => {
  if (!token.value) return;
  try {
    const response = await fetchMe(token.value);
    currentUser.value = response.user;
    badges.value = response.badges;
    if (response.user) {
      profileForm.displayName = response.user.displayName;
      profileForm.bio = response.user.bio;
      form.nickname = response.user.displayName;
      locale.value = response.user.locale === 'en-US' ? 'en-US' : 'zh-CN';
      localStorage.setItem('gongwei-yuwang-locale', locale.value);
      await loadProfile(response.user.username);
      await loadGroups();
      await loadCheckin();
      await loadWallet();
      await refreshNotificationUnreadCount();
      if (response.user.isAdmin) await loadAdminQueue();
    }
  } catch {
    localStorage.removeItem('gongwei-yuwang-token');
    token.value = null;
    currentUser.value = null;
    notificationUnreadCount.value = 0;
  }
};

const loadProfile = async (username = currentUser.value?.username) => {
  if (!username) return;
  try {
    profile.value = await fetchProfile(username);
  } catch {
    profile.value = null;
  }
};

const handleAuth = async () => {
  try {
    const payload = {
      username: authForm.username,
      password: authForm.password,
      displayName: authForm.displayName || authForm.username,
      locale: locale.value
    };
    const response = authMode.value === 'register' ? await registerUser(payload) : await loginUser(payload);
    token.value = response.token;
    currentUser.value = response.user;
    localStorage.setItem('gongwei-yuwang-token', response.token);
    form.nickname = response.user.displayName;
    profileForm.displayName = response.user.displayName;
    profileForm.bio = response.user.bio;
    authForm.password = '';
    await loadMe();
    setStatus(copy(`${response.user.displayName} 已登录`, `${response.user.displayName} signed in`));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('账号操作失败', 'Account action failed'));
  }
};

const logout = () => {
  localStorage.removeItem('gongwei-yuwang-token');
  token.value = null;
  currentUser.value = null;
  profile.value = null;
  walletData.value = null;
  walletTransactions.value = null;
  notificationUnreadCount.value = 0;
  badges.value = [];
  adminQueue.value = null;
  groupsData.value = null;
  selectedGroup.value = null;
  groupFeed.value = [];
  checkin.value = null;
  checkinNote.value = '';
  form.groupIds = [];
  setStatus(copy('已退出登录', 'Signed out'));
};

const saveProfile = async () => {
  if (!token.value) return setError(t('needLogin'));
  try {
    const response = await updateMe({ displayName: profileForm.displayName, bio: profileForm.bio, locale: locale.value }, token.value);
    currentUser.value = response.user;
    badges.value = response.badges;
    if (response.user) {
      form.nickname = response.user.displayName;
      await loadProfile(response.user.username);
    }
    setStatus(copy('个人资料已保存', 'Profile saved'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('保存失败', 'Save failed'));
  }
};

const changeLocale = async () => {
  localStorage.setItem('gongwei-yuwang-locale', locale.value);
  if (!currentUser.value && (form.nickname === '匿名鱼' || form.nickname === 'Anonymous Fish')) {
    form.nickname = locale.value === 'en-US' ? 'Anonymous Fish' : '匿名鱼';
  }
  if (token.value && currentUser.value) {
    await updateMe({ locale: locale.value }, token.value).catch(() => undefined);
  }
};

const loadSocial = async (recordId: number) => {
  selectedRecordId.value = recordId;
  try {
    social.value = await fetchSocial(recordId, token.value);
    shareCard.value = social.value.shareCard;
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('互动信息加载失败', 'Failed to load interactions'));
  }
};

const openProfileRecord = async (recordId: number) => {
  await loadSocial(recordId);
  jumpToSection('social');
};

const handleSubmit = async () => {
  if (!canSubmit.value) return;
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await submitRecord(
      {
        nickname: form.nickname,
        activity_text: form.activityText,
        duration: form.duration,
        story_text: form.description,
        topics: form.topics,
        anonymized: form.anonymized,
        anonymous_confirm: form.anonymized,
        publish_scope: form.privateOnly ? 'private' : form.publishToCommunity ? 'community' : 'groups',
        publishToCommunity: form.publishToCommunity,
        autoCircles: form.autoCircles,
        privateOnly: form.privateOnly,
        groupIds: form.privateOnly ? [] : form.groupIds
      },
      token.value
    );

    lastResult.value = response;
    form.activityText = '';
    form.description = '';
    form.topics = [];
    topicDraft.value = '';
    topicError.value = '';
    form.creativity = CREATIVITY_LEVELS[0].key;
    leaderboardRows.value = response.leaderboards[activeBoard.value] ?? response.leaderboards.today;
    await Promise.all([refreshStats(), response.record.status === 'approved' ? loadSocial(response.record.id) : Promise.resolve()]);
    await Promise.all([
      loadCommunity().catch(() => undefined),
      loadPopularTopics().catch(() => undefined),
      loadGuilds().catch(() => undefined),
      loadCircles().catch(() => undefined),
      loadGroups().catch(() => undefined)
    ]);
    if (currentUser.value) {
      await Promise.all([loadMe(), loadWallet(), currentUser.value.isAdmin ? loadAdminQueue() : Promise.resolve()]);
    }
    setStatus(
      response.fishScaleReward?.awardedAmount
        ? response.fishScaleReward.message
        : response.record.status === 'pending'
          ? copy('记录已提交，等待审核。', 'Record submitted for review.')
          : copy('记录已上榜。', 'Record submitted and ranked.')
    );
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('提交失败', 'Submit failed'));
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  form.activityText = '';
  form.duration = DURATIONS[1].key;
  form.risk = RISKS[1].key;
  form.disguise = DISGUISES[0].key;
  form.creativity = CREATIVITY_LEVELS[0].key;
  form.description = '';
  form.topics = [];
  topicDraft.value = '';
  topicError.value = '';
  form.anonymized = false;
  form.publishToCommunity = true;
  form.autoCircles = true;
  form.privateOnly = false;
  form.groupIds = [];
  errorMessage.value = '';
};

const startNewRecord = () => {
  resetForm();
  jumpToSection('submit');
};

const handlePrivateOnlyChange = () => {
  if (form.privateOnly) {
    form.publishToCommunity = false;
    form.autoCircles = false;
    form.groupIds = [];
  }
};

const handleCommunityScopeChange = () => {
  if (form.publishToCommunity) {
    form.privateOnly = false;
  }
};

const handleInteraction = async (action: 'like' | 'favorite' | 'vote') => {
  if (!token.value) return setError(t('needLogin'));
  const record = selectedRecord.value;
  if (!record) return setError(t('noRecord'));
  const current = action === 'like' ? social.value?.viewer.liked : action === 'favorite' ? social.value?.viewer.favorited : social.value?.viewer.voted;
  try {
    social.value = await toggleInteraction(record.id, { action, active: !current }, token.value);
    shareCard.value = social.value.shareCard;
    await Promise.all([loadLeaderboard(), loadMe(), loadWallet()]);
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('互动失败', 'Interaction failed'));
  }
};

const handleComment = async () => {
  if (!token.value) return setError(t('needLogin'));
  const record = selectedRecord.value;
  if (!record) return setError(t('noRecord'));
  try {
    social.value = await postComment(record.id, commentText.value, token.value);
    commentText.value = '';
    await Promise.all([loadLeaderboard(), loadMe(), loadWallet()]);
    setStatus(copy('评论已发布', 'Comment posted'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('评论失败', 'Failed to post comment'));
  }
};

const handleShare = async () => {
  const record = selectedRecord.value;
  if (!record) return setError(t('noRecord'));
  try {
    shareCard.value = await shareRecord(record.id);
    await loadSocial(record.id);
    setStatus(copy('分享卡已生成', 'Share card generated'));
  } catch (error) {
    setError(error instanceof Error ? error.message : copy('分享失败', 'Share failed'));
  }
};

const loadAdminQueue = async () => {
  if (!token.value || !currentUser.value?.isAdmin) return;
  try {
    adminQueue.value = await fetchAdminQueue(token.value);
  } catch {
    adminQueue.value = null;
  }
};

const handleReviewRecord = async (recordId: number, status: 'approved' | 'rejected') => {
  if (!token.value) return;
  await reviewRecord(recordId, status, status === 'approved' ? copy('页面审核通过', 'Approved from page') : copy('页面审核拒绝', 'Rejected from page'), token.value);
  await Promise.all([loadAdminQueue(), loadLeaderboard(), refreshStats()]);
};

const handleReviewComment = async (commentId: number, status: 'approved' | 'rejected') => {
  if (!token.value) return;
  await reviewComment(commentId, status, status === 'approved' ? copy('页面审核通过', 'Approved from page') : copy('页面审核拒绝', 'Rejected from page'), token.value);
  await Promise.all([loadAdminQueue(), selectedRecordId.value ? loadSocial(selectedRecordId.value) : Promise.resolve()]);
};

provide(appContextKey, {
  activeBoard,
  activeSection,
  addTopic,
  addTopicFromDraft,
  activityTextRemaining,
  adminQueue,
  allProfileBadges,
  announcements,
  canSubmit,
  checkin,
  checkinNote,
  circleFeed,
  circlesData,
  clearLeaderboardFilter,
  commentText,
  communityFilter,
  communityLoading,
  communityRecords,
  copy,
  currentProfileTitle,
  currentUser,
  descriptionRemaining,
  displayedBadges,
  errorMessage,
  feedbackForm,
  feedbackLoading,
  feedbackSubmitted,
  feedCommentDrafts,
  filterKeyword,
  form,
  formatLevelRange,
  groupFeed,
  groupForm,
  groupsData,
  guildsData,
  authToken: token,
  handleCheckin,
  handleComment,
  handleCommunityScopeChange,
  handleCreateGroup,
  handleFeedComment,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  handleFeedbackSubmit,
  handleGroupChallenge,
  handleInteraction,
  handleJoinCircle,
  handleJoinGroup,
  handleJoinGuild,
  handlePrivateOnlyChange,
  handleReviewComment,
  handleReviewRecord,
  handleShare,
  handleSubmit,
  inviteCode,
  isCurrentLevel,
  joinedGroups,
  lastResult,
  leaderboardLoading,
  leaderboardResultCount,
  leaderboardRows,
  loadAnnouncements,
  loadLeaderboard,
  loadWallet,
  loading,
  locale,
  localizedLeaderboardTypes,
  notificationUnreadCount,
  openProfileRecord,
  openTopic,
  options,
  popularTopics,
  profile,
  profileForm,
  resetForm,
  refreshNotificationUnreadCount,
  removeTopic,
  saveProfile,
  selectedBoard,
  selectedCircle,
  selectedCircleRecords,
  selectedGroup,
  selectedGroupRecords,
  selectedGuild,
  selectedRecord,
  selectCircle,
  selectGroup,
  sensitiveHits,
  shareCard,
  showAllBadges,
  social,
  stats,
  statusMessage,
  t,
  topicDraft,
  topicError,
  topicSuggestions,
  isTopicSelected,
  translatedAnnouncement,
  translatedBadge,
  translatedChallenge,
  translatedCircleBoards,
  translatedCircleDescription,
  translatedCircleName,
  translatedGuildDescription,
  translatedGuildName,
  translatedMetric,
  translatedOptionLabel,
  translatedSystemComment,
  translatedTitle,
  unlockedBadges,
  walletData,
  walletTransactions
});

watch([activeBoard, filterKeyword], () => {
  void loadLeaderboard();
});

watch(communityFilter, () => {
  void loadCommunity();
});

watch(activeSection, (section) => {
  if (token.value) void refreshNotificationUnreadCount();
  if (section === 'community') void loadCommunity();
  if (section === 'guilds') void loadGuilds();
  if (section === 'circles') void loadCircles();
  if (section === 'groups') void loadGroups();
  if (section === 'announcements') void loadAnnouncements();
  if (section === 'checkin') void loadCheckin();
  if (section === 'wallet') void loadWallet();
});

onMounted(async () => {
  try {
    options.value = await fetchOptions();
  } catch {
    options.value = defaultOptions;
  }

  await Promise.all([loadMe(), loadLeaderboard(), refreshStats(), loadCommunity(), loadPopularTopics(), loadGuilds(), loadCircles(), loadAnnouncements()]);
});
</script>

<template>
  <RouterView v-if="isAdminStandalone" />
  <main v-else class="app-shell">
    <nav class="feature-nav" :aria-label="copy('MVP 功能导航', 'MVP feature navigation')">
      <div class="nav-brand">
        <span class="brand-mark">{{ copy('鱼', 'Y') }}</span>
        <div>
          <strong>{{ copy('工位鱼王', 'Gongwei Yuwang') }}</strong>
          <small>Gongwei Yuwang MVP</small>
        </div>
      </div>

      <div class="nav-language">
        <Languages :size="16" />
        <span>{{ t('language') }}</span>
        <select v-model="locale" @change="changeLocale">
          <option v-for="item in options.supportedLocales" :key="item.key" :value="item.key">{{ translatedLocaleLabel(item.key, item.label) }}</option>
        </select>
      </div>

      <div class="nav-account">
        <p>{{ t('account') }}</p>
        <template v-if="currentUser">
          <div class="account-card">
            <User :size="16" />
            <div>
              <strong>{{ currentUser.displayName }}</strong>
              <small>@{{ currentUser.username }} <span v-if="currentUser.isAdmin">· Admin</span></small>
            </div>
          </div>
          <div class="nav-account-actions">
            <button type="button" :class="{ active: activeSection === 'profile' }" @click="jumpToSection('profile')">
              <User :size="16" />
              <span>{{ t('profile') }}</span>
            </button>
            <button type="button" :class="{ active: activeSection === 'wallet' }" @click="jumpToSection('wallet')">
              <Coins :size="16" />
              <span>{{ t('wallet') }}</span>
            </button>
            <button type="button" :class="{ active: activeSection === 'notifications' }" @click="jumpToSection('notifications')">
              <Bell :size="16" />
              <span>{{ t('notifications') }}</span>
              <small v-if="notificationUnreadCount > 0">{{ notificationUnreadCount }} {{ copy('未读', 'unread') }}</small>
            </button>
            <button type="button" @click="logout">
              <LogOut :size="16" />
              <span>{{ t('logout') }}</span>
            </button>
          </div>
        </template>
        <template v-else>
          <div class="auth-tabs">
            <button type="button" :class="{ active: authMode === 'login' }" @click="authMode = 'login'">{{ t('login') }}</button>
            <button type="button" :class="{ active: authMode === 'register' }" @click="authMode = 'register'">{{ t('register') }}</button>
          </div>
          <PxInput v-model="authForm.username" :placeholder="t('username')" clearable />
          <PxInput v-model="authForm.password" :placeholder="t('password')" type="password" />
          <PxInput v-if="authMode === 'register'" v-model="authForm.displayName" :placeholder="t('displayName')" clearable />
          <PxButton type="primary" size="small" @click="handleAuth">
            <LogIn :size="14" />
            {{ authMode === 'register' ? t('register') : t('login') }}
          </PxButton>
        </template>
        <div class="account-nav-list">
          <button
            v-for="item in sidebarNavItems"
            :key="`account-page-${item.id}`"
            type="button"
            :class="{ active: activeSection === item.id }"
            @click="jumpToSection(item.id)"
          >
            <component :is="item.icon" :size="16" />
            <span>{{ t(item.labelKey) }}</span>
          </button>
          <button v-if="currentUser?.isAdmin" type="button" :class="{ active: activeSection === 'admin' }" @click="jumpToSection('admin')">
            <ClipboardCheck :size="16" />
            <span>{{ copy('\u5f85\u5ba1', 'Review') }} {{ pendingReviewCount }}</span>
          </button>
        </div>
      </div>

      <div class="nav-section social-nav">
        <p>{{ t('communitySystem') }}</p>
        <button
          v-for="item in socialNavItems"
          :key="`${item.id}-${item.labelKey}`"
          type="button"
          :class="{ active: activeSection === item.id }"
          @click="jumpToSection(item.id)"
        >
          <component :is="item.icon" :size="16" />
          <span>{{ t(item.labelKey) }}</span>
          <small>{{ locale === 'zh-CN' ? item.zhHint : item.enHint }}</small>
        </button>
      </div>

      <div class="nav-quick-panel">
        <p>{{ copy('快捷操作', 'Quick Actions') }}</p>
        <button type="button" @click="startNewRecord">
          <Send :size="14" />
          {{ copy('新建记录', 'New Record') }}
        </button>
        <button type="button" @click="jumpToSection('social')">
          <MessageCircle :size="14" />
          {{ t('comments') }}
        </button>
        <button type="button" @click="jumpToSection('safety')">
          <ShieldAlert :size="14" />
          {{ t('safety') }}
        </button>
      </div>

      <div class="nav-theme-switcher">
        <ThemeSwitcher :locale="locale" />
      </div>

      <div class="nav-stats" v-if="stats">
        <span>{{ t('total') }} {{ stats.totalRecords }}</span>
        <span>{{ t('today') }} {{ stats.todayRecords }}</span>
        <span>{{ t('top') }} {{ stats.topScore }}</span>
      </div>
    </nav>

    <RouterView />
  </main>
</template>
