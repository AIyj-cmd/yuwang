<script setup lang="ts">
/**
 * Guild Hall · /guilds 工会大厅 (v1.4)
 *   - 摆脱旧 PageSection + PxCard 表格布局
 *   - 与 Community V2 同一套 Neo-pixel Flat 风格
 *   - 工会列表卡片化,排名徽章 1/2/3 配色
 *   - 进度条按真实比例(0 分 = 0%,最大值 = 100%)
 *   - 进入页面时清掉跨页面残留的 statusMessage(修举报提示残留)
 * 不引入 @mmt817/pixel-ui;不发明后端 API;不改 GuildDetailPage。
 * 样式全部在 src/styles/pages/guilds.css(以 .guilds-page 前缀作 scope)。
 */
import '../styles/pages/guilds.css';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppContext } from '../appContext';
import { fetchGuild, fetchGuildMembers } from '../api';
import PixelIcon from '../components/community/PixelIcon.vue';
import EmptyState from '../components/community/EmptyState.vue';

const router = useRouter();
const ctx = useAppContext();

const token = ctx.authToken;
const copy = ctx.copy;
const errMsg = ctx.errorMessage;
const guildsData = ctx.guildsData;
const joinGuild = ctx.handleJoinGuild;
const reloadGuilds = ctx.loadGuilds;
const status = ctx.statusMessage;
const t = ctx.t;
const tGuildDesc = ctx.translatedGuildDescription;
const tGuildName = ctx.translatedGuildName;
const tTitle = ctx.translatedTitle;

onMounted(() => {
  status.value = '';
  errMsg.value = '';
});

const guildList = computed(() => (guildsData.value && guildsData.value.guilds) || []);
const myGuild = computed(() => (guildsData.value && guildsData.value.myGuild) || null);

const maxContribution = computed(() => {
  let m = 0;
  const list = guildList.value;
  for (let i = 0; i < list.length; i++) {
    if (list[i].totalContribution > m) m = list[i].totalContribution;
  }
  return m;
});

const myGuildRank = computed(() => {
  const mg = myGuild.value;
  if (!mg) return 0;
  const list = guildList.value;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === mg.id) return i + 1;
  }
  return 0;
});

function barWidth(g: any): string {
  if (!g || g.totalContribution <= 0 || maxContribution.value <= 0) return '0%';
  const pct = (g.totalContribution / maxContribution.value) * 100;
  return Math.min(100, pct) + '%';
}

function rankVariant(idx: any): string { const i = Number(idx);
  if (i === 0) return 'gold';
  if (i === 1) return 'silver';
  if (i === 2) return 'bronze';
  return 'neutral';
}

const guildTab = ref('');
const activeGuildTab = computed(() => {
  if (guildTab.value === 'home' || guildTab.value === 'list') return guildTab.value;
  return myGuild.value ? 'home' : 'list';
});

const expandedGuildId = ref(0);
const expandedRecords = ref<any[]>([]);
const expandedMembers = ref<any[]>([]);
const expandedLoading = ref(false);
const expandedError = ref('');

async function toggleGuildRow(id: number) {
  if (expandedGuildId.value === id) { expandedGuildId.value = 0; return; }
  expandedGuildId.value = id;
  expandedLoading.value = true;
  expandedError.value = '';
  expandedRecords.value = [];
  expandedMembers.value = [];
  try {
    const detail = await fetchGuild(id, token.value);
    const roster = await fetchGuildMembers(id, token.value);
    expandedRecords.value = detail.records;
    expandedMembers.value = roster.members;
  } catch (e) {
    if (e instanceof Error) expandedError.value = e.message;
    else expandedError.value = copy('工会详情加载失败', 'Failed to load guild detail');
  } finally {
    expandedLoading.value = false;
  }
}

function goManageMyGuild() { router.push('/my-guild'); }
function openGuildDetail(id: number) { router.push('/guilds/' + id); }
function isOwner(role: string): string { return role === 'owner' ? 'true' : 'false'; }
function ownerLabel(role: string): string { return role === 'owner' ? copy('会长', 'Owner') : copy('成员', 'Member'); }

/* ------------------------------------------------------------------
 * 本页提示:不再依赖全局 statusMessage 文案关键词。
 * onMounted 已清掉跨页面残留;本页所有动作走 wrapper 写 localStatus/localError,
 * 然后立即清掉全局,避免再次跨页面泄露。
 * ------------------------------------------------------------------ */
const localStatus = ref('');
const localError = ref('');

function captureFromGlobal() {
  const e = typeof errMsg.value === 'string' ? errMsg.value : '';
  const s = typeof status.value === 'string' ? status.value : '';
  if (e) { localError.value = e; errMsg.value = ''; }
  else if (s) { localStatus.value = s; status.value = ''; }
}

async function onJoin(id: number) {
  localStatus.value = '';
  localError.value = '';
  try {
    await joinGuild(id);
  } catch (e) {
    if (e instanceof Error) localError.value = e.message;
  }
  captureFromGlobal();
}

