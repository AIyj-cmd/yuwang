import { SAFETY_NOTICE } from '../shared/scoring.js';
import { db } from './database.js';

export type SiteSettings = {
  communityOpen: boolean;
  commentsOpen: boolean;
  groupCreationOpen: boolean;
  legendNominationOpen: boolean;
  commentMaxLength: number;
  descriptionMaxLength: number;
  defaultRecordStatus: 'published' | 'pending';
  safetyNotice: string;
};

const FALLBACK_SITE_SETTINGS: SiteSettings = {
  communityOpen: true,
  commentsOpen: true,
  groupCreationOpen: true,
  legendNominationOpen: true,
  commentMaxLength: 120,
  descriptionMaxLength: 180,
  defaultRecordStatus: 'published',
  safetyNotice: SAFETY_NOTICE
};

const parseBooleanSetting = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
};

const parsePositiveIntegerSetting = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getSiteSettings = (): SiteSettings => {
  try {
    const rows = db.prepare('SELECT key, value FROM site_settings').all() as { key: string; value: string }[];
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const safetyNotice = map.get('safety_notice')?.trim();

    return {
      communityOpen: parseBooleanSetting(map.get('community_open'), FALLBACK_SITE_SETTINGS.communityOpen),
      commentsOpen: parseBooleanSetting(map.get('comments_open'), FALLBACK_SITE_SETTINGS.commentsOpen),
      groupCreationOpen: parseBooleanSetting(map.get('group_creation_open'), FALLBACK_SITE_SETTINGS.groupCreationOpen),
      legendNominationOpen: parseBooleanSetting(map.get('legend_nomination_open'), FALLBACK_SITE_SETTINGS.legendNominationOpen),
      commentMaxLength: parsePositiveIntegerSetting(map.get('comment_max_length'), FALLBACK_SITE_SETTINGS.commentMaxLength),
      descriptionMaxLength: parsePositiveIntegerSetting(map.get('description_max_length'), FALLBACK_SITE_SETTINGS.descriptionMaxLength),
      defaultRecordStatus: map.get('default_record_status') === 'pending' ? 'pending' : 'published',
      safetyNotice: safetyNotice || FALLBACK_SITE_SETTINGS.safetyNotice
    };
  } catch {
    return { ...FALLBACK_SITE_SETTINGS };
  }
};
