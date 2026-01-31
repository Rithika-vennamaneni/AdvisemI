import { useState, useEffect } from 'react';
import { Info, UserCheck, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Skill } from '@/types/database';

export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type SkillLevel = typeof SKILL_LEVELS[number];

export const scoreToLevel = (score: number): SkillLevel => {
  if (score >= 0.85) return 'Expert';
  if (score >= 0.65) return 'Advanced';
  if (score >= 0.4) return 'Intermediate';
  return 'Beginner';
};

export const levelToScore = (level: SkillLevel): number => {
  switch (level) {
    case 'Expert': return 0.92;
    case 'Advanced': return 0.75;
    case 'Intermediate': return 0.52;
    case 'Beginner': return 0.25;
  }
};

const levelToSliderValue = (level: SkillLevel): number => {
  return SKILL_LEVELS.indexOf(level);
};

const sliderValueToLevel = (value: number): SkillLevel => {
  return SKILL_LEVELS[Math.round(value)] || 'Intermediate';
};

export interface SkillWithLevel extends Skill {
  expertise_level?: string;
}

interface SkillCardProps {
  skill: SkillWithLevel;
  onUpdate: (id: string, updates: Partial<SkillWithLevel>) => void;
  onRemove: (id: string) => void;
}

export function SkillCard({ skill, onUpdate, onRemove }: SkillCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(skill.skill_name);
  const [isAdjusted, setIsAdjusted] = useState(false);
  
  // Use expertise_level if set, otherwise derive from score
  const currentLevel: SkillLevel = (skill.expertise_level as SkillLevel) || scoreToLevel(skill.score);
  const sliderValue = levelToSliderValue(currentLevel);

  const handleLevelChange = (values: number[]) => {
    const newLevel = sliderValueToLevel(values[0]);
    const newScore = levelToScore(newLevel);
    onUpdate(skill.id, { score: newScore, expertise_level: newLevel });
    setIsAdjusted(true);
  };

  const handleNameSave = () => {
    if (editedName.trim()) {
      onUpdate(skill.id, { skill_name: editedName.trim() });
      setIsAdjusted(true);
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(skill.skill_name);
    setIsEditingName(false);
  };

  const levelColors: Record<SkillLevel, string> = {
    Beginner: 'bg-muted text-muted-foreground',
    Intermediate: 'bg-[hsl(var(--skill-medium))]/15 text-[hsl(var(--skill-medium))]',
    Advanced: 'bg-primary/15 text-primary',
    Expert: 'bg-[hsl(var(--skill-strong))]/15 text-[hsl(var(--skill-strong))]',
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      isAdjusted && 'ring-1 ring-primary/20'
    )}>
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') handleNameCancel();
                    }}
                    className="h-9 text-base font-medium"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleNameSave}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleNameCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{skill.skill_name}</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              
              {/* Evidence */}
              {skill.evidence && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span className="line-clamp-1">{skill.evidence}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex-shrink-0">
                        <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        We inferred this from your resume — feel free to correct it.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </p>
              )}
            </div>

            {/* Adjusted Indicator & Remove */}
            <div className="flex items-center gap-2">
              {isAdjusted && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
                  <UserCheck className="w-3 h-3" />
                  <span className="text-xs font-medium">Adjusted</span>
                </div>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(skill.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Level Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Skill Level</span>
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                levelColors[currentLevel]
              )}>
                {currentLevel}
              </span>
            </div>
            
            {/* Slider */}
            <div className="px-1">
              <Slider
                value={[sliderValue]}
                onValueChange={handleLevelChange}
                min={0}
                max={3}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-2">
                {SKILL_LEVELS.map((level, index) => (
                  <span
                    key={level}
                    className={cn(
                      'text-xs transition-colors',
                      index === sliderValue
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground/60'
                    )}
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
