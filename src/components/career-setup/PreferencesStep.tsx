import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { industries, companySizes, timelines } from '@/data/careerOptions';

interface PreferencesStepProps {
  industry: string;
  companySize: string;
  timeline: string;
  onIndustryChange: (value: string) => void;
  onCompanySizeChange: (value: string) => void;
  onTimelineChange: (value: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

export function PreferencesStep({
  industry,
  companySize,
  timeline,
  onIndustryChange,
  onCompanySizeChange,
  onTimelineChange,
  onBack,
  onComplete,
}: PreferencesStepProps) {
  const canProceed = industry && companySize && timeline;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          A few quick preferences
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          This helps us tailor course recommendations to your ideal work environment.
        </p>
      </div>

      {/* Industry Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          Where do you want to work?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {industries.map((ind) => (
            <button
              key={ind.id}
              onClick={() => onIndustryChange(ind.id)}
              className={cn(
                'relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left',
                'hover:border-primary/50 hover:bg-primary/5',
                industry === ind.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              )}
            >
              {industry === ind.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <span className="text-2xl mb-2">{ind.icon}</span>
              <span className="font-medium text-sm">{ind.label}</span>
              <span className="text-xs text-muted-foreground">{ind.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Company Size */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          What company size fits you?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {companySizes.map((size) => (
            <button
              key={size.id}
              onClick={() => onCompanySizeChange(size.id)}
              className={cn(
                'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center',
                'hover:border-primary/50 hover:bg-primary/5',
                companySize === size.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              )}
            >
              {companySize === size.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <span className="text-2xl mb-1">{size.icon}</span>
              <span className="font-medium text-sm">{size.label}</span>
              <span className="text-xs text-muted-foreground">{size.range}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          When are you aiming for this role?
        </label>
        <div className="flex flex-wrap gap-2">
          {timelines.map((t) => (
            <button
              key={t.id}
              onClick={() => onTimelineChange(t.id)}
              className={cn(
                'px-5 py-3 rounded-full border-2 transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                timeline === t.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border'
              )}
            >
              <span className="font-medium text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={onComplete}
          disabled={!canProceed}
          className="rounded-full px-8 gap-2"
        >
          See My Courses
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
