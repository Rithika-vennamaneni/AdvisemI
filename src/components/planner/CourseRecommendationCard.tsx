import { Plus, Check, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Course, Recommendation } from '@/types/database';

interface CourseRecommendationCardProps {
  course: Course;
  recommendation: Recommendation;
  onAdd: (courseId: string) => void;
  isAdded?: boolean;
}

export function CourseRecommendationCard({ 
  course, 
  recommendation, 
  onAdd, 
  isAdded = false,
}: CourseRecommendationCardProps) {
  // Generate a more human explanation based on matched gaps
  const getHumanExplanation = () => {
    const gaps = recommendation.matched_gaps;
    if (gaps.length === 1) {
      return `This course directly builds your ${gaps[0]} skills — one of the key areas for your target role.`;
    }
    if (gaps.length === 2) {
      return `Covers both ${gaps[0]} and ${gaps[1]}, helping you close two skill gaps with one course.`;
    }
    return `Addresses multiple focus areas: ${gaps.slice(0, -1).join(', ')}, and ${gaps[gaps.length - 1]}.`;
  };

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card transition-all duration-200',
        isAdded 
          ? 'opacity-60 bg-muted/20' 
          : 'hover:shadow-md hover:border-primary/20'
      )}
    >
      {/* Main Content */}
      <div className="p-6 space-y-5">
        {/* Course Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <h3 className="text-lg font-semibold">
                {course.subject} {course.number}
              </h3>
              {course.credits && (
                <span className="text-sm text-muted-foreground">
                  {course.credits} credits
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{course.title}</p>
          </div>
          
          {isAdded && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Added</span>
            </div>
          )}
        </div>

        {/* Skills Addressed - Primary Focus */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Builds these skills:
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendation.matched_gaps.map((gap) => (
              <div
                key={gap}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10"
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium text-foreground">{gap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Why This Course - Always Visible */}
        <div className="space-y-2 p-4 rounded-xl bg-muted/50">
          <p className="text-sm font-medium text-foreground">
            Why we recommend this
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {recommendation.explanation}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            {getHumanExplanation()}
          </p>
        </div>

        {/* Course Link */}
        <a
          href={course.course_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          View full course details
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Action Footer */}
      {!isAdded && (
        <div className="px-6 pb-6">
          <Button
            onClick={() => onAdd(course.id)}
            className="w-full h-12 text-base rounded-xl gap-2"
          >
            <Plus className="w-5 h-5" />
            Add to my semester plan
          </Button>
        </div>
      )}
    </div>
  );
}
