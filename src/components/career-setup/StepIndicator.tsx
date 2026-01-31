import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div
            key={stepNumber}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300',
              isCompleted && 'bg-primary text-primary-foreground',
              isCurrent && 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background',
              !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
            )}
          >
            {isCompleted ? (
              <Check className="w-4 h-4" />
            ) : (
              stepNumber
            )}
          </div>
        );
      })}
    </div>
  );
}
