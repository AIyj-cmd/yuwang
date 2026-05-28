<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppContext } from '../appContext';
import {
  fetchGuild,
  fetchGuildMembers,
  fetchGuildRanking,
  fetchGuildTasks,
  joinGuild
} from '../api';
import type { Guild, GuildMember, GuildRankingRow, GuildTask, FeedRecord } from '../types';
import RecordCard from '../components/community/RecordCard.vue';
import PixelIcon from '../components/community/PixelIcon.vue';

/* ------------------------------------------------------------------ */
/*  Routing & auth                                                       */
/* ------------------------------------------------------------------ */
const route = useRoute();
const router = useRouter();
const ctx = useAppContext();
const token = ctx.authToken as import('vue').Ref<string | null>;
const copy = ctx.copy as (zh: string, en: string) => string;

const guildId = computed(() => Number(route.params.id));

/* ------------------------------------------------------------------ */
/*  State                                                               */
/* ------------------------------------------------------------------ */
type LoadState = 'loading' | 'ok' | 'not-found' | 'error';

const loadState = ref<LoadState>('loading');
const guild = ref<Guild | null>(null);
const records = ref<FeedRecord[]>([]);
const members = ref<GuildMember[]>([]);
const ranking = ref<GuildRankingRow[]>([]);
const tasks = ref<GuildTask[]>([]);
const showAllRecords = ref(false);
const joining = ref(false);
const joinError = ref('');

/* ------------------------------------------------------------------ */
/*  Derived                                                             */
/* ------------------------------------------------------------------ */
const displayedRecords = computed(() => {
  const sorted = [...records.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return showAllRecords.value ? sorted : sorted.slice(0, 10);
});

const hasMoreRecords = computed(() => records.value.length > 10 && !showAllRecords.value);

/* ------------------------------------------------------------------ */
/*  Data loading                                                        */
/* ------------------------------------------------------------------ */
onMounted(async () => {
  const id = guildId.value;
  const tok = token.value;

  try {
    const [detail, membersRes, rankingRes, tasksRes] = await Promise.all([
      fetchGuild(id, tok),
      fetchGuildMembers(id, tok),
      fetchGuildRanking(id, tok),
      fetchGuildTasks(id, tok)
    ]);

    guild.value = detail.guild;
    records.value = detail.records || [];
    members.value = membersRes.members || [];
    ranking.value = rankingRes.rows || [];
    tasks.value = tasksRes.tasks || [];
    loadState.value = 'ok';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      loadState.value = 'not-found';
    } else {
      loadState.value = 'error';
    }
  }
});

