import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, GraduationCap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressSummaryProps {
  coursesAdded: number;
  maxCourses: number;
  creditsPlanned: number;
  maxCredits: number;
  matchImprovement: number;
}

export function ProgressSummary({
  coursesAdded,
  maxCourses,
  creditsPlanned,
  maxCredits,
  matchImprovement,
}: ProgressSummaryProps) {
  const courseProgress = (coursesAdded / maxCourses) * 100;
  const creditProgress = (creditsPlanned / maxCredits) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Progress Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Courses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span>Courses</span>
            </div>
            <span className="font-medium">{coursesAdded} / {maxCourses}</span>
          </div>
          <Progress value={courseProgress} className="h-2" />
        </div>

        {/* Credits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <span>Credits</span>
            </div>
            <span className={cn(
              'font-medium',
              creditsPlanned > maxCredits && 'text-destructive'
            )}>
              {creditsPlanned} / {maxCredits}
            </span>
          </div>
          <Progress 
            value={Math.min(creditProgress, 100)} 
            className={cn('h-2', creditsPlanned > maxCredits && '[&>div]:bg-destructive')}
          />
        </div>

        {/* Match Improvement */}
        {matchImprovement > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              +{matchImprovement}% match this session
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
