// src/components/estimate/ui/ChatSection.tsx
import React from "react";
import type { StepId } from "@/hooks/useEstimateForm";
import ChatBubble from "./ChatBubble";

interface Props {
  currentStep: StepId;
}

const ChatSection: React.FC<Props> = ({ currentStep }) => {
  const renderMessage = () => {
    switch (currentStep) {
      case "customer":
        return (
          <ChatBubble sender="bot">
            안녕하세요, 팜비트 스마트팜 자동견적 도우미 <b>팜봇</b>입니다 😊
            <br />
            먼저, 견적 결과를 보내드릴 <b>기본 정보</b>를 간단히 여쭤볼게요.
          </ChatBubble>
        );

      case "space_crops":
        return (
          <ChatBubble sender="bot">
            이제 재배하실 <b>실내 공간 크기</b>와 <b>재배 작물</b>을 알려 주세요.
            <br />
            정확하지 않아도 괜찮아요. 대략 값을 기준으로 계산해 드립니다.
          </ChatBubble>
        );

      case "system":
        return (
          <ChatBubble sender="bot">
            좋아요! 그 공간에 어떤 <b>시스템 구성</b>을 넣을지 정해 보겠습니다.
            <br />
            팜비트에서는 <b>스마트가든 4단</b>과 <b>무빙랙 4단</b>을 기본으로
            추천드리고 있어요 🌱
          </ChatBubble>
        );

      case "operation":
        return (
          <ChatBubble sender="bot">
            마지막으로, <b>운영 인력‧임대료‧대출 여부</b> 등 재무 정보를 알려
            주시면,
            <br />
            AI가 <b>수익성·투자 회수기간</b>까지 분석해 드립니다.
          </ChatBubble>
        );

      case "review":
        return (
          <ChatBubble sender="bot">
            입력해 주신 내용을 정리해 보았어요.
            <br />
            아래 요약을 확인하시고, 괜찮으시면{" "}
            <b>AI 비즈니스 리포트 생성</b>을 진행해 주세요.
          </ChatBubble>
        );
    }
  };

  return <div className="space-y-2">{renderMessage()}</div>;
};

export default ChatSection;

