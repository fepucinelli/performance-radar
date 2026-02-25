import { scoreGaugeColor, gradeScore, GRADE_LABELS } from "@/lib/utils/metrics"
import { cn } from "@/lib/utils"

interface ScoreGaugeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: { outer: 64, stroke: 5, fontSize: "text-lg", labelSize: "text-xs" },
  md: { outer: 96, stroke: 7, fontSize: "text-2xl", labelSize: "text-xs" },
  lg: { outer: 128, stroke: 9, fontSize: "text-4xl", labelSize: "text-sm" },
}

export function ScoreGauge({
  score,
  size = "md",
  showLabel = true,
  className,
}: ScoreGaugeProps) {
  const { outer, stroke, fontSize, labelSize } = SIZE_MAP[size]
  const radius = (outer - stroke * 2) / 2
  const circumference = 2 * Math.PI * radius
  // Start from top (–90°), fill clockwise based on score
  const offset = circumference - (score / 100) * circumference
  const color = scoreGaugeColor(score)
  const grade = gradeScore(score)

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: outer, height: outer }}>
        <svg
          width={outer}
          height={outer}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          {/* Progress */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* Score number in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold tabular-nums", fontSize)} style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span
          className={cn("font-medium", labelSize)}
          style={{ color }}
        >
          {GRADE_LABELS[grade]}
        </span>
      )}
    </div>
  )
}
