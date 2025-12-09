// src/components/estimate/steps/StepSpaceAndCrops.tsx
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

const StepSpaceAndCrops: React.FC<Props> = ({ onNext, onPrev }) => {
  const { register, handleSubmit, watch, setValue } = useFormContext<EstimateFormValues>();
  const selectedCrops = watch("crops.selectedCrops") || [];

  const onValid = () => onNext();

  const handleCropChange = (value: string, checked: boolean) => {
    if (checked) {
      setValue("crops.selectedCrops", [...selectedCrops, value as any]);
    } else {
      setValue(
        "crops.selectedCrops",
        selectedCrops.filter((crop) => crop !== value)
      );
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900 md:text-lg">
        STEP 2. 공간 · 작물
      </h2>

      {/* TODO: 공간 유형, 가로/세로/높이, 작물 선택 등 구현 */}

      <QuestionBlock
        botText={
          <>
            이제 재배하실 <b>실내 공간 크기</b>를 입력해 주세요.
            <br />
            정확하지 않아도 괜찮습니다. 나중에 수정 가능합니다.
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <FormField
            name="space.widthM"
            label="가로 길이 (m)"
            description="예: 5"
          >
            <input
              type="number"
              step="0.1"
              min={1}
              max={100}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("space.widthM", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            name="space.lengthM"
            label="세로 길이 (m)"
            description="예: 4"
          >
            <input
              type="number"
              step="0.1"
              min={1}
              max={100}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("space.lengthM", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            name="space.heightM"
            label="천장 높이 (m)"
            description="예: 2.5"
          >
            <input
              type="number"
              step="0.1"
              min={2}
              max={10}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("space.heightM", { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            어떤 작물을 <b>주로 재배</b>하고 싶으신가요?
            <br />
            최소 1개 이상 선택해 주세요.
          </>
        }
      >
        <FormField
          name="crops.selectedCrops"
          label="재배 예정 작물 (복수 선택 가능)"
        >
          <div className="flex flex-wrap gap-2">
            {[
              { value: "europe_lettuce", label: "유럽상추" },
              { value: "herb", label: "허브류" },
              { value: "microgreen", label: "마이크로그린" },
              { value: "strawberry", label: "딸기" },
              { value: "wasabi", label: "와사비" },
              { value: "ornamental", label: "관엽 / 스마트가든" },
              { value: "other", label: "기타" },
            ].map((item) => (
              <label
                key={item.value}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700"
              >
                <input
                  type="checkbox"
                  value={item.value}
                  checked={selectedCrops.includes(item.value as any)}
                  onChange={(e) => handleCropChange(item.value, e.target.checked)}
                  className="h-3 w-3"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
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

export default StepSpaceAndCrops;

