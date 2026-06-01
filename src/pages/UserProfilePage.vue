<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { BadgeCheck, User } from 'lucide-vue-next';
import { PxCard } from '@mmt817/pixel-ui';
import { fetchProfile } from '../api';
import { useAppContext } from '../appContext';
import { useProfileInsights } from '../composables/useProfileInsights';
import type { ProfileResponse } from '../types';

const route = useRoute();
const { copy, openProfileRecord, translatedTitle } = useAppContext();
const profile = ref<ProfileResponse | null>(null);
const loading = ref(false);
const error = ref('');
const username = computed(() => String(route.params.username ?? ''));
const { profileInsights, profileInsightsLoading, loadProfileInsights } = useProfileInsights();

const load = async () => {
  if (!username.value) return;
  loading.value = true;
  error.value = '';
  try {
    profile.value = await fetchProfile(username.value);
    await loadProfileInsights(username.value);
  } catch (err) {
    profile.value = null;
    error.value = err instanceof Error ? err.message : copy('用户主页加载失败。', 'Failed to load profile.');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(username, load);
</script>

<template>
  <section class="workspace single-view public-profile-page">
    <aside class="right-rail">
      <PxCard class="panel profile-panel">
        <template #header>
          <div class="panel-title between">
            <span><User :size="18" /> {{ copy('公开个人主页', 'Public Profile') }}</span>
            <small v-if="profile">@{{ profile.user.username }}</small>
          </div>
        </template>

        <div v-if="loading" class="loading-line">{{ copy('主页加载中...', 'Loading profile...') }}</div>
        <p v-else-if="error" class="error-line">{{ error }}</p>
        <template v-else-if="profile">
          <div class="module-intro">
            <strong>{{ profile.user.displayName }}</strong>
            <span>{{ profile.user.bio || copy('这条鱼还没有写简介。', 'This fish has not written a bio yet.') }}</span>
          </div>
          <section class="profile-section profile-summary">
            <div>
              <span>{{ copy('公开累计分', 'Public total') }}</span>
              <strong>{{ profile.totalScore.toFixed(1) }}</strong>
            </div>
            <div>
              <span>{{ copy('公开记录', 'Public records') }}</span>
              <strong>{{ profile.records.length }}</strong>
            </div>
            <div>
              <span>{{ copy('徽章', 'Badges') }}</span>
              <strong>{{ profile.badges.filter((badge) => badge.unlocked).length }}</strong>
            </div>
          </section>
          <section class="profile-section">
            <div class="profile-section-head">
              <strong>{{ copy('摸鱼画像', 'Slacking Persona') }}</strong>
              <small>{{ copy('公开记录统计', 'Public record stats') }}</small>
            </div>
            <div v-if="profileInsightsLoading" class="loading-line">{{ copy('画像加载中...', 'Loading insights...') }}</div>
            <template v-else-if="profileInsights">
              <div class="module-intro">
                <strong>{{ profileInsights.persona.label }}</strong>
                <span>{{ profileInsights.persona.description }}</span>
              </div>
              <div v-if="profileInsights.totalRecords > 0" class="record-tags">
                <span>{{ copy('平均分', 'Average') }} {{ profileInsights.averageScore.toFixed(1) }}</span>
                <span>{{ copy('常用类型', 'Top Type') }} {{ profileInsights.topSlackingType?.label ?? '-' }}</span>
                <span>{{ copy('常用伪装', 'Top Disguise') }} {{ profileInsights.topDisguise?.label ?? '-' }}</span>
                <span>{{ copy('互动', 'Interactions') }} {{ profileInsights.interactions.likes + profileInsights.interactions.comments + profileInsights.interactions.legendNominations }}</span>
              </div>
              <div v-else class="empty-list">{{ copy('公开画像还在空白水域。', 'Public insights are still empty.') }}</div>
            </template>
          </section>
          <section class="profile-section">
            <div class="profile-section-head">
              <strong>{{ copy('公开记录', 'Public Records') }}</strong>
              <small>{{ copy('只展示已公开且审核通过的内容', 'Only approved public content') }}</small>
            </div>
            <div v-if="profile.records.length" class="profile-record-list">
              <button v-for="record in profile.records" :key="record.id" class="profile-record-button" type="button" @click="openProfileRecord(record.id)">
                <span>{{ translatedTitle(record.title) }}</span>
                <strong>{{ record.score.toFixed(1) }}</strong>
                <small>{{ record.activityText }}</small>
              </button>
            </div>
            <div v-else class="empty-list">{{ copy('这条鱼还没有公开记录。', 'This fish has no public records yet.') }}</div>
          </section>
          <section class="profile-section">
            <div class="profile-section-head">
              <strong><BadgeCheck :size="15" /> {{ copy('公开成就', 'Public Badges') }}</strong>
              <small>{{ copy('只展示解锁状态', 'Unlocked state only') }}</small>
            </div>
            <div class="record-tags">
              <span v-for="badge in profile.badges.filter((item) => item.unlocked)" :key="badge.key">{{ badge.label }}</span>
            </div>
          </section>
        </template>
      </PxCard>
    </aside>
  </section>
</template>
