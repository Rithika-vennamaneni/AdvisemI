import { Profile, Document, Skill, GapSkill, Course, Recommendation } from '@/types/database';

// Mock user ID for demo
export const MOCK_USER_ID = 'user-demo-123';

// Profile
export const mockProfile: Profile = {
  id: 'profile-1',
  user_id: MOCK_USER_ID,
  dream_role: 'Software Engineer',
  term: '2026-spring',
  created_at: new Date().toISOString(),
};

// Document (resume)
export const mockDocument: Document = {
  id: 'doc-1',
  user_id: MOCK_USER_ID,
  type: 'resume',
  raw_text: 'Sample resume content...',
  created_at: new Date().toISOString(),
};

// Skills
export const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    user_id: MOCK_USER_ID,
    source: 'resume',
    skill_name: 'Python',
    score: 0.85,
    evidence: '4 years experience, multiple projects',
    created_at: new Date().toISOString(),
  },
  {
    id: 'skill-2',
    user_id: MOCK_USER_ID,
    source: 'resume',
    skill_name: 'JavaScript',
    score: 0.70,
    evidence: 'React projects mentioned',
    created_at: new Date().toISOString(),
  },
  {
    id: 'skill-3',
    user_id: MOCK_USER_ID,
    source: 'resume',
    skill_name: 'SQL',
    score: 0.45,
    evidence: 'Basic queries in internship',
    created_at: new Date().toISOString(),
  },
  {
    id: 'skill-4',
    user_id: MOCK_USER_ID,
    source: 'market',
    skill_name: 'System Design',
    score: 0.30,
    evidence: 'Gap vs. job requirements',
    created_at: new Date().toISOString(),
  },
  {
    id: 'skill-5',
    user_id: MOCK_USER_ID,
    source: 'resume',
    skill_name: 'Algorithms',
    score: 0.55,
    evidence: 'Some coursework completed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'skill-6',
    user_id: MOCK_USER_ID,
    source: 'resume',
    skill_name: 'React',
    score: 0.65,
    evidence: '2 production projects',
    created_at: new Date().toISOString(),
  },
  {
    id: 'skill-7',
    user_id: MOCK_USER_ID,
    source: 'market',
    skill_name: 'Distributed Systems',
    score: 0.25,
    evidence: 'No direct experience',
    created_at: new Date().toISOString(),
  },
  {
    id: 'skill-8',
    user_id: MOCK_USER_ID,
    source: 'resume',
    skill_name: 'Git',
    score: 0.80,
    evidence: 'Daily usage in projects',
    created_at: new Date().toISOString(),
  },
];

// Gap Skills
export const mockGapSkills: GapSkill[] = [
  {
    id: 'gap-1',
    user_id: MOCK_USER_ID,
    skill_name: 'System Design',
    priority: 1,
    reason: 'Critical for SWE roles at top companies',
    created_at: new Date().toISOString(),
  },
  {
    id: 'gap-2',
    user_id: MOCK_USER_ID,
    skill_name: 'Distributed Systems',
    priority: 2,
    reason: 'Required by 78% of job postings',
    created_at: new Date().toISOString(),
  },
  {
    id: 'gap-3',
    user_id: MOCK_USER_ID,
    skill_name: 'SQL/Databases',
    priority: 3,
    reason: 'Strengthen existing skill for interviews',
    created_at: new Date().toISOString(),
  },
  {
    id: 'gap-4',
    user_id: MOCK_USER_ID,
    skill_name: 'Algorithms',
    priority: 4,
    reason: 'Foundation for technical interviews',
    created_at: new Date().toISOString(),
  },
];

