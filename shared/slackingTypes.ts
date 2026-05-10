export type SlackingTypeOption = {
  id: string;
  label: string;
  labelEn: string;
  score: number;
  groupId: string;
  groupName: string;
  groupNameEn: string;
  description?: string;
  descriptionEn?: string;
  common?: boolean;
};

export type SlackingTypeGroup = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  options: SlackingTypeOption[];
};

const groupMeta = {
  basic: {
    name: '基础摸鱼',
    nameEn: 'Basic Slacking',
    description: '低风险、短时间、像日常呼吸一样自然。',
    descriptionEn: 'Low-risk, short, and as normal as office breathing.'
  },
  content: {
    name: '内容消费',
    nameEn: 'Content Consumption',
    description: '手机、短视频、小说和剧集带来的精神漂流。',
    descriptionEn: 'Phones, short videos, novels, and shows.'
  },
  social: {
    name: '社交闲聊',
    nameEn: 'Social Chat',
    description: '茶水间、八卦和消息窗口里的小范围交流。',
    descriptionEn: 'Break-room talk, gossip, and small chat windows.'
  },
  life: {
    name: '生活事务',
    nameEn: 'Life Errands',
    description: '把生活里的待办塞进工位空隙。',
    descriptionEn: 'Life tasks squeezed into desk time.'
  },
  rest: {
    name: '休息发呆',
    nameEn: 'Rest & Zoning Out',
    description: '从闭眼、发呆到超长午休的恢复性摸鱼。',
    descriptionEn: 'Restorative drifting, from zoning out to long lunch naps.'
  },
  meeting: {
    name: '会议摸鱼',
    nameEn: 'Meeting Slacking',
    description: '会议里看似认真，实际精神潜水。',
    descriptionEn: 'Looks attentive in meetings, mentally underwater.'
  },
  learning: {
    name: '带薪学习',
    nameEn: 'Paid Learning',
    description: '用工作时间给自己偷偷充电。',
    descriptionEn: 'Using paid time to quietly improve yourself.'
  },
  risky: {
    name: '高危操作',
    nameEn: 'High-Risk Moves',
    description: '分数高，但现实里不要挑战真实规章。',
    descriptionEn: 'High score, but do not challenge real workplace rules.'
  }
} as const;

const option = (
  groupId: keyof typeof groupMeta,
  input: Omit<SlackingTypeOption, 'groupId' | 'groupName' | 'groupNameEn'>
): SlackingTypeOption => ({
  ...input,
  groupId,
  groupName: groupMeta[groupId].name,
  groupNameEn: groupMeta[groupId].nameEn
});

