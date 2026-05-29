<script setup lang="ts">
import PixelIcon from '../community/PixelIcon.vue';
import type { GuildTask } from '../../types';

defineProps<{
  tasks: GuildTask[];
}>();
</script>

<template>
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
</template>

<style scoped>
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

.gd-empty-inline {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-6) 0;
}

@media (max-width: 720px) {
  .gd-tasks-grid {
    grid-template-columns: 1fr;
  }
}
</style>
