// src/components/estimate/ui/QuestionBlock.tsx
import React from "react";
import ChatBubble from "./ChatBubble";

interface QuestionBlockProps {
  botText: React.ReactNode;
  children: React.ReactNode;
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({ botText, children }) => {
  return (
    <div className="space-y-2">
      <ChatBubble sender="bot">{botText}</ChatBubble>
      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
        {children}
      </div>
    </div>
  );
};

export default QuestionBlock;

