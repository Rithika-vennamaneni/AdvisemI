const ROLE_SKILL_MAP: Array<{ pattern: RegExp; skills: string[] }> = [
  {
    pattern: /data\s*scientist|data\s*science/i,
    skills: [
      'Python',
      'Statistics',
      'Machine Learning',
      'Data Visualization',
      'SQL',
      'Pandas',
      'NumPy',
      'Experiment Design',
      'Feature Engineering',
      'Model Evaluation',
      'Deep Learning',
      'Data Cleaning'
    ]
  },
  {
    pattern: /data\s*engineer/i,
    skills: [
      'SQL',
      'Data Warehousing',
      'ETL',
      'Data Pipelines',
      'Spark',
      'Airflow',
      'Python',
      'Kafka',
      'Data Modeling',
      'Distributed Systems',
      'Big Data',
      'Cloud Storage'
    ]
  },
  {
    pattern: /machine\s*learning|ml\s*engineer/i,
    skills: [
      'Machine Learning',
      'Deep Learning',
      'Python',
      'Model Deployment',
      'MLOps',
      'Feature Engineering',
      'TensorFlow',
      'PyTorch',
      'Model Evaluation',
      'Data Pipelines',
      'Docker',
      'Kubernetes'
    ]
  },
  {
    pattern: /backend|server/i,
    skills: [
      'API Design',
      'Databases',
      'System Design',
      'Distributed Systems',
      'SQL',
      'Caching',
      'Authentication',
      'Microservices',
      'Performance',
      'Cloud Computing',
      'Networking',
      'Testing'
    ]
  },
  {
    pattern: /frontend|front\s*end|web/i,
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'HTML',
      'CSS',
      'Web Performance',
      'Accessibility',
      'UI Design',
      'State Management',
      'Testing',
      'Responsive Design',
      'Build Tooling'
    ]
  },
  {
    pattern: /full\s*stack/i,
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'API Design',
      'Databases',
      'System Design',
      'Cloud Computing',
      'Authentication',
      'Testing',
      'DevOps',
      'SQL',
      'Deployment'
    ]
  },
  {
    pattern: /devops|sre|site reliability/i,
    skills: [
      'Linux',
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Cloud Computing',
      'Infrastructure as Code',
      'Monitoring',
      'Networking',
      'Security',
      'SRE',
      'Automation',
      'Incident Response'
    ]
  },
  {
    pattern: /cloud|architect/i,
    skills: [
      'Cloud Computing',
      'System Design',
      'Networking',
      'Security',
      'Distributed Systems',
      'Infrastructure as Code',
      'Kubernetes',
      'Databases',
      'Cost Optimization',
      'Scalability',
      'Reliability',
      'Observability'
    ]
  },
  {
    pattern: /security|cyber/i,
    skills: [
      'Network Security',
      'Cryptography',
      'Secure Coding',
      'Threat Modeling',
      'Incident Response',
      'Application Security',
      'Cloud Security',
      'Penetration Testing',
      'Identity Management',
      'Security Monitoring',
      'Risk Assessment',
      'Vulnerability Management'
    ]
  },
  {
    pattern: /product\s*manager|product/i,
    skills: [
      'Product Strategy',
      'User Research',
      'Roadmapping',
      'Analytics',
      'A/B Testing',
      'Go-to-Market',
      'UX Design',
      'Data Analysis',
      'Stakeholder Management',
      'Metrics',
      'Market Research',
      'Experimentation'
    ]
  },
  {
    pattern: /ux|ui\s*designer|product\s*designer/i,
    skills: [
      'User Research',
      'Wireframing',
      'Prototyping',
      'Interaction Design',
      'Usability Testing',
      'Information Architecture',
      'Visual Design',
      'Design Systems',
      'Accessibility',
      'User Flows',
      'Figma',
      'Design Critique'
    ]
  },
  {
    pattern: /software\s*engineer|developer|engineer/i,
    skills: [
      'Data Structures',
      'Algorithms',
      'System Design',
      'Databases',
      'Operating Systems',
      'Networking',
      'APIs',
      'Distributed Systems',
      'Testing',
      'Cloud Computing',
      'Software Engineering',
      'Git'
    ]
  }
];

const DEFAULT_ROLE_SKILLS = [
  'Python',
  'SQL',
  'Statistics',
  'Machine Learning',
  'Data Visualization',
  'System Design',
  'Databases',
  'Cloud Computing',
  'Testing',
  'Distributed Systems'
];

export const getRoleSkillFallback = (dreamRole?: string | null): string[] => {
  const role = (dreamRole ?? '').trim();
  if (!role) {
    return [];
  }
  for (const entry of ROLE_SKILL_MAP) {
    if (entry.pattern.test(role)) {
      return entry.skills;
    }
  }
  return DEFAULT_ROLE_SKILLS;
};
