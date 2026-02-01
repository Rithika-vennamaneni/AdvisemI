import { XMLParser } from 'fast-xml-parser';
import { logger } from '../util/logger.js';
import type { UIUCCourse, UIUCSubject, UIUCCatalogResponse } from './types.js';

const BASE_URL = 'https://courses.illinois.edu/cisapp/explorer';
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  parseAttributeValue: true,
  trimValues: true,
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const subjectsCache = new Map<string, { expiresAt: number; data: UIUCSubject[] }>();
const coursesCache = new Map<string, { expiresAt: number; data: UIUCCourse[] }>();
const inflight = new Map<string, Promise<string>>();

const getCacheKey = (...parts: string[]): string => parts.join(':');

const fetchWithRetry = async (
  url: string,
  maxRetries = 3,
  retryDelay = 1000
): Promise<string> => {
  const cached = inflight.get(url);
  if (cached) {
    return cached;
  }
  const request = (async () => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AdvisemI-Course-Recommender/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Rate limited, retrying after ${delay}ms`, { attempt, url });
          await sleep(delay);
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      const delay = retryDelay * Math.pow(2, attempt - 1);
      logger.warn(`Request failed, retrying after ${delay}ms`, { attempt, error, url });
      await sleep(delay);
    }
  }
  throw new Error('Max retries exceeded');
  })();
  inflight.set(url, request);
  try {
    return await request;
  } finally {
    inflight.delete(url);
  }
};

export const fetchSubjects = async (year: string, semester: string): Promise<UIUCSubject[]> => {
  const cacheKey = getCacheKey('subjects', year, semester);
  const cached = subjectsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `${BASE_URL}/catalog/${year}/${semester}.xml?mode=summary`;
  logger.info('Fetching subjects from UIUC API', { year, semester, url });

  try {
    const xmlText = await fetchWithRetry(url);
    const parsed = parser.parse(xmlText) as Record<string, unknown>;
    const root =
      (parsed['ns2:term'] as Record<string, unknown> | undefined) ??
      (parsed['term'] as Record<string, unknown> | undefined) ??
      parsed;

    const subjects: UIUCSubject[] = [];
    const rootRecord = root as Record<string, unknown>;
    const subjectData = rootRecord?.subjects ? rootRecord.subjects : rootRecord?.children;

    const rawSubjects =
      (subjectData as Record<string, unknown>)?.subject ??
      (subjectData as UIUCSubject | UIUCSubject[] | undefined);

    if (!rawSubjects) {
      logger.warn('No subjects found in response', { year, semester });
      return [];
    }

    const subjectArray = Array.isArray(rawSubjects) ? rawSubjects : [rawSubjects];

    for (const subj of subjectArray) {
      if (subj && typeof subj === 'object' && 'code' in subj) {
        subjects.push({
          code: subj.code || '',
          name: subj.name || subj.text || subj.code || '',
        });
      }
    }

    logger.info('Fetched subjects', { count: subjects.length, year, semester });
    subjectsCache.set(cacheKey, { data: subjects, expiresAt: Date.now() + CACHE_TTL_MS });
    return subjects;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch subjects', { error: message, year, semester });
    throw new Error(`Failed to fetch subjects: ${message}`);
  }
};

export const fetchCoursesForSubject = async (
  year: string,
  semester: string,
  subjectCode: string
): Promise<UIUCCourse[]> => {
  const cacheKey = getCacheKey('courses', year, semester, subjectCode);
  const cached = coursesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `${BASE_URL}/catalog/${year}/${semester}/${subjectCode}.xml?mode=cascade`;
  logger.info('Fetching courses for subject', { year, semester, subjectCode, url });

  try {
    const xmlText = await fetchWithRetry(url);
    const parsed = parser.parse(xmlText) as Record<string, unknown>;
    const subjectNode =
      (parsed['ns2:subject'] as Record<string, unknown> | undefined) ??
      (parsed['subject'] as Record<string, unknown> | undefined);

    const courses: UIUCCourse[] = [];
    const subjectRecord = subjectNode as Record<string, unknown> | undefined;
    const cascadingCourses = subjectRecord?.cascadingCourses as Record<string, unknown> | undefined;
    const coursesNode = subjectRecord?.courses as Record<string, unknown> | undefined;
    const courseData =
      (cascadingCourses?.cascadingCourse as unknown) ??
      (coursesNode?.course as unknown);

    if (!courseData) {
      logger.info('No courses found for subject', { subjectCode });
      return [];
    }

    const courseArray = Array.isArray(courseData) ? courseData : [courseData];

    for (const course of courseArray) {
      if (!course || typeof course !== 'object') continue;

      const courseId = course.id || '';
      let courseNumber = '';
      if (courseId.startsWith(subjectCode)) {
        courseNumber = courseId.replace(subjectCode, '').trim();
      }
      if (!courseNumber && course.href) {
        const hrefParts = course.href.split('/');
        const last = hrefParts[hrefParts.length - 1];
        courseNumber = last.replace('.xml', '') || '';
      }
      const courseUrl = course.href 
        ? course.href
        : `${BASE_URL}/catalog/${year}/${semester}/${subjectCode}/${courseNumber}.xml`;

      // Extract credits from creditHours or label
      let credits: number | null = null;
      if (course.creditHours) {
        const creditMatch = String(course.creditHours).match(/(\d+(?:\.\d+)?)/);
        if (creditMatch) {
          credits = parseFloat(creditMatch[1]);
        }
      }

      // Try to get description from nested structure
      let description: string | null = null;
      if (course.description) {
        description = course.description;
      } else if (course.text) {
        description = course.text;
      }

      courses.push({
        subject: subjectCode,
        number: courseNumber,
        title: course.label || course.text || `${subjectCode} ${courseNumber}`,
        description,
        credits,
        courseUrl,
      });
    }

    logger.info('Fetched courses for subject', { 
      subjectCode, 
      count: courses.length, 
      year, 
      semester 
    });
    coursesCache.set(cacheKey, { data: courses, expiresAt: Date.now() + CACHE_TTL_MS });
    return courses;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch courses for subject', { 
      error: message, 
      subjectCode, 
      year, 
      semester 
    });
    // Don't throw - return empty array so other subjects can still be processed
    return [];
  }
};

export const fetchCourseDetails = async (
  year: string,
  semester: string,
  subjectCode: string,
  courseNumber: string
): Promise<UIUCCourse | null> => {
  const url = `${BASE_URL}/catalog/${year}/${semester}/${subjectCode}/${courseNumber}.xml?mode=detail`;
    logger.info('Fetching course details', { year, semester, subjectCode, courseNumber });

  try {
    const xmlText = await fetchWithRetry(url);
    const parsed = parser.parse(xmlText) as any;

    // Extract detailed course information
    const course = parsed.course || parsed.children?.course;
    if (!course) {
      return null;
    }

    let credits: number | null = null;
    if (course.creditHours) {
      const creditMatch = String(course.creditHours).match(/(\d+(?:\.\d+)?)/);
      if (creditMatch) {
        credits = parseFloat(creditMatch[1]);
      }
    }

    return {
      subject: subjectCode,
      number: courseNumber,
      title: course.label || course.title || course.text || `${subjectCode} ${courseNumber}`,
      description: course.description || course.text || null,
      credits,
      courseUrl: course.href 
        ? `http://courses.illinois.edu${course.href}`
        : url.replace('.xml', ''),
    };
  } catch (error) {
    logger.warn('Failed to fetch course details', { 
      error: error instanceof Error ? error.message : 'Unknown',
      subjectCode, 
      courseNumber 
    });
    return null;
  }
};
