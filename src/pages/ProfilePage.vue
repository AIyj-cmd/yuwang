<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  Award,
  BadgeCheck,
  BarChart3,
  ChevronsDown,
  Coins,
  Crown,
  Edit3,
  Fish,
  Hash,
  Heart,
  MessageCircle,
  RefreshCw,
  Save,
  Star,
  Trophy,
  User,
  Users,
  X,
  Zap
} from 'lucide-vue-next';
import { PxButton, PxCard, PxInput, PxTag } from '@mmt817/pixel-ui';
import { TITLE_LEVELS } from '../../shared/scoring';
import { useAppContext } from '../appContext';
import { useProfileInsights } from '../composables/useProfileInsights';
import type { Badge, RecordSummary } from '../types';

const router = useRouter();
const {
  currentUser,
  profile,
  profileForm,
  saveProfile,
  walletData,
  loadWallet,
  loadProfile,
  loadGuilds,
  guildsData,
  circlesData,
  groupsData,
  currentProfileTitle,
  allProfileBadges,
  unlockedBadges,
  openProfileRecord,
  t,
  copy,
  locale,
  translatedTitle,
  translatedBadge,
  formatLevelRange,
  isCurrentLevel
} = useAppContext();

const { profileInsights, profileInsightsLoading, loadProfileInsights } = useProfileInsights();

watch(
  () => profile.value?.user?.username,
  (username) => {
    void loadProfileInsights(username);
  },
  { immediate: true }
);

const isEditing = ref(false);
const badgeFilter = ref<'all' | 'unlocked'>('unlocked');
const recordLimit = ref(6);
const recordFilter = ref<'all' | 'approved' | 'pending' | 'hidden'>('all');
const insightsRefreshing = ref(false);

onMounted(() => {
  loadProfile();
  loadWallet();
  loadGuilds();
});

const userStats = computed(() => {
  if (!profile.value) return null;
  const totalRecords = profile.value.records.length;
  const totalScore = profile.value.totalScore;
  const avgScore = totalRecords > 0 ? totalScore / totalRecords : 0;
  const wallet = walletData.value;
  return { totalRecords, totalScore, avgScore, wallet };
});

const filteredBadges = computed(() => {
  const badges: Badge[] = allProfileBadges.value ?? [];
  return badgeFilter.value === 'unlocked'
    ? badges.filter((badge) => badge.unlocked)
    : badges;
});

const currentLevel = computed(() => {
  if (!profile.value) return null;
  return TITLE_LEVELS.find(level => isCurrentLevel(level)) ?? null;
});

const nextLevelInfo = computed(() => {
  if (!profile.value) return null;
  const total = profile.value.totalScore;
  return TITLE_LEVELS.find(level => level.min > total) ?? null;
});

const levelProgressPct = computed(() => {
  if (!profile.value || !currentLevel.value || !nextLevelInfo.value) return 100;
  const range = nextLevelInfo.value.min - currentLevel.value.min;
  const progress = profile.value.totalScore - currentLevel.value.min;
  return Math.min(100, Math.max(0, (progress / range) * 100));
});

const levelProgressText = computed(() => {
  if (!profile.value || !nextLevelInfo.value) return copy('已满级', 'Max Level');
  const remaining = nextLevelInfo.value.min - profile.value.totalScore;
  return copy(`距下一级还差 ${remaining.toFixed(1)} 分`, `${remaining.toFixed(1)} pts to next level`);
});

/* 热力图 */
const HEATMAP_WEEKS = 18;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;

interface HeatmapDay {
  date: Date;
  dateStr: string;
  score: number;
  count: number;
  level: number;
}

interface HeatmapWeek {
  index: number;
  days: HeatmapDay[];
  monthLabel: string;
}

