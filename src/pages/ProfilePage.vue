<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { Fish } from 'lucide-vue-next';
import { PxButton } from '@mmt817/pixel-ui';
import { useAppContext } from '../appContext';
import { useProfileInsights } from '../composables/useProfileInsights';
import ProfileHero from '../components/ProfileHero.vue';
import QuickStats from '../components/profile/QuickStats.vue';
import LevelProgress from '../components/profile/LevelProgress.vue';
import Heatmap from '../components/profile/Heatmap.vue';
import PersonaCard from '../components/profile/PersonaCard.vue';
import SocialLinks from '../components/profile/SocialLinks.vue';
import BadgeList from '../components/profile/BadgeList.vue';
import RecentRecords from '../components/profile/RecentRecords.vue';

const {
  currentUser,
  profile,
  loadProfile,
  loadWallet,
  loadGuilds,
  openAuthPanel,
  copy,
  t
} = useAppContext();

const goLogin = () => {
  // 直接打开顶部账户面板的登录表单，而不是仅跳转到首页。
  openAuthPanel('login');
};

const { profileInsights, profileInsightsLoading, loadProfileInsights } = useProfileInsights();

watch(
  () => profile.value?.user?.username,
  (username) => {
    void loadProfileInsights(username);
  },
  { immediate: true }
);

onMounted(() => {
  loadProfile();
  loadWallet();
  loadGuilds();
});

const refreshInsights = () => {
  void loadProfileInsights(profile.value?.user?.username);
};
</script>

<template>
  <div class="pp-page">
    <!-- 未登录 -->
    <div v-if="!currentUser" class="pp-empty-state">
      <Fish :size="48" />
      <p>{{ t('needLogin') }}</p>
      <PxButton type="primary" @click="goLogin">
        {{ copy('去登录', 'Sign In') }}
      </PxButton>
    </div>

    <template v-else>
      <ProfileHero />
      <QuickStats />

      <div class="pp-body">
        <div class="pp-col pp-col-left">
          <LevelProgress />
          <Heatmap v-if="profile && profile.records.length > 0" :records="profile.records" />
          <PersonaCard
            :insights="profileInsights"
            :loading="profileInsightsLoading"
            @refresh="refreshInsights"
          />
        </div>

        <div class="pp-col pp-col-right">
          <SocialLinks />
          <BadgeList />
          <RecentRecords v-if="profile && profile.records.length > 0" :records="profile.records" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pp-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px 64px;
  display: grid;
  gap: 24px;
}

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

@media (max-width: 760px) {
  .pp-page {
    padding: 20px 16px 48px;
    gap: 20px;
  }
  .pp-body {
    grid-template-columns: 1fr;
  }
}
</style>
