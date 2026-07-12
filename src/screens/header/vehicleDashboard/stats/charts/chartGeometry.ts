export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleRad: number,
) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function donutFullRingPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
): string {
  const outerA = polarToCartesian(cx, cy, rOuter, 0);
  const outerB = polarToCartesian(cx, cy, rOuter, Math.PI);
  const innerA = polarToCartesian(cx, cy, rInner, 0);
  const innerB = polarToCartesian(cx, cy, rInner, Math.PI);
  return [
    `M ${outerA.x} ${outerA.y}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${outerB.x} ${outerB.y}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${outerA.x} ${outerA.y}`,
    `L ${innerA.x} ${innerA.y}`,
    `A ${rInner} ${rInner} 0 1 0 ${innerB.x} ${innerB.y}`,
    `A ${rInner} ${rInner} 0 1 0 ${innerA.x} ${innerA.y}`,
    "Z",
  ].join(" ");
}

export function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  if (endAngle - startAngle >= 2 * Math.PI - 1e-6) {
    return donutFullRingPath(cx, cy, rOuter, rInner);
  }

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, rOuter, startAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}
