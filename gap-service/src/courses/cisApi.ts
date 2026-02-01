import { XMLParser } from 'fast-xml-parser';
import { logger } from '../util/logger.js';

export type CourseRef = {
  subject: string;
  number: string;
};

export type CourseDetail = {
  subject: string;
  number: string;
  title: string | null;
  description: string | null;
  course_url: string;
};

const CIS_BASE_URL = 'https://courses.illinois.edu/cisapi';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return null;
};

const findStringByKeys = (node: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = node[key];
    const str = asString(value);
    if (str) return str;
  }
  return null;
};

const traverse = (node: unknown, visitor: (item: Record<string, unknown>) => void): void => {
  if (Array.isArray(node)) {
    node.forEach((item) => traverse(item, visitor));
    return;
  }
  if (!isRecord(node)) return;
  visitor(node);
  Object.values(node).forEach((value) => traverse(value, visitor));
};

const extractCourseRefs = (xml: string): CourseRef[] => {
  const parsed = parser.parse(xml);
  const refs: CourseRef[] = [];

  traverse(parsed, (node) => {
    const subject =
      findStringByKeys(node, ['subject', 'subjectCode', '@_subject']) ?? null;
    const number =
      findStringByKeys(node, ['number', 'courseNumber', '@_courseNumber', '@_number']) ?? null;
    if (subject && number) {
      refs.push({ subject, number });
    }
  });

  return refs;
};

const extractCourseDetail = (xml: string, subject: string, number: string, courseUrl: string): CourseDetail => {
  const parsed = parser.parse(xml);
  let title: string | null = null;
  let description: string | null = null;

  traverse(parsed, (node) => {
    if (!title) {
      title =
        findStringByKeys(node, ['title', 'courseTitle', 'label']) ?? title;
    }
    if (!description) {
      description =
        findStringByKeys(node, ['description', 'courseDescription']) ?? description;
    }
  });

  return {
    subject,
    number,
    title,
    description,
    course_url: courseUrl
  };
};

const fetchWithRetry = async (url: string, retryCount = 1, timeoutMs = 8000): Promise<string> => {
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/xml' },
        signal: controller.signal
      });
      if (!res.ok) {
        const status = res.status;
        if (attempt < retryCount) {
          logger.warn('CIS API request failed, retrying', { url, status });
          continue;
        }
        throw new Error(`CIS API request failed (${status})`);
      }
      return await res.text();
    } catch (error) {
      if (attempt < retryCount) {
        logger.warn('CIS API request error, retrying', { url, error: error instanceof Error ? error.message : String(error) });
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('CIS API request failed');
};

export const searchCourses = async (year: number, term: string, queryParam: { key: 'qs' | 'qw_o' | 'qw_a'; value: string }): Promise<CourseRef[]> => {
  const url = new URL(`${CIS_BASE_URL}/schedule/courses`);
  url.searchParams.set('year', String(year));
  url.searchParams.set('term', term);
  url.searchParams.set(queryParam.key, queryParam.value);

  const xml = await fetchWithRetry(url.toString());
  return extractCourseRefs(xml);
};

export const fetchCourseDetail = async (
  year: number,
  term: string,
  subject: string,
  number: string
): Promise<CourseDetail> => {
  const courseUrl = `https://courses.illinois.edu/schedule/${year}/${term}/${subject}/${number}`;
  const url = `${CIS_BASE_URL}/catalog/${year}/${term}/${subject}/${number}`;
  const xml = await fetchWithRetry(url);
  return extractCourseDetail(xml, subject, number, courseUrl);
};
