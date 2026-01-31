import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { StepIndicator } from '@/components/career-setup/StepIndicator';
import { RoleStep } from '@/components/career-setup/RoleStep';
import { PreferencesStep } from '@/components/career-setup/PreferencesStep';
import type { CareerPreferences } from '@/data/careerOptions';

const TOTAL_STEPS = 2;

export default function CareerSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<CareerPreferences>({
    jobRole: '',
    industry: '',
    companySize: '',
    timeline: '',
  });

  const handleComplete = () => {
    // Store preferences (would go to context/database in production)
    console.log('Career preferences:', preferences);
    navigate('/planner');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Minimal Header */}
      <header className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Course Planner</span>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="py-4">
        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
      </div>

      {/* Main Content */}
      <main className="container max-w-2xl px-4 py-8">
        <div className="min-h-[60vh] flex flex-col justify-center">
          {step === 1 && (
            <RoleStep
              value={preferences.jobRole}
              onChange={(jobRole) => setPreferences(prev => ({ ...prev, jobRole }))}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <PreferencesStep
              industry={preferences.industry}
              companySize={preferences.companySize}
              timeline={preferences.timeline}
              onIndustryChange={(industry) => setPreferences(prev => ({ ...prev, industry }))}
              onCompanySizeChange={(companySize) => setPreferences(prev => ({ ...prev, companySize }))}
              onTimelineChange={(timeline) => setPreferences(prev => ({ ...prev, timeline }))}
              onBack={() => setStep(1)}
              onComplete={handleComplete}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-muted-foreground">
          You can always change these preferences later
        </p>
      </footer>
    </div>
  );
}
