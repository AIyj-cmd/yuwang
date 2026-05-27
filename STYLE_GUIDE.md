# 工位鱼王 · 视觉与排版规范 (STYLE_GUIDE)

> **版本**:v1.3(2026-05-27)
> **状态**:基于 v3 设计稿验证后的稳定版 + Community V2 落地后的"软化"修正 + 背景统一修正
>
> **v1.2 核心修正**:Neo-pixel Flat **禁止大面积黑色硬边框**(详见 §0.1)。
>
> **v1.3 核心修正**:Community V2 **页面背景必须统一**,不允许 body / app / 内容 shell 出现冲突底色,网格只作轻纹理(详见 §0.2)。
>
> 本文件是项目的视觉真理来源。任何 AI 或人在修改前端前,**必须先读完本文件**。
> 所有 UI 改动必须遵守本规范,不允许出现规范外的硬编码颜色、字号、间距。

---

## 0. 风格定位

**Neo-pixel Flat(新像素扁平风)**

核心配方:**80% 现代扁平 + 20% 像素点缀**。

- 整体使用现代圆润字体、低饱和奶油配色、扁平卡片、充足留白
- 像素元素仅用于:图标(鱼、徽章、称号)、装饰小元素、徽章
- 禁止:粗黑边框、纯像素字体、高饱和荧光色、纯黑文字、模糊阴影

视觉气质参考:Stardew Valley UI、动物森友会、itch.io 独立游戏 store 页、Linear 的克制感。

### 0.1 黑色硬边框禁用规则（v1.2 补充）

Neo-pixel Flat 不是粗黑描边像素后台。

**禁止大面积使用黑色或接近黑色边框**。黑色 / 深色边框只允许用于极少量小面积像素点缀，例如小徽章、小图标、极小尺寸装饰块，不允许作为下列元素的默认边界：

- 页面顶部导航分隔线
- 主卡片外框
- 右栏卡片外框
- 输入框外框
- 筛选 tab 外框
- 左侧导航容器外框
- PostBox 整体外框
- 普通按钮外框

默认边界必须使用柔和米灰 / 暖灰 token。强 CTA 允许强调，但优先通过主色、层级、扁平偏移阴影和留白实现，不优先使用黑色粗框。

目标气质：柔和、轻松、现代、低压迫感。像素感来自图标、徽章和小装饰，而不是所有容器都被黑线框住。

### 0.2 背景统一规则（v1.3 补充）

Community V2 的页面背景必须**统一**,不允许出现"中间一块米白色贴片、外面一圈蓝灰背景"的割裂感。

强制规则:

1. **body / app shell / 内容 shell 不允许使用互相冲突的背景色**。社区页期间,这三层应当属于同一背景系统。
2. **内容区域不能像贴在背景上的独立色块**。`CommunityShell` 不允许在自身上画一块明显不同色的大面积底板;统一底色应由 `body` 承担。
3. **网格 / 纹理只能作为极弱的轻背景**,不作为强视觉层。`themes.css` 默认 `--bg-pattern` 在 pond 主题下使用 `#18202a` 0.06 透明度网格,在 Community V2 中**必须降低到 0.05 以下并改为柔和暖灰**,或者直接 `none`。
4. **左栏、主栏、右栏所在区域属于同一背景系统**。左右栏空白处和主栏空白处看到的应该是同一种底色。
5. **顶部导航和社区内容区域之间不允许出现颜色断层**。导航底色必须与社区页 body 底色一致,或通过极柔分隔线衔接。
6. **层级靠 surface + border + shadow + spacing 建立**,不靠不同大色块对比。卡片用 `--color-bg-card`(白),body 用 `--color-bg-base`(奶油白),两者形成温和层级。
7. **黑色边框不能作为制造层级的手段**(已由 §0.1 约束)。

实现建议:Community V2 通过 `CommunityShell` 在挂载期给 `<html>` 加 `.is-community-v2` class,以全局 CSS 接管 `body` 背景为 `--color-bg-base`,并把 `--bg-pattern` 替换为极淡纹理或 `none`。卸载时移除 class,不污染其他页面。


---

## 1. Design Tokens(CSS 变量)

所有变量定义在 `src/styles/tokens.css`,全局引入。**禁止在组件中使用裸数值**。

