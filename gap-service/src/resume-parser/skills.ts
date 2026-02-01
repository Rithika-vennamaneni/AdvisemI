import type { CanonicalSkillCategory, CanonicalSkills } from './types.js';
import { normalizeSkillName, trimSkillName } from '../util/strings.js';

export const SKILL_DICTIONARY: CanonicalSkills = {
  programming_languages: [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C',
    'C++',
    'C#',
    'Go',
    'Rust',
    'Ruby',
    'PHP',
    'Swift',
    'Kotlin',
    'Scala',
    'R',
    'SQL',
    'Bash',
    'PowerShell',
    'HTML',
    'CSS',
    'GraphQL'
  ],
  frameworks: [
    'React',
    'Next.js',
    'Vue.js',
    'Angular',
    'Svelte',
    'SvelteKit',
    'Node.js',
    'Express',
    'NestJS',
    'Django',
    'Flask',
    'FastAPI',
    'Spring',
    'ASP.NET',
    'Laravel',
    'Ruby on Rails'
  ],
  tools: [
    'Git',
    'GitHub',
    'GitLab',
    'Docker',
    'Kubernetes',
    'Jenkins',
    'GitHub Actions',
    'Terraform',
    'CI/CD',
    'Jira',
    'Confluence',
    'Figma',
    'Postman',
    'Linux'
  ],
  databases: [
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'SQLite',
    'SQL Server',
    'Oracle',
    'DynamoDB',
    'Cassandra',
    'Elasticsearch'
  ],
  data_skills: [
    'Data Analysis',
    'ETL',
    'Data Modeling',
    'Data Warehousing',
    'Data Visualization',
    'Tableau',
    'Power BI',
    'Excel',
    'Pandas',
    'NumPy',
    'Spark'
  ],
  ml_ai: [
    'Machine Learning',
    'Deep Learning',
    'NLP',
    'Computer Vision',
    'TensorFlow',
    'PyTorch',
    'Scikit-learn',
    'LLM',
    'Generative AI'
  ],
  cloud: [
    'AWS',
    'Azure',
    'GCP',
    'S3',
    'EC2',
    'Lambda',
    'Cloud Functions',
    'Cloud Run',
    'Kubernetes'
  ],
  operating_systems: [
    'Linux',
    'Windows',
    'macOS',
    'Unix'
  ],
  soft_skills: [
    'Communication',
    'Leadership',
    'Teamwork',
    'Collaboration',
    'Problem Solving',
    'Critical Thinking',
    'Time Management',
    'Adaptability',
    'Project Management'
  ],
  domain_skills: [
    'Backend',
    'Frontend',
    'Full Stack',
    'Mobile',
    'DevOps',
    'Data Engineering',
    'Cybersecurity',
    'Fintech',
    'Healthcare',
    'E-commerce'
  ],
  other: []
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value: string): string => value.toLowerCase();

const normalizeForWords = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ');

const matchesSkill = (text: string, wordText: string, skill: string): boolean => {
  const normalized = skill.toLowerCase();
  const hasSpecialChars = /[^a-z0-9\s]/.test(normalized);
  if (hasSpecialChars) {
    return text.includes(normalized);
  }
  if (normalized.includes(' ')) {
    return wordText.includes(normalized);
  }
  const pattern = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i');
  return pattern.test(wordText);
};

export const extractCanonicalSkills = (rawText: string): CanonicalSkills => {
  const text = normalizeText(rawText);
  const wordText = normalizeForWords(rawText);
  const result: CanonicalSkills = {
    programming_languages: [],
    frameworks: [],
    tools: [],
    databases: [],
    data_skills: [],
    ml_ai: [],
    cloud: [],
    operating_systems: [],
    soft_skills: [],
    domain_skills: [],
    other: []
  };

  (Object.keys(SKILL_DICTIONARY) as Array<keyof CanonicalSkills>).forEach((category) => {
    const skills = SKILL_DICTIONARY[category];
    skills.forEach((skill) => {
      if (matchesSkill(text, wordText, skill)) {
        result[category].push(skill);
      }
    });
  });

  return result;
};

const CATEGORY_ORDER: CanonicalSkillCategory[] = [
  'programming_languages',
  'frameworks',
  'tools',
  'databases',
  'data_skills',
  'ml_ai',
  'cloud',
  'operating_systems',
  'soft_skills',
  'domain_skills',
  'other'
];

const buildSkillIndex = (): Map<string, CanonicalSkillCategory> => {
  const index = new Map<string, CanonicalSkillCategory>();
  CATEGORY_ORDER.forEach((category) => {
    if (category === 'other') return;
    const skills = SKILL_DICTIONARY[category];
    skills.forEach((skill) => {
      const key = normalizeSkillName(skill);
      if (!index.has(key)) {
        index.set(key, category);
      }
    });
  });
  return index;
};

const SKILL_INDEX = buildSkillIndex();

export const categorizeSkills = (skills: string[]): CanonicalSkills => {
  const result: CanonicalSkills = {
    programming_languages: [],
    frameworks: [],
    tools: [],
    databases: [],
    data_skills: [],
    ml_ai: [],
    cloud: [],
    operating_systems: [],
    soft_skills: [],
    domain_skills: [],
    other: []
  };

  const seen = new Set<string>();

  skills.forEach((skill) => {
    const trimmed = trimSkillName(skill);
    if (!trimmed) return;
    const key = normalizeSkillName(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    const category = SKILL_INDEX.get(key) ?? 'other';
    result[category].push(trimmed);
  });

  return result;
};