export const SLACKING_TYPE_GROUPS: SlackingTypeGroup[] = [
  {
    id: 'basic',
    ...groupMeta.basic,
    options: [
      option('basic', {
        id: 'water-break',
        label: '喝水、上厕所、接水',
        labelEn: 'Water / restroom / refill',
        score: 5,
        description: '基础鱼类活动，风险很低。',
        descriptionEn: 'Basic low-risk fish activity.'
      }),
      option('basic', {
        id: 'water-refill',
        label: '喝水、接水',
        labelEn: 'Water refill',
        score: 5,
        description: '看似补水，实际换气。',
        descriptionEn: 'Looks like hydration, feels like resurfacing.',
        common: true
      }),
      option('basic', {
        id: 'desk-stretch',
        label: '工位拉伸',
        labelEn: 'Desk stretching',
        score: 8,
        description: '身体在拉伸，灵魂在重启。',
        descriptionEn: 'Body stretches while the soul reboots.'
      })
    ]
  },
  {
    id: 'content',
    ...groupMeta.content,
    options: [
      option('content', {
        id: 'phone-video',
        label: '刷手机、看短视频',
        labelEn: 'Phone or short videos',
        score: 15,
        description: '最常见的现代工位漂流。',
        descriptionEn: 'The classic modern desk drift.',
        common: true
      }),
      option('content', {
        id: 'short-video',
        label: '看短视频',
        labelEn: 'Short videos',
        score: 18,
        description: '一条接一条，时间感消失。',
        descriptionEn: 'One more clip until time disappears.',
        common: true
      }),
      option('content', {
        id: 'novel-comic-drama',
        label: '看小说、漫画或追剧',
        labelEn: 'Novels, comics, or shows',
        score: 35,
        description: '剧情推进比工作推进更稳定。',
        descriptionEn: 'Plot progression beats work progression.'
      }),
      option('content', {
        id: 'gaming',
        label: '打游戏',
        labelEn: 'Gaming',
        score: 45,
        description: '娱乐强度更高，风险也更明显。',
        descriptionEn: 'Higher entertainment, higher risk.'
      })
    ]
  },
  {
    id: 'social',
    ...groupMeta.social,
    options: [
      option('social', {
        id: 'gossip',
        label: '聊天、看八卦',
        labelEn: 'Chatting or office gossip',
        score: 20,
        description: '工位社交雷达启动。',
        descriptionEn: 'Desk social radar activated.'
      }),
      option('social', {
        id: 'tea-room-chat',
        label: '茶水间闲聊',
        labelEn: 'Break-room chatting',
        score: 18,
        description: '借接水之名交换精神天气。',
        descriptionEn: 'Trading mental weather near the water dispenser.'
      }),
      option('social', {
        id: 'muted-lurking',
        label: '静音潜水',
        labelEn: 'Muted lurking',
        score: 22,
        description: '人在群里，声卡离线。',
        descriptionEn: 'Present in the chat, absent from the audio.',
        common: true
      })
    ]
  },
  {
    id: 'life',
    ...groupMeta.life,
    options: [
      option('life', {
        id: 'shopping-food',
        label: '逛淘宝、点外卖',
        labelEn: 'Shopping or ordering food',
        score: 25,
        description: '生活事务精准插队。',
        descriptionEn: 'Life errands cut into the work queue.'
      }),
      option('life', {
        id: 'order-food',
        label: '点外卖',
        labelEn: 'Ordering food',
        score: 22,
        description: '午饭决策委员会正式开会。',
        descriptionEn: 'The lunch decision committee convenes.',
        common: true
      }),
      option('life', {
        id: 'personal-errand',
        label: '处理个人待办',
        labelEn: 'Personal errands',
        score: 28,
        description: '把生活任务塞进工位缝隙。',
        descriptionEn: 'Life tasks slipped between desk tasks.'
      })
    ]
  },
  {
    id: 'rest',
    ...groupMeta.rest,
    options: [
      option('rest', {
        id: 'nap',
        label: '睡觉、超长午休',
        labelEn: 'Nap or long lunch break',
        score: 50,
        description: '肉体离线，工位在线。',
        descriptionEn: 'Body offline, desk online.',
        common: true
      }),
      option('rest', {
        id: 'zoning-out',
        label: '盯屏发呆',
        labelEn: 'Staring into the screen',
        score: 20,
        description: '看着屏幕，脑内下班。',
        descriptionEn: 'Screen on, brain clocked out.'
      }),
      option('rest', {
        id: 'micro-nap',
        label: '短暂闭眼重启',
        labelEn: 'Micro nap reboot',
        score: 30,
        description: '假装思考，实际重启。',
        descriptionEn: 'Looks like thinking, actually rebooting.'
      })
    ]
  },
  {
    id: 'meeting',
    ...groupMeta.meeting,
    options: [
      option('meeting', {
        id: 'meeting-pretend',
        label: '会议中假装认真但实际摸鱼',
        labelEn: 'Pretending in a meeting',
        score: 65,
        description: '经典会议潜水项目。',
        descriptionEn: 'The classic meeting dive.'
      }),
      option('meeting', {
        id: 'fake-note-taking',
        label: '假装认真记笔记',
        labelEn: 'Fake note-taking',
        score: 55,
        description: '键盘在响，重点不详。',
        descriptionEn: 'Keyboard sounds productive; notes unclear.',
        common: true
      }),
      option('meeting', {
        id: 'camera-off-drift',
        label: '关摄像头精神漂移',
        labelEn: 'Camera-off drifting',
        score: 60,
        description: '头像在线，灵魂漫游。',
        descriptionEn: 'Avatar online, soul roaming.'
      })
    ]
  },
  {
    id: 'learning',
    ...groupMeta.learning,
    options: [
      option('learning', {
        id: 'learning-side-project',
        label: '带薪学习、副业、个人项目',
        labelEn: 'Paid learning / side project',
        score: 60,
        description: '表面工作，实际成长。',
        descriptionEn: 'Looks like work, feels like growth.'
      }),
      option('learning', {
        id: 'paid-learning',
        label: '带薪学习',
        labelEn: 'Paid learning',
        score: 55,
        description: '知识进入，工单暂缓。',
        descriptionEn: 'Knowledge in, tickets paused.',
        common: true
      }),
      option('learning', {
        id: 'personal-project',
        label: '个人项目推进',
        labelEn: 'Personal project progress',
        score: 70,
        description: '个人路线图悄悄前进。',
        descriptionEn: 'Personal roadmap quietly advances.'
      })
    ]
  },
  {
    id: 'risky',
    ...groupMeta.risky,
    options: [
      option('risky', {
        id: 'auto-online',
        label: '自动化脚本、远程假在线',
        labelEn: 'Automation or fake online',
        score: 80,
        description: '状态灯稳定，风险也稳定。',
        descriptionEn: 'Status light stable, risk stable too.'
      }),
      option('risky', {
        id: 'remote-fake-online',
        label: '远程假在线',
        labelEn: 'Remote fake online',
        score: 75,
        description: '在线状态负责营业。',
        descriptionEn: 'Online status does the office hours.',
        common: true
      }),
      option('risky', {
        id: 'whole-day-undetected',
        label: '基本一整天什么都没做且没人发现',
        labelEn: 'Whole day unnoticed',
        score: 100,
        description: '娱乐记录可以写，现实里别实践。',
        descriptionEn: 'Fine as entertainment; do not practice in reality.'
      })
    ]
  }
];

export const SLACKING_TYPE_OPTIONS = SLACKING_TYPE_GROUPS.flatMap((group) => group.options);
export const COMMON_SLACKING_TYPE_IDS = SLACKING_TYPE_OPTIONS.filter((item) => item.common).map((item) => item.id);

export const findSlackingTypeOption = (idOrLabel: string): SlackingTypeOption | undefined =>
  SLACKING_TYPE_OPTIONS.find((item) => item.id === idOrLabel || item.label === idOrLabel || item.labelEn === idOrLabel);

export const getSlackingTypeOption = (idOrLabel: string): SlackingTypeOption => {
  const option = findSlackingTypeOption(idOrLabel);
  if (!option) throw new Error(`Invalid slackingType: ${idOrLabel}`);
  return option;
};
