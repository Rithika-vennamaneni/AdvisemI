export interface UIUCCourse {
  subject: string;
  number: string;
  title: string;
  description: string | null;
  credits: number | null;
  courseUrl: string;
}

export interface UIUCSubject {
  code: string;
  name: string;
}

export interface UIUCCatalogResponse {
  subjects?: {
    subject?: UIUCSubject | UIUCSubject[];
  };
  courses?: {
    course?: UIUCCourseData | UIUCCourseData[];
  };
}

export interface UIUCCourseData {
  id: string;
  label: string;
  href?: string;
  creditHours?: string;
  section?: {
    id: string;
    href?: string;
  } | Array<{
    id: string;
    href?: string;
  }>;
}
