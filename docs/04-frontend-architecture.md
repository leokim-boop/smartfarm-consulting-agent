# 프론트엔드 아키텍처 설계 문서

## 1. 페이지 구조

### 1.1 `/estimate` 페이지 엔트리 구성

**파일 위치**: `app/estimate/page.tsx`

**역할**: 견적 입력 플로우의 최상위 엔트리 포인트

**구조**:
```typescript
// app/estimate/page.tsx
import { EstimateLayout } from '@/components/estimate/EstimateLayout';
import { EstimateWizard } from '@/components/estimate/EstimateWizard';

export default function EstimatePage() {
  return (
    <EstimateLayout>
      <EstimateWizard />
    </EstimateLayout>
  );
}
```

**설명**:
- `EstimateLayout`: 전체 레이아웃 구조 (헤더, 푸터, 반응형 그리드 컨테이너)
- `EstimateWizard`: 실제 견적 입력 위저드 로직 및 UI

### 1.2 EstimateLayout + EstimateWizard 조합

#### EstimateLayout
**책임**:
- 반응형 그리드 레이아웃 제공 (PC: 좌우 분할, 모바일: 세로 스택)
- 공통 헤더/푸터 포함
- 최대 너비 제한 및 중앙 정렬

**구조**:
```typescript
// components/estimate/EstimateLayout.tsx
export function EstimateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header>{/* 헤더 */}</header>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <footer>{/* 푸터 */}</footer>
    </div>
  );
}
```

#### EstimateWizard
**책임**:
- 다단계 폼 상태 관리 (`useEstimateForm` 훅 사용)
- 현재 Step 렌더링 및 네비게이션 제어
- StepIndicator, SummarySidebar와의 통합

**구조**:
```typescript
// components/estimate/EstimateWizard.tsx
export function EstimateWizard() {
  const form = useEstimateForm();
  const { currentStep, goToStep, nextStep, prevStep } = form;
  
  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      {/* 좌측: 챗봇 + 폼 */}
      <div className="space-y-6">
        <StepIndicator currentStep={currentStep} />
        <ChatSection step={currentStep} />
        {renderStep(currentStep, form)}
      </div>
      
      {/* 우측: 요약 사이드바 */}
      <SummarySidebar formData={form.watch()} />
    </div>
  );
}
```

---

## 2. 폼/상태 관리 구조

### 2.1 useEstimateForm 훅

**위치**: `hooks/useEstimateForm.ts`

**역할**: React Hook Form + Zod Resolver + Multi-step 상태 관리 통합

**핵심 기능**:
- React Hook Form 인스턴스 생성 및 관리
- Zod 스키마 기반 검증
- Step 네비게이션 로직 (next/prev/goToStep)
- 현재 Step 상태 추적
- 폼 데이터 초기화 및 리셋

**타입 정의**:
```typescript
// types/estimate.ts
export type StepId = 
  | 'customer-info'      // STEP 1
  | 'space-and-crops'    // STEP 2
  | 'system-config'      // STEP 3
  | 'operation'          // STEP 4
  | 'review';            // STEP 5 (요약 확인)

export const STEP_ORDER: StepId[] = [
  'customer-info',
  'space-and-crops',
  'system-config',
  'operation',
  'review'
];

export interface EstimateFormData {
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  spaceAndCrops: {
    spaceSize: number;
    spaceSizeUnit: 'sqm' | 'pyeong';
    purpose: 'education' | 'medical' | 'startup' | 'enterprise';
    budgetRange: string;
  };
  systemConfig: {
    systemType: 'smartgarden' | 'movingrack' | 'fixed';
    systemTiers?: number;
    quantity: number;
    options: string[];
  };
  operation: {
    operationPeriod: string;
    targetProduction: {
      amount: number;
      unit: string;
    };
    salesChannel: string;
  };
}
```

