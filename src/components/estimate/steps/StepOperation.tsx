// src/components/estimate/steps/StepOperation.tsx
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

const StepOperation: React.FC<Props> = ({ onNext, onPrev }) => {
  const { register, handleSubmit, watch, setValue } = useFormContext<EstimateFormValues>();
  const isRented = watch("operation.isRented");
  const useLoan = watch("operation.useLoan");

  const onValid = () => onNext();

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900 md:text-lg">
        STEP 4. 운영 · 재무
      </h2>

      <QuestionBlock
        botText={
          <>
            <b>운영 인력</b> 정보를 입력해 주세요.
            <br />
            인력 비용은 수익성 분석에 포함됩니다.
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            name="operation.staffCount"
            label="운영 인력 수 (명)"
            description="예: 1~2명"
          >
            <input
              type="number"
              min={0}
              max={10}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("operation.staffCount", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            name="operation.monthlySalaryPerStaff"
            label="인당 월 급여 (만원)"
            description="예: 300만원"
          >
            <input
              type="number"
              min={100}
              max={600}
              step="10"
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("operation.monthlySalaryPerStaff", { valueAsNumber: true })}
            />
          </FormField>
        </div>
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            공간을 <b>임대</b>하시나요?
            <br />
            임대료가 있으시면 입력해 주세요.
          </>
        }
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...register("operation.isRented")}
            />
            <span className="text-sm">임대 공간 사용</span>
          </label>

          {isRented && (
            <FormField
              name="operation.monthlyRent"
              label="월 임대료 (만원)"
              description="예: 50만원"
            >
              <input
                type="number"
                min={0}
                max={2000}
                step="10"
                className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                {...register("operation.monthlyRent", { valueAsNumber: true })}
              />
            </FormField>
          )}
        </div>
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            <b>대출</b>을 사용하시나요?
            <br />
            대출 정보를 입력하시면 이자 비용까지 계산해 드립니다.
          </>
        }
      >
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              {...register("operation.useLoan")}
            />
            <span className="text-sm">대출 사용</span>
          </label>

          {useLoan && (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <FormField
                name="operation.loanAmount"
                label="대출 금액 (만원)"
                description="예: 5000만원"
              >
                <input
                  type="number"
                  min={0}
                  max={100000}
                  step="100"
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  {...register("operation.loanAmount", { valueAsNumber: true })}
                />
              </FormField>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  name="operation.loanInterestRate"
                  label="연 이자율 (%)"
                  description="예: 5%"
                >
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step="0.1"
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                    {...register("operation.loanInterestRate", { valueAsNumber: true })}
                  />
                </FormField>

                <FormField
                  name="operation.loanTermYears"
                  label="대출 기간 (년)"
                >
                  <select
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                    {...register("operation.loanTermYears", { valueAsNumber: true })}
                  >
                    <option value="">선택하세요</option>
                    <option value="3">3년</option>
                    <option value="5">5년</option>
                    <option value="7">7년</option>
                    <option value="10">10년</option>
                  </select>
                </FormField>
              </div>

              <FormField
                name="operation.gracePeriodYears"
                label="거치 기간 (년)"
                description="이자만 납부하는 기간"
              >
                <select
                  className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                  {...register("operation.gracePeriodYears", { valueAsNumber: true })}
                >
                  <option value="0">거치 기간 없음</option>
                  <option value="1">1년</option>
                </select>
              </FormField>
            </div>
          )}
        </div>
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            <b>목표 매출</b>과 <b>마케팅 예산</b>을 알려 주세요.
            <br />
            수익성 분석에 반영됩니다.
          </>
        }
      >
        <div className="space-y-3">
          <FormField
            name="operation.targetMonthlyRevenue"
            label="목표 월 매출 (만원)"
            description="예: 500만원"
          >
            <input
              type="number"
              min={0}
              max={100000}
              step="10"
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("operation.targetMonthlyRevenue", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            name="operation.marketingBudget"
            label="마케팅 예산 구간"
          >
            <select
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("operation.marketingBudget")}
            >
              <option value="">선택하세요</option>
              <option value="none_0_20">없음 ~ 2천만원</option>
              <option value="small_20_50">2천만원 ~ 5천만원</option>
              <option value="medium_50_100">5천만원 ~ 1억원</option>
              <option value="large_100_plus">1억원 이상</option>
              <option value="unknown">미정</option>
            </select>
          </FormField>
        </div>
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

export default StepOperation;

