import { CREATIVITY_LEVELS, DISGUISES, RISKS, SLACKING_TYPES, getOptionLabel } from './scoring.js';

export const COMMENT_MAX_LENGTH = 120;
export const GROUP_NAME_MAX_LENGTH = 24;

export const GUILD_LEVELS = [
  { min: 0, max: 999, title: '临时摸鱼组织' },
  { min: 1000, max: 4999, title: '工位互助会' },
  { min: 5000, max: 19999, title: '带薪摸鱼工会' },
  { min: 20000, max: 99999, title: '大型办公地下组织' },
  { min: 100000, max: Number.POSITIVE_INFINITY, title: '摸鱼总工会' }
] as const;

export const OFFICIAL_GUILDS = [
  { slug: 'tea-room-expedition', name: '茶水间远征军', icon: '茶', description: '以接水、喝水、茶水间哲学为核心战术的松散组织。' },
  { slug: 'meeting-divers', name: '会议潜水队', icon: '会', description: '擅长在会议里保持头像稳定和眼神在线。' },
  { slug: 'excel-camouflage', name: 'Excel 伪装联盟', icon: '表', description: '所有窗口最后都会被解释成生产力工具。' },
  { slug: 'paid-learning-lab', name: '带薪学习研究会', icon: '学', description: '把精神成长和工位时间管理研究到极致。' },
  { slug: 'nap-extension', name: '午休延长委员会', icon: '休', description: '以稳定作息为名，研究午休边界。' },
  { slug: 'auto-online', name: '自动化假在线协会', icon: '自', description: '关注状态灯、脚本和远程在线幻术。' }
] as const;

export const OFFICIAL_CIRCLES = [
  { slug: 'meeting-fish', name: '会议摸鱼圈', icon: '会', description: '会议中假装认真但精神潜水的公共观察区。' },
  { slug: 'busy-camouflage', name: '假装忙碌圈', icon: '忙', description: 'Excel、IDE、多窗口与切屏技巧的匿名陈列柜。' },
  { slug: 'paid-learning', name: '带薪学习圈', icon: '学', description: '学习、副业、个人项目和精神成长鱼的聚集地。' },
  { slug: 'life-admin', name: '生活事务圈', icon: '生', description: '外卖、吃什么和日常琐事在工位上的匿名漂流瓶。' },
  { slug: 'short-video-dive', name: '短视频潜水圈', icon: '刷', description: '短视频和手机摸鱼记录的水下频道。' },
  { slug: 'tea-room-philosophy', name: '茶水间哲学圈', icon: '茶', description: '喝水、接水、上厕所路上的职场精神观察。' },
  { slug: 'nap-extension', name: '午休延长圈', icon: '休', description: '超长午休、睡觉和清醒失败研究所。' },
  { slug: 'auto-online', name: '自动化假在线圈', icon: '自', description: '脚本、远程在线和状态灯安全边界讨论区。' },
  { slug: 'worker-mood', name: '打工人精神状态圈', icon: '态', description: '记录办公人群的抽象精神天气。' },
  { slug: 'legend-watch', name: '传奇操作观察室', icon: '传', description: '高创意、高节目效果和传奇提名候选池。' }
] as const;

export const CIRCLE_FEATURED_BOARDS: Record<string, string[]> = {
  'meeting-fish': ['今日会议潜水王', '最会假装记笔记者', '被点名但圆过去榜'],
  'busy-camouflage': ['Excel 伪装大师', 'IDE 幻术师', '多窗口掩护榜'],
  'paid-learning': ['带薪自我提升榜', '工作时间阅读榜', '精神成长鱼榜'],
  'life-admin': ['今日生活事务员', '外卖决策榜', '晚饭研究会'],
  'short-video-dive': ['今日短视频潜水王', '划走但没划出工位榜'],
  'tea-room-philosophy': ['接水哲学家', '茶水间远征榜'],
  'nap-extension': ['午休边界探索榜', '稳定闭眼员工'],
  'auto-online': ['状态灯幻术榜', '远程在线观察榜'],
  'worker-mood': ['今日精神天气榜', '稳定发疯观察榜'],
  'legend-watch': ['传奇候选榜', '节目效果观察榜']
};

