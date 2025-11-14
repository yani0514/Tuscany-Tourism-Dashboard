/**
 * Red/Blue diverging palette using the exact requested shades:
 * Red: 100 → 400 → 700
 * Blue: 100 → 400 → 700
 * Neutral around zero: light gray
 */
export function getCellColor(value) {
  const v = Math.max(-1, Math.min(1, value)); // clamp -1..1
  const intensity = Math.abs(v);

  // Near zero → neutral gray
  if (intensity < 0.05) {
    return "rgb(243, 244, 246)"; // gray-100
  }

  // Helper: interpolate between two colors
  const lerp = (a, b, t) => {
    const r = a[0] + (b[0] - a[0]) * t;
    const g = a[1] + (b[1] - a[1]) * t;
    const bb = a[2] + (b[2] - a[2]) * t;
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(bb)})`;
  };

  // Smooth scaling
  const t = Math.pow(intensity, 0.75);

  if (v > 0) {
    // RED side
    const weak = [254, 226, 226];  // red-100
    const med  = [248, 113, 113];  // red-400
    const strong = [185, 28, 28];  // red-700

    return t < 0.5
      ? lerp(weak, med, t * 2)
      : lerp(med, strong, (t - 0.5) * 2);

  } else {
    // BLUE side
    const weak = [219, 234, 254];  // blue-100
    const med  = [96, 165, 250];   // blue-400
    const strong = [29, 78, 216];  // blue-700

    return t < 0.5
      ? lerp(weak, med, t * 2)
      : lerp(med, strong, (t - 0.5) * 2);
  }
}