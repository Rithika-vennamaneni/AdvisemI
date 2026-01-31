import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CircularProgress } from '@/components/ui/circular-progress';
import type { GapSkill } from '@/types/database';

interface CareerProgressProps {
  dreamRole: string;
  gapSkills: GapSkill[];
  skillScores: Record<string, number>;
  boostedSkills?: string[];
}

export function CareerProgress({ dreamRole, gapSkills, skillScores, boostedSkills = [] }: CareerProgressProps) {
  // Calculate overall readiness
  const avgScore = gapSkills.length > 0
    ? gapSkills.reduce((sum, gap) => sum + (skillScores[gap.skill_name] || 0), 0) / gapSkills.length
    : 0;
  const overallPercentage = Math.round(avgScore * 100);

  return (
    <div className="space-y-6">
      {/* Header with Overall Progress Ring */}
      <div className="flex items-center gap-6">
        <CircularProgress
          value={overallPercentage}
          size="lg"
          showValue
          glow={boostedSkills.length > 0}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Your goal</span>
          </div>
          <h2 className="text-xl font-semibold">{dreamRole}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Job readiness based on your skill development
          </p>
        </div>
      </div>

      {/* Skill Progress Chips */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Skills to develop</p>
        <div className="flex flex-wrap gap-3">
          {gapSkills.map((gap) => {
            const score = skillScores[gap.skill_name] || 0;
            const percentage = Math.round(score * 100);
            const isBoosted = boostedSkills.includes(gap.skill_name);

            return (
              <div
                key={gap.id}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-full border bg-card transition-all duration-300',
                  isBoosted 
                    ? 'border-primary/30 shadow-sm shadow-primary/10' 
                    : 'border-border'
                )}
              >
                <CircularProgress
                  value={percentage}
                  size="sm"
                  glow={isBoosted}
                />
                <span className="text-sm font-medium">{gap.skill_name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