**구현 예시**:
```typescript
// hooks/useEstimateForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { estimateFormSchema, type EstimateFormData } from '@/lib/schemas/estimate';
import { STEP_ORDER, type StepId } from '@/types/estimate';

export function useEstimateForm() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep: StepId = STEP_ORDER[currentStepIndex];
  
  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateFormSchema),
    mode: 'onChange', // 실시간 검증
    defaultValues: {
      customerInfo: {
        name: '',
        email: '',
        phone: '',
      },
      spaceAndCrops: {
        spaceSize: 0,
        spaceSizeUnit: 'sqm',
        purpose: 'education',
        budgetRange: '',
      },
      // ... 기타 기본값
    },
  });
  
  const nextStep = async () => {
    // 현재 Step의 필드만 검증
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid && currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const goToStep = (stepId: StepId) => {
    const targetIndex = STEP_ORDER.indexOf(stepId);
    if (targetIndex !== -1) {
      setCurrentStepIndex(targetIndex);
    }
  };
  
  return {
    ...form,
    currentStep,
    currentStepIndex,
    totalSteps: STEP_ORDER.length,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === STEP_ORDER.length - 1,
  };
}
```

### 2.2 StepId, STEP_ORDER, 네비게이션 구조

#### StepId 타입
- 각 Step을 고유하게 식별하는 문자열 리터럴 타입
- TypeScript 타입 안정성 보장

#### STEP_ORDER 배열
- Step 진행 순서를 정의하는 배열
- `currentStepIndex`로 현재 위치 추적
- Step 추가/순서 변경 시 이 배열만 수정하면 됨

#### 네비게이션 메서드
- **nextStep()**: 다음 Step으로 이동 (검증 후)
- **prevStep()**: 이전 Step으로 이동 (검증 없음)
- **goToStep(stepId)**: 특정 Step으로 직접 이동 (요약 페이지에서 수정 시 사용)

**Step별 필드 매핑**:
```typescript
// lib/utils/step-fields.ts
export function getFieldsForStep(stepId: StepId): (keyof EstimateFormData)[] {
  const fieldMap: Record<StepId, (keyof EstimateFormData)[]> = {
    'customer-info': ['customerInfo'],
    'space-and-crops': ['spaceAndCrops'],
    'system-config': ['systemConfig'],
    'operation': ['operation'],
    'review': [], // review는 검증 불필요
  };
  
  return fieldMap[stepId] || [];
}
```

---

## 3. 컴포넌트 계층 구조

### 3.1 컴포넌트 트리 다이어그램

```
EstimatePage (app/estimate/page.tsx)
└── EstimateLayout
    └── EstimateWizard
        ├── StepIndicator
        ├── ChatSection
        │   └── ChatBubble (여러 개)
        ├── Step Components (조건부 렌더링)
        │   ├── StepCustomerInfo
        │   │   └── QuestionBlock (여러 개)
        │   │       ├── ChatBubble
        │   │       └── FormField
        │   ├── StepSpaceAndCrops
        │   ├── StepSystemConfig
        │   ├── StepOperation
        │   └── StepReview
        │       └── ConfirmModal
        └── SummarySidebar
            └── Card (여러 개)
```

### 3.2 EstimateWizard

**위치**: `components/estimate/EstimateWizard.tsx`

**책임**:
- `useEstimateForm` 훅으로 폼 상태 관리
- 현재 Step에 맞는 Step 컴포넌트 렌더링
- StepIndicator, ChatSection, SummarySidebar 통합

**구현**:
```typescript
// components/estimate/EstimateWizard.tsx
'use client';

import { useEstimateForm } from '@/hooks/useEstimateForm';
import { StepIndicator } from './StepIndicator';
import { ChatSection } from './ui/ChatSection';
import { SummarySidebar } from './SummarySidebar';
import { StepCustomerInfo } from './steps/StepCustomerInfo';
import { StepSpaceAndCrops } from './steps/StepSpaceAndCrops';
import { StepSystemConfig } from './steps/StepSystemConfig';
import { StepOperation } from './steps/StepOperation';
import { StepReview } from './steps/StepReview';

export function EstimateWizard() {
  const form = useEstimateForm();
  const { currentStep } = form;
  
  const renderStep = () => {
    switch (currentStep) {
      case 'customer-info':
        return <StepCustomerInfo form={form} />;
      case 'space-and-crops':
        return <StepSpaceAndCrops form={form} />;
      case 'system-config':
        return <StepSystemConfig form={form} />;
      case 'operation':
        return <StepOperation form={form} />;
      case 'review':
        return <StepReview form={form} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6">
      {/* 좌측: 챗봇 + 폼 */}
      <div className="space-y-6">
        <StepIndicator 
          currentStep={currentStep}
          totalSteps={form.totalSteps}
        />
        <ChatSection step={currentStep} />
        {renderStep()}
      </div>
      
      {/* 우측: 요약 사이드바 */}
      <SummarySidebar formData={form.watch()} />
    </div>
  );
}
```

