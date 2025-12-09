// src/components/estimate/steps/StepSystemConfig.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import type { EstimateFormValues } from "@/lib/estimateSchema";
import QuestionBlock from "../ui/QuestionBlock";
import FormField from "../ui/FormField";

interface Props {
  onNext: () => void;
  onPrev: () => void;
}

const StepSystemConfig: React.FC<Props> = ({ onNext, onPrev }) => {
  const { register, handleSubmit, watch, setValue } = useFormContext<EstimateFormValues>();
  const systemType = watch("system.systemType");
  const envControlIncluded = watch("system.envControlIncluded");

  const onValid = () => onNext();

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900 md:text-lg">
        STEP 3. 시스템 구성
      </h2>

      <QuestionBlock
        botText={
          <>
            어떤 <b>시스템 구성</b>을 원하시나요?
            <br />
            공간과 작물에 맞는 추천 시스템을 선택해 주세요.
          </>
        }
      >
        <FormField
          name="system.systemType"
          label="시스템 타입"
          description="기본 추천: 스마트가든 4단"
        >
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            {...register("system.systemType")}
          >
            <option value="smart_garden_4tier">스마트가든 4단</option>
            <option value="moving_rack_4tier">무빙랙 4단</option>
            <option value="fixed_rack_custom">고정랙 커스텀</option>
          </select>
        </FormField>

        {systemType === "fixed_rack_custom" && (
          <FormField
            name="system.fixedRackTiers"
            label="랙 단수"
            description="5~8단 중 선택"
          >
            <select
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("system.fixedRackTiers", { valueAsNumber: true })}
            >
              <option value="">선택하세요</option>
              <option value="5">5단</option>
              <option value="6">6단</option>
              <option value="7">7단</option>
              <option value="8">8단</option>
            </select>
          </FormField>
        )}
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            <b>수경재배 방식</b>을 선택해 주세요.
            <br />
            작물과 시스템에 따라 적합한 방식이 달라집니다.
          </>
        }
      >
        <FormField
          name="system.hydroponicType"
          label="수경재배 방식"
        >
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-md border border-slate-200 p-2 hover:bg-slate-50">
              <input
                type="radio"
                value="ebb_flow"
                className="h-4 w-4"
                {...register("system.hydroponicType")}
              />
              <div>
                <div className="text-sm font-medium">Ebb & Flow (관수형)</div>
                <div className="text-xs text-slate-500">일반적인 수경재배 방식</div>
              </div>
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 p-2 hover:bg-slate-50">
              <input
                type="radio"
                value="aeroponic"
                className="h-4 w-4"
                {...register("system.hydroponicType")}
              />
              <div>
                <div className="text-sm font-medium">Aeroponic (공기분무형)</div>
                <div className="text-xs text-slate-500">고급 수경재배 방식</div>
              </div>
            </label>
          </div>
        </FormField>
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            <b>환경 제어 시스템</b>을 포함하시겠어요?
            <br />
            온도, 습도, 조도 등을 자동으로 제어합니다.
          </>
        }
      >
        <FormField
          name="system.envControlIncluded"
          label="환경 제어 시스템 포함"
        >
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...register("system.envControlIncluded")}
            />
            <span className="text-sm">환경 제어 시스템 포함</span>
          </label>
        </FormField>
      </QuestionBlock>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleSubmit(onValid)}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};

export default StepSystemConfig;