const heatmapWeeks = computed<HeatmapWeek[]>(() => {
  if (!profile.value) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - HEATMAP_DAYS + 1);

  const records = profile.value.records;
  const days: HeatmapDay[] = [];

  for (let i = 0; i < HEATMAP_DAYS; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayRecords = records.filter((r: RecordSummary) => {
      const rDate = new Date(r.createdAt).toISOString().split('T')[0];
      return rDate === dateStr;
    });

    const score = dayRecords.reduce((sum: number, r: RecordSummary) => sum + r.score, 0);
    const count = dayRecords.length;

    let level = 0;
    if (count > 0) {
      if (score < 60) level = 1;
      else if (score < 120) level = 2;
      else if (score < 200) level = 3;
      else level = 4;
    }

    days.push({ date, dateStr, score, count, level });
  }

  const weeks: HeatmapWeek[] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const weekDays = days.slice(w * 7, w * 7 + 7);
    const firstDay = weekDays[0];
    const monthLabel = firstDay.date.getDate() <= 7 || w === 0
      ? firstDay.date.toLocaleDateString(locale.value === 'en-US' ? 'en' : 'zh-CN', { month: 'short' })
      : '';
    weeks.push({ index: w, days: weekDays, monthLabel });
  }

  return weeks;
});

const recordFilters = computed(() => [
  { key: 'all' as const, label: copy('全部', 'All') },
  { key: 'approved' as const, label: copy('已通过', 'Approved') },
  { key: 'pending' as const, label: copy('审核中', 'Pending') },
  { key: 'hidden' as const, label: copy('已隐藏', 'Hidden') }
]);

const filteredRecords = computed(() => {
  if (!profile.value) return [];
  let list = [...profile.value.records];
  if (recordFilter.value !== 'all') {
    list = list.filter(r => r.status === recordFilter.value);
  }
  return list;
});

const handleSaveProfile = async () => {
  await saveProfile();
  isEditing.value = false;
};

const goWallet = () => router.push('/profile/wallet');
const goSubmit = () => router.push('/submit');
const goGuild = (id: number) => router.push(`/guilds/${id}`);
const goCircle = (id: number) => router.push(`/circles/${id}`);
const goGroup = (id: number) => router.push(`/groups/${id}`);

const refreshInsights = async () => {
  insightsRefreshing.value = true;
  await loadProfileInsights(profile.value?.user?.username);
  insightsRefreshing.value = false;
};

const statusTagType = (status: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'approved':
    case 'published': return 'success';
    case 'pending': return 'warning';
    case 'hidden':
    case 'rejected': return 'danger';
    default: return 'info';
  }
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    approved: copy('已通过', 'Approved'),
    published: copy('已发布', 'Published'),
    pending: copy('审核中', 'Pending'),
    hidden: copy('已隐藏', 'Hidden'),
    rejected: copy('已驳回', 'Rejected')
  };
  return map[status] ?? status;
};

const myGuild = computed(() => guildsData.value?.myGuild);
const joinedCircles = computed(() => circlesData.value?.joined ?? []);
const joinedGroups = computed(() => groupsData.value?.groups ?? []);
const hasSocialLinks = computed(() =>
  !!myGuild.value || joinedCircles.value.length > 0 || joinedGroups.value.length > 0
);
</script>