### 3.3 StepIndicator

**위치**: `components/estimate/StepIndicator.tsx`

**책임**: 현재 진행 단계를 시각적으로 표시

**Props**:
```typescript
interface StepIndicatorProps {
  currentStep: StepId;
  totalSteps: number;
}
```

**구현 예시**:
```typescript
// components/estimate/StepIndicator.tsx
export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const progress = ((currentIndex + 1) / totalSteps) * 100;
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentIndex + 1} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">{progress.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

### 3.4 SummarySidebar

**위치**: `components/estimate/SummarySidebar.tsx`

**책임**: 우측 사이드바에 입력된 데이터 요약 표시 (실시간 업데이트)

**Props**:
```typescript
interface SummarySidebarProps {
  formData: EstimateFormData;
}
```

**구현 예시**:
```typescript
// components/estimate/SummarySidebar.tsx
'use client';

import { Card } from './ui/Card';
import { EstimateFormData } from '@/types/estimate';

export function SummarySidebar({ formData }: SummarySidebarProps) {
  return (
    <aside className="lg:sticky lg:top-6 h-fit space-y-4">
      <Card title="입력 요약">
        <div className="space-y-4">
          {formData.customerInfo.name && (
            <div>
              <span className="text-sm text-gray-500">이름</span>
              <p className="font-medium">{formData.customerInfo.name}</p>
            </div>
          )}
          {formData.spaceAndCrops.spaceSize > 0 && (
            <div>
              <span className="text-sm text-gray-500">공간 크기</span>
              <p className="font-medium">
                {formData.spaceAndCrops.spaceSize} {formData.spaceAndCrops.spaceSizeUnit === 'sqm' ? '㎡' : '평'}
              </p>
            </div>
          )}
          {/* 기타 필드 표시 */}
        </div>
      </Card>
    </aside>
  );
}
```

### 3.5 UI 컴포넌트 (components/estimate/ui/)

#### ChatSection
**위치**: `components/estimate/ui/ChatSection.tsx`

**책임**: 각 Step의 상단에 표시되는 챗봇 설명/멘트 영역

**Props**:
```typescript
interface ChatSectionProps {
  step: StepId;
}
```

**구현**:
```typescript
// components/estimate/ui/ChatSection.tsx
import { ChatBubble } from './ChatBubble';

const STEP_MESSAGES: Record<StepId, string[]> = {
  'customer-info': [
    '안녕하세요! 스마트팜 견적을 도와드리겠습니다.',
    '먼저 기본 정보를 입력해주세요.'
  ],
  'space-and-crops': [
    '공간 크기와 용도를 알려주시면 적합한 시스템을 추천해드릴게요.'
  ],
  // ... 기타 Step 메시지
};

