/**
 * Pure worklet snap computation for canvas alignment guides.
 * Runs on UI thread for 60fps drag performance.
 */

export const SNAP_THRESHOLD = 6;
export const SPACING_VALUES = [8, 16, 24, 32, 48, 64];

// Guide encoding: 6 values per guide
// Alignment: [0, axis, position, 0, 0, 0]  (axis: 0=horizontal, 1=vertical)
// Spacing:   [1, axis, from, to, perpCenter, spacingValue]

interface SnapResult {
  snapDX: number;
  snapDY: number;
  guides: number[];
}

/**
 * Compute snap deltas and guide lines for a dragged component.
 *
 * @param l - left of dragged rect (px)
 * @param t - top of dragged rect (px)
 * @param w - width of dragged rect (px)
 * @param h - height of dragged rect (px)
 * @param siblings - flat array, 4 values per sibling: [l, t, w, h, ...]
 * @param selfIndex - index of dragged component (skip in siblings)
 * @param canvasW - canvas width (px)
 * @param canvasH - canvas height (px)
 */
export function computeSnap(
  l: number,
  t: number,
  w: number,
  h: number,
  siblings: number[],
  selfIndex: number,
  canvasW: number,
  canvasH: number
): SnapResult {
  "worklet";

  const guides: number[] = [];
  let snapDX = 0;
  let snapDY = 0;
  let bestDistX = SNAP_THRESHOLD + 1;
  let bestDistY = SNAP_THRESHOLD + 1;

  const r = l + w;
  const b = t + h;
  const cx = l + w / 2;
  const cy = t + h / 2;

  // Helper to update best snap on X axis (vertical guide lines)
  function trySnapX(dragEdge: number, targetEdge: number): number {
    "worklet";
    const dist = Math.abs(dragEdge - targetEdge);
    if (dist < bestDistX) {
      bestDistX = dist;
      return targetEdge - dragEdge;
    }
    return snapDX;
  }

  // Helper to update best snap on Y axis (horizontal guide lines)
  function trySnapY(dragEdge: number, targetEdge: number): number {
    "worklet";
    const dist = Math.abs(dragEdge - targetEdge);
    if (dist < bestDistY) {
      bestDistY = dist;
      return targetEdge - dragEdge;
    }
    return snapDY;
  }

  // --- Canvas edge/center snapping ---
  // X axis: snap to left edge, right edge, center
  snapDX = trySnapX(l, 0);
  snapDX = trySnapX(r, canvasW);
  snapDX = trySnapX(cx, canvasW / 2);

  // Y axis: snap to top edge, bottom edge, center
  snapDY = trySnapY(t, 0);
  snapDY = trySnapY(b, canvasH);
  snapDY = trySnapY(cy, canvasH / 2);

  // --- Sibling snapping ---
  const sibCount = siblings.length / 4;
  for (let i = 0; i < sibCount; i++) {
    if (i === selfIndex) continue;
    const sl = siblings[i * 4];
    const st = siblings[i * 4 + 1];
    const sw = siblings[i * 4 + 2];
    const sh = siblings[i * 4 + 3];
    const sr = sl + sw;
    const sb = st + sh;
    const scx = sl + sw / 2;
    const scy = st + sh / 2;

    // X axis alignment (vertical guide lines): left-left, right-right, center-center, left-right, right-left
    snapDX = trySnapX(l, sl);
    snapDX = trySnapX(r, sr);
    snapDX = trySnapX(cx, scx);
    snapDX = trySnapX(l, sr);
    snapDX = trySnapX(r, sl);

    // Y axis alignment (horizontal guide lines): top-top, bottom-bottom, center-center, top-bottom, bottom-top
    snapDY = trySnapY(t, st);
    snapDY = trySnapY(b, sb);
    snapDY = trySnapY(cy, scy);
    snapDY = trySnapY(t, sb);
    snapDY = trySnapY(b, st);

    // --- Spacing checks ---
    // Check if components overlap on perpendicular axis
    const overlapY = t < sb && b > st;
    const overlapX = l < sr && r > sl;

    if (overlapY) {
      // Horizontal spacing: gap between edges
      const perpCenter = (Math.max(t, st) + Math.min(b, sb)) / 2;

      // Gap: dragged right edge -> sibling left edge
      const gapRight = sl - r;
      // Gap: sibling right edge -> dragged left edge
      const gapLeft = l - sr;

      for (let s = 0; s < SPACING_VALUES.length; s++) {
        const sv = SPACING_VALUES[s];
        // Dragged is to the left of sibling
        if (Math.abs(gapRight - sv) < SNAP_THRESHOLD && Math.abs(gapRight - sv) < bestDistX) {
          bestDistX = Math.abs(gapRight - sv);
          snapDX = sv - gapRight;
        }
        // Dragged is to the right of sibling
        if (Math.abs(gapLeft - sv) < SNAP_THRESHOLD && Math.abs(gapLeft - sv) < bestDistX) {
          bestDistX = Math.abs(gapLeft - sv);
          snapDX = -(sv - gapLeft);
        }
      }
    }

    if (overlapX) {
      // Vertical spacing: gap between edges
      const perpCenter = (Math.max(l, sl) + Math.min(r, sr)) / 2;

      // Gap: dragged bottom edge -> sibling top edge
      const gapBelow = st - b;
      // Gap: sibling bottom edge -> dragged top edge
      const gapAbove = t - sb;

      for (let s = 0; s < SPACING_VALUES.length; s++) {
        const sv = SPACING_VALUES[s];
        // Dragged is above sibling
        if (Math.abs(gapBelow - sv) < SNAP_THRESHOLD && Math.abs(gapBelow - sv) < bestDistY) {
          bestDistY = Math.abs(gapBelow - sv);
          snapDY = sv - gapBelow;
        }
        // Dragged is below sibling
        if (Math.abs(gapAbove - sv) < SNAP_THRESHOLD && Math.abs(gapAbove - sv) < bestDistY) {
          bestDistY = Math.abs(gapAbove - sv);
          snapDY = -(sv - gapAbove);
        }
      }
    }
  }

  // If no snap found, reset deltas
  if (bestDistX > SNAP_THRESHOLD) snapDX = 0;
  if (bestDistY > SNAP_THRESHOLD) snapDY = 0;

  // --- Build guide lines based on final snapped position ---
  const finalL = l + snapDX;
  const finalT = t + snapDY;
  const finalR = finalL + w;
  const finalB = finalT + h;
  const finalCX = finalL + w / 2;
  const finalCY = finalT + h / 2;

  // Canvas edge guides
  if (Math.abs(finalL) < 1) guides.push(0, 1, 0, 0, 0, 0); // vertical at x=0
  if (Math.abs(finalR - canvasW) < 1) guides.push(0, 1, canvasW, 0, 0, 0); // vertical at right edge
  if (Math.abs(finalCX - canvasW / 2) < 1) guides.push(0, 1, canvasW / 2, 0, 0, 0); // vertical at center
  if (Math.abs(finalT) < 1) guides.push(0, 0, 0, 0, 0, 0); // horizontal at y=0 — position encoded as guides[i+2]
  if (Math.abs(finalB - canvasH) < 1) guides.push(0, 0, canvasH, 0, 0, 0);
  if (Math.abs(finalCY - canvasH / 2) < 1) guides.push(0, 0, canvasH / 2, 0, 0, 0);

  // Sibling guides
  for (let i = 0; i < sibCount; i++) {
    if (i === selfIndex) continue;
    const sl = siblings[i * 4];
    const st = siblings[i * 4 + 1];
    const sw = siblings[i * 4 + 2];
    const sh = siblings[i * 4 + 3];
    const sr = sl + sw;
    const sb = st + sh;
    const scx = sl + sw / 2;
    const scy = st + sh / 2;

    // Vertical guides (X alignment)
    if (Math.abs(finalL - sl) < 1 || Math.abs(finalR - sl) < 1) guides.push(0, 1, sl, 0, 0, 0);
    if (Math.abs(finalR - sr) < 1 || Math.abs(finalL - sr) < 1) guides.push(0, 1, sr, 0, 0, 0);
    if (Math.abs(finalCX - scx) < 1) guides.push(0, 1, scx, 0, 0, 0);

    // Horizontal guides (Y alignment)
    if (Math.abs(finalT - st) < 1 || Math.abs(finalB - st) < 1) guides.push(0, 0, st, 0, 0, 0);
    if (Math.abs(finalB - sb) < 1 || Math.abs(finalT - sb) < 1) guides.push(0, 0, sb, 0, 0, 0);
    if (Math.abs(finalCY - scy) < 1) guides.push(0, 0, scy, 0, 0, 0);

    // Spacing guides
    const overlapY = finalT < sb && finalB > st;
    const overlapX = finalL < sr && finalR > sl;

    if (overlapY) {
      const perpCenter = (Math.max(finalT, st) + Math.min(finalB, sb)) / 2;
      const gapRight = sl - finalR;
      const gapLeft = finalL - sr;

      for (let s = 0; s < SPACING_VALUES.length; s++) {
        const sv = SPACING_VALUES[s];
        if (Math.abs(gapRight - sv) < 1) {
          guides.push(1, 0, finalR, sl, perpCenter, sv);
        }
        if (Math.abs(gapLeft - sv) < 1) {
          guides.push(1, 0, sr, finalL, perpCenter, sv);
        }
      }
    }

    if (overlapX) {
      const perpCenter = (Math.max(finalL, sl) + Math.min(finalR, sr)) / 2;
      const gapBelow = st - finalB;
      const gapAbove = finalT - sb;

      for (let s = 0; s < SPACING_VALUES.length; s++) {
        const sv = SPACING_VALUES[s];
        if (Math.abs(gapBelow - sv) < 1) {
          guides.push(1, 1, finalB, st, perpCenter, sv);
        }
        if (Math.abs(gapAbove - sv) < 1) {
          guides.push(1, 1, sb, finalT, perpCenter, sv);
        }
      }
    }
  }

  return { snapDX, snapDY, guides };
}
