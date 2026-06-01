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
import GuildHeaderCard from '../components/guild/GuildHeaderCard.vue';
import GuildSeasonTasks from '../components/guild/GuildSeasonTasks.vue';
import GuildRankingPanel from '../components/guild/GuildRankingPanel.vue';
import GuildMembersPanel from '../components/guild/GuildMembersPanel.vue';
import GuildRecentRecords from '../components/guild/GuildRecentRecords.vue';

/* ------------------------------------------------------------------ */
/*  Routing & auth                                                       */
/* ------------------------------------------------------------------ */
const route = useRoute();
const router = useRouter();
const ctx = useAppContext();
const token = ctx.authToken as import('vue').Ref<string | null>;
const ctxLoadMe = ctx.loadMe as () => Promise<void>;
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
const joining = ref(false);
const joinError = ref('');

/* ------------------------------------------------------------------ */
/*  Data loading                                                        */
/* ------------------------------------------------------------------ */
async function loadAllData(): Promise<void> {
  const id = guildId.value;
  const tok = token.value;
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
}

onMounted(async () => {
  try {
    await loadAllData();
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
    await Promise.all([loadAllData(), ctxLoadMe()]);
  } catch (err: unknown) {
    joinError.value = err instanceof Error ? err.message : '加入失败';
  } finally {
    joining.value = false;
  }
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
      <p class="gd-empty-title">{{ copy('工会不存在', 'Guild not found') }}</p>
      <p class="gd-empty-sub">{{ copy('这个工会可能已解散或链接有误。', 'This guild may have disbanded or the link is wrong.') }}</p>
      <button class="gd-btn-primary" @click="router.push('/guilds')">{{ copy('返回工会列表', 'Back to guilds') }}</button>
    </div>
  </div>

  <!-- ====================== ERROR ====================== -->
  <div v-else-if="loadState === 'error'" class="gd-page gd-centered">
    <div class="gd-empty-state">
      <div class="gd-empty-icon">⚠️</div>
      <p class="gd-empty-title">{{ copy('加载失败', 'Failed to load') }}</p>
      <p class="gd-empty-sub">{{ copy('请稍后重试。', 'Please try again later.') }}</p>
      <button class="gd-btn-primary" @click="router.push('/guilds')">{{ copy('返回工会列表', 'Back to guilds') }}</button>
    </div>
  </div>

  <!-- ====================== CONTENT ====================== -->
  <div v-else-if="guild" class="gd-page">
    <GuildHeaderCard
      :guild="guild"
      :joining="joining"
      :join-error="joinError"
      :token="token"
      @join="handleJoin"
    />
    <GuildSeasonTasks :tasks="tasks" />
    <div class="gd-columns">
      <GuildRankingPanel :ranking="ranking" />
      <GuildMembersPanel :members="members" />
    </div>
    <GuildRecentRecords :records="records" />
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
 * Columns layout (ranking + members side by side)
 * ============================================================ */
.gd-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  align-items: start;
}

/* ============================================================
 * Full-page empty / error states
 * ============================================================ */
.gd-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
  padding: var(--space-10) var(--space-6);
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

.gd-btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  font-family: inherit;
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

/* ============================================================
 * Responsive
 * ============================================================ */
@media (max-width: 720px) {
  .gd-page {
    padding: var(--space-4);
    gap: var(--space-6);
  }

  .gd-columns {
    grid-template-columns: 1fr;
  }
}
</style>
