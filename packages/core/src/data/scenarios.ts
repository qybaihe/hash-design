import type { Scenario, ScenarioId } from '../types.js';

/**
 * Design scenarios: what kind of artifact the rolled direction is applied to.
 *
 * `web` is the default and changes nothing in the mapping. The other scenarios keep every rolled
 * dimension (branch, voice, layout, type, palette, motif, anchor, scale, surface) and add:
 *  - a format picked by byte 13 (canvas or viewport, plus a structural variant),
 *  - pool filters for density and twist (applied before bytes 6 and 12, like light_only),
 *  - a root text size suited to the canvas, and scenario-specific output rules.
 * Scenario data has its own fingerprint, so editing it never changes web refs or the library fingerprint.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'web',
    name: { zh: '网页', en: 'Web page' },
    summary: {
      zh: '网页 / 落地页 / 一页站（默认场景，brief 与以往完全相同）。',
      en: 'A web page, landing page or one-page site (the default; briefs are exactly as before).',
    },
    output: {
      zh: '一个自包含、响应式的 HTML 页面，从 390px 手机到宽屏桌面都可读。',
      en: 'One self-contained, responsive HTML page, readable from a 390 px phone to a wide desktop.',
    },
    count: { zh: '一页，包含版式里的全部区块。', en: 'One page with every section of the layout.' },
    layout: {
      zh: '按版式的栅格和区块顺序（自上而下）。',
      en: 'The layout’s grid and section order, top to bottom.',
    },
    anchor: { zh: '首屏锚点就是首屏。', en: 'The anchor is the first screen.' },
    motion: { zh: '按 brief 的动效规格。', en: 'As the brief’s motion spec says.' },
    baseSize: { scale: 1 },
    formats: [],
    dropDensities: [],
    dropTwists: [],
    stillMotion: false,
    must: [],
    mustNot: [],
  },
  {
    id: 'deck',
    name: { zh: '幻灯片', en: 'Slide deck' },
    summary: {
      zh: '一份 16:9 幻灯片：单个 HTML 文件，每页一张 1920×1080 的画布。',
      en: 'A 16:9 slide deck: one HTML file, one 1920×1080 canvas per slide.',
    },
    output: {
      zh: '一个自包含 HTML 文件。每张幻灯片是固定 1920×1080 画布上的一个 <section class="slide">，按窗口等比缩放（留边，不重排）。←/→、PageUp/PageDown 和空格翻页，URL hash（#3）记录当前页。打印样式（@page { size: 1920px 1080px; margin: 0 }，每页一张）让"打印 → PDF"直接导出整套。',
      en: 'One self-contained HTML file. Each slide is a <section class="slide"> on a fixed 1920×1080 canvas, scaled to fit the window (letterboxed, never reflowed). ←/→, PageUp/PageDown and Space change slides; the URL hash (#3) tracks the current one. A print stylesheet (@page { size: 1920px 1080px; margin: 0 }, one slide per page) makes "Print → PDF" export the deck.',
    },
    count: {
      zh: '预览：5–7 张（封面、一个章节页、内容页、数据或事实页、结尾页）。正式稿：按用户要求的页数；没说就 8–14 张，一页只讲一件事。',
      en: 'Preview: 5–7 slides (cover, one section divider, content, a data or fact slide, closing). Final deck: the slide count the user asks for, otherwise 8–14, one idea per slide.',
    },
    layout: {
      zh: '分支版式的栅格放大到 1920×1080 作为母版栅格；它的区块顺序就是幻灯片顺序（一个区块对应一张或几张）。每张只用一种页型：封面、章节页、单句页、内容页（文字 + 视觉）、图表/数据页、引语或事实高亮页、结尾页。',
      en: 'The branch layout’s grid, scaled to 1920×1080, is the slide master grid; its section order is the slide order (one section becomes one or more slides). Each slide is one type: cover, section divider, statement, content (text + visual), figure or data, quote or fact highlight, closing.',
    },
    anchor: { zh: '首屏锚点就是封面页。', en: 'The first-screen anchor is the cover slide.' },
    motion: {
      zh: '动效只用于翻页过渡和每页最多一次逐项出现，时长和缓动按 brief；不要循环动画。',
      en: 'Motion is for slide transitions and at most one build per slide, with the brief’s duration and easing; nothing loops.',
    },
    baseSize: { scale: 2 },
    formats: [
      {
        id: 'full-bleed',
        name: { zh: '满版母版', en: 'Full-bleed master' },
        description: {
          zh: '每张都用满整个画布；章节页是整块强调色或面板色；角落放一个小页脚（标题 · n/N）。',
          en: 'Every slide uses the whole canvas edge to edge; section dividers are solid fields of accent or panel colour; a small running folio (title · n/N) sits in one corner.',
        },
        width: 1920,
        height: 1080,
        fixed: true,
      },
      {
        id: 'index-rail',
        name: { zh: '索引栏母版', en: 'Index-rail master' },
        description: {
          zh: '画布一侧有一条常驻索引栏（约 1/6 宽），列出各章节并标出当前章节；内容占其余部分。',
          en: 'A persistent rail on one edge (about a sixth of the width) lists the sections and marks the current one; content fills the rest.',
        },
        width: 1920,
        height: 1080,
        fixed: true,
      },
      {
        id: 'document',
        name: { zh: '文档母版', en: 'Document master' },
        description: {
          zh: '每张像印刷报告的一页：页眉写标题与章节，图表编号、脚注齐全，右下角页码。',
          en: 'Slides read like pages of a printed report: a header line with the title and section, numbered figures and footnotes, the page number bottom right.',
        },
        width: 1920,
        height: 1080,
        fixed: true,
      },
    ],
    dropDensities: ['packed'],
    dropTwists: ['no-button-above-fold'],
    stillMotion: false,
    must: [
      {
        zh: '每张严格 1920×1080，页内不滚动。',
        en: 'Every slide is exactly 1920×1080 and nothing scrolls inside a slide.',
      },
      {
        zh: '画布上正文至少 28px；除数据表外每页不超过约 40 个英文词或 80 个汉字。',
        en: 'Body text is at least 28 px on the canvas; outside data tables, no more than about 40 words per slide.',
      },
      {
        zh: '显示页码（n / N），顺序遵循版式的区块顺序。',
        en: 'Slide numbers are visible (n / N) and the order follows the layout’s section order.',
      },
    ],
    mustNot: [
      { zh: '不堆项目符号：每页最多 5 条。', en: 'No bullet walls: at most 5 bullets on a slide.' },
      {
        zh: '不要每页都是"顶部标题 + 项目符号框"的默认模板。',
        en: 'No default template of a title on top and a bullet box on every slide.',
      },
      {
        zh: '不要套话式"谢谢 / Q&A"结尾页，除非事实里有。',
        en: 'No stock "Thank you / Q&A" closing slide unless the facts call for one.',
      },
    ],
  },
  {
    id: 'app',
    name: { zh: '手机 App 界面', en: 'Mobile app screens' },
    summary: {
      zh: '手机 App 界面：一个 HTML 页面，把同一条使用流程的几个手机屏并排展示。',
      en: 'Mobile app screens: one HTML page showing several phone screens of one user journey side by side.',
    },
    output: {
      zh: '一个自包含 HTML 页面。每个屏是 390×844 的框（CSS px 即 iOS pt），画成中性的设备轮廓，顶部 54px 状态栏区和底部 34px 主屏指示条区留空；各屏在素色背景上并排，窄窗口时换行。不要逐像素模仿某款手机或 iOS / Android 的系统界面。',
      en: 'One self-contained HTML page. Each screen is a 390×844 frame (CSS px = iOS points) drawn as a neutral device outline, with the status-bar area (top 54 px) and home-indicator area (bottom 34 px) kept clear; screens sit side by side on a plain backdrop and wrap on narrow windows. Do not copy a specific phone model or the iOS / Android system UI pixel for pixel.',
    },
    count: {
      zh: '预览：3 屏（入口、主任务、详情或结果）。正式稿：按用户要的流程每步一屏，通常 4–6 屏。',
      en: 'Preview: 3 screens (entry, the main task, a detail or result). Final: one screen per step of the journey the user asks for, usually 4–6.',
    },
    layout: {
      zh: '把分支版式当成一套屏幕系统：栅格变成 390pt 宽的屏幕栅格（左右边距 16–24pt），前几个区块构成入口屏，其余分到后面的屏。一个屏只做一件事。',
      en: 'Read the branch layout as a screen system: its grid becomes the 390 pt screen grid (16–24 pt side margins), its first sections make the entry screen and the rest spread over the following screens. One screen, one job.',
    },
    anchor: {
      zh: '首屏锚点是入口屏的主体元素。',
      en: 'The first-screen anchor is the main element of the entry screen.',
    },
    motion: {
      zh: '动效用于按压反馈和转场（按下态、底部面板滑出），时长和缓动按 brief；预览可以是静态的。',
      en: 'Motion is for press feedback and transitions (pressed states, a sheet sliding up), with the brief’s duration and easing; previews may stay static.',
    },
    baseSize: { min: 16, max: 17 },
    formats: [
      {
        id: 'tab-bar',
        name: { zh: '底部标签栏', en: 'Bottom tab bar' },
        description: {
          zh: '常驻底部标签栏，3–5 个带文字的入口；当前项的标示不能只靠颜色。',
          en: 'A persistent bottom tab bar with 3–5 labelled destinations; the current one is marked by more than colour.',
        },
        width: 390,
        height: 844,
        fixed: false,
      },
      {
        id: 'top-tabs',
        name: { zh: '顶部分段 + 返回栈', en: 'Top tabs with a back stack' },
        description: {
          zh: '标题下方是分段控件或标签；更深的屏用顶栏返回按钮压栈进入；没有底部栏。',
          en: 'A segmented control or tabs under the title; deeper screens push in with a back button in the top bar; no bottom bar.',
        },
        width: 390,
        height: 844,
        fixed: false,
      },
      {
        id: 'single-flow',
        name: { zh: '单任务流程', en: 'Single-task flow' },
        description: {
          zh: '线性流程，带进度指示，每屏一个主操作放在拇指够得着的高度；除返回外没有别的出口。',
          en: 'A linear flow with a progress indicator and one primary action per screen at thumb height; back is the only other way out.',
        },
        width: 390,
        height: 844,
        fixed: false,
      },
      {
        id: 'sheet',
        name: { zh: '底部面板驱动', en: 'Sheet-driven' },
        description: {
          zh: '一个常驻主视图（地图、列表或画布），内容放在可拖动的底部面板里，有两到三档高度。',
          en: 'One persistent main view (map, list or canvas) with content in a draggable bottom sheet at two or three heights.',
        },
        width: 390,
        height: 844,
        fixed: false,
      },
    ],
    dropDensities: ['packed'],
    dropTwists: ['no-button-above-fold', 'footer-as-colophon'],
    stillMotion: false,
    must: [
      {
        zh: '触控目标至少 44×44pt，彼此间距至少 8pt。',
        en: 'Touch targets are at least 44×44 pt with at least 8 pt between them.',
      },
      {
        zh: '正文至少 16px；任何功能都不依赖悬停。',
        en: 'Body text is at least 16 px; nothing depends on hover.',
      },
      {
        zh: '主要操作放在屏幕下半部，拇指够得着。',
        en: 'Primary actions sit in the lower half of the screen, within thumb reach.',
      },
      {
        zh: '每个屏下方标注步骤名，整条流程从左到右可读。',
        en: 'Each frame is captioned with its step, so the journey reads left to right.',
      },
    ],
    mustNot: [
      {
        zh: '不要把桌面版式塞进手机：不要多栏正文、悬停菜单或超出屏宽的表格。',
        en: 'No desktop layout squeezed into a phone: no multi-column text, hover menus or tables wider than the screen.',
      },
      {
        zh: '不要假系统界面：不要运营商名、假通知或手机厂商标志。',
        en: 'No fake system chrome: no carrier names, fake notifications or phone-maker logos.',
      },
    ],
  },
  {
    id: 'dashboard',
    name: { zh: '数据看板', en: 'Dashboard' },
    summary: {
      zh: '数据看板：一个桌面屏，一眼看清某件事的状态。',
      en: 'A dashboard: one desktop screen that shows the state of something at a glance.',
    },
    output: {
      zh: '一个自包含 HTML 页面，按 1440×900 视口设计；最重要的数字和主图表不滚动就能看到。图表用内联 SVG 或 HTML/CSS 画，数据来自事实。窄到 390px 仍可用（面板堆叠）。',
      en: 'One self-contained HTML page designed for a 1440×900 viewport; the most important figures and the main chart are visible without scrolling. Charts are inline SVG or HTML/CSS, drawn from the facts. It stays usable down to 390 px (panels stack).',
    },
    count: {
      zh: '一屏：1–3 个核心数字、一个主图表或主表格、2–4 个辅助面板。正式稿按用户要求补上筛选、详情抽屉、空状态等。',
      en: 'One screen: 1–3 headline figures, one primary chart or table, 2–4 supporting panels. The final page adds the states the user asks for (filters, a detail drawer, empty states).',
    },
    layout: {
      zh: '分支版式的栅格变成面板栅格；区块顺序决定面板的阅读顺序，最重要的在前。面板长什么样（细线框、卡片、图版、票据……）由分支决定，而不是后台模板的默认样子。',
      en: 'The branch layout’s grid becomes the panel grid; its section order sets the reading order of the panels, most important first. The branch decides what a panel looks like (ruled box, card, plate, ticket…), not admin-template defaults.',
    },
    anchor: { zh: '首屏锚点承载核心数字。', en: 'The first-screen anchor holds the headline figures.' },
    motion: {
      zh: '动效只用于数据更新和悬停/聚焦反馈，时长和缓动按 brief；加载时不做入场动画。',
      en: 'Motion is for data updates and hover or focus feedback only, with the brief’s duration and easing; nothing animates on load.',
    },
    baseSize: { min: 13, max: 15 },
    formats: [
      {
        id: 'sidebar',
        name: { zh: '侧栏外壳', en: 'Sidebar shell' },
        description: {
          zh: '左侧导航栏（200–240px）加顶栏（标题和时间范围），其余是面板。',
          en: 'A left navigation column (200–240 px) and a top bar with the title and time range; panels fill the rest.',
        },
        width: 1440,
        height: 900,
        fixed: false,
      },
      {
        id: 'top-nav',
        name: { zh: '顶栏外壳', en: 'Top-bar shell' },
        description: {
          zh: '一条顶栏放导航、标题和筛选；下方面板占满全宽。',
          en: 'One top bar holds navigation, title and filters; the panels below use the full width.',
        },
        width: 1440,
        height: 900,
        fixed: false,
      },
      {
        id: 'wall',
        name: { zh: '看板墙', en: 'Wall display' },
        description: {
          zh: '没有导航外壳：一整屏看板，适合远看，核心数字做到海报尺寸。',
          en: 'No navigation chrome: one full-screen board meant to be read from a distance, with the headline figure at poster size.',
        },
        width: 1440,
        height: 900,
        fixed: false,
      },
    ],
    dropDensities: ['airy'],
    dropTwists: ['no-button-above-fold', 'footer-as-colophon'],
    stillMotion: false,
    must: [
      {
        zh: '数字用等宽数字（font-variant-numeric: tabular-nums），在列中右对齐。',
        en: 'Figures use tabular numerals (font-variant-numeric: tabular-nums) and right-align in columns.',
      },
      {
        zh: '每个数字和数据序列都来自事实；事实没给数据的地方显示带标注的空状态，不要编数字。',
        en: 'Every figure and series comes from the facts; where the facts give no data, show a labelled empty state instead of invented numbers.',
      },
      {
        zh: '每个图表都有标题、单位，以及带标注的坐标轴或图例。',
        en: 'Every chart has a title, units and a labelled axis or legend.',
      },
      {
        zh: '状态色要配文字或形状，不能只靠颜色。',
        en: 'Status colours are paired with a label or shape, never colour alone.',
      },
    ],
    mustNot: [
      {
        zh: '不要一排一模一样的 KPI 卡片：核心数字按重要性做出大小差别。',
        en: 'No row of identical KPI cards: headline figures differ in size by importance.',
      },
      {
        zh: '不要图表垃圾：不要 3D、柱子不要渐变、环形图不超过 4 段。',
        en: 'No chart junk: no 3D, no gradient bars, no donut with more than 4 slices.',
      },
    ],
  },
  {
    id: 'poster',
    name: { zh: '海报 / 社交图', en: 'Poster / social card' },
    summary: {
      zh: '单张固定画板：一张只传达一个信息的海报或社交图片。',
      en: 'One fixed artboard: a poster or social image with one message.',
    },
    output: {
      zh: '一个自包含 HTML 页面，里面一个与格式尺寸完全一致的画板，按窗口等比缩放、不重排；按 1× 截图应能直接得到成品 PNG。',
      en: 'One self-contained HTML page holding one artboard of exactly the format’s size, scaled to fit the window and never reflowed; a 1× screenshot of it is the finished PNG.',
    },
    count: {
      zh: '一张画板。用户要系列时，每张都是同格式的独立画板，单看也成立。',
      en: 'One artboard. If the user asks for a series, each card is its own artboard of the same format and works on its own.',
    },
    layout: {
      zh: '把分支版式压缩成一个构图：保留栅格和最强的那个区块；其余事实变成小的次要信息块，或者不放。一张画板只讲一件事。',
      en: 'Collapse the branch layout into one composition: keep its grid and its strongest section; the other facts become one small secondary block or stay out. One message per artboard.',
    },
    anchor: {
      zh: '首屏锚点就是海报主体，至少占画板一半。',
      en: 'The first-screen anchor is the poster’s main element and takes at least half the artboard.',
    },
    motion: {
      zh: '默认静态；只有用户要动图卡片时才加动效，且要无缝循环。',
      en: 'Static by default; motion only if the user asks for an animated card, and then it loops seamlessly.',
    },
    baseSize: { scale: 1.75 },
    formats: [
      {
        id: 'portrait',
        name: { zh: '竖版 4:5', en: 'Portrait 4:5' },
        description: {
          zh: '1080×1350，信息流帖子或印刷海报比例。',
          en: '1080×1350, the feed-post and printed-poster proportion.',
        },
        width: 1080,
        height: 1350,
        fixed: true,
      },
      {
        id: 'square',
        name: { zh: '方形 1:1', en: 'Square 1:1' },
        description: { zh: '1080×1080，方形帖子或封面图块。', en: '1080×1080, a square post or cover tile.' },
        width: 1080,
        height: 1080,
        fixed: true,
      },
      {
        id: 'story',
        name: { zh: '竖屏 9:16', en: 'Story 9:16' },
        description: {
          zh: '1080×1920 全屏快拍；顶部和底部各 250px 不放文字，留给应用界面覆盖。',
          en: '1080×1920 full-screen story; keep the top and bottom 250 px free of text for app overlays.',
        },
        width: 1080,
        height: 1920,
        fixed: true,
      },
      {
        id: 'link-card',
        name: { zh: '链接卡片 1.91:1', en: 'Link card 1.91:1' },
        description: {
          zh: '1200×630 的 Open Graph / 链接预览图；缩到 600px 宽仍要能读。',
          en: '1200×630 Open Graph / link-preview image; it must still read at 600 px wide.',
        },
        width: 1200,
        height: 630,
        fixed: true,
      },
    ],
    dropDensities: [],
    dropTwists: ['nav-elsewhere', 'no-button-above-fold'],
    stillMotion: false,
    must: [
      {
        zh: '画板严格等于格式尺寸，任何元素都不超出。',
        en: 'The artboard is exactly the format’s size and nothing extends past it.',
      },
      {
        zh: '至少留短边 6% 的安全边距；文字不贴边。',
        en: 'Keep a safe margin of at least 6% of the short side; text never touches the edge.',
      },
      {
        zh: '缩到 25% 时主信息 3 秒内能读懂。',
        en: 'At 25% scale the main message reads in under three seconds.',
      },
    ],
    mustNot: [
      {
        zh: '画板上不要界面元素：按钮、导航栏、cookie 横幅都不要。',
        en: 'No interface elements on the artboard: no buttons, nav bars or cookie banners.',
      },
      { zh: '画布上不要小于 24px 的段落文字。', en: 'No paragraph text below 24 px on the canvas.' },
    ],
  },
  {
    id: 'email',
    name: { zh: 'HTML 邮件', en: 'HTML email' },
    summary: {
      zh: '一封在真实邮件客户端里也不变形的 HTML 邮件。',
      en: 'An HTML email that holds up in real mail clients.',
    },
    output: {
      zh: '一个面向邮件客户端的 HTML 文件：按格式宽度居中的表格布局（role="presentation"），样式内联（<style> 只放媒体查询和深色模式），不用 JavaScript、外部 CSS 和表单。邮件客户端对 CSS 自定义属性支持不可靠，把 tokens.css 里的值直接内联。网络字体只是加分项：brief 里的后备字体单独使用也要像是设计过的。加一行隐藏的预览文字（preheader）。',
      en: 'One HTML file built for mail clients: a centred table layout (role="presentation") at the format’s width, styles inlined (a <style> block only for media queries and dark mode), no JavaScript, external CSS or forms. Custom properties are unreliable in mail clients, so inline the literal values from tokens.css. Web fonts are a bonus: the brief’s fallback stack must look intentional on its own. Include a hidden preheader line.',
    },
    count: {
      zh: '一封邮件：报头、主信息、辅助区块、一个行动按钮、页脚（发件方信息来自事实）。',
      en: 'One email: masthead, the main message, supporting blocks, one call to action, and a footer with the sender details from the facts.',
    },
    layout: {
      zh: '把分支版式按区块顺序压成单栏；并排的部分在 480px 以下变成上下堆叠的表格行。',
      en: 'Collapse the branch layout into a single column in its section order; side-by-side parts stack as table rows below 480 px.',
    },
    anchor: {
      zh: '首屏锚点是顶部区块，在预览窗格里（前 300px）就能看到。',
      en: 'The first-screen anchor is the top block, visible in the preview pane (the first 300 px).',
    },
    motion: {
      zh: '无动效：邮件客户端不能可靠地运行 CSS 动画，所以使用分支最静的动效选项。',
      en: 'No motion: mail clients do not run CSS animation reliably, so the branch’s stillest motion option applies.',
    },
    baseSize: { min: 16, max: 17 },
    formats: [
      {
        id: 'single-600',
        name: { zh: '单栏 600', en: 'Single column 600' },
        description: {
          zh: '经典 600px 单栏，外面是浅色页面底色。',
          en: 'The classic 600 px column on a tinted page background.',
        },
        width: 600,
        height: 1200,
        fixed: false,
      },
      {
        id: 'banded-640',
        name: { zh: '640 通栏色带', en: '640 with full-width bands' },
        description: {
          zh: '640px 单栏，各区块放在横贯全宽的色带上。',
          en: 'A 640 px column whose sections sit on colour bands that run edge to edge.',
        },
        width: 640,
        height: 1200,
        fixed: false,
      },
      {
        id: 'digest',
        name: { zh: '摘要简报', en: 'Digest' },
        description: {
          zh: '600px 简报：报头带期号，下面是编号条目，每条有标题、两行说明和链接。',
          en: 'A 600 px digest: a masthead with an issue line, then numbered items, each with a heading, two lines and a link.',
        },
        width: 600,
        height: 1200,
        fixed: false,
      },
    ],
    dropDensities: ['packed'],
    dropTwists: ['nav-elsewhere', 'vertical-text', 'one-element-breaks-grid'],
    stillMotion: true,
    must: [
      {
        zh: '内容最大宽度等于格式宽度；375px 下不出现横向滚动。',
        en: 'Content is no wider than the format width, and the email reads at 375 px without horizontal scrolling.',
      },
      {
        zh: '行动按钮是"防弹按钮"（带真实链接的表格单元格），不是图片。',
        en: 'The call to action is a "bulletproof" button (a styled table cell with a real link), not an image.',
      },
      {
        zh: '每张图都有 alt，关掉图片也能读懂。',
        en: 'Every image has alt text and the email makes sense with images off.',
      },
      {
        zh: '页脚有事实中的发件方名称和地址，以及标为"待补"的退订链接。',
        en: 'The footer carries the sender name and address from the facts and an unsubscribe link marked as a placeholder.',
      },
    ],
    mustNot: [
      {
        zh: '不要 JavaScript、表单、视频，不要用 position 或 CSS grid 搭结构。',
        en: 'No JavaScript, forms or video; no position-based or CSS-grid structure.',
      },
      { zh: '除标志外不要把文字做成图片。', en: 'No text set as images, except a logo.' },
    ],
  },
];

export const SCENARIO_IDS = SCENARIOS.map((s) => s.id) as ScenarioId[];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
