// src/hooks/useEstimateForm.ts
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  estimateFormSchema,
  type EstimateFormValues,
} from "@/lib/estimateSchema";

export type StepId =
  | "customer"
  | "space_crops"
  | "system"
  | "operation"
  | "review";

const STEP_ORDER: StepId[] = [
  "customer",
  "space_crops",
  "system",
  "operation",
  "review",
];

const DEFAULT_VALUES: EstimateFormValues = {
  customer: {
    customerType: "startup",
    name: "",
    phone: "",
    email: "",
  },
  space: {
    spaceType: "empty_room",
    widthM: 5,
    lengthM: 4,
    heightM: 2.5,
  },
  crops: {
    selectedCrops: ["europe_lettuce"],
  },
  system: {
    systemType: "smart_garden_4tier",
    hydroponicType: "ebb_flow",
    envControlIncluded: true,
  },
  operation: {},
};

export const useEstimateForm = () => {
  const methods = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const [currentStep, setCurrentStep] = useState<StepId>("customer");
  const stepIndex = STEP_ORDER.indexOf(currentStep);

  const nextStep = () => {
    if (stepIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[stepIndex + 1]);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEP_ORDER[stepIndex - 1]);
    }
  };

  const goToStep = (step: StepId) => setCurrentStep(step);

  return {
    methods,
    currentStep,
    stepIndex,
    totalSteps: STEP_ORDER.length,
    nextStep,
    prevStep,
    goToStep,
  };
};

