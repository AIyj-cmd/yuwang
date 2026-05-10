<script setup lang="ts">
/**
 * MainWorkspace
 * -----------------------------------------------------------------
 * Top-level right-side container for the whole frontend user shell.
 * Fills all remaining screen real estate next to the fixed Sidebar.
 *
 * - width: 100%
 * - min-height: 100vh
 * - padding: 24px
 * - pixel game workbench background (grid + subtle yellow/mint wash)
 * - no max-width / centering
 */
</script>

<template>
  <div class="main-workspace">
    <div class="main-workspace__inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.main-workspace {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  padding: 24px;
  color: #18202a;
  background:
    radial-gradient(circle at top left, rgba(255, 230, 109, 0.22), transparent 55%),
    radial-gradient(circle at bottom right, rgba(216, 255, 244, 0.45), transparent 60%),
    linear-gradient(90deg, rgba(24, 32, 42, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(24, 32, 42, 0.08) 1px, transparent 1px),
    #f6f1e8;
  background-size:
    auto,
    auto,
    24px 24px,
    24px 24px,
    auto;
}

.main-workspace__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: calc(100vh - 48px);
  gap: 0;
}

@media (max-width: 960px) {
  .main-workspace {
    padding: 16px;
  }
}

@media (max-width: 640px) {
  .main-workspace {
    padding: 12px;
  }
}
</style>
