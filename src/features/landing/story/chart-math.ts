/** A smooth SVG path through `values`, fitted to a `width` × `height` box. */
export function linePath(values: number[], width: number, height: number, min: number, max: number, from = 0) {
  const step = width / (values.length - 1);
  const y = (v: number) => height - ((v - min) / (max - min)) * height;
  const points = values.map((v, i) => [i * step, y(v)] as const).slice(from);
  return points
    .map(([x, py], i) => {
      if (i === 0) return `M${x.toFixed(1)} ${py.toFixed(1)}`;
      const [px, ppy] = points[i - 1];
      const mid = (px + x) / 2;
      return `C${mid.toFixed(1)} ${ppy.toFixed(1)} ${mid.toFixed(1)} ${py.toFixed(1)} ${x.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");
}

/** Where reading `index` sits in the same box. */
export function pointAt(values: number[], index: number, width: number, height: number, min: number, max: number) {
  return {
    x: (width / (values.length - 1)) * index,
    y: height - ((values[index] - min) / (max - min)) * height,
  };
}