// Courses
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    term: '2026-spring',
    subject: 'CS',
    number: '374',
    title: 'Introduction to Algorithms',
    description: 'Analysis of algorithms: correctness proofs, time/space complexity. Algorithm design techniques.',
    course_url: 'https://courses.illinois.edu/cs374',
    credits: 4,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-2',
    term: '2026-spring',
    subject: 'CS',
    number: '411',
    title: 'Database Systems',
    description: 'Design, implementation, and optimization of database systems. SQL, transactions, and query processing.',
    course_url: 'https://courses.illinois.edu/cs411',
    credits: 3,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-3',
    term: '2026-spring',
    subject: 'CS',
    number: '421',
    title: 'Programming Languages',
    description: 'Programming language design, semantics, and implementation concepts.',
    course_url: 'https://courses.illinois.edu/cs421',
    credits: 3,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-4',
    term: '2026-spring',
    subject: 'CS',
    number: '438',
    title: 'Communication Networks',
    description: 'Fundamentals of networking protocols, distributed systems concepts, and network programming.',
    course_url: 'https://courses.illinois.edu/cs438',
    credits: 3,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-5',
    term: '2026-spring',
    subject: 'CS',
    number: '461',
    title: 'Computer Security',
    description: 'Security principles, cryptography, network security, and secure systems design.',
    course_url: 'https://courses.illinois.edu/cs461',
    credits: 4,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-6',
    term: '2026-spring',
    subject: 'ECE',
    number: '391',
    title: 'Computer Systems Engineering',
    description: 'Operating system concepts, low-level programming, and system architecture.',
    course_url: 'https://courses.illinois.edu/ece391',
    credits: 4,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-7',
    term: '2026-spring',
    subject: 'ECE',
    number: '408',
    title: 'Applied Parallel Programming',
    description: 'GPU programming, parallel algorithms, and high-performance computing concepts.',
    course_url: 'https://courses.illinois.edu/ece408',
    credits: 4,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-8',
    term: '2026-spring',
    subject: 'CS',
    number: '498',
    title: 'Cloud Computing',
    description: 'Distributed systems, cloud infrastructure, and scalable application design.',
    course_url: 'https://courses.illinois.edu/cs498',
    credits: 3,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-9',
    term: '2026-spring',
    subject: 'BADM',
    number: '352',
    title: 'Database Design & Management',
    description: 'Business-focused database design, ER modeling, and data management strategies.',
    course_url: 'https://courses.illinois.edu/badm352',
    credits: 3,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-10',
    term: '2026-spring',
    subject: 'IS',
    number: '457',
    title: 'Cybersecurity Fundamentals',
    description: 'Introduction to cybersecurity principles, risk management, and security policies.',
    course_url: 'https://courses.illinois.edu/is457',
    credits: 4,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-11',
    term: '2026-spring',
    subject: 'CS',
    number: '225',
    title: 'Data Structures',
    description: 'Core data structures and algorithms: trees, graphs, hash tables, and analysis.',
    course_url: 'https://courses.illinois.edu/cs225',
    credits: 4,
    last_synced: new Date().toISOString(),
  },
  {
    id: 'course-12',
    term: '2026-spring',
    subject: 'CS',
    number: '357',
    title: 'Numerical Methods',
    description: 'Numerical computing, scientific programming, and computational mathematics.',
    course_url: 'https://courses.illinois.edu/cs357',
    credits: 3,
    last_synced: new Date().toISOString(),
  },
];

// Recommendations with more thoughtful explanations
export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    user_id: MOCK_USER_ID,
    course_id: 'course-2', // CS 411
    score: 0.92,
    matched_gaps: ['SQL/Databases', 'System Design'],
    explanation: 'Database Systems is foundational for any software engineering role. You\'ll learn to design schemas, optimize queries, and understand how data flows through production systems — skills that come up in almost every technical interview.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-2',
    user_id: MOCK_USER_ID,
    course_id: 'course-6', // ECE 391
    score: 0.88,
    matched_gaps: ['System Design'],
    explanation: 'This course is intense but transformative. Building an operating system from scratch gives you deep intuition about how computers actually work — exactly what senior engineers and tech leads need to debug complex systems.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-3',
    user_id: MOCK_USER_ID,
    course_id: 'course-4', // CS 438
    score: 0.85,
    matched_gaps: ['Distributed Systems'],
    explanation: 'Understanding networking is essential for building reliable distributed systems. This course covers protocols and patterns used by every major cloud platform — knowledge that directly applies to backend engineering roles.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-4',
    user_id: MOCK_USER_ID,
    course_id: 'course-8', // CS 498 Cloud
    score: 0.82,
    matched_gaps: ['Distributed Systems', 'System Design'],
    explanation: 'Cloud computing is where modern software lives. This course teaches you to design systems that scale to millions of users — a skill that\'s become essential for software engineers at any growing company.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-5',
    user_id: MOCK_USER_ID,
    course_id: 'course-1', // CS 374
    score: 0.78,
    matched_gaps: ['Algorithms'],
    explanation: 'Strong algorithmic thinking sets great engineers apart. This course builds the problem-solving foundation you\'ll use in technical interviews and when tackling complex engineering challenges at work.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-6',
    user_id: MOCK_USER_ID,
    course_id: 'course-7', // ECE 408
    score: 0.72,
    matched_gaps: ['System Design'],
    explanation: 'Parallel programming is increasingly important as AI and data processing grow. Learning to write efficient GPU code opens doors to high-performance computing roles and ML infrastructure teams.',
    created_at: new Date().toISOString(),
  },
];

// Helper to get course by ID
export const getCourseById = (id: string): Course | undefined => {
  return mockCourses.find(course => course.id === id);
};

// Helper to get recommendation with course details
export interface RecommendationWithCourse extends Recommendation {
  course: Course;
}

export const getRecommendationsWithCourses = (): RecommendationWithCourse[] => {
  return mockRecommendations
    .map(rec => {
      const course = getCourseById(rec.course_id);
      if (!course) return null;
      return { ...rec, course };
    })
    .filter((rec): rec is RecommendationWithCourse => rec !== null)
    .sort((a, b) => b.score - a.score);
};

// Skill boost mapping for courses
export const courseSkillBoosts: Record<string, Record<string, number>> = {
  'course-1': { 'Algorithms': 0.15 },
  'course-2': { 'SQL/Databases': 0.20, 'System Design': 0.10 },
  'course-4': { 'Distributed Systems': 0.18 },
  'course-6': { 'System Design': 0.22 },
  'course-7': { 'System Design': 0.12 },
  'course-8': { 'Distributed Systems': 0.15, 'System Design': 0.15 },
};