### 1.1 颜色

```css
:root {
  /* 背景 */
  --color-bg-base: #FAF7F2;        /* 页面主背景,奶油白 */
  --color-bg-card: #FFFFFF;        /* 卡片背景 */
  --color-bg-subtle: #F3EFE6;      /* 次级背景,如输入框、标签底 */

  /* 主色与辅助色 */
  --color-primary: #FFD666;        /* 主色,柔和奶黄 */
  --color-primary-soft: #FFF2C7;   /* 主色柔化,用于 hover、次级强调 */
  --color-accent-mint: #A8D8C9;    /* 雾薄荷 */
  --color-accent-mint-soft: #ECF6F1; /* 薄荷柔化 */
  --color-accent-coral: #FFB4A2;   /* 柔粉珊瑚,传奇称号 */
  --color-accent-coral-soft: #FFF0E8; /* 珊瑚柔化 */
  --color-accent-lilac: #C8B6E2;   /* 雾紫,稀有标签 */

  /* 互动 active 状态色(v3 验证补齐) */
  --color-bg-active-warm: #FFF8DD;    /* 心、收藏 active 底色 */
  --color-bg-active-coral: #FFF0E8;   /* 传奇徽章 action active */
  --color-bg-active-danger: #FFE8E0;  /* 举报、危险操作 active */

  /* 文字 */
  --color-text-primary: #2B2B2B;
  --color-text-secondary: #8B8680;
  --color-text-tertiary: #B8B3AC;
  --color-text-body: #4A4A45;       /* 正文专用,比 primary 稍弱 */
  --color-text-inverse: #FFFFFF;

  /* 标签字色(深色描边版,搭配 soft 底色) */
  --color-text-on-mint: #4A6A5E;
  --color-text-on-coral: #7A4A3A;

  /* 边框与分隔 */
  --color-border: #E8E2D5;
  --color-border-strong: #D6CBBE;  /* 柔和强调边界；禁止作为黑色硬边框使用 */
  --color-border-emphasis: #C9BDAE; /* 少量强调边界 */
  --color-border-ink-soft: #B8AA99; /* 极少量像素点缀边界，禁止大面积使用 */
  --color-divider: #F0EBE0;

  /* 功能色 */
  --color-success: #8FBF9F;
  --color-warning: #E8B86A;
  --color-danger: #E89B8B;
  --color-info: #91B8D4;
}
```

**禁止使用**:`#000`、`#FFF`(除卡片白底外)、`red`/`green` 等关键字、未定义在 token 内的颜色。

### 1.2 字体

```css
:root {
  --font-sans: 'MiSans', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  --font-en: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, Consolas, monospace;
}
```

