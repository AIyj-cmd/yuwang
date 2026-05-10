<script setup lang="ts">
/**
 * PageWorkbench
 * -----------------------------------------------------------------
 * Per-page container inside MainWorkspace. Owns vertical layout:
 * header -> body (via WorkbenchGrid or custom) -> optional footer strip.
 */

defineProps<{
  variant?: 'default' | 'flat';
}>();
</script>

<template>
  <section class="page-workbench" :data-variant="variant ?? 'default'">
    <slot />
  </section>
</template>

<style scoped>
.page-workbench {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: calc(100vh - 48px);
  gap: 18px;
}

@media (max-width: 640px) {
  .page-workbench {
    gap: 14px;
  }
}
</style>