export function ChatSection({ step }: ChatSectionProps) {
  const messages = STEP_MESSAGES[step] || [];
  
  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <ChatBubble key={index} type="bot" text={message} />
      ))}
    </div>
  );
}
```

#### ChatBubble
**위치**: `components/estimate/ui/ChatBubble.tsx`

**책임**: 챗봇 메시지 버블 UI

**Props**:
```typescript
interface ChatBubbleProps {
  type: 'bot' | 'user';
  text: string;
}
```

**구현**:
```typescript
// components/estimate/ui/ChatBubble.tsx
export function ChatBubble({ type, text }: ChatBubbleProps) {
  return (
    <div className={`flex ${type === 'bot' ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          type === 'bot'
            ? 'bg-blue-50 text-gray-800'
            : 'bg-blue-600 text-white'
        }`}
      >
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}
```

#### QuestionBlock
**위치**: `components/estimate/ui/QuestionBlock.tsx`

**책임**: 챗봇 질문 + 폼 필드를 하나의 블록으로 묶는 컴포넌트

**구조**: ChatBubble(botText) + FormField 카드

**Props**:
```typescript
interface QuestionBlockProps {
  question: string;
  children: React.ReactNode; // FormField 컴포넌트
  required?: boolean;
}
```

**구현**:
```typescript
// components/estimate/ui/QuestionBlock.tsx
import { ChatBubble } from './ChatBubble';
import { Card } from './Card';

export function QuestionBlock({ 
  question, 
  children, 
  required = false 
}: QuestionBlockProps) {
  return (
    <div className="space-y-3">
      <ChatBubble type="bot" text={question} />
      <Card>
        {required && (
          <span className="text-xs text-red-500 mb-2 block">* 필수 항목</span>
        )}
        {children}
      </Card>
    </div>
  );
}
```

#### FormField
**위치**: `components/estimate/ui/FormField.tsx`

**책임**: React Hook Form과 통합된 폼 필드 래퍼

**Props**:
```typescript
interface FormFieldProps {
  name: string; // React Hook Form 필드 이름
  label?: string;
  error?: string;
  children: React.ReactNode; // 실제 input 요소
}
```

**구현**:
```typescript
// components/estimate/ui/FormField.tsx
import { useFormContext } from 'react-hook-form';

export function FormField({ name, label, children }: FormFieldProps) {
  const { formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string;
  
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
```

#### ConfirmModal
**위치**: `components/estimate/ui/ConfirmModal.tsx`

**책임**: 최종 제출 전 확인 모달

**사용 위치**: StepReview 컴포넌트

**구현**:
```typescript
// components/estimate/ui/ConfirmModal.tsx
'use client';

import { useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={onConfirm}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
```

#### Button
**위치**: `components/estimate/ui/Button.tsx`

**책임**: 재사용 가능한 버튼 컴포넌트

**Props**:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}
```

#### Card
**위치**: `components/estimate/ui/Card.tsx`

**책임**: 카드 컨테이너 컴포넌트

**Props**:
```typescript
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}
```

### 3.6 Step 컴포넌트 (components/estimate/steps/)

#### StepCustomerInfo
**위치**: `components/estimate/steps/StepCustomerInfo.tsx`

**책임**: STEP 1 - 고객 기본 정보 입력

**구조**: 여러 QuestionBlock을 세로로 배치

**구현 예시**:
```typescript
// components/estimate/steps/StepCustomerInfo.tsx
'use client';

import { UseFormReturn } from 'react-hook-form';
import { QuestionBlock } from '../ui/QuestionBlock';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { EstimateFormData } from '@/types/estimate';

interface StepCustomerInfoProps {
  form: UseFormReturn<EstimateFormData>;
}

export function StepCustomerInfo({ form }: StepCustomerInfoProps) {
  const { register, formState: { errors }, handleSubmit } = form;
  const { nextStep } = form as any; // useEstimateForm에서 확장된 메서드
  
  return (
    <form onSubmit={handleSubmit(nextStep)} className="space-y-6">
      <QuestionBlock 
        question="성함을 알려주세요."
        required
      >
        <FormField name="customerInfo.name" error={errors.customerInfo?.name?.message}>
          <Input
            {...register('customerInfo.name', { required: '이름을 입력해주세요.' })}
            placeholder="홍길동"
          />
        </FormField>
      </QuestionBlock>
      
      <QuestionBlock 
        question="이메일 주소를 입력해주세요."
        required
      >
        <FormField name="customerInfo.email" error={errors.customerInfo?.email?.message}>
          <Input
            type="email"
            {...register('customerInfo.email', { 
              required: '이메일을 입력해주세요.',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: '올바른 이메일 형식이 아닙니다.'
              }
            })}
            placeholder="example@email.com"
          />
        </FormField>
      </QuestionBlock>
      
      <QuestionBlock 
        question="연락처를 입력해주세요."
        required
      >
        <FormField name="customerInfo.phone" error={errors.customerInfo?.phone?.message}>
          <Input
            {...register('customerInfo.phone', { required: '연락처를 입력해주세요.' })}
            placeholder="010-1234-5678"
          />
        </FormField>
      </QuestionBlock>
      
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" variant="primary">
          다음 단계
        </Button>
      </div>
    </form>
  );
}
```

#### StepSpaceAndCrops
**위치**: `components/estimate/steps/StepSpaceAndCrops.tsx`

**책임**: STEP 2 - 공간 크기 및 용도 선택

**주요 필드**:
- 공간 크기 (숫자 입력 + 단위 선택)
- 용도 선택 (라디오 버튼)
- 예산 범위 (드롭다운)

#### StepSystemConfig
**위치**: `components/estimate/steps/StepSystemConfig.tsx`

**책임**: STEP 3 - 시스템 타입 및 상세 설정

**주요 필드**:
- 시스템 타입 (라디오 버튼: 스마트가든/무빙랙/고정식)
- 고정식 선택 시 단수 입력 (5단 이상 경고)
- 수량 입력
- 추가 옵션 (체크박스)

**특수 로직**: 고정식 5단 이상 선택 시 경고 모달 표시

#### StepOperation
**위치**: `components/estimate/steps/StepOperation.tsx`

**책임**: STEP 4 - 운영 정보 입력

**주요 필드**:
- 운영 기간 선택
- 목표 생산량 (숫자 + 단위)
- 판매 채널 선택

#### StepReview
**위치**: `components/estimate/steps/StepReview.tsx`

**책임**: STEP 5 - 입력 정보 요약 및 최종 확인

**기능**:
- 모든 입력 데이터를 카드 형태로 표시
- 각 섹션별 수정 버튼 (해당 Step으로 이동)
- 최종 제출 버튼 (ConfirmModal 표시 후 API 호출)

**구현 예시**:
```typescript
// components/estimate/steps/StepReview.tsx
'use client';

import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { EstimateFormData } from '@/types/estimate';

interface StepReviewProps {
  form: UseFormReturn<EstimateFormData> & {
    goToStep: (stepId: StepId) => void;
  };
}

export function StepReview({ form }: StepReviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formData = form.watch();
  
  const handleSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setIsModalOpen(true);
    }
  };
  
  const handleConfirm = async () => {
    setIsModalOpen(false);
    // API 호출
    const response = await fetch('/api/estimates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    if (response.ok) {
      const { data } = await response.json();
      // 견적 결과 페이지로 이동
      window.location.href = `/estimate/result/${data.id}`;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card title="고객 정보">
        {/* 입력 데이터 표시 */}
        <Button onClick={() => form.goToStep('customer-info')}>
          수정
        </Button>
      </Card>
      
      {/* 기타 섹션 카드 */}
      
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => form.goToStep('operation')}>
          이전
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          견적 제출
        </Button>
      </div>
      
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        title="견적을 제출하시겠습니까?"
        message="제출 후 수정이 어려울 수 있습니다."
      />
    </div>
  );
}
```

### 3.7 데이터 흐름

**폼 데이터 흐름**:
```
useEstimateForm (상태 관리)
  ↓
EstimateWizard (현재 Step 결정)
  ↓
Step 컴포넌트 (폼 필드 렌더링)
  ↓
React Hook Form (필드 값 관리)
  ↓
SummarySidebar (실시간 요약 표시)
```

**네비게이션 흐름**:
```
Step 컴포넌트의 "다음" 버튼 클릭
  ↓
handleSubmit(nextStep) 호출
  ↓
Zod 검증 (현재 Step 필드만)
  ↓
검증 성공 시 nextStep() 실행
  ↓
currentStepIndex 증가
  ↓
EstimateWizard가 새로운 Step 컴포넌트 렌더링
```

---

## 4. 반응형 레이아웃 설계

### 4.1 브레이크포인트 전략

**Tailwind 기본 브레이크포인트 사용**:
- `sm`: 640px 이상 (작은 태블릿)
- `md`: 768px 이상 (태블릿)
- `lg`: 1024px 이상 (데스크톱)
- `xl`: 1280px 이상 (큰 데스크톱)

### 4.2 PC 레이아웃 (lg 이상)

**구조**: 좌우 분할 그리드
- 좌측: 챗봇 + 폼 (flexible width)
- 우측: 요약 사이드바 (고정 400px)

**구현**:
```typescript
<div className="grid lg:grid-cols-[1fr_400px] gap-6">
  {/* 좌측 */}
  <div className="space-y-6">
    <StepIndicator />
    <ChatSection />
    {/* Step 컴포넌트 */}
  </div>
  
  {/* 우측 */}
  <aside className="lg:sticky lg:top-6 h-fit">
    <SummarySidebar />
  </aside>
</div>
```

**특징**:
- `lg:sticky lg:top-6`: 스크롤 시 사이드바 고정
- `h-fit`: 콘텐츠 높이에 맞춤

### 4.3 태블릿 레이아웃 (md ~ lg)

**구조**: 세로 스택, 사이드바는 하단에 배치

**구현**:
```typescript
<div className="flex flex-col md:flex-col lg:grid lg:grid-cols-[1fr_400px] gap-6">
  {/* 메인 콘텐츠 */}
  <div className="order-1 lg:order-1">
    {/* 챗봇 + 폼 */}
  </div>
  
  {/* 사이드바 */}
  <aside className="order-2 lg:order-2 md:sticky md:bottom-0 md:bg-white md:p-4 md:shadow-lg">
    <SummarySidebar />
  </aside>
</div>
```

### 4.4 모바일 레이아웃 (sm 미만)

**구조**: 완전한 세로 스택

**구현**:
```typescript
<div className="flex flex-col space-y-4">
  <StepIndicator />
  <ChatSection />
  {/* Step 컴포넌트 */}
  <SummarySidebar /> {/* 하단에 배치 */}
</div>
```

**모바일 최적화**:
- 패딩 축소: `px-4` → `px-2`
- 폰트 크기 조정: `text-lg` → `text-base`
- 버튼 전체 너비: `w-full`
- 카드 간격 축소: `space-y-6` → `space-y-4`

### 4.5 컴포넌트별 반응형 클래스

#### StepIndicator
```typescript
<div className="bg-white rounded-lg p-3 md:p-4 shadow-sm">
  {/* 모바일: 작은 패딩, 데스크톱: 큰 패딩 */}
</div>
```

#### ChatBubble
```typescript
<div className={`max-w-[90%] md:max-w-[80%] rounded-lg px-3 py-2 md:px-4 md:py-2`}>
  {/* 모바일: 더 넓은 너비 */}
</div>
```

#### QuestionBlock
```typescript
<div className="space-y-2 md:space-y-3">
  {/* 모바일: 간격 축소 */}
</div>
```

#### Button
```typescript
<Button className="w-full md:w-auto">
  {/* 모바일: 전체 너비, 데스크톱: 자동 너비 */}
</Button>
```

---

## 5. 폼과 챗봇 UX의 결합 방식

### 5.1 설계 원칙

**ChatSection의 역할**:
- 각 Step 상단에 표시되는 설명/멘트만 담당
- 실제 입력과는 분리된 정보 제공 영역
- Step 전환 시 자동으로 메시지 변경

**QuestionBlock의 역할**:
- 챗봇 질문(ChatBubble) + 폼 필드(Card)를 하나의 블록으로 묶음
- 사용자가 "질문 → 답변" 흐름을 자연스럽게 인지하도록 설계
- 각 질문 블록은 독립적으로 스크롤 가능

### 5.2 QuestionBlock 구조

**시각적 구조**:
```
┌─────────────────────────┐
│  ChatBubble (bot)       │  ← 질문
│  "성함을 알려주세요."    │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│  Card                   │  ← 답변 입력 영역
│  ┌───────────────────┐ │
│  │ FormField         │ │
│  │ [Input 필드]      │ │
│  └───────────────────┘ │
└─────────────────────────┘
```

**코드 구조**:
```typescript
<QuestionBlock question="성함을 알려주세요." required>
  <FormField name="customerInfo.name">
    <Input {...register('customerInfo.name')} />
  </FormField>
</QuestionBlock>
```

### 5.3 Step에서 QuestionBlock 사용 패턴

**StepCustomerInfo 예시**:
```typescript
export function StepCustomerInfo({ form }: StepCustomerInfoProps) {
  return (
    <form className="space-y-6">
      {/* 질문 블록 1 */}
      <QuestionBlock question="성함을 알려주세요." required>
        <FormField name="customerInfo.name">
          <Input {...register('customerInfo.name')} />
        </FormField>
      </QuestionBlock>
      
      {/* 질문 블록 2 */}
      <QuestionBlock question="이메일 주소를 입력해주세요." required>
        <FormField name="customerInfo.email">
          <Input type="email" {...register('customerInfo.email')} />
        </FormField>
      </QuestionBlock>
      
      {/* 질문 블록 3 */}
      <QuestionBlock question="연락처를 입력해주세요." required>
        <FormField name="customerInfo.phone">
          <Input {...register('customerInfo.phone')} />
        </FormField>
      </QuestionBlock>
      
      {/* 네비게이션 버튼 */}
      <div className="flex justify-end">
        <Button type="submit">다음 단계</Button>
      </div>
    </form>
  );
}
```

**설명**:
- 각 Step에서 여러 QuestionBlock을 세로로 배치
- `space-y-6`로 적절한 간격 유지
- 질문 순서대로 자연스러운 흐름 생성

### 5.4 ChatSection과 QuestionBlock의 관계

**ChatSection**:
- Step 전체에 대한 맥락 제공
- 예: "안녕하세요! 기본 정보를 입력해주세요."

**QuestionBlock**:
- 개별 질문에 대한 구체적인 입력 요청
- 예: "성함을 알려주세요."

**결합 효과**:
- 사용자가 전체 맥락을 이해한 후 구체적인 입력 진행
- 챗봇과 대화하는 것 같은 자연스러운 UX

---

## 6. 향후 컴포넌트 확장 전략

### 6.1 Step 추가/변경 시 수정 포인트

#### 새로운 Step 추가

**1. 타입 정의 수정** (`types/estimate.ts`):
```typescript
export type StepId = 
  | 'customer-info'
  | 'space-and-crops'
  | 'system-config'
  | 'operation'
  | 'new-step'  // ← 추가
  | 'review';

export const STEP_ORDER: StepId[] = [
  'customer-info',
  'space-and-crops',
  'system-config',
  'operation',
  'new-step',  // ← 추가
  'review'
];
```

**2. Zod 스키마 수정** (`lib/schemas/estimate.ts`):
```typescript
export const estimateFormSchema = z.object({
  customerInfo: z.object({ /* ... */ }),
  // ... 기존 필드
  newStepData: z.object({  // ← 추가
    // 새 Step의 필드 정의
  }),
});
```

**3. Step 필드 매핑 수정** (`lib/utils/step-fields.ts`):
```typescript
export function getFieldsForStep(stepId: StepId) {
  const fieldMap: Record<StepId, (keyof EstimateFormData)[]> = {
    // ... 기존 매핑
    'new-step': ['newStepData'],  // ← 추가
  };
  return fieldMap[stepId] || [];
}
```

**4. Step 컴포넌트 생성** (`components/estimate/steps/StepNewStep.tsx`):
```typescript
export function StepNewStep({ form }: StepNewStepProps) {
  // 새 Step 컴포넌트 구현
}
```

**5. ChatSection 메시지 추가** (`components/estimate/ui/ChatSection.tsx`):
```typescript
const STEP_MESSAGES: Record<StepId, string[]> = {
  // ... 기존 메시지
  'new-step': [
    '새로운 Step에 대한 설명입니다.'
  ],
};
```

**6. EstimateWizard에 Step 추가** (`components/estimate/EstimateWizard.tsx`):
```typescript
const renderStep = () => {
  switch (currentStep) {
    // ... 기존 case
    case 'new-step':
      return <StepNewStep form={form} />;  // ← 추가
    // ...
  }
};
```

#### Step 순서 변경

**수정 포인트**: `STEP_ORDER` 배열만 수정
```typescript
export const STEP_ORDER: StepId[] = [
  'customer-info',
  'new-step',      // ← 순서 변경
  'space-and-crops',
  // ...
];
```

### 6.2 재사용 가능한 컴포넌트 분리

#### 공통 UI 컴포넌트
**위치**: `components/ui/` (프로젝트 전역)

**재사용 가능한 컴포넌트**:
- `Button`: 모든 페이지에서 사용
- `Card`: 다양한 컨텍스트에서 사용
- `Input`, `Select`, `Radio`, `Checkbox`: 폼 전반에서 사용
- `Modal`: 확인 모달, 알림 모달 등

**구조**:
```
components/
├── ui/              # 전역 공통 컴포넌트
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── ...
└── estimate/        # 견적 페이지 전용 컴포넌트
    ├── ui/          # 견적 페이지 내 공통 컴포넌트
    │   ├── ChatBubble.tsx
    │   ├── QuestionBlock.tsx
    │   └── ...
    └── steps/       # Step 컴포넌트
```

#### 비즈니스 로직 분리

**훅 분리** (`hooks/`):
- `useEstimateForm`: 견적 폼 전용
- `useMultiStepForm`: 범용 다단계 폼 훅 (향후 다른 폼에서도 사용 가능)

**유틸리티 분리** (`lib/utils/`):
- `step-fields.ts`: Step 필드 매핑 로직
- `form-validation.ts`: 폼 검증 유틸리티
- `estimate-calculator.ts`: 견적 계산 로직 (재사용 가능)

### 6.3 관리자용/다른 견적 타입용 재사용

#### 관리자용 견적 수정 페이지

**재사용 가능한 부분**:
- `EstimateWizard`: Step 구조 재사용
- `Step 컴포넌트`: 필드 입력 UI 재사용
- `useEstimateForm`: 폼 상태 관리 로직 재사용

**수정 필요 부분**:
- `EstimateWizard`: 초기값을 API에서 가져오도록 수정
- `Step 컴포넌트`: 수정 모드일 때 다른 동작 (예: "저장" 버튼)
- API 호출: `POST /api/estimates` → `PUT /api/estimates/{id}`

**구현 예시**:
```typescript
// app/admin/estimates/[id]/edit/page.tsx
export default function AdminEstimateEditPage({ params }: { params: { id: string } }) {
  const estimate = await fetchEstimate(params.id);
  
  return (
    <EstimateLayout>
      <EstimateWizard 
        mode="edit"
        initialData={estimate}
        onSubmit={async (data) => {
          await fetch(`/api/admin/estimates/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
        }}
      />
    </EstimateLayout>
  );
}
```

#### 다른 견적 타입용 재사용

**예시**: 농기계 견적, 시설 견적 등

**재사용 전략**:
1. **제네릭 타입 사용**:
```typescript
// types/form.ts
export interface BaseFormData {
  customerInfo: CustomerInfo;
}

