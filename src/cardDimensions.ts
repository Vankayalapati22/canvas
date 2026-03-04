/**
 * Single source of truth for the rendered .item-card dimensions.
 * These values must be kept in sync with the CSS in App.css.
 *
 *  .item-card         → width: 148px  (min-width 120 + padding 14×2 + border 2×2)
 *  .item-card-header  → height: 32px  (padding 6+6 + ~20px line-height)
 *  .item-card-body    → height: 100px (min-height 100)
 */
export const CARD_W = 110;        // total card width (px)
export const CARD_HEADER_H = 28;  // header box height (px)
export const CARD_BODY_H = 72;   // body box height (px)
export const CARD_H = 100; // 132 px total
