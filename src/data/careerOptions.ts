// Career setup options

export const jobRoles = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Scientist',
  'Data Engineer',
  'Machine Learning Engineer',
  'Product Manager',
  'UX Designer',
  'DevOps Engineer',
  'Cloud Architect',
  'Security Engineer',
  'Mobile Developer',
  'QA Engineer',
  'Technical Program Manager',
  'Solutions Architect',
  'Research Scientist',
  'Quantitative Analyst',
  'Consultant',
  'Investment Banking Analyst',
];

export const industries = [
  { id: 'big-tech', label: 'Big Tech', icon: '🏢', description: 'Google, Meta, Amazon, etc.' },
  { id: 'fintech', label: 'FinTech', icon: '💳', description: 'Stripe, Square, Robinhood' },
  { id: 'healthtech', label: 'HealthTech', icon: '🏥', description: 'Healthcare & biotech' },
  { id: 'startup', label: 'Startups', icon: '🚀', description: 'Early-stage companies' },
  { id: 'consulting', label: 'Consulting', icon: '📊', description: 'McKinsey, BCG, Bain' },
  { id: 'enterprise', label: 'Enterprise', icon: '🏛️', description: 'Fortune 500 companies' },
];

export const companySizes = [
  { id: 'startup', label: 'Startup', range: '1–50 people', icon: '🌱', description: 'Move fast, wear many hats' },
  { id: 'midsize', label: 'Mid-size', range: '50–500 people', icon: '🌿', description: 'Growing teams, clear roles' },
  { id: 'large', label: 'Large', range: '500+ people', icon: '🌳', description: 'Established processes, deep expertise' },
];

export const timelines = [
  { id: 'next-semester', label: 'Next semester', description: 'Ready to dive in now' },
  { id: '1-year', label: 'Within 1 year', description: 'Building towards graduation' },
  { id: '2-years', label: '2+ years', description: 'Long-term career planning' },
];

export interface CareerPreferences {
  jobRole: string;
  industry: string;
  companySize: string;
  timeline: string;
}
