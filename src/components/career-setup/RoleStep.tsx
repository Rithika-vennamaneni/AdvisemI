import { useState, useMemo } from 'react';
import { Search, Sparkles, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { jobRoles } from '@/data/careerOptions';

interface RoleStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export function RoleStep({ value, onChange, onNext }: RoleStepProps) {
  const [search, setSearch] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return jobRoles.slice(0, 6);
    return jobRoles.filter(role => 
      role.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 6);
  }, [search]);

  const handleSelect = (role: string) => {
    setSearch(role);
    onChange(role);
    setIsFocused(false);
  };

  const handleInputChange = (val: string) => {
    setSearch(val);
    onChange(val);
  };

  const canProceed = search.trim().length > 2;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-2">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          What's your dream role?
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Tell us where you're headed, and we'll help you get there with the right courses.
        </p>
      </div>

      {/* Search Input */}
      <div className="max-w-md mx-auto space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search or type your dream role..."
            className="pl-12 h-14 text-lg rounded-xl border-2 focus:border-primary"
          />
        </div>

        {/* Suggestions */}
        {(isFocused || !value) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {search.trim() ? 'Suggestions' : 'Popular roles'}
            </p>
            <div className="flex flex-wrap gap-2">
              {filteredRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => handleSelect(role)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    'border border-border hover:border-primary hover:bg-primary/5',
                    value === role && 'border-primary bg-primary/10 text-primary'
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-full px-8 gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
