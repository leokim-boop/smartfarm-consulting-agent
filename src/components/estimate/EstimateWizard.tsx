// src/components/estimate/EstimateWizard.tsx
"use client";

import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { useEstimateForm } from "@/hooks/useEstimateForm";
import StepIndicator from "./StepIndicator";
import SummarySidebar from "./SummarySidebar";
import StepCustomerInfo from "./steps/StepCustomerInfo";
import StepSpaceAndCrops from "./steps/StepSpaceAndCrops";
import StepSystemConfig from "./steps/StepSystemConfig";
import StepOperation from "./steps/StepOperation";
import StepReview from "./steps/StepReview";
import ChatSection from "./ui/ChatSection";

const EstimateWizard = () => {
  const {
    methods,
    currentStep,
    stepIndex,
    totalSteps,
    nextStep,
    prevStep,
  } = useEstimateForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [estimateId, setEstimateId] = useState<string | null>(null);

  const onSubmit = methods.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/estimates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "견적 저장에 실패했습니다.");
      }

      const result = await response.json();
      setEstimateId(result.estimateId);
      
      // 성공 메시지 표시
      alert(
        `견적이 성공적으로 저장되었습니다!\n견적 ID: ${result.estimateId}\n\n이제 AI 리포트 생성을 진행할 수 있습니다.`
      );
      
      // TODO: 리포트 생성 페이지로 이동하거나 모달 표시
      console.log("Estimate saved:", result);
    } catch (error: any) {
      console.error("Submit error:", error);
      setSubmitError(error.message || "견적 저장 중 오류가 발생했습니다.");
      alert(`오류: ${error.message || "견적 저장 중 오류가 발생했습니다."}`);
    } finally {
      setIsSubmitting(false);
    }
  });

  const renderStep = () => {
    switch (currentStep) {
      case "customer":
        return <StepCustomerInfo onNext={nextStep} />;
      case "space_crops":
        return <StepSpaceAndCrops onNext={nextStep} onPrev={prevStep} />;
      case "system":
        return <StepSystemConfig onNext={nextStep} onPrev={prevStep} />;
      case "operation":
        return <StepOperation onNext={nextStep} onPrev={prevStep} />;
      case "review":
        return (
          <StepReview
            onPrev={prevStep}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <section id="wizard" className="mt-4">
        <StepIndicator stepIndex={stepIndex} totalSteps={totalSteps} />

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <div className="space-y-4">
            <ChatSection currentStep={currentStep} />

            <form
              onSubmit={
                currentStep === "review"
                  ? onSubmit
                  : (e) => {
                      e.preventDefault();
                    }
              }
              className="rounded-2xl bg-white p-4 shadow-md md:p-6"
            >
              {renderStep()}
            </form>
          </div>

          <div className="md:sticky md:top-20">
            <SummarySidebar />
          </div>
        </div>
      </section>
    </FormProvider>
  );
};

export default EstimateWizard;

