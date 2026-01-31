import { useState } from 'react';
import { GripVertical, ChevronDown, ExternalLink, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Course, Recommendation } from '@/types/database';

interface CourseTileProps {
  course: Course;
  recommendation: Recommendation;
  onAdd: (courseId: string) => void;
  isAdded?: boolean;
}

export function CourseTile({ course, recommendation, onAdd, isAdded = false }: CourseTileProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('courseId', course.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Card
      draggable={!isAdded}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'transition-all duration-200 cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 scale-[1.02] shadow-lg rotate-1',
        !isDragging && 'hover:shadow-md hover:-translate-y-0.5',
        isAdded && 'opacity-60 cursor-not-allowed'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div className="flex-shrink-0 mt-1 text-muted-foreground">
            <GripVertical className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-sm">
                  {course.subject} {course.number}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {course.title}
                </p>
              </div>
              <Badge variant="secondary" className="flex-shrink-0">
                {course.credits} cr
              </Badge>
            </div>

            {/* Match Score */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${recommendation.score * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-primary">
                {Math.round(recommendation.score * 100)}% match
              </span>
            </div>

            {/* Skill Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {recommendation.matched_gaps.map((gap) => (
                <Badge key={gap} variant="outline" className="text-xs">
                  {gap}
                </Badge>
              ))}
            </div>

            {/* Why this course expandable */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                  Why this course?
                  <ChevronDown className={cn(
                    'w-3 h-3 ml-1 transition-transform',
                    isExpanded && 'rotate-180'
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  {recommendation.explanation}
                </p>
                <a
                  href={course.course_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View course details
                  <ExternalLink className="w-3 h-3" />
                </a>
              </CollapsibleContent>
            </Collapsible>

            {/* Add Button */}
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                size="sm"
                variant={isAdded ? 'secondary' : 'default'}
                className="w-full"
                onClick={() => onAdd(course.id)}
                disabled={isAdded}
              >
                {isAdded ? (
                  'Added to Plan'
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add to Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