export const GROUP_CHALLENGES = [
  {
    name: '今天谁的精神状态最稳定？',
    condition: '提交一条普通但好笑的记录',
    reward: '稳定发疯员工'
  },
  {
    name: '本周小组摸鱼王',
    condition: '本周累计 Fish Power Score 最高',
    reward: '小组鱼王'
  },
  {
    name: '最会伪装成员',
    condition: '伪装加分最高',
    reward: '窗口切换术士'
  }
] as const;

export const getGuildLevel = (contribution: number): string =>
  GUILD_LEVELS.find((level) => contribution >= level.min && contribution <= level.max)?.title ?? GUILD_LEVELS[0].title;

export const getCircleSlugsForRecord = (input: {
  activityText?: string;
  storyText?: string;
  topics?: string[];
  slackingType?: string;
  risk?: string;
  disguise?: string;
  creativity?: string;
  legendNominations?: number;
}): string[] => {
  const slugs = new Set<string>(['worker-mood']);
  const slackingType = input.slackingType ?? '';
  const activityText = input.activityText ?? '';
  const storyText = input.storyText ?? '';
  const topicText = (input.topics ?? []).join(' ');
  const slackingTypeLabel = slackingType ? getOptionLabel(SLACKING_TYPES, slackingType) : '';
  const risk = input.risk ?? '';
  const disguise = input.disguise ?? '';
  const creativity = input.creativity ?? '';
  const riskLabel = risk ? getOptionLabel(RISKS, risk) : '';
  const disguiseLabel = disguise ? getOptionLabel(DISGUISES, disguise) : '';
  const creativityLabel = creativity ? getOptionLabel(CREATIVITY_LEVELS, creativity) : '';
  const text = `${activityText} ${storyText} ${topicText} ${slackingType} ${risk} ${disguise} ${creativity} ${slackingTypeLabel} ${riskLabel} ${disguiseLabel} ${creativityLabel}`;

  if (text.includes('会议') || risk === 'meeting' || risk === 'screen-share' || slackingType === 'meeting-pretend') {
    slugs.add('meeting-fish');
  }
  if (
    text.includes('Excel') ||
    text.includes('IDE') ||
    text.includes('多窗口') ||
    text.includes('切换窗口') ||
    ['window-switch', 'excel-ide', 'multi-window'].includes(disguise)
  ) {
    slugs.add('busy-camouflage');
  }
  if (text.includes('带薪学习') || text.includes('学习') || text.includes('副业') || text.includes('个人项目') || text.includes('代码') || slackingType === 'learning-side-project') {
    slugs.add('paid-learning');
  }
  if (text.includes('外卖') || text.includes('吃什么') || text.includes('晚饭') || slackingType === 'shopping-food') {
    slugs.add('life-admin');
  }
  if (text.includes('刷手机') || text.includes('短视频') || text.includes('手机') || slackingType === 'phone-video') {
    slugs.add('short-video-dive');
  }
  if (text.includes('喝水') || text.includes('上厕所') || text.includes('接水') || slackingType === 'water-break') {
    slugs.add('tea-room-philosophy');
  }
  if (text.includes('睡觉') || text.includes('午休') || slackingType === 'nap') {
    slugs.add('nap-extension');
  }
  if (text.includes('自动化') || text.includes('远程假在线') || slackingType === 'auto-online' || disguise === 'auto-online') {
    slugs.add('auto-online');
  }
  if (['showtime', 'everyone-laughed', 'legendary'].includes(creativity) || Number(input.legendNominations ?? 0) > 0) {
    slugs.add('legend-watch');
  }

  return [...slugs];
};