**字体引入**(在 `index.html` 中):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet" />
<!-- MiSans 通过 CDN,不可达时自动 fallback -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans@4.001/lib/MiSans-Regular.min.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans@4.001/lib/MiSans-Semibold.min.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/misans@4.001/lib/MiSans-Bold.min.css" />
```

- **中文正文**:MiSans
- **数字、英文、等宽**:JetBrains Mono(分数、统计、时间)、Inter(英文段落)
- **不使用像素字体**,像素感由图标承担

### 1.3 字号 / 行高

```css
:root {
  --text-xs: 12px;     /* 标签、徽章 */
  --text-sm: 13px;     /* 元信息 */
  --text-base: 15px;   /* 正文 */
  --text-md: 18px;     /* 副标题、卡片标题 */
  --text-lg: 24px;     /* 页面标题 */
  --text-xl: 32px;     /* 区块大标题 */
  --text-display: 40px;/* 核心数字(摸鱼指数) */

  --leading-tight: 1.3;
  --leading-normal: 1.5;
  --leading-relaxed: 1.6;
}
```

**字号体系只有 7 档**,禁止规范外字号(14px、20px、22px 等)。

### 1.4 间距(8 倍数体系)

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

使用规则:

- 元素内部 padding:`--space-2` ~ `--space-4`
- 元素之间 gap:`--space-3` ~ `--space-6`
- 模块之间 margin:`--space-8` ~ `--space-12`
- **禁止裸数字**

### 1.5 圆角

```css
:root {
  --radius-sm: 4px;    /* 标签、徽章 */
  --radius-md: 8px;    /* 默认:卡片、按钮、输入框 */
  --radius-lg: 12px;   /* 大容器:模态框 */
  --radius-pill: 999px;/* 头像、圆形按钮 */
}
```

### 1.6 阴影

```css
:root {
  /* 扁平偏移投影,核心视觉特征 */
  --shadow-flat-sm: 2px 2px 0 var(--color-border);
  --shadow-flat-md: 4px 4px 0 var(--color-border);
  --shadow-flat-lg: 6px 6px 0 var(--color-border);

  /* 悬浮阴影,仅用于浮层 */
  --shadow-soft: 0 4px 16px rgba(43, 43, 43, 0.08);
}
```

**默认使用扁平偏移投影**,模糊阴影只用在浮层(模态、下拉)。

### 1.7 边框

```css
:root {
  --border-default: 1.5px solid var(--color-border);
  --border-strong: 1.5px solid var(--color-border-emphasis); /* 柔和强调边框；禁止粗黑描边 */
}
```

---

## 2. 布局规范

### 2.1 全局栅格

页面采用**三栏布局**,最大宽度 `1280px` 居中:

```
┌──────┬───────────────────────┬──────────┐
│ 左栏  │       主内容栏          │  右栏    │
│ 56px  │     min 0 / 1fr        │ 280/240  │
│ 固定  │       自适应            │  固定    │
└──────┴───────────────────────┴──────────┘
```

`grid-template-columns: 56px minmax(0, 1fr) 280px` — **必须用 `minmax(0, 1fr)`**,否则长文本会撑破布局。

### 2.2 响应式断点(v3 验证)

```css
/* 1280px 以下:右栏压到 240px */
@media (max-width: 1280px) {
  .app { grid-template-columns: 56px minmax(0, 1fr) 240px; }
}
/* 960px 以下:右栏隐藏 */
@media (max-width: 960px) {
  .app { grid-template-columns: 56px minmax(0, 1fr); }
  .side { display: none; }
}
/* 720px 以下:左栏折叠为顶部横向条 */
@media (max-width: 720px) {
  .app { grid-template-columns: 1fr; padding: 16px; gap: 16px; }
  .nav { position: static; flex-direction: row; overflow-x: auto; }
}
```

JS 引用断点:

```css
:root {
  --bp-mobile: 720px;
  --bp-tablet: 960px;
  --bp-desktop: 1280px;
}
```

### 2.3 首页信息架构

**从上到下顺序**(v3 验证):

1. **页头**(精简,左侧"社区广场"标题 + 右侧搜索图标按钮,合并为一行)
2. **投放入口**(主 CTA,黄底,占整行,高 68px)
3. **筛选 Tab**(紧凑 28px,count 仅 active 显示)
4. **内容瀑布流**(卡片列表)
5. **右栏**(我的摸鱼数据 → 今日全站 → 排行榜 → 更多工具 → 推荐)

**关键原则**:

- 搜索是次要功能,**降级为右上角图标按钮**,不占整行
- **投放入口必须是首页最醒目的元素**,使用主色 + 柔和强调边框 + 扁平阴影
- 数据卡片不放主栏顶部,移至右栏
- 冷启动期数值 < 5 时,按 §4 数据降级规则处理

### 2.4 间距节奏

- 卡片之间 gap:`--space-4`(16px)
- 模块之间 margin:`--space-8`(32px)
- 区块标题与内容之间:`--space-6`(24px)
- 页面顶部 padding:`--space-6`(24px)

---

## 3. 核心组件规范

### 3.1 投放入口(post-box)— 首页主 CTA

**必须存在于首页顶部**,这是产品核心动作。结构:

```
┌────────────────────────────────────────────┐
│ [✏ 图标] [今天这条鱼怎么摸的?提示文案]  [鱼上墙] │  ← 黄底,柔和强调边框
└────────────────────────────────────────────┘
```

规范:

- 容器:`background: var(--color-primary)`、`border: var(--border-strong)`、`border-radius: var(--radius-md)`、`box-shadow: var(--shadow-flat-md)`、`padding: var(--space-3) var(--space-4)`、高度 68px
- 左侧图标块:44×44px、白底、柔和强调边框
- 中间输入区(占位提示):44px 高、白底、柔和强调边框、`cursor: text`、粗体主问题 + 次色副提示
- 右侧投放按钮:44px 高、高对比 CTA，但避免黑色粗边框、扁平阴影、按下偏移动效

**移动端(<720px)**:wrap 成上下三段,图标在上,输入区中间宽,按钮在下宽。

### 3.2 内容卡片(record)

```
┌────────────────────────────────────────┐
│ [头像] 昵称          ┌─────────┐      │
│       5小时前·#标签   │  传奇   │      │  ← 称号徽章右上(80px)
│                     │   4.0   │      │
│                     └─────────┘      │
│                                        │
│  卡片标题(line-clamp: 1)              │
│                                        │
│  正文最多显示 3 行,超出折叠展开...    │
│  [展开全文 ↓]                          │  ← 仅长文本显示
│  ───────────────────────────────       │
│  ♥ 12   💬 3   ★ 5            ⋯       │  ← 0 值的按钮完全不显示数字
└────────────────────────────────────────┘
```

规范:

- 卡片:`background: var(--color-bg-card)`、`border: var(--border-default)`、`border-radius: var(--radius-md)`、`box-shadow: var(--shadow-flat-md)`、`padding: 18px 20px 14px`
- 使用 CSS Grid:`grid-template-columns: auto 1fr auto`,头像跨两行,徽章跨两行
- 头像:44px,圆角 8px,柔和强调边框,根据用户随机分配 mint / coral / primary 三色之一
- 昵称:`--text-base`、粗体、`--leading-tight`
- 元信息行:`--text-sm`、次色、时间(mono 字体)·小圆点分隔·主标签
- **每条记录只展示 1 个标签**,其余通过详情页查看
- 标题:`--text-md`、粗体、`line-clamp: 1`
- 正文:`--text-base`、`--leading-relaxed`、`color: --color-text-body`、`line-clamp: 3`
- **互动按钮数字为 0 时只显示图标不显示数字**;最右侧 `⋯` 更多按钮始终显示
- 评论框默认隐藏,点击 💬 才展开

### 3.3 称号徽章(title-badge)

像素风徽章是本产品的核心视觉资产。规范:

- 容器:`min-width: 80px`、`padding: 7px 8px`、`border: var(--border-strong)`、`border-radius: var(--radius-md)`、`box-shadow: var(--shadow-flat-sm)`
- 上下两行:称号文字(`--text-xs`、粗体)+ 分数(`--text-md`、mono 字体、粗体)
- 按等级配色:
  - 小鱼苗 / 默认:`--color-bg-subtle`
  - 老油条 / 常驻:`--color-accent-mint`
  - 高手 / 主流:`--color-primary`
  - 传奇:`--color-accent-coral`
- 移动端(<720px):`min-width: 72px`、`padding: 6px`

### 3.4 按钮

主按钮(CTA):

```css
.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-primary);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-base);
  font-weight: 600;
  box-shadow: var(--shadow-flat-sm);
  transition: transform 0.08s, box-shadow 0.08s;
}
.btn-primary:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--color-border);
}
.btn-primary:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-border);
}
```

强 CTA(投放按钮):深色主按钮可少量使用，但应优先柔和强调边界 + 主色层级,其余规则同上。

### 3.5 互动按钮(action)

行内按钮,带图标和数字:

```css
.action {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px; padding: 0 10px;
  background: transparent;
  border: var(--border-default); border-color: transparent;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.action:hover { background: var(--color-bg-base); color: var(--color-text-primary); }
.action.active { border-color: var(--color-border); background: var(--color-bg-active-warm); color: var(--color-text-primary); }
.action.legend.active { background: var(--color-bg-active-coral); }
.action.danger.active { background: var(--color-bg-active-danger); }
```

**数字为 0 时只渲染图标,不渲染数字 `<span>`**。

### 3.6 筛选 Tab

```css
.filter-tab {
  height: 28px;
  padding: 0 12px;
  border: var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.filter-tab.active {
  background: var(--color-primary);
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-flat-sm);
}
.filter-tab .count { display: none; }
.filter-tab.active .count { display: inline; }
```

**count 仅在 active tab 上显示**,其余隐藏。**所有 tab 要么全有图标、要么全无**,禁止混搭。

### 3.7 输入框

```css
.input {
  background: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  color: var(--color-text-primary);
}
.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-flat-sm);
}
```

### 3.8 数据卡片(right side card)

放在右栏。结构:

- 标题(`--text-md`、粗体、带像素图标)
- 副标题(`--text-xs`、次色)
- 主体内容(根据卡片类型变化)

核心数字使用 `--text-display`、`--font-mono`、`--color-text-primary`,后接分母 / 单位(次色、`--text-sm`)。

### 3.9 标签(tag)

```css
.tag {
  display: inline-flex; align-items: center;
  padding: 2px 8px;
  border: var(--border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-base);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-primary);
}
.tag.mint { background: var(--color-accent-mint-soft); border-color: var(--color-accent-mint); color: var(--color-text-on-mint); }
.tag.coral { background: var(--color-accent-coral-soft); border-color: var(--color-accent-coral); color: var(--color-text-on-coral); }
```

每条记录在列表页**展示标签数量上限 = 1**(主标签)。

---

## 4. 数据降级规则(冷启动期)

**这是产品策略的一部分,前端必须实现**,不允许只展示设计稿里的理想状态。

### 4.1 全站数据卡(今日全站)

每个指标(今日新增 / 今日活跃 / 今日点赞 等)独立判定:

- **数值 ≥ 5**:正常显示当日数据,如 `今日新增 128`
- **数值 < 5**:切换到 fallback 样式,显示累计数据,如 `累计 568`,并加柔和底色提示

CSS 实现:

```css
.fish-row.fallback {
  background: var(--color-bg-base);
  margin: 0 -8px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  border-top: none;
}
```

**禁止在同一个卡片里同时展示"正常态"和"fallback 态"**(这是 v3 mockup 的缺陷,实际产品里两者互斥)。

### 4.2 空状态(0 条记录)

首页内容流为空时,**必须有专门的空状态设计**,不允许只展示空白。建议结构:

- 居中大像素小鱼图(80×80px)
- 主文案:"鱼塘还没有人,你来当第一条!"(`--text-md`、粗体)
- 副文案:简短说明(`--text-sm`、次色)
- 大投放按钮(沿用 §3.1 投放入口样式)

### 4.3 近空状态(1-3 条记录)

正常展示,但不显示"今日活跃 1""今日新增 2"这种打击性数据,按 §4.1 降级。

---

## 5. 像素元素使用规范

像素感是**点缀**,不是主体。允许的使用场景:

1. **图标**:16px / 24px 的像素 SVG 图标
2. **称号徽章**:见 §3.3
3. **装饰元素**:卡片角落小水波、星星、气泡
4. **加载动画**:像素风小鱼游动

**像素图标实现方式**(v3 验证):

```html
<svg viewBox="0 0 16 16">
  <g shape-rendering="crispEdges" fill="currentColor">
    <!-- rect 拼接像素图,使用 currentColor 继承父级颜色 -->
    <rect x="2" y="6" width="1" height="4"/>
    <!-- ... -->
  </g>
