// src/components/estimate/steps/StepCustomerInfo.tsx
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import type { EstimateFormValues } from "@/lib/estimateSchema";
import QuestionBlock from "../ui/QuestionBlock";
import FormField from "../ui/FormField";

interface Props {
  onNext: () => void;
}

const StepCustomerInfo: React.FC<Props> = ({ onNext }) => {
  const { register, handleSubmit, watch } = useFormContext<EstimateFormValues>();
  const customerType = watch("customer.customerType");

  const onValid = () => {
    onNext();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900 md:text-lg">
        STEP 1. 기본 정보
      </h2>

      <QuestionBlock
        botText={
          <>
            먼저 고객님이 어떤 곳에서 <b>스마트팜을 계획</b>하고 계신지
            알려주실 수 있을까요?
            <br />
            목적에 따라 <b>추천 시스템과 사업성 분석 기준</b>이 달라집니다.
          </>
        }
      >
        <FormField
          name="customer.customerType"
          label="고객 유형"
          description="가장 가까운 항목을 선택해 주세요."
        >
          <select
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            {...register("customer.customerType")}
          >
            <option value="">선택하세요</option>
            <option value="school">학교 / 교육기관</option>
            <option value="hospital">병원 / 요양병원</option>
            <option value="welfare">복지시설</option>
            <option value="startup">창업 / 스마트팜 창업</option>
            <option value="cafe_restaurant">카페 / 레스토랑</option>
            <option value="lab">기업 연구실</option>
            <option value="other">기타</option>
          </select>
        </FormField>

        {customerType === "other" && (
          <FormField
            name="customer.customerTypeOther"
            label="기타 유형"
            description="예: 공공기관 실증 시설"
          >
            <input
              type="text"
              placeholder="예: 공공기관 실증 시설"
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              {...register("customer.customerTypeOther")}
            />
          </FormField>
        )}
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            감사합니다 😊
            <br />
            견적서와 리포트에 표시될 <b>대표자 또는 담당자 성함</b>을
            알려주세요.
          </>
        }
      >
        <FormField name="customer.name" label="이름">
          <input
            type="text"
            placeholder="예: 홍길동"
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            {...register("customer.name")}
          />
        </FormField>
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            혹시 추가로 궁금하신 점이 있을 때 연락드릴 수 있도록
            <br />
            <b>휴대전화 번호</b>도 남겨주시면 좋습니다.
          </>
        }
      >
        <FormField name="customer.phone" label="연락처">
          <input
            type="tel"
            placeholder="예: 010-1234-5678"
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            {...register("customer.phone")}
          />
        </FormField>
      </QuestionBlock>

      <QuestionBlock
        botText={
          <>
            마지막으로, <b>AI 리포트와 견적서를 보내드릴 이메일</b>을
            입력해 주세요.
          </>
        }
      >
        <FormField name="customer.email" label="이메일">
          <input
            type="email"
            placeholder="예: your@email.com"
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
            {...register("customer.email")}
          />
        </FormField>
      </QuestionBlock>

      <div className="mt-4 flex justify-end">
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

export default StepCustomerInfo;

