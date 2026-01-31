import { useState } from 'react';
import { X, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { getSkillStrength, type Skill } from '@/types/database';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SkillChipProps {
  skill: Skill;
  onUpdate?: (id: string, name: string) => void;
  onRemove?: (id: string) => void;
  editable?: boolean;
}

export function SkillChip({ skill, onUpdate, onRemove, editable = true }: SkillChipProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(skill.skill_name);
  
  const strength = getSkillStrength(skill.score);
  
  const strengthStyles = {
    strong: 'bg-[hsl(var(--skill-strong))]/10 text-[hsl(var(--skill-strong))] border-[hsl(var(--skill-strong))]/30',
    medium: 'bg-[hsl(var(--skill-medium))]/10 text-[hsl(var(--skill-medium))] border-[hsl(var(--skill-medium))]/30',
    weak: 'bg-muted text-muted-foreground border-border',
  };
  
  const handleSave = () => {
    if (editValue.trim() && onUpdate) {
      onUpdate(skill.id, editValue.trim());
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(skill.skill_name);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-primary bg-background">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-6 w-24 px-2 text-sm border-0 focus-visible:ring-0"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-0.5 rounded hover:bg-muted"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all',
            strengthStyles[strength],
            editable && 'hover:shadow-sm'
          )}
        >
          <span>{skill.skill_name}</span>
          
          {editable && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-0.5 rounded hover:bg-foreground/10"
              >
                <Pencil className="w-3 h-3" />
              </button>
              {onRemove && (
                <button
                  onClick={() => onRemove(skill.id)}
                  className="p-0.5 rounded hover:bg-foreground/10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium capitalize">{strength} skill</p>
          {skill.evidence && (
            <p className="text-xs text-muted-foreground">{skill.evidence}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Score: {Math.round(skill.score * 100)}%
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
