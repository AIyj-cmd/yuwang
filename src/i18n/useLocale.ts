import { ref, watch } from 'vue';
import type { Announcement, Badge } from '../types';
import {
  announcementTranslations,
  badgeTranslations,
  challengeTranslations,
  circleTranslations,
  guildTranslations,
  messages,
  optionTranslations,
  systemCommentTranslations,
  titleTranslations
} from './messages';
import type { Locale, MessageKey } from './messages';

const LOCALE_STORAGE_KEY = 'gongwei-yuwang-locale';

const normalizeLocale = (value: string | null | undefined): Locale => (value === 'en-US' ? 'en-US' : 'zh-CN');

export const useLocale = () => {
  const locale = ref<Locale>(normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY)));

  const setLocale = (value: string | null | undefined) => {
    locale.value = normalizeLocale(value);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale.value);
  };

  watch(locale, (value) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, value);
  });

  const t = (key: MessageKey) => messages[locale.value][key] ?? messages['zh-CN'][key];
  const copy = (zh: string, en: string) => (locale.value === 'en-US' ? en : zh);
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
  const translatedLocaleLabel = (key: string, fallback: string) => (locale.value === 'en-US' && key === 'zh-CN' ? 'Simplified Chinese' : fallback);

  return {
    locale,
    setLocale,
    t,
    copy,
    translatedAnnouncement,
    translatedBadge,
    translatedChallenge,
    translatedCircleBoards,
    translatedCircleDescription,
    translatedCircleName,
    translatedGuildDescription,
    translatedGuildName,
    translatedLocaleLabel,
    translatedOptionLabel,
    translatedSystemComment,
    translatedTitle
  };
};

export type UseLocaleReturn = ReturnType<typeof useLocale>;
export type { Locale, MessageKey };