/* ------------------------------------------------------------------ */
/*  Actions                                                             */
/* ------------------------------------------------------------------ */
async function handleJoin() {
  if (!token.value) return;
  joining.value = true;
  joinError.value = '';
  try {
    await joinGuild(guildId.value, token.value);
    if (guild.value) guild.value.joined = true;
  } catch (err: unknown) {
    joinError.value = err instanceof Error ? err.message : '加入失败';
  } finally {
    joining.value = false;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function rankBg(rank: number): string {
  if (rank === 1) return 'var(--color-primary)';
  if (rank === 2) return 'var(--color-accent-mint)';
  if (rank === 3) return 'var(--color-accent-coral)';
  return 'var(--color-bg-subtle)';
}

function rankColor(rank: number): string {
  if (rank <= 3) return 'var(--color-text-primary)';
  return 'var(--color-text-secondary)';
}

function avatarLetter(name: string): string {
  return (name || '?')[0].toUpperCase();
}

function memberAvatarBg(name: string): string {
  const seed = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const colors = [
    'var(--color-accent-mint)',
    'var(--color-accent-coral)',
    'var(--color-primary)'
  ];
  return colors[seed % 3];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch {
    return iso;
  }
}

function roleLabel(role: string): string {
  if (role === 'owner') return copy('会长', 'Leader');
  return copy('成员', 'Member');
}

function isOwnerRole(role: string): boolean {
  return role === 'owner';
}
</script>

<template>
  <!-- ====================== LOADING ====================== -->
  <div v-if="loadState === 'loading'" class="gd-page">
    <div class="gd-skeleton gd-skeleton--header"></div>
    <div class="gd-skeleton gd-skeleton--tasks"></div>
    <div class="gd-skeleton gd-skeleton--columns"></div>
  </div>

  <!-- ====================== NOT FOUND ====================== -->
  <div v-else-if="loadState === 'not-found'" class="gd-page gd-centered">
    <div class="gd-empty-state">
      <div class="gd-empty-icon">🐟</div>
      <p class="gd-empty-title">工会不存在</p>
      <p class="gd-empty-sub">这个工会可能已解散或链接有误。</p>
      <button class="gd-btn-primary" @click="router.push('/guilds')">返回工会列表</button>
    </div>
  </div>

  <!-- ====================== ERROR ====================== -->
  <div v-else-if="loadState === 'error'" class="gd-page gd-centered">
    <div class="gd-empty-state">
      <div class="gd-empty-icon">⚠️</div>
      <p class="gd-empty-title">加载失败</p>
      <p class="gd-empty-sub">请稍后重试。</p>
      <button class="gd-btn-primary" @click="router.push('/guilds')">返回工会列表</button>
    </div>
  </div>

  <!-- ====================== CONTENT ====================== -->
  <div v-else-if="guild" class="gd-page">

    <!-- ===== Block 1: Guild Header Card ===== -->
    <section class="gd-header-card">
      <div class="gd-header-main">
        <!-- Left: icon + title -->
        <div class="gd-header-left">
          <div class="gd-guild-icon" aria-hidden="true">{{ guild.icon }}</div>
          <div class="gd-header-info">
            <h1 class="gd-guild-name">{{ guild.name }}</h1>
            <p class="gd-guild-meta">
              Lv.{{ guild.level }}
              <span class="gd-dot" aria-hidden="true"></span>
              {{ guild.memberCount }} {{ copy('人', 'members') }}
            </p>
          </div>
        </div>

        <!-- Middle: description -->
        <p v-if="guild.description" class="gd-guild-desc">{{ guild.description }}</p>

        <!-- Right: join button -->
        <div class="gd-header-action">
          <button
            v-if="guild.joined"
            class="gd-btn-joined"
            disabled
          >已加入</button>
          <button
            v-else-if="token"
            class="gd-btn-primary"
            :disabled="joining"
            @click="handleJoin"
          >{{ joining ? '加入中…' : '加入工会' }}</button>
          <p v-if="joinError" class="gd-join-error">{{ joinError }}</p>
        </div>
      </div>

      <!-- Contribution display -->
      <div class="gd-contribution-row">
        <span class="gd-contribution-num">{{ guild.totalContribution.toLocaleString() }}</span>
        <span class="gd-contribution-label">赛季总贡献</span>
      </div>
    </section>

    <!-- ===== Block 2: Season Tasks ===== -->
    <section class="gd-section">
      <h2 class="gd-section-title">
        <PixelIcon name="fish" :size="16" />
        本赛季任务
      </h2>

      <div v-if="tasks.length" class="gd-tasks-grid">
        <div
          v-for="(task, i) in tasks"
          :key="i"
          class="gd-task-card"
        >
          <p class="gd-task-name">{{ task.name }}</p>
          <p class="gd-task-target">{{ task.target }}</p>
          <span class="gd-task-reward">{{ task.reward }}</span>
        </div>
      </div>

      <div v-else class="gd-empty-inline">暂无赛季任务</div>
    </section>

    <!-- ===== Block 3: Ranking + Members ===== -->
    <section class="gd-columns">

      <!-- Left: Contribution Ranking -->
      <div class="gd-column-card">
        <h2 class="gd-section-title">
          <PixelIcon name="crown" :size="16" />
          贡献榜
        </h2>

        <div v-if="ranking.length" class="gd-ranking-list">
          <div
            v-for="row in ranking"
            :key="row.userId"
            class="gd-ranking-row"
          >
            <span
              class="gd-rank-badge"
              :style="{ background: rankBg(row.rank), color: rankColor(row.rank) }"
            >{{ row.rank }}</span>
            <span class="gd-rank-name">{{ row.nickname || row.username }}</span>
            <span class="gd-rank-score">{{ row.contribution.toLocaleString() }}</span>
          </div>
        </div>

        <div v-else class="gd-empty-inline">暂无贡献数据</div>
      </div>

      <!-- Right: Members -->
      <div class="gd-column-card">
        <h2 class="gd-section-title">
          <PixelIcon name="heart" :size="16" />
          成员
        </h2>

        <div v-if="members.length" class="gd-member-list">
          <div
            v-for="m in members"
            :key="m.id"
            class="gd-member-row"
          >
            <div
              class="gd-member-avatar"
              :style="{ background: memberAvatarBg(m.display_name || m.username) }"
              aria-hidden="true"
            >{{ avatarLetter(m.display_name || m.username) }}</div>

            <span class="gd-member-name">{{ m.display_name || m.username }}</span>

            <span
              class="gd-member-role"
              :class="{ 'gd-member-role--owner': isOwnerRole(m.role) }"
            >{{ roleLabel(m.role) }}</span>

            <span class="gd-member-date">{{ formatDate(m.joined_at) }}</span>
          </div>
        </div>

        <div v-else class="gd-empty-inline">暂无成员</div>
      </div>
    </section>

    <!-- ===== Block 4: Guild Records ===== -->
    <section class="gd-section">
      <h2 class="gd-section-title">
        <PixelIcon name="fish" :size="16" />
        工会摸鱼记录
      </h2>

      <div v-if="displayedRecords.length" class="gd-records-list">
        <RecordCard
          v-for="rec in displayedRecords"
          :key="rec.id"
          :record="rec"
        />
      </div>

      <div v-else class="gd-empty-state gd-empty-state--inline">
        <p class="gd-empty-title">这个工会还没有摸鱼记录</p>
        <p class="gd-empty-sub">加入后一起摸鱼吧！</p>
      </div>

      <div v-if="hasMoreRecords" class="gd-more-row">
        <button class="gd-btn-ghost" @click="showAllRecords = true">
          查看全部 {{ records.length }} 条记录
        </button>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ============================================================
 * 页面容器
 * ============================================================ */
.gd-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.gd-centered {
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

/* ============================================================
 * Skeleton 占位
 * ============================================================ */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.gd-skeleton {
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  animation: pulse 1.4s ease-in-out infinite;
}
.gd-skeleton--header  { height: 140px; }
.gd-skeleton--tasks   { height: 120px; }
.gd-skeleton--columns { height: 300px; }

/* ============================================================
 * Block 1 — Header Card
 * ============================================================ */
.gd-header-card {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flat-md);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gd-header-main {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.gd-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.gd-guild-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  border: var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  flex-shrink: 0;
  line-height: 1;
}

.gd-header-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.gd-guild-name {
  font-size: var(--text-lg);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: var(--leading-tight);
}

.gd-guild-meta {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.gd-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-tertiary);
  display: inline-block;
}

.gd-guild-desc {
  flex: 1;
  font-size: var(--text-base);
  color: var(--color-text-body);
  line-height: var(--leading-normal);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  min-width: 160px;
}

.gd-header-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  flex-shrink: 0;
}

.gd-join-error {
  font-size: var(--text-xs);
  color: var(--color-danger);
}

.gd-contribution-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-divider);
}

