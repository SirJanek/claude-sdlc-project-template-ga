// Documentation helpers only (not exported from the package). Read the live CSS variables so the
// Foundations pages always show what the tokens file actually contains.

export function readVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Resolve any CSS colour (including oklch) to sRGB 0–255 through a canvas. */
export function toRgb(cssColor: string): [number, number, number] | null {
  if (typeof document === 'undefined' || !cssColor) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#000';
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

export function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG 2.x contrast ratio between two CSS colours, measured from the resolved values. */
export function contrast(a: string, b: string): number | null {
  const ra = toRgb(a);
  const rb = toRgb(b);
  if (!ra || !rb) return null;
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
