import { cn } from '@/lib/utils';

interface CircularProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
  showValue?: boolean;
  className?: string;
  glow?: boolean;
}

const sizeConfig = {
  sm: { diameter: 24, stroke: 2.5, fontSize: 'text-[8px]' },
  md: { diameter: 40, stroke: 3, fontSize: 'text-xs' },
  lg: { diameter: 80, stroke: 4, fontSize: 'text-lg' },
};

export function CircularProgress({
  value,
  size = 'sm',
  strokeWidth,
  showValue = false,
  className,
  glow = false,
}: CircularProgressProps) {
  const config = sizeConfig[size];
  const diameter = config.diameter;
  const stroke = strokeWidth ?? config.stroke;
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        glow && 'drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]',
        className
      )}
      style={{ width: diameter, height: diameter }}
    >
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        {/* Progress ring */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {showValue && (
        <span
          className={cn(
            'absolute font-semibold text-foreground',
            config.fontSize
          )}
        >
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
