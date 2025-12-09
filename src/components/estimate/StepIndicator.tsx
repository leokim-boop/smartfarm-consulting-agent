// src/components/estimate/StepIndicator.tsx
import React from "react";

interface Props {
  stepIndex: number;
  totalSteps: number;
}

const STEP_LABELS = [
  "기본 정보",
  "공간 · 작물",
  "시스템 구성",
  "운영 · 재무",
  "요약 확인",
];

const StepIndicator: React.FC<Props> = ({ stepIndex, totalSteps }) => {
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 md:text-sm">
        <span>
          STEP {stepIndex + 1} / {totalSteps} · {STEP_LABELS[stepIndex]}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default StepIndicator;