</svg>
```

所有图标必须 `shape-rendering="crispEdges"` + `image-rendering: pixelated`,使用 `currentColor` 继承色。

**禁止**:

- 整段文字用像素字体
- 整块区域用像素纹理背景
- 像素元素超过 32px

---

## 6. 文案规范

**文案不应该由 AI 自动生成,需要作者把关**。规范:

### 6.1 投放入口文案

- 主提示(粗体):用问句拉互动,如 "今天这条鱼怎么摸的?"
- 副提示(次色):口语化、可填项暗示,**避免平台自创术语**(如"伪装方式、烈度、结局")

### 6.2 按钮文案

- 行动按钮带产品气质,如 "鱼上墙" / "投个鱼" / "发条鱼",**不要用"投放""提交""发布"等通用词**
- 否定按钮统一为 "取消" / "再想想"

### 6.3 空状态与降级文案

- 不展示打击性数据(如"今日活跃 1")
- 用累计数据 + 鼓励性语气(如 "累计 568 条 · 加把劲")
- 空状态文案要轻松,不要冷冰冰("鱼塘还没有人,你来当第一条!" 而不是 "暂无数据")

### 6.4 合规与审核提示

- 短、轻、不放主视觉位置
- 例:在投放按钮旁小字 "120 字以内 · 别写公司名",而不是页头长段声明

---

## 7. 命名与代码规范

### 7.1 CSS 命名

使用 BEM 或 Tailwind utility,**禁止裸数值**:

```css
/* ❌ 错误 */
.card { padding: 20px; border-radius: 6px; color: #333; }

/* ✅ 正确 */
.card {
  padding: var(--space-5);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
}
```

### 7.2 组件命名

- 通用组件:`Card.vue`、`Button.vue`、`Tag.vue`、`Badge.vue`、`Icon.vue`、`Input.vue`
- 业务组件:`RecordCard.vue`、`TitleBadge.vue`、`PostBox.vue`、`FilterTabs.vue`、`LeaderboardItem.vue`、`SideDataCard.vue`、`EmptyState.vue`
- 页面:`CommunityPage.vue`、`LeaderboardPage.vue`、`ProfilePage.vue`

### 7.3 图标组件

像素图标统一封装为 `<Icon>` 组件,以 `name` 属性引用,颜色用 `currentColor` 继承:

```vue
<Icon name="fish" />
<Icon name="heart" class="text-coral" />
```

所有图标定义在 `src/components/ui/icons/` 下,统一管理。

### 7.4 文件结构

```
src/
├── styles/
│   ├── tokens.css      ← Design tokens
│   ├── reset.css       ← 重置样式
│   └── global.css      ← 全局样式
├── components/
│   ├── ui/             ← 通用 UI 组件
│   │   ├── icons/
│   │   └── Icon.vue
│   └── business/       ← 业务组件
└── pages/
```

---

## 8. 给 AI 协作者的硬性要求

**任何 AI(Claude Code / Kimi / Codex / DeepSeek)修改前端前必须**:

1. 先读完本文件
2. 修改时只使用 token 中定义的变量,**禁止硬编码颜色、字号、间距**
3. 新增组件前先检查 `src/components/ui/` 是否已存在,优先复用
4. 修改完成后,在 PR 描述中声明"已遵守 STYLE_GUIDE.md"
5. 如果发现 token 不够用,**先在本文件 §1 中扩充 token,再使用**,不允许临时硬编码
6. 实现数据展示组件时,**必须实现 §4 的降级规则**,不允许只做理想状态
7. 文案占位符必须用 `{{ TODO: 文案 }}` 标记,**禁止 AI 自行编造产品文案**

**违反规范的代码视为错误,需要重写**。

---

## 9. 变更日志

- **v1.3(2026-05-27)**:Community V2 背景统一
  - 新增 §0.2 背景统一规则
  - body / app shell / CommunityShell 三层不允许冲突底色
  - 网格 / 纹理降级为极弱轻背景,或 none
  - 内容区域不再像贴片,统一底色由 body 承担
  - 顶部导航与社区区域必须衔接自然,不允许颜色断层
  - 实现方式:CommunityShell 挂载期 toggle `<html>.is-community-v2` class,通过全局 CSS 接管 body 背景,卸载时清理

- **v1.2(2026-05-27)**:补充黑色硬边框禁用规则
  - 明确 Neo-pixel Flat 不是粗黑描边像素后台
  - 黑色 / 深色边框仅允许用于极少量小面积像素点缀
  - 默认卡片、导航、输入框、右栏和 PostBox 使用柔和边界
  - `--color-border-strong` 调整为柔和强调边界语义
  - 强 CTA 优先使用主色、层级和柔和投影，不依赖黑色粗框

- **v1.1(2026-05-26)**:基于 v3 设计稿验证后的稳定版
  - 补充互动 active 状态色 token(warm / coral / danger)
  - 补充标签字色 token(on-mint / on-coral)
  - 补充正文专用色 `--color-text-body`
  - 三栏布局明确 `minmax(0, 1fr)`,响应式断点改为 1280 / 960 / 720
  - 新增 §3.1 投放入口规范(首页主 CTA)
  - 新增 §4 数据降级规则(冷启动期处理)
  - 新增 §6 文案规范
  - 称号徽章宽度从 92px 调整为 80px
  - 筛选 tab 高度 28px,count 仅 active 显示
  - 像素图标实现规范化为纯 SVG rect 方案
- **v1.0(2026-05-26)**:初始版本,确立 Neo-pixel Flat 风格、三栏布局、卡片规范
