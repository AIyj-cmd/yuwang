<script setup lang="ts">
/**
 * Community V2 · CommunityShell
 * 三栏布局壳:左栏 nav slot / 中间 main slot / 右栏 side slot。
 * 严格按 STYLE_GUIDE §2.1 / §2.2 实现:
 *   - max-width 1280
 *   - grid-template-columns: 56px minmax(0, 1fr) 280px
 *   - 1280 → 240,960 → 隐藏右栏,720 → 顶部横向 nav
 *
 * v1.3 背景统一:
 *   挂载期间给 <html> 加 .is-community-v2 class,
 *   通过同文件的全局 <style> 把 body 背景统一为奶油白 + 极淡纹理,
 *   并让顶部导航底色与之衔接。卸载时移除 class,不污染其他页面。
 *   不再依赖 shell 自身的 background-color 或 ::before 来"贴一块米白底"。
 */
import { onBeforeUnmount, onMounted } from 'vue';

const HTML_CLASS = 'is-community-v2';

onMounted(() => {
  document.documentElement.classList.add(HTML_CLASS);
});
onBeforeUnmount(() => {
  document.documentElement.classList.remove(HTML_CLASS);
});
</script>

<template>
  <div class="community-shell">
    <aside class="shell-nav">
      <slot name="nav" />
    </aside>
    <main class="shell-main">
      <slot name="main" />
    </main>
    <aside class="shell-side">
      <slot name="side" />
    </aside>
  </div>
</template>

<style scoped>
/* v1.3:shell 自身不再绘制背景,完全交由 body 承担,避免出现"贴片"色块 */
.community-shell {
  max-width: var(--layout-max-width);
  margin: 0 auto;
  padding: var(--space-6);
  display: grid;
  grid-template-columns: var(--layout-sidebar-left) minmax(0, 1fr) var(--layout-sidebar-right);
  gap: var(--space-6);
  align-items: start;
  background: transparent;
}
.shell-main {
  min-width: 0;
  display: grid;
  gap: var(--space-3);
}
.shell-side {
  display: grid;
  gap: var(--space-4);
  position: sticky;
  top: var(--space-6);
  min-width: 0;
}

@media (max-width: 1280px) {
  .community-shell {
    grid-template-columns: var(--layout-sidebar-left) minmax(0, 1fr) var(--layout-sidebar-right-compact);
  }
}
@media (max-width: 960px) {
  .community-shell {
    grid-template-columns: var(--layout-sidebar-left) minmax(0, 1fr);
  }
  .shell-side {
    display: none;
  }
}
@media (max-width: 720px) {
  .community-shell {
    grid-template-columns: 1fr;
    padding: var(--space-4);
    gap: var(--space-4);
  }
}
</style>

<!--
  v1.3 全局规则(非 scoped):
  仅当 <html> 带 .is-community-v2 class 时生效。
  CommunityShell mount/unmount 控制 class 加减,
  其他页面完全不受影响。
-->
<style>
html.is-community-v2 {
  /* 覆盖 themes.css 默认的黑色网格 SVG;背景跟随当前主题的 V2 page token */
  background-color: var(--color-bg-base);
  background-image: none;
}
html.is-community-v2 body {
  background-color: var(--color-bg-base);
  /*
   * 极淡纹理:1px 半透明暖灰圆点,fill-opacity 0.04,
   * 距离很近时几乎不可见,只在大面积时形成微弱纹理感。
   * 远低于 themes.css 默认网格的 0.06 stroke 强度。
   */
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><circle cx='2' cy='2' r='1' fill='%238b8680' fill-opacity='0.045'/></svg>");
  background-repeat: repeat;
}

/*
 * 顶部导航在社区页期间的衔接:
 *   - 背景统一与 body 同色,避免出现"导航白条 + 内容奶油白"的两段色感
 *   - 底线由 nav.css 的 var(--color-divider) 提供,跟随主题,这里不再叠加
 */
html.is-community-v2 .top-nav {
  background: var(--color-bg-base);
}

/*
 * App shell main 区域也透明,让 body 底色直接透出来。
 * styles.css 中可能给 .app-shell / .app-main 设了 surface 色,这里压一下。
 */
html.is-community-v2 .app-shell,
html.is-community-v2 .app-main {
  background: transparent;
}
</style>
