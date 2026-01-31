import { Target, TrendingUp, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GapSkill } from '@/types/database';

interface CareerProgressProps {
  dreamRole: string;
  gapSkills: GapSkill[];
  skillScores: Record<string, number>;
}

const getSkillStatus = (score: number): { label: string; variant: 'strong' | 'growing' | 'focus' } => {
  if (score >= 0.7) return { label: 'Strong', variant: 'strong' };
  if (score >= 0.45) return { label: 'Growing', variant: 'growing' };
  return { label: 'Focus area', variant: 'focus' };
};

export function CareerProgress({ dreamRole, gapSkills, skillScores }: CareerProgressProps) {
  // Calculate overall readiness
  const avgScore = gapSkills.reduce((sum, gap) => sum + (skillScores[gap.skill_name] || 0), 0) / gapSkills.length;
  const readinessLabel = avgScore >= 0.7 ? 'On track' : avgScore >= 0.5 ? 'Making progress' : 'Building foundations';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Your goal</span>
          </div>
          <h2 className="text-xl font-semibold">{dreamRole}</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">{readinessLabel}</span>
        </div>
      </div>

      {/* Skill Gap Pills */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Skills to develop</p>
        <div className="flex flex-wrap gap-2">
          {gapSkills.map((gap, index) => {
            const score = skillScores[gap.skill_name] || 0;
            const status = getSkillStatus(score);
            
            const variantStyles = {
              strong: 'bg-[hsl(var(--skill-strong))]/10 text-[hsl(var(--skill-strong))] border-[hsl(var(--skill-strong))]/20',
              growing: 'bg-[hsl(var(--skill-medium))]/10 text-[hsl(var(--skill-medium))] border-[hsl(var(--skill-medium))]/20',
              focus: 'bg-muted text-foreground border-border',
            };

            return (
              <div
                key={gap.id}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm',
                  variantStyles[status.variant]
                )}
              >
                <span className="font-medium">{gap.skill_name}</span>
                <span className="text-xs opacity-70">{status.label}</span>
                {index < 2 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
