<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Hash, MessageCircle } from 'lucide-vue-next';
import { PxCard, PxInput } from '@mmt817/pixel-ui';
import { fetchTopicDetail } from '../api';
import { useAppContext } from '../appContext';
import type { TopicDetailResponse } from '../types';

const route = useRoute();
const detail = ref<TopicDetailResponse | null>(null);
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
  t,
  translatedCircleName,
  translatedGuildName,
  translatedTitle
} = useAppContext();

const slug = computed(() => String(route.params.slug ?? ''));
const topic = computed(() => detail.value?.topic ?? null);
const records = computed(() => detail.value?.records ?? []);
const popularTopics = computed(() => detail.value?.popularTopics ?? []);

const load = async () => {
  if (!slug.value) return;
  loading.value = true;
  error.value = '';
  try {
    detail.value = await fetchTopicDetail(slug.value, authToken.value);
  } catch (err) {
    detail.value = null;
    error.value = err instanceof Error ? err.message : copy('话题加载失败。', 'Failed to load topic.');
  } finally {
    loading.value = false;
  }
};

const reloadAfter = async (action: (recordId: number) => Promise<void>, recordId: number) => {
  await action(recordId);
  await load();
};

onMounted(load);
watch(slug, load);
</script>

<template>
  <section class="workspace single-view topic-detail-page">
    <PxCard class="panel">
      <template #header>
        <div class="panel-title between">
          <span><Hash :size="18" /> {{ copy('话题详情页', 'Topic Detail') }}</span>
          <small v-if="topic">{{ topic.usage_count }} {{ copy('次使用', 'uses') }}</small>
        </div>
      </template>

      <div v-if="loading" class="loading-line" role="status" aria-live="polite">{{ copy('话题加载中...', 'Loading topic...') }}</div>
      <p v-else-if="error" class="error-line" role="alert" aria-live="assertive">{{ error }}</p>
      <template v-else-if="topic">
        <div class="module-intro">
          <strong>#{{ topic.name }}</strong>
          <span>{{ copy('这些记录都带着同一个匿名小标签。话题只做聚合，不参与评分、圈子积分或工会贡献。', 'These records share the same anonymous tag. Topics only aggregate content and do not affect scoring, circles, or guild contribution.') }}</span>
        </div>

        <div v-if="popularTopics.length" class="popular-topic-strip">
          <strong>{{ copy('相关热门话题', 'Popular Topics') }}</strong>
          <button v-for="item in popularTopics" :key="item.id" type="button" @click="openTopic(item.slug)">
            #{{ item.name }} <span>{{ item.usage_count }}</span>
          </button>
        </div>

        <div v-if="records.length" class="record-card-list">
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
            <p>{{ record.description }}</p>
            <div v-if="record.topics?.length" class="topic-chip-list record-topic-list">
              <button v-for="item in record.topics" :key="item.id" type="button" class="topic-chip" @click="openTopic(item.slug)">#{{ item.name }}</button>
            </div>
            <div class="record-tags">
              <span v-for="tag in record.tags" :key="tag.id">{{ translatedCircleName(tag) }}</span>
              <span v-if="record.guild">{{ copy('贡献到 ', 'Contributed to ') }}{{ translatedGuildName(record.guild) }} +{{ record.guildContribution.toFixed(1) }}</span>
            </div>
            <div class="record-actions">
              <button type="button" :class="{ active: record.viewer.liked }" @click="reloadAfter(handleFeedLike, record.id)">{{ t('like') }} {{ record.likeCount }}</button>
              <button type="button" @click="openProfileRecord(record.id)">{{ t('comments') }} {{ record.commentCount }}</button>
              <button type="button" :class="{ active: record.viewer.legendNominated }" @click="reloadAfter(handleFeedNominate, record.id)">{{ copy('传奇提名', 'Nominate') }} {{ record.legendNominationCount }}</button>
              <button type="button" :class="{ active: record.viewer.reported }" @click="reloadAfter(handleFeedReport, record.id)">{{ copy('举报', 'Report') }} {{ record.reportCount }}</button>
            </div>
            <div class="feed-comment-row">
              <PxInput v-model="feedCommentDrafts[record.id]" :placeholder="copy('120 字以内，别写真实公司、客户或聊天记录', 'Within 120 chars. No real company, client, or chat records.')" clearable />
              <button type="button" @click="reloadAfter(handleFeedComment, record.id)"><MessageCircle :size="14" />{{ t('addComment') }}</button>
            </div>
          </article>
        </div>
        <div v-else class="empty-list">{{ copy('这个话题下面还没有鱼游过。', 'No fish has swum under this topic yet.') }}</div>
      </template>
    </PxCard>
  </section>
</template>