export interface EstimateFormData extends BaseFormData {
  // 견적 특화 필드
}

export interface MachineryFormData extends BaseFormData {
  // 농기계 견적 특화 필드
}
```

2. **제네릭 훅 생성**:
```typescript
// hooks/useMultiStepForm.ts
export function useMultiStepForm<T extends BaseFormData>(
  schema: ZodSchema<T>,
  steps: StepId[]
) {
  // 범용 다단계 폼 로직
}
```

3. **컴포넌트 Props 제네릭화**:
```typescript
// components/estimate/EstimateWizard.tsx
interface EstimateWizardProps<T extends BaseFormData> {
  formSchema: ZodSchema<T>;
  steps: StepComponent<T>[];
  // ...
}
```

### 6.4 확장성 고려사항

#### 컴포넌트 분리 원칙
- **단일 책임 원칙**: 각 컴포넌트는 하나의 명확한 책임만 가짐
- **Props 인터페이스 명확화**: TypeScript로 타입 안정성 보장
- **의존성 최소화**: 컴포넌트 간 결합도 낮추기

#### 상태 관리 확장
- **현재**: React Hook Form으로 로컬 상태 관리
- **향후**: Zustand 또는 Jotai로 전역 상태 관리 추가 가능
- **조건부**: 복잡한 상태가 필요할 때만 전역 상태 도입

#### 성능 최적화
- **코드 스플리팅**: Step 컴포넌트 동적 import
- **메모이제이션**: React.memo, useMemo 활용
- **가상화**: 긴 리스트가 있을 때 react-window 활용

---

## 7. 파일 구조 참고

```
app/
└── estimate/
    ├── page.tsx                    # 엔트리 포인트
    ├── result/
    │   └── [id]/
    │       └── page.tsx            # 견적 결과 페이지
    └── layout.tsx                  # 견적 페이지 레이아웃 (선택)

