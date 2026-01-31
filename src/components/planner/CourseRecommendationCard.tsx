import { useState } from 'react';
import { ChevronDown, ExternalLink, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Course, Recommendation } from '@/types/database';

interface CourseRecommendationCardProps {
  course: Course;
  recommendation: Recommendation;
  onAdd: (courseId: string) => void;
  isAdded?: boolean;
  rank: number;
}

export function CourseRecommendationCard({ 
  course, 
  recommendation, 
  onAdd, 
  isAdded = false,
  rank,
}: CourseRecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const matchLabel = recommendation.score >= 0.85 
    ? 'Great match' 
    : recommendation.score >= 0.7 
    ? 'Good match' 
    : 'Relevant';

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card p-5 transition-all duration-200',
        'hover:shadow-sm hover:border-border/80',
        isAdded && 'opacity-60 bg-muted/30'
      )}
    >
      {/* Rank indicator */}
      {rank <= 3 && !isAdded && (
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shadow-sm">
          {rank}
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">
                {course.subject} {course.number}
              </h3>
              <Badge variant="outline" className="text-xs font-normal">
                {course.credits} credits
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{course.title}</p>
          </div>
          
          {!isAdded && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary flex-shrink-0">
              <Sparkles className="w-3 h-3" />
              <span className="text-xs font-medium">{matchLabel}</span>
            </div>
          )}
        </div>

        {/* Skills addressed */}
        <div className="flex flex-wrap gap-1.5">
          {recommendation.matched_gaps.map((gap) => (
            <span
              key={gap}
              className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground"
            >
              {gap}
            </span>
          ))}
        </div>

        {/* Why this course */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span>Why this course?</span>
            <ChevronDown className={cn(
              'w-4 h-4 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {recommendation.explanation}
            </p>
            <a
              href={course.course_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              View course details
              <ExternalLink className="w-3 h-3" />
            </a>
          </CollapsibleContent>
        </Collapsible>

        {/* Action */}
        <Button
          variant={isAdded ? 'secondary' : 'default'}
          size="sm"
          className="w-full"
          onClick={() => onAdd(course.id)}
          disabled={isAdded}
        >
          {isAdded ? (
            'Added to plan'
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1.5" />
              Add to semester
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