<template>
  <div class="pp-page">
    <!-- 未登录 -->
    <div v-if="!currentUser" class="pp-empty-state">
      <Fish :size="48" />
      <p>{{ t('needLogin') }}</p>
      <PxButton type="primary" @click="router.push('/')">
        {{ copy('去登录', 'Sign In') }}
      </PxButton>
    </div>

    <template v-else>
      <!-- ==================== HERO ==================== -->
      <section class="pp-hero">
        <div class="pp-avatar">
          {{ (profile?.user?.displayName?.[0] ?? currentUser?.displayName?.[0] ?? '鱼').toUpperCase() }}
        </div>
        <div class="pp-hero-text">
          <div class="pp-hero-name-row">
            <h1 class="pp-name">{{ profile?.user?.displayName ?? currentUser?.displayName ?? '-' }}</h1>
            <button class="pp-hero-edit" @click="isEditing = !isEditing">
              <component :is="isEditing ? X : Edit3" :size="13" />
            </button>
          </div>
          <p class="pp-handle">@{{ profile?.user?.username ?? currentUser?.username ?? '-' }}</p>
          <p v-if="profile?.user?.bio || profileForm.bio" class="pp-bio">
            {{ profile?.user?.bio || profileForm.bio }}
          </p>
          <div class="pp-hero-tags">
            <span class="pp-tag pp-tag--primary"><Crown :size="10" /> {{ currentProfileTitle }}</span>
            <span v-if="profile?.user?.isAdmin" class="pp-tag pp-tag--danger">Admin</span>
          </div>
        </div>
        <div class="pp-hero-score">
          <span class="pp-score-label">Fish Power</span>
          <span class="pp-score-num">{{ (profile?.totalScore ?? 0).toFixed(1) }}</span>
        </div>
      </section>

      <!-- 编辑表单 -->
      <transition name="pp-fold">
        <div v-if="isEditing" class="pp-edit-wrap">
          <div class="pp-edit-form">
            <label class="pp-form-field">
              <span>{{ t('displayName') }}</span>
              <PxInput v-model="profileForm.displayName" clearable />
            </label>
            <label class="pp-form-field">
              <span>Bio</span>
              <textarea v-model="profileForm.bio" maxlength="120" rows="2" />
            </label>
            <div class="pp-edit-actions">
              <PxButton type="primary" size="small" @click="handleSaveProfile">
                <Save :size="14" /> {{ t('save') }}
              </PxButton>
              <PxButton type="base" size="small" @click="isEditing = false">
                {{ copy('取消', 'Cancel') }}
              </PxButton>
            </div>
          </div>
        </div>
      </transition>

      <!-- ==================== 快捷数据条 ==================== -->
      <nav class="pp-quick-stats">
        <div class="pp-quick-item">
          <BarChart3 :size="15" />
          <strong>{{ userStats?.totalRecords ?? 0 }}</strong>
          <span>{{ copy('记录', 'Records') }}</span>
        </div>
        <div class="pp-quick-item">
          <Zap :size="15" />
          <strong>{{ (userStats?.avgScore ?? 0).toFixed(1) }}</strong>
          <span>{{ copy('平均', 'Avg') }}</span>
        </div>
        <div class="pp-quick-item pp-quick-clickable" @click="goWallet">
          <Coins :size="15" />
          <strong>{{ userStats?.wallet?.wallet.fishScaleBalance ?? 0 }}</strong>
          <span>{{ copy('鱼鳞', 'Scale') }}</span>
        </div>
      </nav>

      <!-- ==================== 两栏主体 ==================== -->
      <div class="pp-body">
        <!-- 左栏 -->
        <div class="pp-col pp-col-left">
          <!-- 等级 -->
          <section class="pp-section">
            <div class="pp-section-head">
              <Award :size="15" />
              <h2>{{ t('levels') }}</h2>
            </div>
            <div class="pp-level-main">
              <div class="pp-level-current">
                <strong>{{ currentProfileTitle }}</strong>
                <span v-if="nextLevelInfo">{{ levelProgressText }}</span>
                <span v-else>{{ copy('已满级', 'Max Level') }}</span>
              </div>
              <div class="pp-pixel-bar">
                <div
                  v-for="n in 20"
                  :key="n"
                  class="pp-pixel-segment"
                  :class="{ filled: n <= Math.round(levelProgressPct / 100 * 20) }"
                />
              </div>
            </div>
            <div class="pp-level-list">
              <span
                v-for="level in TITLE_LEVELS"
                :key="level.title"
                class="pp-level-tag"
                :class="{ active: isCurrentLevel(level) }"
              >
                {{ translatedTitle(level.title) }}
              </span>
            </div>
          </section>

          <!-- 热力图 -->
          <section v-if="profile && profile.records.length > 0" class="pp-section">
            <div class="pp-section-head">
              <BarChart3 :size="15" />
              <h2>{{ copy('摸鱼热力图', 'Heatmap') }}</h2>
            </div>
            <div class="pp-heatmap">
              <div class="pp-heatmap-months">
                <span
                  v-for="week in heatmapWeeks"
                  :key="`m-${week.index}`"
                  class="pp-heatmap-month"
                  :class="{ visible: week.monthLabel }"
                >{{ week.monthLabel }}</span>
              </div>
              <div class="pp-heatmap-grid">
                <div v-for="week in heatmapWeeks" :key="week.index" class="pp-heatmap-week">
                  <div
                    v-for="(day, idx) in week.days"
                    :key="`${week.index}-${idx}`"
                    class="pp-heatmap-cell"
                    :class="`level-${day.level}`"
                    :title="`${day.dateStr} · ${day.count} ${copy('条', 'records')} · ${day.score.toFixed(1)} ${copy('分', 'pts')}`"
                  />
                </div>
              </div>
              <div class="pp-heatmap-legend">
                <span>{{ copy('少', 'Less') }}</span>
                <div class="pp-heatmap-cell level-0" />
                <div class="pp-heatmap-cell level-1" />
                <div class="pp-heatmap-cell level-2" />
                <div class="pp-heatmap-cell level-3" />
                <div class="pp-heatmap-cell level-4" />
                <span>{{ copy('多', 'More') }}</span>
              </div>
            </div>
          </section>

          <!-- 摸鱼画像 -->
          <section class="pp-section">
            <div class="pp-section-head">
              <Fish :size="15" />
              <h2>{{ copy('摸鱼画像', 'Persona') }}</h2>
              <button
                class="pp-refresh-btn"
                :class="{ spinning: insightsRefreshing }"
                :disabled="insightsRefreshing"
                @click="refreshInsights"
              >
                <RefreshCw :size="12" />
              </button>
            </div>

            <div v-if="profileInsightsLoading || insightsRefreshing" class="pp-placeholder">
              {{ copy('画像生成中...', 'Loading insights...') }}
            </div>

            <template v-else-if="profileInsights">
              <div v-if="profileInsights.totalRecords > 0" class="pp-persona">
                <div class="pp-persona-badge">
                  <Star :size="14" />
                  <strong>{{ profileInsights.persona.label }}</strong>
                </div>
                <p class="pp-persona-desc">{{ profileInsights.persona.description }}</p>

                <div class="pp-persona-metrics">
                  <div class="pp-metric">
                    <span>{{ copy('总次数', 'Total') }}</span>
                    <strong>{{ profileInsights.totalRecords }}</strong>
                  </div>
                  <div class="pp-metric">
                    <span>{{ copy('平均分', 'Avg') }}</span>
                    <strong>{{ profileInsights.averageScore.toFixed(1) }}</strong>
                  </div>
                  <div class="pp-metric">
                    <span>{{ copy('本周', 'Week') }}</span>
                    <strong>{{ profileInsights.weekActivity.records }}</strong>
                  </div>
                  <div class="pp-metric">
                    <span>{{ copy('本月', 'Month') }}</span>
                    <strong>{{ profileInsights.monthActivity.records }}</strong>
                  </div>
                  <div class="pp-metric">
                    <span>{{ copy('获赞', 'Likes') }}</span>
                    <strong>{{ profileInsights.interactions.likes }}</strong>
                  </div>
                  <div class="pp-metric">
                    <span>{{ copy('传奇提名', 'Legends') }}</span>
                    <strong>{{ profileInsights.interactions.legendNominations }}</strong>
                  </div>
                </div>

                <div
                  v-if="profileInsights.highestRecord"
                  class="pp-best-record"
                  @click="openProfileRecord(profileInsights.highestRecord.id)"
                >
                  <div class="pp-best-meta">
                    <span class="pp-tag pp-tag--warning">{{ copy('最高分', 'Best') }}</span>
                    <span>{{ translatedTitle(profileInsights.highestRecord.title) }}</span>
                  </div>
                  <strong class="pp-best-score">{{ profileInsights.highestRecord.score.toFixed(1) }}</strong>
                  <small>{{ profileInsights.highestRecord.activityText }}</small>
                </div>
              </div>

              <div v-else class="pp-placeholder">
                <p>{{ copy('还没有公开记录，提交一条后画像会自动生成。', 'No public records yet.') }}</p>
                <PxButton type="primary" size="small" @click="goSubmit">{{ copy('去提交', 'Submit') }}</PxButton>
              </div>
            </template>
          </section>
        </div>

        <!-- 右栏 -->
        <div class="pp-col pp-col-right">
          <!-- 社交链路 -->
          <section class="pp-section">
            <div class="pp-section-head">
              <Users :size="15" />
              <h2>{{ copy('我的归属', 'Social') }}</h2>
            </div>
            <div v-if="hasSocialLinks" class="pp-social-list">
              <button v-if="myGuild" class="pp-social-row" @click="goGuild(myGuild.id)">
                <span class="pp-social-emoji">{{ myGuild.icon }}</span>
                <div class="pp-social-text">
                  <strong>{{ myGuild.name }}</strong>
                  <span>{{ copy('工会', 'Guild') }} · {{ myGuild.totalContribution.toFixed(1) }}</span>
                </div>
              </button>
              <button
                v-for="circle in joinedCircles.slice(0, 3)"
                :key="`c-${circle.id}`"
                class="pp-social-row"
                @click="goCircle(circle.id)"
              >
                <span class="pp-social-emoji">{{ circle.icon }}</span>
                <div class="pp-social-text">
                  <strong>{{ circle.name }}</strong>
                  <span>{{ copy('圈子', 'Circle') }} · {{ circle.recordCount }} {{ copy('条', 'records') }}</span>
                </div>
              </button>
              <button
                v-for="group in joinedGroups.slice(0, 3)"
                :key="`g-${group.id}`"
                class="pp-social-row"
                @click="goGroup(group.id)"
              >
                <Hash :size="14" />
                <div class="pp-social-text">
                  <strong>{{ group.name }}</strong>
                  <span>{{ copy('小组', 'Group') }} · {{ group.memberCount }} {{ copy('人', 'members') }}</span>
                </div>
              </button>
            </div>
            <div v-else class="pp-placeholder">
              <p>{{ copy('还没有加入任何组织。', 'Not part of any organization yet.') }}</p>
            </div>
          </section>

          <!-- 徽章 -->
          <section class="pp-section">
            <div class="pp-section-head">
              <BadgeCheck :size="15" />
              <h2>{{ t('badges') }}</h2>
              <small class="pp-section-count">{{ unlockedBadges.length }} / {{ allProfileBadges.length }}</small>
            </div>
            <div class="pp-badge-filter">
              <button :class="{ active: badgeFilter === 'unlocked' }" @click="badgeFilter = 'unlocked'">
                {{ copy('已解锁', 'Unlocked') }}
              </button>
              <button :class="{ active: badgeFilter === 'all' }" @click="badgeFilter = 'all'">
                {{ copy('全部', 'All') }}
              </button>
            </div>
            <div class="pp-badge-list">
              <div
                v-for="badge in filteredBadges"
                :key="badge.key"
                class="pp-badge-row"
                :class="{ unlocked: badge.unlocked }"
              >
                <BadgeCheck :size="14" />
                <div class="pp-badge-text">
                  <strong>{{ translatedBadge(badge).label }}</strong>
                  <span>{{ translatedBadge(badge).description }}</span>
                </div>
              </div>
            </div>
            <div v-if="filteredBadges.length === 0" class="pp-placeholder">
              {{ copy('暂无徽章', 'No badges yet.') }}
            </div>
          </section>

          <!-- 近期记录 -->
          <section v-if="profile && profile.records.length > 0" class="pp-section">
            <div class="pp-section-head">
              <Trophy :size="15" />
              <h2>{{ copy('近期记录', 'Recent') }}</h2>
            </div>
            <div class="pp-record-filter">
              <button
                v-for="f in recordFilters"
                :key="f.key"
                :class="{ active: recordFilter === f.key }"
                @click="recordFilter = f.key"
              >
                {{ f.label }}
              </button>
            </div>
            <div v-if="filteredRecords.length === 0" class="pp-placeholder">
              {{ copy('该状态下没有记录。', 'No records in this status.') }}
            </div>
            <div v-else class="pp-record-list">
              <button
                v-for="record in filteredRecords.slice(0, recordLimit)"
                :key="record.id"
                class="pp-record-row"
                @click="openProfileRecord(record.id)"
              >
                <div class="pp-record-info">
                  <div class="pp-record-top">
                    <span class="pp-record-title">{{ translatedTitle(record.title) }}</span>
                    <PxTag :type="statusTagType(record.status)" size="small">{{ statusLabel(record.status) }}</PxTag>
                  </div>
                  <small class="pp-record-activity">{{ record.activityText }}</small>
                </div>
                <div class="pp-record-score">
                  <strong>{{ record.score.toFixed(1) }}</strong>
                  <small>{{ new Date(record.createdAt).toLocaleDateString() }}</small>
                </div>
              </button>
            </div>
            <div v-if="filteredRecords.length > recordLimit" class="pp-load-more">
              <button @click="recordLimit += 6">
                <ChevronsDown :size="14" /> {{ copy('加载更多', 'Load More') }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ===== 扁平像素风：零阴影，纯色块，硬边框 ===== */

.pp-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  display: grid;
  gap: 24px;
}

