/**
 * 展示层文本去重工具(纯前端,不改动后端字段或提交 payload)。
 *
 * 背景:速记快速投放只有一个输入框,但提交链路会把同一段文本同时写入
 * activity_text 与 story_text。因此社区卡片 / 动态详情页若分别渲染
 * activityText(标题)与 storyText/description(正文),会出现两段完全
 * 相同的内容。这里只做"展示是否重复"的安全判断,真实数据保持不变。
 */

/** 规范化:非字符串视为空;去首尾空白;连续空白 / 换行折叠为单个空格。 */
export const normalizeDisplayText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

/**
 * 判断两段展示文本是否重复。
 * 仅当两者规范化后均非空且完全一致时返回 true;
 * 任一为空(缺失正文 / 缺失标题)都不算重复,避免误删唯一内容。
 */
export const isDuplicateDisplayText = (primary: unknown, secondary: unknown): boolean => {
  const a = normalizeDisplayText(primary);
  const b = normalizeDisplayText(secondary);
  return a.length > 0 && b.length > 0 && a === b;
};