async function onLoadGuilds() {
  localStatus.value = '';
  localError.value = '';
  try {
    await reloadGuilds();
  } catch (e) {
    if (e instanceof Error) localError.value = e.message;
  }
  captureFromGlobal();
}
</script>

<template>
  <div class="guilds-page">
    <header class="gh-head">
      <div class="gh-head-title">
        <div class="gh-emblem" aria-hidden="true">
          <PixelIcon name="crown" :size="22" />
        </div>
        <div class="gh-head-text">
          <h1>{{ copy('工会大厅', 'Guild Hall') }}</h1>
          <p>{{ copy('挑一支门派,把鱼塘划成你们的地盘', 'Pick a guild and claim a corner of the pond') }}</p>
        </div>
      </div>
      <nav v-if="myGuild" class="gh-tabs" :aria-label="copy('工会视图', 'Guild views')">
        <button type="button" class="gh-tab" :class="{ active: activeGuildTab === 'home' }" @click="guildTab = 'home'">
          {{ copy('我的工会', 'My Guild') }}
        </button>
        <button type="button" class="gh-tab" :class="{ active: activeGuildTab === 'list' }" @click="guildTab = 'list'">
          {{ copy('工会列表', 'All Guilds') }}
        </button>
      </nav>
    </header>

    <p v-if="localStatus" class="gh-toast gh-toast--ok">{{ localStatus }}</p>
    <p v-if="localError" class="gh-toast gh-toast--err">{{ localError }}</p>

    <div v-if="!guildsData && errMsg" class="gh-state gh-state--error">
      <PixelIcon name="lock" :size="32" />
      <strong>{{ copy('工会大厅没能浮上来', 'The guild hall failed to surface') }}</strong>
      <span>{{ errMsg }}</span>
      <button type="button" class="btn-ghost" @click="onLoadGuilds">{{ copy('重新加载', 'Reload') }}</button>
    </div>
    <div v-else-if="!guildsData" class="gh-skeleton-list">
      <span v-for="n in 5" :key="n" class="gh-skeleton"></span>
    </div>

    <template v-else>
      <section v-if="activeGuildTab === 'home' && myGuild" class="gh-mine">
        <article class="gh-mine-card">
          <div class="gh-mine-emblem">{{ myGuild.icon }}</div>
          <div class="gh-mine-id">
            <span class="gh-kicker">{{ copy('我的工会', 'MY GUILD') }}</span>
            <strong>{{ tGuildName(myGuild) }}</strong>
            <span class="gh-mine-meta">{{ tTitle(myGuild.level) }} · {{ myGuild.memberCount }} {{ copy('人', 'members') }}</span>
          </div>
          <div class="gh-mine-stats">
            <div><b class="num">{{ myGuild.totalContribution.toFixed(1) }}</b><span>{{ copy('工会总贡献', 'Guild total') }}</span></div>
            <div><b class="num">#{{ myGuildRank || '—' }}</b><span>{{ copy('全榜名次', 'Overall rank') }} / {{ guildList.length }}</span></div>
          </div>
          <div class="gh-mine-actions">
            <button type="button" class="btn-primary" @click="goManageMyGuild">
              <PixelIcon name="crown" :size="14" /> {{ copy('管理我的工会', 'Manage my guild') }}
            </button>
            <button type="button" class="btn-ghost" @click="guildTab = 'list'">{{ copy('浏览全部工会', 'Browse all') }}</button>
          </div>
        </article>
      </section>

      <section v-else class="gh-list-view">
        <p class="gh-caption">{{ copy('全部工会按赛季总贡献排名 · 点开任意一支看成员与高分记录', 'All guilds ranked by season total · open any to see roster and highlights') }}</p>

        <div v-if="guildList.length" class="gh-cols-hint" aria-hidden="true">
          <span class="hint-rank">#</span>
          <span class="hint-guild">{{ copy('工会', 'Guild') }}</span>
          <span class="hint-bar">{{ copy('赛季战力', 'Season power') }}</span>
          <span class="hint-score">{{ copy('总贡献', 'Total') }}</span>
        </div>

        <ul v-if="guildList.length" class="gh-list">
          <li
            v-for="(guild, idx) in guildList"
            :key="guild.id"
            class="gh-card"
            :class="{ 'is-mine': guild.joined, 'is-open': expandedGuildId === guild.id }"
          >
            <button type="button" class="gh-card-main" :aria-expanded="expandedGuildId === guild.id" @click="toggleGuildRow(guild.id)">
              <span class="gh-rank" :data-variant="rankVariant(idx)"><span class="gh-rank-num">{{ Number(idx) + 1 }}</span></span>
              <span class="gh-guild">
                <span class="gh-guild-emblem" :data-variant="rankVariant(idx)">{{ guild.icon }}</span>
                <span class="gh-guild-id">
                  <strong>{{ tGuildName(guild) }}</strong>
                  <small>
                    {{ tTitle(guild.level) }} · {{ guild.memberCount }} {{ copy('人', 'members') }}
                    <em v-if="guild.joined"> · {{ copy('你的工会', 'yours') }}</em>
                  </small>
                </span>
              </span>
              <span class="gh-bar-cell">
                <span class="gh-bar"><span class="gh-bar-fill" :style="{ width: barWidth(guild) }"></span></span>
              </span>
              <span class="gh-score num">{{ guild.totalContribution.toFixed(1) }}</span>
              <span class="gh-chev" :class="{ rotated: expandedGuildId === guild.id }" aria-hidden="true">▾</span>
            </button>

            <div v-if="expandedGuildId === guild.id" class="gh-detail">
              <p v-if="tGuildDesc(guild)" class="gh-detail-desc">{{ tGuildDesc(guild) }}</p>
              <div v-if="expandedLoading" class="gh-detail-state">{{ copy('加载工会详情...', 'Loading guild detail...') }}</div>
              <div v-else-if="expandedError" class="gh-detail-state gh-detail-state--err">{{ expandedError }}</div>
              <template v-else>
                <div class="gh-detail-cols">
                  <section class="gh-detail-block">
                    <h4>{{ copy('成员名册', 'Roster') }} <span class="num">{{ expandedMembers.length }}</span></h4>
                    <ul v-if="expandedMembers.length" class="gh-roster">
                      <li v-for="member in expandedMembers" :key="member.id">
                        <span class="gh-roster-name">{{ member.display_name }}</span>
                        <span class="gh-roster-role" :data-owner="isOwner(member.role)">{{ ownerLabel(member.role) }}</span>
                      </li>
                    </ul>
                    <div v-else class="gh-detail-empty">{{ copy('还没有成员', 'No members yet') }}</div>
                  </section>
                  <section class="gh-detail-block">
                    <h4>{{ copy('高分公开记录', 'Top records') }} <span class="num">{{ expandedRecords.length }}</span></h4>
                    <ul v-if="expandedRecords.length" class="gh-rec">
                      <li v-for="record in expandedRecords" :key="record.id">
                        <span class="gh-rec-top">
                          <b>{{ record.nickname }}</b>
                          <em class="num">{{ record.score.toFixed(1) }}</em>
                        </span>
                        <span class="gh-rec-sub">{{ tTitle(record.title) }} · {{ copy('工会 +', 'guild +') }}{{ record.guildContribution.toFixed(1) }}</span>
                      </li>
                    </ul>
                    <div v-else class="gh-detail-empty">{{ copy('还没有公开记录', 'No public records yet') }}</div>
                  </section>
                </div>
                <div class="gh-detail-actions">
                  <button v-if="guild.joined" type="button" class="btn-state" disabled>{{ copy('这是你的当前工会', 'Your current guild') }}</button>
                  <button v-else-if="!token" type="button" class="btn-ghost" disabled :title="t('needLogin')">{{ copy('登录后可加入', 'Sign in to join') }}</button>
                  <button v-else type="button" class="btn-primary" @click="onJoin(guild.id)">
                    {{ myGuild ? copy('换到这个工会', 'Switch to this guild') : copy('加入这个工会', 'Join this guild') }}
                  </button>
                  <button type="button" class="btn-ghost" @click.stop="openGuildDetail(guild.id)">{{ copy('查看详情', 'View detail') }}</button>
                </div>
              </template>
            </div>
          </li>
        </ul>

        <EmptyState
          v-else
          icon="trophy"
          :title="copy('还没有工会占领鱼塘', 'No guild claims the pond yet')"
          :description="copy('赛季尚未启动,可以先去社区广场摸条鱼,等待门派开张。', 'The season has not started yet. Slack in the community while we prepare guild seats.')"
        />

        <article v-if="token" class="gh-create">
          <div class="gh-create-icon"><PixelIcon name="crown" :size="20" /></div>
          <div class="gh-create-text">
            <strong>{{ copy('创建你自己的工会', 'Start your own guild') }}</strong>
            <span>{{ copy('在管理页填写名称、徽章与简介', 'Configure name, emblem and intro on the manage page') }}</span>
          </div>
          <button type="button" class="btn-primary" @click="goManageMyGuild">{{ copy('前往创建', 'Go create') }}</button>
        </article>
        <article v-else class="gh-create gh-create--locked">
          <div class="gh-create-icon"><PixelIcon name="lock" :size="20" /></div>
          <div class="gh-create-text">
            <strong>{{ copy('创建新工会 · 登录后开放', 'Create a guild · sign in first') }}</strong>
            <span>{{ copy('登录账号后可在管理页发起创建', 'Sign in to start creating from the manage page') }}</span>
          </div>
          <button type="button" class="btn-ghost" disabled>{{ copy('待登录', 'Sign in') }}</button>
        </article>
      </section>
    </template>
  </div>
</template>
