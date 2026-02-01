import { normalizeSkillName } from './strings.js';

export type LearningSkill = {
  name: string;
  covers: string[];
};

type LearningRule = {
  name: string;
  keywords: string[];
};

const RULES: LearningRule[] = [
  {
    name: 'Databases',
    keywords: [
      'sql',
      'postgresql',
      'postgres',
      'mysql',
      'sqlite',
      'oracle',
      'sql server',
      'mongodb',
      'redis',
      'dynamodb',
      'cassandra',
      'elasticsearch',
      'nosql'
    ]
  },
  {
    name: 'Cloud Computing',
    keywords: [
      'aws',
      'amazon web services',
      'azure',
      'gcp',
      'google cloud',
      'cloud',
      's3',
      'ec2',
      'lambda',
      'cloud functions',
      'cloud run'
    ]
  },
  {
    name: 'Data Engineering',
    keywords: [
      'data engineering',
      'etl',
      'data pipeline',
      'data pipelines',
      'spark',
      'kafka',
      'airflow',
      'dbt',
      'snowflake',
      'bigquery',
      'databricks'
    ]
  },
  {
    name: 'Distributed Systems',
    keywords: [
      'distributed systems',
      'microservices',
      'kubernetes',
      'k8s',
      'docker',
      'hadoop'
    ]
  },
  {
    name: 'Machine Learning',
    keywords: [
      'machine learning',
      'ml',
      'deep learning',
      'nlp',
      'computer vision',
      'pytorch',
      'tensorflow',
      'scikit-learn',
      'xgboost'
    ]
  },
  {
    name: 'MLOps',
    keywords: [
      'mlops',
      'mlflow',
      'kubeflow',
      'feature store',
      'model deployment',
      'model serving'
    ]
  },
  {
    name: 'Web Development',
    keywords: [
      'javascript',
      'typescript',
      'react',
      'next.js',
      'vue',
      'angular',
      'svelte',
      'node.js',
      'express',
      'fastapi',
      'django',
      'flask',
      'spring',
      'asp.net',
      'laravel',
      'ruby on rails'
    ]
  },
  {
    name: 'DevOps',
    keywords: [
      'devops',
      'ci/cd',
      'github actions',
      'gitlab',
      'jenkins',
      'terraform',
      'ansible'
    ]
  }
];

const normalizeForMatch = (value: string): string => {
  return normalizeSkillName(value).replace(/\s+/g, ' ');
};

const matchesRule = (normalizedSkill: string, rule: LearningRule): boolean => {
  return rule.keywords.some((keyword) => {
    const normalizedKeyword = normalizeForMatch(keyword);
    if (!normalizedKeyword) return false;
    if (normalizedSkill === normalizedKeyword) return true;
    return normalizedSkill.includes(normalizedKeyword);
  });
};

export const groupLearningSkills = (skills: string[]): LearningSkill[] => {
  const seen = new Set<string>();
  const uniqueSkills = skills
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0)
    .filter((skill) => {
      const key = normalizeSkillName(skill);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const groupMap = new Map<string, string[]>();
  const groupOrder: string[] = [];
  const groupedSkills = new Set<string>();

  uniqueSkills.forEach((skill) => {
    const normalized = normalizeForMatch(skill);
    const matchedRule = RULES.find((rule) => matchesRule(normalized, rule));
    if (!matchedRule) {
      return;
    }
    if (!groupMap.has(matchedRule.name)) {
      groupMap.set(matchedRule.name, []);
      groupOrder.push(matchedRule.name);
    }
    groupMap.get(matchedRule.name)!.push(skill);
  });

  const results: LearningSkill[] = [];

  groupOrder.forEach((groupName) => {
    const covers = groupMap.get(groupName) ?? [];
    if (covers.length >= 2) {
      results.push({ name: groupName, covers });
      covers.forEach((skill) => groupedSkills.add(normalizeSkillName(skill)));
    }
  });

  uniqueSkills.forEach((skill) => {
    const key = normalizeSkillName(skill);
    if (groupedSkills.has(key)) return;
    results.push({ name: skill, covers: [skill] });
  });

  return results;
};
