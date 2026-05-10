<script setup lang="ts">
/**
 * WorkbenchGrid
 * -----------------------------------------------------------------
 * Flexible multi-column body for the workbench.
 *
 * Column configurations:
 *  - 'two'   : main (~55%) + side (~45%)       -> `main` / `side`
 *  - 'three' : left (filters) / main / side    -> `left` / `main` / `side`
 *  - 'triple': three equal balanced columns
 *  - 'stack' : single column (no splitting)
 *
 * Below 1100px the grid collapses to a single column automatically.
 */

defineProps<{
  columns?: 'two' | 'three' | 'triple' | 'stack';
}>();
</script>

<template>
  <div class="workbench-grid" :data-columns="columns ?? 'two'">
    <aside v-if="$slots.left" class="workbench-grid__col workbench-grid__col--left">
      <slot name="left" />
    </aside>
    <section v-if="$slots.main" class="workbench-grid__col workbench-grid__col--main">
      <slot name="main" />
    </section>
    <aside v-if="$slots.side" class="workbench-grid__col workbench-grid__col--side">
      <slot name="side" />
    </aside>
    <div v-if="$slots.default" class="workbench-grid__col workbench-grid__col--full">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.workbench-grid {
  display: grid;
  gap: 18px;
  width: 100%;
  min-width: 0;
  align-items: stretch;
}

.workbench-grid[data-columns='two'] {
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
}

.workbench-grid[data-columns='three'] {
  grid-template-columns: minmax(240px, 0.85fr) minmax(0, 1.6fr) minmax(260px, 0.95fr);
}

.workbench-grid[data-columns='triple'] {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.workbench-grid[data-columns='stack'] {
  grid-template-columns: minmax(0, 1fr);
}

.workbench-grid__col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 14px;
}

@media (max-width: 1280px) {
  .workbench-grid[data-columns='three'] {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  }

  .workbench-grid[data-columns='three'] .workbench-grid__col--side {
    grid-column: 1 / -1;
  }

  .workbench-grid[data-columns='triple'] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .workbench-grid[data-columns='two'],
  .workbench-grid[data-columns='three'],
  .workbench-grid[data-columns='triple'] {
    grid-template-columns: minmax(0, 1fr);
  }

  .workbench-grid[data-columns='three'] .workbench-grid__col--side {
    grid-column: auto;
  }
}
</style>
