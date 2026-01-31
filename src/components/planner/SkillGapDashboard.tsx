import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { GapSkill } from '@/types/database';

interface SkillGapDashboardProps {
  gapSkills: GapSkill[];
  skillScores: Record<string, number>;
  boostedSkills?: string[];
}

export function SkillGapDashboard({ gapSkills, skillScores, boostedSkills = [] }: SkillGapDashboardProps) {
  const overallMatch = useMemo(() => {
    if (gapSkills.length === 0) return 0;
    const totalScore = gapSkills.reduce((sum, gap) => {
      const score = skillScores[gap.skill_name] || 0;
      return sum + score;
    }, 0);
    return Math.round((totalScore / gapSkills.length) * 100);
  }, [gapSkills, skillScores]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Skill Gap Progress</CardTitle>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{overallMatch}% Match</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {gapSkills.map((gap) => {
          const score = skillScores[gap.skill_name] || 0;
          const percentage = Math.round(score * 100);
          const isBoosted = boostedSkills.includes(gap.skill_name);
          
          return (
            <div key={gap.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{gap.skill_name}</span>
                  <span className="text-xs text-muted-foreground">P{gap.priority}</span>
                </div>
                <span className={cn(
                  'font-medium transition-all duration-300',
                  isBoosted && 'text-primary scale-110'
                )}>
                  {percentage}%
                </span>
              </div>
              <div className="relative">
                <Progress 
                  value={percentage} 
                  className={cn(
                    'h-2 transition-all duration-500',
                    isBoosted && 'ring-2 ring-primary/30 ring-offset-1'
                  )}
                />
                {isBoosted && (
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
