// src/components/estimate/ui/FormField.tsx
import React from "react";
import { useFormContext } from "react-hook-form";

interface Props {
  name: string;
  label: string;
  children: React.ReactNode;
  description?: string;
}

const FormField: React.FC<Props> = ({ name, label, children, description }) => {
  const {
    formState: { errors },
  } = useFormContext();

  const segments = name.split(".");
  let error: any = errors;
  for (const seg of segments) {
    error = error?.[seg];
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-500">
          {error.message?.toString() ?? "값을 확인해 주세요."}
        </p>
      )}
    </div>
  );
};

export default FormField;

