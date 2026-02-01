export const trimSkillName = (value: string | null | undefined): string => {
  return (value ?? '').trim();
};

export const normalizeSkillName = (value: string | null | undefined): string => {
  return trimSkillName(value).toLowerCase();
};

export const truncateReason = (value: string, maxLength = 180): string => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.slice(0, maxLength);
};

const titleizeWord = (word: string): string => {
  if (word.length === 0) {
    return word;
  }
  if (word.toUpperCase() === word) {
    return word;
  }
  const first = word.charAt(0).toUpperCase();
  const rest = word.slice(1).toLowerCase();
  return `${first}${rest}`;
};

export const toPreferredTitleCase = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const hasLower = /[a-z]/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);
  const isAllCaps = trimmed.toUpperCase() === trimmed;
  if (isAllCaps || (hasLower && hasUpper)) {
    return trimmed;
  }
  const words = trimmed.split(/\s+/).map((word) => {
    const parts = word.split(/([\-/])/); // keep separators
    return parts
      .map((part) => {
        if (part === '-' || part === '/') {
          return part;
        }
        return titleizeWord(part);
      })
      .join('');
  });
  return words.join(' ');
};