/* ===== Hero：扁平色块拼接 ===== */
.pp-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
}
.pp-avatar {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  font-family: var(--font-pixel);
  font-size: 22px;
  font-weight: 900;
}
.pp-hero-text {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.pp-hero-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pp-name {
  font-family: var(--font-pixel);
  font-size: 16px;
  font-weight: 900;
  margin: 0;
  color: var(--color-text);
  line-height: 1.2;
}
.pp-hero-edit {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}
.pp-hero-edit:hover {
  background: var(--color-border);
  color: var(--color-surface);
}
.pp-handle {
  font-size: 13px;
  color: var(--color-text-muted);
  font-weight: 700;
  margin: 0;
}
.pp-bio {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
  max-width: 360px;
}
.pp-hero-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}
.pp-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 900;
  border: 2px solid var(--color-border);
}
.pp-tag--primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.pp-tag--danger {
  background: var(--color-danger);
  color: var(--color-danger-text);
}
.pp-tag--warning {
  background: var(--color-warning);
  color: var(--color-text);
}
.pp-hero-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding-left: 20px;
  border-left: 3px solid var(--color-border);
  flex-shrink: 0;
}
.pp-score-label {
  font-size: 10px;
  color: var(--color-text-muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pp-score-num {
  font-family: var(--font-pixel);
  font-size: 22px;
  color: var(--color-text);
  line-height: 1;
}

/* ===== 编辑表单 ===== */
.pp-fold-enter-active,
.pp-fold-leave-active {
  transition: all 0.2s ease;
}
.pp-fold-enter-from,
.pp-fold-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
.pp-edit-wrap {
  overflow: hidden;
}
.pp-edit-form {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 3px solid var(--color-border);
  background: var(--color-surface-soft);
}
.pp-form-field {
  display: grid;
  gap: 6px;
}
.pp-form-field span {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.pp-form-field textarea {
  padding: 10px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-readable);
  font-size: 14px;
  resize: vertical;
}
.pp-edit-actions {
  display: flex;
  gap: 10px;
}

/* ===== 快捷数据条：扁平色块拼接 ===== */
.pp-quick-stats {
  display: flex;
  align-items: center;
  gap: 0;
}
.pp-quick-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  margin-right: -3px;
}
.pp-quick-item svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.pp-quick-item strong {
  font-family: var(--font-pixel);
  font-size: 15px;
  line-height: 1;
}
.pp-quick-item span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-quick-clickable {
  cursor: pointer;
}
.pp-quick-clickable:hover {
  background: var(--color-surface-soft);
}

/* ===== 两栏主体 ===== */
.pp-body {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  align-items: start;
}
.pp-col {
  display: grid;
  gap: 24px;
}

/* ===== 通用区块 ===== */
.pp-section {
  display: grid;
  gap: 14px;
}
.pp-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 3px solid var(--color-border);
  background: var(--color-ink-strong-bg);
}
.pp-section-head h2 {
  font-family: var(--font-pixel);
  font-size: 13px;
  font-weight: 900;
  margin: 0;
  color: var(--color-ink-strong-text);
  flex: 1;
  letter-spacing: 0.3px;
}
.pp-section-head svg {
  color: var(--color-ink-strong-text);
  padding: 3px;
  border: 2px solid var(--color-ink-strong-text);
  flex-shrink: 0;
}
.pp-section-count {
  font-size: 11px;
  color: var(--color-ink-strong-text);
  opacity: 0.85;
  font-weight: 800;
}

