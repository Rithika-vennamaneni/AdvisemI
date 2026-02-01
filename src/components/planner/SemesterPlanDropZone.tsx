import { useState, useCallback } from 'react';
import { BookMarked, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Course } from '@/types/database';
import { PlannedCourseCard } from './PlannedCourseCard';

interface SemesterPlanDropZoneProps {
  term: string;
  courses: Course[];
  onDrop: (courseId: string) => void;
  onRemove: (courseId: string) => void;
  newlyAddedId?: string | null;
}

export function SemesterPlanDropZone({
  term,
  courses,
  onDrop,
  onRemove,
  newlyAddedId,
}: SemesterPlanDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const courseId = e.dataTransfer.getData('courseId');
    if (courseId) {
      onDrop(courseId);
    }
  }, [onDrop]);

  const formatTerm = (term: string) => {
    const [year, semester] = term.split('-');
    return `${semester.charAt(0).toUpperCase() + semester.slice(1)} ${year}`;
  };

  const totalCredits = courses.reduce((sum, c) => sum + (c.credits || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{formatTerm(term)}</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {totalCredits} credits
        </span>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'min-h-[200px] rounded-lg border-2 border-dashed transition-all duration-200 p-4',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : courses.length === 0
            ? 'border-border bg-muted/30'
            : 'border-transparent bg-transparent p-0'
        )}
      >
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[168px] text-center">
            <Sparkles className="w-8 h-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              Drop courses here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag from recommendations or click "Add to Plan"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <PlannedCourseCard
                key={course.id}
                course={course}
                onRemove={onRemove}
                isNew={course.id === newlyAddedId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