.gd-contribution-num {
  font-family: var(--font-mono);
  font-size: var(--text-display);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  line-height: 1;
}

.gd-contribution-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* ============================================================
 * Buttons
 * ============================================================ */
.gd-btn-primary {
  background: var(--color-primary);
  color: var(--color-text-primary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  box-shadow: var(--shadow-flat-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  cursor: pointer;
}
.gd-btn-primary:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}
.gd-btn-primary:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-border);
}
.gd-btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.gd-btn-joined {
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  cursor: default;
}

.gd-btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-sm);
  font-weight: var(--weight-semibold);
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}
.gd-btn-ghost:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

/* ============================================================
 * Section headers
 * ============================================================ */
.gd-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gd-section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

/* ============================================================
 * Block 2 — Tasks
 * ============================================================ */
.gd-tasks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.gd-task-card {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flat-sm);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.gd-task-name {
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.gd-task-target {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.gd-task-reward {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px var(--space-2);
  background: var(--color-primary-soft);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

/* ============================================================
 * Block 3 — Columns
 * ============================================================ */
.gd-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  align-items: start;
}

.gd-column-card {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-flat-sm);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Ranking */
.gd-ranking-list {
  display: flex;
  flex-direction: column;
}

.gd-ranking-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 48px;
  border-bottom: 1px solid var(--color-divider);
}
.gd-ranking-row:last-child {
  border-bottom: none;
}

.gd-rank-badge {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  flex-shrink: 0;
}

.gd-rank-name {
  flex: 1;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-rank-score {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  flex-shrink: 0;
}

/* Members */
.gd-member-list {
  display: flex;
  flex-direction: column;
}

.gd-member-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 48px;
  border-bottom: 1px solid var(--color-divider);
}
.gd-member-row:last-child {
  border-bottom: none;
}

.gd-member-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
  flex-shrink: 0;
}

.gd-member-name {
  flex: 1;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-member-role {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-secondary);
  padding: 2px var(--space-2);
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.gd-member-role--owner {
  background: var(--color-primary-soft);
  color: var(--color-text-primary);
}

.gd-member-date {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  flex-shrink: 0;
  font-family: var(--font-mono);
}

/* ============================================================
 * Block 4 — Records
 * ============================================================ */
.gd-records-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.gd-more-row {
  display: flex;
  justify-content: center;
  padding-top: var(--space-2);
}

/* ============================================================
 * Empty / inline states
 * ============================================================ */
.gd-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
  padding: var(--space-10) var(--space-6);
}

.gd-empty-state--inline {
  padding: var(--space-8) var(--space-6);
}

.gd-empty-icon {
  font-size: var(--text-display);
  line-height: 1;
}

.gd-empty-title {
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--color-text-primary);
}

.gd-empty-sub {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-normal);
}

.gd-empty-inline {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-6) 0;
}

/* ============================================================
 * Responsive
 * ============================================================ */
@media (max-width: 720px) {
  .gd-page {
    padding: var(--space-4);
    gap: var(--space-6);
  }

  .gd-tasks-grid {
    grid-template-columns: 1fr;
  }

  .gd-columns {
    grid-template-columns: 1fr;
  }

  .gd-header-main {
    flex-direction: column;
    gap: var(--space-3);
  }

  .gd-header-action {
    align-items: flex-start;
  }

  .gd-member-date {
    display: none;
  }
}
</style>
