<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Crown, Trophy, BadgeCheck, MessageCircle, Hash } from 'lucide-vue-next';
import { PxButton, PxCard } from '@mmt817/pixel-ui';
import { fetchGuild } from '../api';
import { useAppContext } from '../appContext';
import type { GuildDetailResponse } from '../types';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader, { type WorkbenchStat } from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';

const route = useRoute();
const router = useRouter();
const detail = ref<GuildDetailResponse | null>(null);
const loading = ref(false);
const error = ref('');

const {
  authToken,
  copy,
  currentUser,
  guildsData,
  handleJoinGuild,
  openProfileRecord,
  openTopic,
  t,
  translatedCircleName,
  translatedGuildDescription,
  translatedGuildName,
  translatedTitle
} = useAppContext();

const guildId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
});

const guild = computed(() => detail.value?.guild ?? null);
const records = computed(() => detail.value?.records ?? []);
const ranking = computed(() => guildsData.value?.ranking ?? []);
const isMyGuild = computed(() => Boolean(currentUser.value?.guildId && guild.value && currentUser.value.guildId === guild.value.id));

const headerStats = computed<WorkbenchStat[]>(() => [
  { label: copy('成员数', 'Members'), value: guild.value?.memberCount ?? 0, accent: 'primary' },
  { label: copy('总贡献', 'Contribution'), value: guild.value ? guild.value.totalContribution.toFixed(1) : '0.0', accent: 'mint' },
  { label: copy('等级', 'Level'), value: guild.value ? translatedTitle(guild.value.level) : '-', accent: 'muted' },
  { label: copy('记录样本', 'Records'), value: records.value.length, accent: 'primary' }
]);

const load = async () => {
  if (!Number.isFinite(guildId.value)) {
    error.value = copy('工会 ID 无效。', 'Invalid guild ID.');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    detail.value = await fetchGuild(guildId.value, authToken.value);
  } catch (err) {
    detail.value = null;
    error.value = err instanceof Error ? err.message : copy('工会详情加载失败。', 'Failed to load guild detail.');
  } finally {
    loading.value = false;
  }
};

const handleJoin = async () => {
  if (!guild.value) return;
  await handleJoinGuild(guild.value.id);
  await load();
};

const backToList = () => router.push('/guilds');

onMounted(load);
watch(guildId, load);
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="Crown"
      :title="guild ? translatedGuildName(guild) : copy('工会详情', 'Guild Detail')"
      :subtitle="guild ? translatedGuildDescription(guild) : copy('正在加载工会信息...', 'Loading guild information...')"
      :stats="headerStats"
    >
      <template #actions>
        <button class="workbench-action" type="button" @click="backToList">
          {{ copy('返回工会大厅', 'Back to Guild Hall') }}
        </button>
        <PxButton v-if="guild" type="primary" size="small" :disabled="isMyGuild" @click="handleJoin">
          {{ isMyGuild ? copy('当前工会', 'Current Guild') : copy('加入工会', 'Join Guild') }}
        </PxButton>
      </template>
    </WorkbenchHeader>

    <p v-if="error" class="error-line">{{ error }}</p>

    <WorkbenchGrid columns="three">
      <template #left>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Crown :size="16" /><span>{{ copy('工会信息', 'Guild Info') }}</span></div>
          </template>
          <div v-if="guild" class="module-intro">
            <strong>{{ translatedGuildName(guild) }}</strong>
            <span>{{ translatedGuildDescription(guild) }}</span>
          </div>
          <div v-else-if="loading" class="loading-line">{{ copy('加载中...', 'Loading...') }}</div>
          <div v-else class="empty-list">{{ copy('暂无工会信息。', 'No guild info.') }}</div>

          <dl v-if="guild" class="side-stats">
            <div><dt>{{ copy('图标', 'Icon') }}</dt><dd>{{ guild.icon }}</dd></div>
            <div><dt>{{ copy('等级', 'Level') }}</dt><dd>{{ translatedTitle(guild.level) }}</dd></div>
            <div><dt>{{ copy('成员', 'Members') }}</dt><dd>{{ guild.memberCount }}</dd></div>
            <div><dt>{{ copy('贡献', 'Contrib.') }}</dt><dd>{{ guild.totalContribution.toFixed(1) }}</dd></div>
          </dl>
        </PxCard>
      </template>

      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title between">
              <span><Trophy :size="16" /> {{ copy('成员近期记录', 'Recent Member Records') }}</span>
              <small>{{ records.length }} {{ copy('条', 'items') }}</small>
            </div>
          </template>
          <div v-if="loading" class="loading-line">{{ copy('记录加载中...', 'Loading records...') }}</div>
          <div v-else-if="records.length" class="record-card-list">
            <article v-for="record in records" :key="record.id" class="record-card">
              <header>
                <div>
                  <strong>{{ record.nickname }}</strong>
                  <small>{{ new Date(record.createdAt).toLocaleString() }}</small>
                </div>
                <div class="record-score">
                  <strong>{{ record.score.toFixed(1) }}</strong>
                  <span>{{ translatedTitle(record.title) }}</span>
                </div>
              </header>
              <strong class="record-activity">{{ record.activityText }}</strong>
              <p>{{ record.storyText || record.description }}</p>
              <div v-if="record.topics?.length" class="topic-chip-list record-topic-list">
                <button v-for="topic in record.topics" :key="topic.id" type="button" class="topic-chip" @click="openTopic(topic.slug)">
                  <Hash :size="12" /> {{ topic.name }}
                </button>
              </div>
              <div class="record-tags">
                <span v-for="tag in record.tags" :key="tag.id">{{ translatedCircleName(tag) }}</span>
                <span>{{ copy('贡献 +', 'Contrib. +') }}{{ record.guildContribution.toFixed(1) }}</span>
              </div>
              <div class="record-actions">
                <button type="button" @click="openProfileRecord(record.id)">
                  <MessageCircle :size="14" />
                  {{ t('comments') }} {{ record.commentCount }}
                </button>
              </div>
            </article>
          </div>
          <div v-else class="empty-list">{{ copy('这个工会还没有有效的贡献记录。', 'No contribution records yet.') }}</div>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Trophy :size="16" /><span>{{ copy('全站成员贡献', 'Global Ranking') }}</span></div>
          </template>
          <ol v-if="ranking.length" class="compact-ranking">
            <li v-for="row in ranking" :key="row.userId">
              <span>#{{ row.rank }} {{ row.nickname }}</span>
              <strong>{{ row.contribution.toFixed(1) }}</strong>
            </li>
          </ol>
          <div v-else class="empty-list">{{ copy('还没有贡献数据。', 'No contribution data yet.') }}</div>
        </PxCard>

        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('赛季规则', 'Season Rules') }}</span></div>
          </template>
          <ul class="rule-list">
            <li>{{ copy('Fish Power * 0.3 贡献到当前工会。', 'Fish Power * 0.3 contributes to current guild.') }}</li>
            <li>{{ copy('互动加成额外计入贡献。', 'Interaction bonuses also count.') }}</li>
            <li>{{ copy('一次只能加入一个工会。', 'One guild at a time.') }}</li>
            <li>{{ copy('切换工会不会清空历史记录。', 'Switching does not erase past records.') }}</li>
          </ul>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