components/
├── estimate/
│   ├── EstimateLayout.tsx          # 레이아웃 래퍼
│   ├── EstimateWizard.tsx          # 위저드 메인 컴포넌트
│   ├── StepIndicator.tsx           # 진행 단계 표시
│   ├── SummarySidebar.tsx          # 요약 사이드바
│   ├── ui/                         # 견적 페이지 UI 컴포넌트
│   │   ├── ChatSection.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── QuestionBlock.tsx
│   │   ├── FormField.tsx
│   │   ├── ConfirmModal.tsx
│   │   ├── Button.tsx
│   │   └── Card.tsx
│   └── steps/                      # Step 컴포넌트
│       ├── StepCustomerInfo.tsx
│       ├── StepSpaceAndCrops.tsx
│       ├── StepSystemConfig.tsx
│       ├── StepOperation.tsx
│       └── StepReview.tsx
└── ui/                             # 전역 공통 컴포넌트
    ├── Button.tsx
    ├── Card.tsx
    ├── Input.tsx
    ├── Select.tsx
    └── ...

hooks/
└── useEstimateForm.ts              # 견적 폼 훅

lib/
├── schemas/
│   └── estimate.ts                 # Zod 스키마
├── utils/
│   ├── step-fields.ts              # Step 필드 매핑
│   └── form-validation.ts          # 폼 검증 유틸리티
└── business/
    └── estimate-calculator.ts      # 견적 계산 로직

types/
└── estimate.ts                     # 타입 정의
```

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024년  
**작성자**: 개발팀

