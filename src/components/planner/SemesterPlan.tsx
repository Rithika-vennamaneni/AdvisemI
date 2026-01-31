import { useState, useCallback } from 'react';
import { Calendar, X, GripVertical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Course } from '@/types/database';

interface SemesterPlanProps {
  term: string;
  courses: Course[];
  onDrop: (courseId: string) => void;
  onRemove: (courseId: string) => void;
  maxCredits: number;
}

const formatTerm = (term: string) => {
  const [year, semester] = term.split('-');
  return `${semester.charAt(0).toUpperCase() + semester.slice(1)} ${year}`;
};

export function SemesterPlan({ term, courses, onDrop, onRemove, maxCredits }: SemesterPlanProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const creditStatus = totalCredits >= maxCredits ? 'full' : totalCredits >= maxCredits * 0.75 ? 'almost' : 'open';

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{formatTerm(term)}</h2>
        </div>
        <div className={cn(
          'text-sm font-medium',
          creditStatus === 'full' && 'text-destructive',
          creditStatus === 'almost' && 'text-[hsl(var(--skill-medium))]',
          creditStatus === 'open' && 'text-muted-foreground'
        )}>
          {totalCredits} / {maxCredits} credits
        </div>
      </div>

      {/* Drop Zone / Course List */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border-2 border-dashed transition-all duration-200 min-h-[180px]',
          isDragOver
            ? 'border-primary bg-primary/5'
            : courses.length === 0
            ? 'border-border/60 bg-muted/20'
            : 'border-transparent bg-transparent p-0'
        )}
      >
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-center px-4">
            <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Your semester plan
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Add courses from recommendations or drag them here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group flex items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-sm transition-all"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {course.subject} {course.number}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {course.credits} cr
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {course.title}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(course.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      {courses.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{courses.length} course{courses.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{totalCredits} credits planned</span>
        </div>
      )}
    </div>
  );
}
