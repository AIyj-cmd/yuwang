<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Hash, Users } from 'lucide-vue-next';
import { useAppContext } from '../../appContext';

const { copy, guildsData, circlesData, groupsData } = useAppContext();
const router = useRouter();

const myGuild = computed(() => guildsData.value?.myGuild);
const joinedCircles = computed(() => circlesData.value?.joined ?? []);
const joinedGroups = computed(() => groupsData.value?.groups ?? []);
const hasSocialLinks = computed(() =>
  !!myGuild.value || joinedCircles.value.length > 0 || joinedGroups.value.length > 0
);

const goGuild = (id: number) => router.push(`/guilds/${id}`);
const goCircle = (id: number) => router.push(`/circles/${id}`);
const goGroup = (id: number) => router.push(`/groups/${id}`);
</script>

<template>
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
</template>

<style scoped>
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
  margin: 0;
}
</style>
