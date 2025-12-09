// src/components/estimate/steps/StepReview.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import type { EstimateFormValues } from "@/lib/estimateSchema";

interface Props {
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  school: "학교 / 교육기관",
  hospital: "병원 / 요양병원",
  welfare: "복지시설",
  startup: "창업 / 스마트팜 창업",
  cafe_restaurant: "카페 / 레스토랑",
  lab: "기업 연구실",
  other: "기타",
};

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  smart_garden_4tier: "스마트가든 4단",
  moving_rack_4tier: "무빙랙 4단",
  fixed_rack_custom: "고정랙 커스텀",
};

const HYDROPONIC_TYPE_LABELS: Record<string, string> = {
  ebb_flow: "Ebb & Flow (관수형)",
  aeroponic: "Aeroponic (공기분무형)",
};

const CROP_LABELS: Record<string, string> = {
  europe_lettuce: "유럽상추",
  herb: "허브류",
  microgreen: "마이크로그린",
  strawberry: "딸기",
  wasabi: "와사비",
  ornamental: "관엽 / 스마트가든",
  other: "기타",
};

const MARKETING_BUDGET_LABELS: Record<string, string> = {
  none_0_20: "없음 ~ 2천만원",
  small_20_50: "2천만원 ~ 5천만원",
  medium_50_100: "5천만원 ~ 1억원",
  large_100_plus: "1억원 이상",
  unknown: "미정",
};

const StepReview: React.FC<Props> = ({ onPrev, onSubmit, isSubmitting = false, submitError = null }) => {
  const { watch } = useFormContext<EstimateFormValues>();
  const values = watch();

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900 md:text-lg">
        STEP 5. 요약 확인
      </h2>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">고객 정보</h3>
          <div className="space-y-1 text-sm text-slate-700">
            <div>
              <span className="font-medium">고객 유형:</span>{" "}
              {values.customer?.customerType
                ? CUSTOMER_TYPE_LABELS[values.customer.customerType] || values.customer.customerType
                : "미입력"}
              {values.customer?.customerTypeOther && ` (${values.customer.customerTypeOther})`}
            </div>
            <div>
              <span className="font-medium">이름:</span> {values.customer?.name || "미입력"}
            </div>
            <div>
              <span className="font-medium">이메일:</span> {values.customer?.email || "미입력"}
            </div>
            <div>
              <span className="font-medium">연락처:</span> {values.customer?.phone || "미입력"}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">공간 정보</h3>
          <div className="space-y-1 text-sm text-slate-700">
            <div>
              <span className="font-medium">크기:</span> {values.space?.widthM}m × {values.space?.lengthM}m × {values.space?.heightM}m
            </div>
            <div>
              <span className="font-medium">면적:</span>{" "}
              {values.space?.widthM && values.space?.lengthM
                ? (values.space.widthM * values.space.lengthM).toFixed(1)
                : "-"}{" "}
              ㎡
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">재배 작물</h3>
          <div className="text-sm text-slate-700">
            {values.crops?.selectedCrops && values.crops.selectedCrops.length > 0
              ? values.crops.selectedCrops
                  .map((crop) => CROP_LABELS[crop] || crop)
                  .join(", ")
              : "선택 없음"}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">시스템 구성</h3>
          <div className="space-y-1 text-sm text-slate-700">
            <div>
              <span className="font-medium">시스템 타입:</span>{" "}
              {values.system?.systemType
                ? SYSTEM_TYPE_LABELS[values.system.systemType] || values.system.systemType
                : "미입력"}
              {values.system?.fixedRackTiers && ` (${values.system.fixedRackTiers}단)`}
            </div>
            <div>
              <span className="font-medium">수경재배 방식:</span>{" "}
              {values.system?.hydroponicType
                ? HYDROPONIC_TYPE_LABELS[values.system.hydroponicType] || values.system.hydroponicType
                : "미입력"}
            </div>
            <div>
              <span className="font-medium">환경 제어 시스템:</span>{" "}
              {values.system?.envControlIncluded ? "포함" : "미포함"}
            </div>
          </div>
        </div>

        {(values.operation?.staffCount ||
          values.operation?.isRented ||
          values.operation?.useLoan ||
          values.operation?.targetMonthlyRevenue) && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">운영 · 재무</h3>
            <div className="space-y-1 text-sm text-slate-700">
              {values.operation?.staffCount && (
                <div>
                  <span className="font-medium">운영 인력:</span> {values.operation.staffCount}명
                  {values.operation.monthlySalaryPerStaff &&
                    ` (인당 ${values.operation.monthlySalaryPerStaff}만원/월)`}
                </div>
              )}
              {values.operation?.isRented && values.operation.monthlyRent && (
                <div>
                  <span className="font-medium">월 임대료:</span> {values.operation.monthlyRent}만원
                </div>
              )}
              {values.operation?.useLoan && values.operation.loanAmount && (
                <div>
                  <span className="font-medium">대출:</span> {values.operation.loanAmount}만원
                  {values.operation.loanInterestRate && ` (연 ${values.operation.loanInterestRate}%)`}
                  {values.operation.loanTermYears && ` · ${values.operation.loanTermYears}년`}
                </div>
              )}
              {values.operation?.targetMonthlyRevenue && (
                <div>
                  <span className="font-medium">목표 월 매출:</span> {values.operation.targetMonthlyRevenue}만원
                </div>
              )}
              {values.operation?.marketingBudget && (
                <div>
                  <span className="font-medium">마케팅 예산:</span>{" "}
                  {MARKETING_BUDGET_LABELS[values.operation.marketingBudget] || values.operation.marketingBudget}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          이전
        </button>
        <button
          type="submit"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "저장 중..." : "AI 리포트 생성하기"}
        </button>
      </div>
    </div>
  );
};

export default StepReview;

