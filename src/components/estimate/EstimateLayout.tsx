// src/components/estimate/EstimateLayout.tsx
import React from "react";

interface Props {
  children: React.ReactNode;
}

const EstimateLayout: React.FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="text-sm font-extrabold tracking-[0.2em]">
            FARMBIT
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#intro">소개</a>
            <a href="#wizard">견적</a>
            <a href="#contact">문의</a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
};

export default EstimateLayout;

