/**
 * Default responsive dashboard layouts for react-grid-layout v2.
 *
 * Grid: 12 columns, rowHeight = 80px, margin = [16, 16]
 * Pixel height ≈ h * (rowHeight + margin) - margin
 *   h=2 → ~176px   h=3 → ~256px   h=4 → ~336px
 *   h=5 → ~416px   h=6 → ~496px
 *
 * UX section order (standard analytics dashboard):
 *   ①  KPI Summary          — totals at a glance
 *   ②  Views Trend + Sub Δ  — what's trending
 *   ③  Publishing + Views Δ — activity vs impact
 *   ④  Views by Category    — audience distribution
 *   ⑤  Top Channels         — channel leaders
 *   ⑥  Portfolio Metrics    — derived KPI cards
 *   ⑦  Channel Metrics Table— deep comparison
 *   ⑧  Top Videos           — content detail
 */
export const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'summary',        x: 0,  y: 0,  w: 12, h: 2,  minW: 6,  minH: 2 },
    { i: 'viewstrend',     x: 0,  y: 2,  w: 6,  h: 4,  minW: 3,  minH: 3 },
    { i: 'subgrowth',      x: 6,  y: 2,  w: 6,  h: 4,  minW: 3,  minH: 3 },
    { i: 'publishing',     x: 0,  y: 6,  w: 6,  h: 4,  minW: 3,  minH: 3 },
    { i: 'viewgrowth',     x: 6,  y: 6,  w: 6,  h: 4,  minW: 3,  minH: 3 },
    { i: 'viewscat',       x: 0,  y: 10, w: 12, h: 4,  minW: 4,  minH: 3 },
    { i: 'topchannels',    x: 0,  y: 14, w: 12, h: 5,  minW: 4,  minH: 4 },
    { i: 'metrics',        x: 0,  y: 19, w: 12, h: 2,  minW: 6,  minH: 2 },
    { i: 'channelmetrics', x: 0,  y: 21, w: 12, h: 6,  minW: 6,  minH: 4 },
    { i: 'topvideos',      x: 0,  y: 27, w: 12, h: 6,  minW: 6,  minH: 4 },
  ],
  md: [
    { i: 'summary',        x: 0, y: 0,  w: 10, h: 2,  minW: 5,  minH: 2 },
    { i: 'viewstrend',     x: 0, y: 2,  w: 5,  h: 4,  minW: 3,  minH: 3 },
    { i: 'subgrowth',      x: 5, y: 2,  w: 5,  h: 4,  minW: 3,  minH: 3 },
    { i: 'publishing',     x: 0, y: 6,  w: 5,  h: 4,  minW: 3,  minH: 3 },
    { i: 'viewgrowth',     x: 5, y: 6,  w: 5,  h: 4,  minW: 3,  minH: 3 },
    { i: 'viewscat',       x: 0, y: 10, w: 10, h: 4,  minW: 4,  minH: 3 },
    { i: 'topchannels',    x: 0, y: 14, w: 10, h: 5,  minW: 4,  minH: 4 },
    { i: 'metrics',        x: 0, y: 19, w: 10, h: 2,  minW: 5,  minH: 2 },
    { i: 'channelmetrics', x: 0, y: 21, w: 10, h: 6,  minW: 5,  minH: 4 },
    { i: 'topvideos',      x: 0, y: 27, w: 10, h: 6,  minW: 5,  minH: 4 },
  ],
  sm: [
    { i: 'summary',        x: 0, y: 0,  w: 6, h: 3,  minW: 3, minH: 2 },
    { i: 'viewstrend',     x: 0, y: 3,  w: 6, h: 4,  minW: 3, minH: 3 },
    { i: 'subgrowth',      x: 0, y: 7,  w: 6, h: 4,  minW: 3, minH: 3 },
    { i: 'publishing',     x: 0, y: 11, w: 6, h: 4,  minW: 3, minH: 3 },
    { i: 'viewgrowth',     x: 0, y: 15, w: 6, h: 4,  minW: 3, minH: 3 },
    { i: 'viewscat',       x: 0, y: 19, w: 6, h: 4,  minW: 3, minH: 3 },
    { i: 'topchannels',    x: 0, y: 23, w: 6, h: 5,  minW: 3, minH: 4 },
    { i: 'metrics',        x: 0, y: 28, w: 6, h: 3,  minW: 3, minH: 2 },
    { i: 'channelmetrics', x: 0, y: 31, w: 6, h: 6,  minW: 3, minH: 4 },
    { i: 'topvideos',      x: 0, y: 37, w: 6, h: 6,  minW: 3, minH: 4 },
  ],
  xs: [
    { i: 'summary',        x: 0, y: 0,  w: 4, h: 4,  minW: 2, minH: 3 },
    { i: 'viewstrend',     x: 0, y: 4,  w: 4, h: 4,  minW: 2, minH: 3 },
    { i: 'subgrowth',      x: 0, y: 8,  w: 4, h: 4,  minW: 2, minH: 3 },
    { i: 'publishing',     x: 0, y: 12, w: 4, h: 4,  minW: 2, minH: 3 },
    { i: 'viewgrowth',     x: 0, y: 16, w: 4, h: 4,  minW: 2, minH: 3 },
    { i: 'viewscat',       x: 0, y: 20, w: 4, h: 4,  minW: 2, minH: 3 },
    { i: 'topchannels',    x: 0, y: 24, w: 4, h: 5,  minW: 2, minH: 4 },
    { i: 'metrics',        x: 0, y: 29, w: 4, h: 4,  minW: 2, minH: 3 },
    { i: 'channelmetrics', x: 0, y: 33, w: 4, h: 6,  minW: 2, minH: 4 },
    { i: 'topvideos',      x: 0, y: 39, w: 4, h: 6,  minW: 2, minH: 4 },
  ],
};

export const COLS       = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };
export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
