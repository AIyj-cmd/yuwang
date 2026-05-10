<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Star, Trophy, BadgeCheck, ShieldAlert, MessageCircle, Hash } from 'lucide-vue-next';
import { PxButton, PxCard, PxInput } from '@mmt817/pixel-ui';
import { fetchCircle, fetchCircleFeed, joinCircle } from '../api';
import { useAppContext } from '../appContext';
import type { CircleDetailResponse, FeedRecord } from '../types';
import PageWorkbench from '../components/layout/PageWorkbench.vue';
import WorkbenchHeader, { type WorkbenchStat } from '../components/layout/WorkbenchHeader.vue';
import WorkbenchGrid from '../components/layout/WorkbenchGrid.vue';

const route = useRoute();
const router = useRouter();
const detail = ref<CircleDetailResponse | null>(null);
const feed = ref<FeedRecord[]>([]);
const loading = ref(false);
const error = ref('');

const {
  authToken,
  copy,
  feedCommentDrafts,
  handleFeedComment,
  handleFeedLike,
  handleFeedNominate,
  handleFeedReport,
  openProfileRecord,
  openTopic,
  options,
  t,
  translatedCircleBoards,
  translatedCircleDescription,
  translatedCircleName,
  translatedGuildName,
  translatedTitle
} = useAppContext();

const circleId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
});

const circle = computed(() => detail.value?.circle ?? null);
const boards = computed(() => translatedCircleBoards(circle.value ?? null));

const headerStats = computed<WorkbenchStat[]>(() => [
  { label: copy('成员', 'Members'), value: circle.value?.memberCount ?? 0, accent: 'primary' },
  { label: copy('记录', 'Records'), value: circle.value?.recordCount ?? 0, accent: 'mint' },
  { label: copy('榜单', 'Boards'), value: boards.value.length, accent: 'muted' },
  { label: copy('帖子样本', 'Feed'), value: feed.value.length, accent: 'primary' }
]);

const load = async () => {
  if (!Number.isFinite(circleId.value)) {
    error.value = copy('圈子 ID 无效。', 'Invalid circle ID.');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [detailResponse, feedResponse] = await Promise.all([
      fetchCircle(circleId.value, authToken.value),
      fetchCircleFeed(circleId.value, authToken.value)
    ]);
    detail.value = detailResponse;
    feed.value = feedResponse.records;
  } catch (err) {
    detail.value = null;
    feed.value = [];
    error.value = err instanceof Error ? err.message : copy('圈子加载失败。', 'Failed to load circle.');
  } finally {
    loading.value = false;
  }
};

const handleJoin = async () => {
  if (!authToken.value) {
    error.value = t('needLogin');
    return;
  }
  if (!circle.value) return;
  try {
    await joinCircle(circle.value.id, authToken.value);
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : copy('加入圈子失败。', 'Failed to join circle.');
  }
};

const backToList = () => router.push('/circles');

const reloadAfter = async (action: (recordId: number) => Promise<void>, recordId: number) => {
  await action(recordId);
  await load();
};

onMounted(load);
watch(circleId, load);
</script>