/* ===== 等级 ===== */
.pp-level-main {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 3px solid var(--color-border);
  background: var(--color-surface-soft);
}
.pp-level-current {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.pp-level-current strong {
  font-family: var(--font-pixel);
  font-size: 13px;
  color: var(--color-text);
}
.pp-level-current span {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-pixel-bar {
  display: flex;
  gap: 3px;
}
.pp-pixel-segment {
  flex: 1;
  height: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  transition: background 0.3s ease;
}
.pp-pixel-segment.filled {
  background: var(--color-primary);
}
.pp-level-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pp-level-tag {
  padding: 4px 10px;
  border: 2px solid var(--color-border-soft);
  background: var(--color-surface);
  font-size: 11px;
  font-weight: 800;
  color: var(--color-text-muted);
}
.pp-level-tag.active {
  border-color: var(--color-border);
  background: var(--color-accent);
  color: var(--color-text);
}

/* ===== 热力图 ===== */
.pp-heatmap {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 3px solid var(--color-border);
  background: var(--color-surface-soft);
}
.pp-heatmap-months {
  display: flex;
  gap: 3px;
}
.pp-heatmap-month {
  width: 14px;
  font-size: 9px;
  color: var(--color-text-muted);
  font-weight: 800;
  text-align: center;
  line-height: 1;
  visibility: hidden;
}
.pp-heatmap-month.visible {
  visibility: visible;
}
.pp-heatmap-grid {
  display: flex;
  gap: 3px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.pp-heatmap-week {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.pp-heatmap-cell {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}
.pp-heatmap-cell.level-1 {
  background: var(--color-accent);
  opacity: 0.5;
}
.pp-heatmap-cell.level-2 {
  background: var(--color-accent);
  opacity: 0.8;
}
.pp-heatmap-cell.level-3 {
  background: var(--color-accent);
  opacity: 1;
}
.pp-heatmap-cell.level-4 {
  background: var(--color-primary);
  opacity: 1;
}
.pp-heatmap-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 4px;
}
.pp-heatmap-legend span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}

/* ===== 摸鱼画像 ===== */
.pp-persona {
  display: grid;
  gap: 14px;
}
.pp-persona-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 3px solid var(--color-border);
  background: var(--color-primary);
  color: var(--color-primary-text);
  width: fit-content;
}
.pp-persona-badge strong {
  font-family: var(--font-pixel);
  font-size: 13px;
}
.pp-persona-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
}
.pp-persona-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 3px solid var(--color-border);
}
.pp-metric {
  display: grid;
  gap: 4px;
  padding: 14px 10px;
  background: var(--color-surface);
  text-align: center;
  border-right: 2px solid var(--color-border-soft);
  border-bottom: 2px solid var(--color-border-soft);
}
.pp-metric:nth-child(3n) {
  border-right: none;
}
.pp-metric:nth-last-child(-n+3) {
  border-bottom: none;
}
.pp-metric span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}
.pp-metric strong {
  font-family: var(--font-pixel);
  font-size: 15px;
  color: var(--color-text);
  line-height: 1;
}
.pp-best-record {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 3px solid var(--color-border);
  background: var(--color-warning);
  cursor: pointer;
}
.pp-best-record:hover {
  filter: brightness(0.97);
}
.pp-best-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pp-best-score {
  font-family: var(--font-pixel);
  font-size: 20px;
  color: var(--color-text);
}
.pp-best-record small {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
}

