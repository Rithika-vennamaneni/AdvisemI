export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const normalizeToUnit = (values: number[], value: number): number => {
  if (values.length === 0) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 1;
  return clamp((value - min) / (max - min), 0, 1);
};

export const quintileIndex = (values: number[], value: number): number => {
  if (values.length === 0) {
    return 0;
  }
  if (values.length === 1) {
    return 4;
  }
  const sorted = [...values].sort((a, b) => a - b);
  let rank = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i] <= value) {
      rank = i;
    } else {
      break;
    }
  }
  const position = rank / (sorted.length - 1);
  const index = Math.floor(position * 5);
  return Math.min(4, Math.max(0, index));
};