<template>
  <PageWorkbench>
    <WorkbenchHeader
      :icon="Star"
      :title="circle ? translatedCircleName(circle) : copy('圈子详情', 'Circle Detail')"
      :subtitle="circle ? translatedCircleDescription(circle) : copy('正在加载圈子内容...', 'Loading circle content...')"
      :stats="headerStats"
    >
      <template #actions>
        <button class="workbench-action" type="button" @click="backToList">
          {{ copy('返回圈子广场', 'Back to Circles') }}
        </button>
        <PxButton v-if="circle" type="primary" size="small" @click="handleJoin">
          {{ circle.joined ? copy('已加入', 'Joined') : copy('加入圈子', 'Join') }}
        </PxButton>
      </template>
    </WorkbenchHeader>

    <p v-if="error" class="error-line">{{ error }}</p>

    <WorkbenchGrid columns="three">
      <template #left>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><Star :size="16" /><span>{{ copy('圈子介绍', 'About') }}</span></div>
          </template>
          <div v-if="circle" class="module-intro">
            <strong>{{ translatedCircleName(circle) }}</strong>
            <span>{{ translatedCircleDescription(circle) }}</span>
          </div>
          <div v-else-if="loading" class="loading-line">{{ copy('加载中...', 'Loading...') }}</div>
          <div v-else class="empty-list">{{ copy('暂无圈子信息。', 'No circle info.') }}</div>

          <dl v-if="circle" class="side-stats">
            <div><dt>{{ copy('成员', 'Members') }}</dt><dd>{{ circle.memberCount }}</dd></div>
            <div><dt>{{ copy('记录', 'Records') }}</dt><dd>{{ circle.recordCount }}</dd></div>
          </dl>
        </PxCard>

        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><BadgeCheck :size="16" /><span>{{ copy('圈子榜单', 'Boards') }}</span></div>
          </template>
          <div v-if="boards.length" class="record-tags board-tags">
            <span v-for="board in boards" :key="board">{{ board }}</span>
          </div>
          <div v-else class="empty-list">{{ copy('暂无榜单', 'No boards') }}</div>
        </PxCard>
      </template>

      <template #main>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title between">
              <span><Trophy :size="16" /> {{ copy('圈子内容流', 'Circle Feed') }}</span>
              <small>{{ feed.length }} {{ copy('条', 'items') }}</small>
            </div>
          </template>
          <div v-if="loading" class="loading-line">{{ copy('内容流加载中...', 'Loading feed...') }}</div>
          <div v-else-if="feed.length" class="record-card-list">
            <article v-for="record in feed" :key="record.id" class="record-card">
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
                <span v-if="record.guild">{{ copy('贡献到 ', 'Contrib. ') }}{{ translatedGuildName(record.guild) }} +{{ record.guildContribution.toFixed(1) }}</span>
              </div>
              <div class="record-actions">
                <button type="button" :class="{ active: record.viewer.liked }" @click="reloadAfter(handleFeedLike, record.id)">
                  {{ t('like') }} {{ record.likeCount }}
                </button>
                <button type="button" :class="{ active: record.viewer.legendNominated }" @click="reloadAfter(handleFeedNominate, record.id)">
                  {{ copy('传奇提名', 'Nominate') }} {{ record.legendNominationCount }}
                </button>
                <button type="button" @click="openProfileRecord(record.id)">
                  <MessageCircle :size="14" />
                  {{ t('comments') }} {{ record.commentCount }}
                </button>
                <button type="button" :class="{ active: record.viewer.reported }" @click="reloadAfter(handleFeedReport, record.id)">
                  {{ copy('举报', 'Report') }} {{ record.reportCount }}
                </button>
              </div>
              <div class="feed-comment-row">
                <PxInput v-model="feedCommentDrafts[record.id]" :placeholder="copy('120 字以内，别写真实公司或客户', 'Within 120 chars.')" clearable />
                <button type="button" @click="reloadAfter(handleFeedComment, record.id)">{{ t('addComment') }}</button>
              </div>
            </article>
          </div>
          <div v-else class="empty-list">{{ copy('这个圈子暂时风平浪静。', 'This circle is quiet for now.') }}</div>
        </PxCard>
      </template>

      <template #side>
        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('圈子规则', 'Circle Rules') }}</span></div>
          </template>
          <ul class="rule-list">
            <li>{{ copy('按事项 / 故事 / 话题自动归类。', 'Auto-classified by activity / story / topic.') }}</li>
            <li>{{ copy('可加入多个圈子。', 'Multiple circles allowed.') }}</li>
            <li>{{ copy('圈子不参与工会贡献。', 'Circles do not affect guild contribution.') }}</li>
            <li>{{ copy('命中敏感词的记录会进入审核。', 'Sensitive records go to review.') }}</li>
          </ul>
        </PxCard>

        <PxCard class="panel fill">
          <template #header>
            <div class="panel-title"><ShieldAlert :size="16" /><span>{{ copy('安全提示', 'Safety Notice') }}</span></div>
          </template>
          <p class="safety-inline">{{ copy(options.safetyNotice, 'Keep content anonymous.') }}</p>
        </PxCard>
      </template>
    </WorkbenchGrid>
  </PageWorkbench>
</template>