/* 刷新按钮 */
.pp-refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 2px solid var(--color-ink-strong-text);
  background: transparent;
  color: var(--color-ink-strong-text);
  cursor: pointer;
}
.pp-refresh-btn:hover {
  background: var(--color-ink-strong-text);
  color: var(--color-ink-strong-bg);
}
.pp-refresh-btn.spinning svg {
  animation: pp-spin 0.8s linear infinite;
}
@keyframes pp-spin {
  to { transform: rotate(360deg); }
}

/* ===== 社交链路 ===== */
.pp-social-list {
  display: grid;
  gap: 0;
  border: 3px solid var(--color-border);
}
.pp-social-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid var(--color-border-soft);
  transition: background 0.1s;
}
.pp-social-row:last-child {
  border-bottom: none;
}
.pp-social-row:hover {
  background: var(--color-surface-soft);
}
.pp-social-row svg {
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.pp-social-emoji {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  background: var(--color-primary);
  font-size: 14px;
  flex-shrink: 0;
}
.pp-social-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.pp-social-text strong {
  font-size: 13px;
  font-weight: 950;
}
.pp-social-text span {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}

/* ===== 徽章 ===== */
.pp-badge-filter {
  display: flex;
  gap: 8px;
}
.pp-badge-filter button {
  padding: 5px 12px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.pp-badge-filter button.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.pp-badge-list {
  display: grid;
  gap: 0;
  border: 3px solid var(--color-border);
}
.pp-badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  color: var(--color-text-muted);
  opacity: 0.5;
  border-bottom: 2px solid var(--color-border-soft);
}
.pp-badge-row:last-child {
  border-bottom: none;
}
.pp-badge-row.unlocked {
  opacity: 1;
  background: var(--color-accent);
  color: var(--color-text);
}
.pp-badge-row svg {
  flex-shrink: 0;
}
.pp-badge-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.pp-badge-text strong {
  font-size: 13px;
  font-weight: 950;
}
.pp-badge-text span {
  font-size: 11px;
  line-height: 1.4;
  opacity: 0.8;
}

/* ===== 记录 ===== */
.pp-record-filter {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pp-record-filter button {
  padding: 5px 10px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.pp-record-filter button.active {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.pp-record-list {
  display: grid;
  gap: 0;
  border: 3px solid var(--color-border);
}
.pp-record-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  border: none;
  border-bottom: 2px solid var(--color-border-soft);
  transition: background 0.1s;
}
.pp-record-row:last-child {
  border-bottom: none;
}
.pp-record-row:hover {
  background: var(--color-surface-soft);
}
.pp-record-info {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.pp-record-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.pp-record-title {
  font-size: 13px;
  font-weight: 950;
}
.pp-record-activity {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pp-record-score {
  display: grid;
  gap: 2px;
  text-align: right;
  flex-shrink: 0;
}
.pp-record-score strong {
  font-family: var(--font-pixel);
  font-size: 15px;
}
.pp-record-score small {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}

/* 加载更多 */
.pp-load-more {
  display: flex;
  justify-content: center;
  padding-top: 6px;
}
.pp-load-more button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.pp-load-more button:hover {
  background: var(--color-border);
  color: var(--color-surface);
}

/* 通用占位 */
.pp-placeholder {
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 700;
  border: 3px solid var(--color-border-soft);
  background: var(--color-surface-soft);
}
.pp-placeholder p {
  margin: 0 0 10px;
}

/* 空状态 */
.pp-empty-state {
  display: grid;
  place-items: center;
  gap: 14px;
  padding: 80px 24px;
  color: var(--color-text-muted);
  text-align: center;
  border: 3px solid var(--color-border);
  background: var(--color-surface);
}
.pp-empty-state p {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

/* ===== 响应式 ===== */
@media (max-width: 760px) {
  .pp-page {
    padding: 20px 16px 48px;
    gap: 20px;
  }
  .pp-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .pp-hero-score {
    border-left: none;
    border-top: 3px solid var(--color-border);
    padding: 12px 0 0;
    align-items: flex-start;
    width: 100%;
  }
  .pp-quick-stats {
    flex-wrap: wrap;
    gap: 0;
  }
  .pp-quick-item {
    margin-right: 0;
    margin-bottom: -3px;
    flex: 1;
    min-width: 120px;
  }
  .pp-body {
    grid-template-columns: 1fr;
  }
  .pp-persona-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .pp-metric:nth-child(3n) {
    border-right: 2px solid var(--color-border-soft);
  }
  .pp-metric:nth-last-child(-n+3) {
    border-bottom: 2px solid var(--color-border-soft);
  }
  .pp-metric:nth-child(2n) {
    border-right: none;
  }
  .pp-metric:last-child,
  .pp-metric:nth-last-child(2):nth-child(odd) {
    border-bottom: none;
  }
}

@media (max-width: 420px) {
  .pp-hero-main {
    flex-direction: column;
    align-items: flex-start;
  }
  .pp-persona-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .pp-record-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .pp-record-score {
    text-align: left;
    flex-direction: row;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
