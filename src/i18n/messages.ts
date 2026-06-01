export const messages = {
  'zh-CN': {
    mvpFeatures: '功能中心',
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
    account: '账号中心',
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
    mvpFeatures: 'Features',
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
    account: 'Account',
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

export const optionTranslations: Record<string, string> = {
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

export const titleTranslations: Record<string, string> = {
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

export const leaderboardTranslations: Record<string, { label: string; description: string }> = {
  today: { label: "Today's Slacking King", description: "Today's top aggregate score" },
  week: { label: 'Weekly Paid Slacking Board', description: 'Highest weekly aggregate score' },
  month: { label: 'Monthly Slacking Board', description: 'Highest monthly aggregate score' },
  season: { label: 'Season Fish King Board', description: 'Highest quarterly aggregate score' },
  disguise: { label: 'Camouflage Master Board', description: 'Highest disguise bonus total' },
  meeting: { label: 'Meeting Slacking Board', description: 'Meeting-related records' },
  legendary: { label: 'Legendary Fish Board', description: 'Community-nominated records' }
};

export const badgeTranslations: Record<string, { label: string; description: string }> = {
  'first-catch': { label: 'First Catch', description: 'Submit your first record' },
  'power-200': { label: 'Over 200', description: 'Reach 200 Fish Power in one record' },
  'power-500': { label: 'High-Pressure Torpedo', description: 'Reach 500 Fish Power in one record' },
  'meeting-fish': { label: 'Meeting Diver', description: 'Submit a meeting-related record' },
  'disguise-master': { label: 'Camouflage Master', description: 'Reach 30 disguise bonus in one record' },
  'legend-voter': { label: 'Legend Witness', description: 'Vote for a legendary record' },
  'social-fish': { label: 'Break Room Speaker', description: 'Post an approved comment' }
};

export const guildTranslations: Record<string, { name: string; description: string; level?: string }> = {
  'tea-room-expedition': { name: 'Break Room Expedition', description: 'A group that treats water refill routes like expeditions.' },
  'meeting-divers': { name: 'Meeting Divers', description: 'Specialists in staying underwater during meetings.' },
  'excel-camouflage': { name: 'Excel Camouflage Alliance', description: 'Everything can look productive through a spreadsheet.' },
  'paid-learning-lab': { name: 'Paid Learning Society', description: 'Turns working hours into self-improvement samples.' },
  'nap-extension': { name: 'Lunch Break Extension Committee', description: 'Studies the edge of a legal lunch break.' },
  'auto-online': { name: 'Auto Online Association', description: 'Keeps status lights and office moods stable.' }
};

export const circleTranslations: Record<string, { name: string; description: string; boards?: string[] }> = {
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

export const challengeTranslations: Record<string, { name: string; condition: string; reward: string }> = {
  '今天谁的精神状态最稳定？': { name: 'Who has the steadiest mood today?', condition: 'Submit an ordinary but funny record', reward: 'Stable Chaos Employee' },
  本周小组摸鱼王: { name: 'Weekly Group Fish King', condition: 'Highest weekly Fish Power Score', reward: 'Group Fish King' },
  最会伪装成员: { name: 'Best Camouflage Member', condition: 'Highest disguise bonus', reward: 'Window Switch Mage' }
};

export const announcementTranslations: Record<number, { title: string; body: string }> = {
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
    body: 'After signing in, you can check in from the Features section and track your streak. Check-ins record playful mood only, not real workplace identity.'
  }
};

export const systemCommentTranslations: Record<string, string> = {
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

export type Locale = keyof typeof messages;
export type MessageKey = keyof (typeof messages)['zh-CN'];
