// src/components/estimate/SummarySidebar.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import type { EstimateFormValues } from "@/lib/estimateSchema";

const SummarySidebar: React.FC = () => {
  const { watch } = useFormContext<EstimateFormValues>();
  const values = watch();

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-sm md:p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">
        입력 요약
      </h3>
      <div className="space-y-2">
        <div>
          <div className="font-semibold">고객 정보</div>
          <div>{values.customer?.name || "이름 미입력"}</div>
          <div>{values.customer?.email || "이메일 미입력"}</div>
        </div>
        <div>
          <div className="font-semibold">공간</div>
          <div>
            {values.space?.widthM}m x {values.space?.lengthM}m · 높이{" "}
            {values.space?.heightM}m
          </div>
        </div>
        <div>
          <div className="font-semibold">재배 작물</div>
          <div>
            {values.crops?.selectedCrops?.join(", ") || "선택 없음"}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SummarySidebar;

