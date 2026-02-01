import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Course } from '@/types/database';

interface PlannedCourseCardProps {
  course: Course;
  onRemove: (courseId: string) => void;
  isNew?: boolean;
}

export function PlannedCourseCard({ course, onRemove, isNew = false }: PlannedCourseCardProps) {
  return (
    <Card className={cn(
      'transition-all duration-300',
      isNew && 'animate-scale-in ring-2 ring-primary/30'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">
                {course.subject} {course.number}
              </h4>
              {course.credits && (
                <Badge variant="secondary" className="text-xs">
                  {course.credits} cr
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {course.title}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(course.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
