// src/app/estimate/page.tsx
"use client";

import EstimateLayout from "@/components/estimate/EstimateLayout";
import EstimateWizard from "@/components/estimate/EstimateWizard";

export default function EstimatePage() {
  return (
    <EstimateLayout>
      <EstimateWizard />
    </EstimateLayout>
  );
}

