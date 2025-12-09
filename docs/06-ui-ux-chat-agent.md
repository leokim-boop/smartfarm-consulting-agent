# UI/UX 챗봇 에이전트 설계 문서

## 1. 에이전트 컨셉 & 말투 가이드

### 1.1 기본 컨셉

**"챗봇처럼 느껴지지만 실제로는 정형 폼을 입력받는" UX 패턴**

- 사용자는 자연스러운 대화를 나누는 것처럼 느끼지만
- 실제로는 구조화된 데이터를 수집하여 정확한 견적을 제공
- 단계별로 정보를 수집하여 사용자의 인지 부담 최소화

### 1.2 말투 가이드라인

#### 기본 톤
- **존댓말 사용**: "~해주세요", "~입니다", "~하시면 됩니다"
- **친절하지만 과하지 않음**: 지나치게 격식적이지 않고, 친근하지만 전문적
- **명확하고 간결함**: 불필요한 수사 제거, 핵심만 전달

#### 금지 표현
- ❌ "꼭", "반드시", "필수로" 등 강압적인 표현
- ❌ "잘못 입력하시면", "오류가 발생합니다" 등 부정적 표현
- ❌ "~해야 합니다", "~하지 않으면 안 됩니다" 등 명령형 표현

#### 권장 표현
- ✅ "~해주시면 됩니다", "~입력해주세요"
- ✅ "정확하지 않아도 괜찮습니다", "대략적인 수치로도 가능합니다"
- ✅ "~하시면 더 정확한 견적을 제공해드릴 수 있습니다"

### 1.3 정보 수집 원칙

#### 원칙 1: "왜 이 정보를 묻는지" 간단히 설명
**예시**:
- ❌ "공간 크기를 입력해주세요."
- ✅ "공간 크기를 알려주시면 적합한 시스템 규모를 추천해드릴 수 있습니다."

#### 원칙 2: "정확하지 않아도 괜찮다"는 메시지 반복
**예시**:
- "대략적인 수치로도 괜찮습니다."
- "정확하지 않아도 됩니다. 나중에 수정 가능합니다."
- "예상치로 입력해주셔도 됩니다."

#### 원칙 3: 단계별 진행 상황 안내
**예시**:
- "이제 마지막 단계입니다!"
- "거의 다 왔습니다. 몇 가지만 더 알려주세요."
- "기본 정보 입력이 완료되었습니다. 다음으로 공간 정보를 알려주세요."

### 1.4 에이전트 페르소나

**이름**: 팜비트 (FarmBit)

**성격**:
- 전문적이지만 친근한 스마트팜 컨설턴트
- 사용자의 상황을 이해하고 최적의 솔루션을 제안
- 복잡한 정보를 쉽게 설명하는 능력

**말투 특징**:
- 비전문가도 이해할 수 있는 쉬운 용어 사용
- 필요시 간단한 설명 제공
- 사용자의 선택을 존중하며 권장사항 제시

---

## 2. 기본 패턴: QuestionBlock

### 2.1 QuestionBlock 구조

**컴포넌트 조합**: `ChatBubble(bot)` + `FormField(사용자 입력)`

**시각적 구조**:
```
┌─────────────────────────┐
│  ChatBubble (bot)       │  ← 봇 멘트
│  "성함을 알려주세요."    │
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│  Card                   │  ← 입력 영역
│  ┌───────────────────┐ │
│  │ FormField         │ │
│  │ [Input 필드]      │ │
│  └───────────────────┘ │
└─────────────────────────┘
```

### 2.2 QuestionBlock 컴포넌트 예시

```typescript
// components/estimate/ui/QuestionBlock.tsx
import { ChatBubble } from './ChatBubble';
import { Card } from './Card';
import { FormField } from './FormField';

interface QuestionBlockProps {
  question: string;           // 봇 멘트
  explanation?: string;        // 선택적 설명 (작은 글씨)
  required?: boolean;          // 필수 여부
  children: React.ReactNode;   // FormField 컴포넌트
}

export function QuestionBlock({ 
  question, 
  explanation, 
  required = false,
  children 
}: QuestionBlockProps) {
  return (
    <div className="space-y-3">
      {/* 봇 멘트 */}
      <ChatBubble type="bot" text={question} />
      
      {/* 선택적 설명 */}
      {explanation && (
        <div className="ml-4 text-xs text-gray-500 italic">
          {explanation}
        </div>
      )}
      
      {/* 입력 영역 */}
      <Card className="p-4">
        {required && (
          <span className="text-xs text-red-500 mb-2 block">
            * 필수 항목
          </span>
        )}
        {children}
      </Card>
    </div>
  );
}
```

### 2.3 사용 예시

```typescript
// StepCustomerInfo 컴포넌트 내부
<QuestionBlock 
  question="성함을 알려주세요."
  explanation="나중에 견적서에 표기됩니다."
  required
>
  <FormField name="customer.name">
    <Input
      {...register('customer.name')}
      placeholder="홍길동"
    />
  </FormField>
</QuestionBlock>
```

### 2.4 QuestionBlock 변형 패턴

#### 패턴 1: 설명이 긴 경우
```typescript
<QuestionBlock 
  question="공간 크기를 알려주세요."
  explanation="정확하지 않아도 괜찮습니다. 대략적인 수치로 입력해주시면 됩니다."
>
  {/* 입력 필드 */}
</QuestionBlock>
```

#### 패턴 2: 선택사항인 경우
```typescript
<QuestionBlock 
  question="회사 또는 기관명을 알려주세요. (선택사항)"
>
  {/* 입력 필드 */}
</QuestionBlock>
```

#### 패턴 3: 여러 옵션이 있는 경우
```typescript
<QuestionBlock 
  question="어떤 용도로 사용하실 계획인가요?"
  explanation="용도에 따라 적합한 시스템을 추천해드립니다."
>
  <RadioGroup>
    <Radio value="education">교육용 (학교, 대학)</Radio>
    <Radio value="medical">의료용 (병원)</Radio>
    <Radio value="startup">창업용</Radio>
    <Radio value="enterprise">기업용</Radio>
  </RadioGroup>
</QuestionBlock>
```

---

## 3. STEP 1~4 대표 대사 스크립트

### 3.1 STEP 1: 기본 정보

#### 인트로 멘트 (ChatSection)
```typescript
const STEP1_INTRO = [
  "안녕하세요! 팜비트입니다. 😊",
  "스마트팜 견적을 도와드리기 위해 몇 가지 정보를 알려주시면 됩니다.",
  "정확하지 않아도 괜찮으니 편하게 답변해주세요."
];
```

#### 질문 1: 고객 유형
```typescript
<QuestionBlock
  question="먼저 어떤 용도로 사용하실 계획인가요?"
  explanation="용도에 따라 적합한 시스템과 예산 범위를 추천해드립니다."
  required
>
  <RadioGroup {...register('customer.customerType')}>
    <Radio value="education">교육용 (학교, 대학 실습)</Radio>
    <Radio value="medical">의료용 (병원 내 재배)</Radio>
    <Radio value="startup">창업용 (스마트팜 사업 시작)</Radio>
    <Radio value="enterprise">기업용 (사내 시설)</Radio>
  </RadioGroup>
</QuestionBlock>
```

**봇 멘트**: "먼저 어떤 용도로 사용하실 계획인가요?"

**설명**: 용도에 따라 적합한 시스템과 예산 범위를 추천해드립니다.

#### 질문 2: 이름
```typescript
<QuestionBlock
  question="성함을 알려주세요."
  explanation="나중에 견적서에 표기됩니다."
  required
>
  <FormField name="customer.name">
    <Input
      {...register('customer.name')}
      placeholder="홍길동"
    />
  </FormField>
</QuestionBlock>
```

**봇 멘트**: "성함을 알려주세요."

**설명**: 나중에 견적서에 표기됩니다.

#### 질문 3: 이메일
```typescript
<QuestionBlock
  question="이메일 주소를 알려주세요."
  explanation="견적서와 상세 정보를 이메일로 보내드립니다."
  required
>
  <FormField name="customer.email">
    <Input
      type="email"
      {...register('customer.email')}
      placeholder="example@email.com"
    />
  </FormField>
</QuestionBlock>
```

**봇 멘트**: "이메일 주소를 알려주세요."

**설명**: 견적서와 상세 정보를 이메일로 보내드립니다.

#### 질문 4: 연락처
```typescript
<QuestionBlock
  question="연락처를 알려주세요."
  explanation="필요시 전화로 상담을 도와드릴 수 있습니다."
  required
>
  <FormField name="customer.phone">
    <Input
      {...register('customer.phone')}
      placeholder="010-1234-5678"
    />
  </FormField>
</QuestionBlock>
```

**봇 멘트**: "연락처를 알려주세요."

**설명**: 필요시 전화로 상담을 도와드릴 수 있습니다.

#### 질문 5: 회사/기관명 (선택사항)
```typescript
<QuestionBlock
  question="회사 또는 기관명을 알려주세요. (선택사항)"
>
  <FormField name="customer.company">
    <Input
      {...register('customer.company')}
      placeholder="OO대학교"
    />
  </FormField>
</QuestionBlock>
```

**봇 멘트**: "회사 또는 기관명을 알려주세요. (선택사항)"

---

### 3.2 STEP 2: 공간 정보 & 작물 선택

#### 인트로 멘트 (ChatSection)
```typescript
const STEP2_INTRO = [
  "좋습니다! 이제 설치할 공간에 대해 알려주세요.",
  "정확한 수치가 아니어도 괜찮습니다. 대략적인 크기만 알려주시면 됩니다."
];
```

#### 질문 1: 공간 크기 (가로/세로/높이)
```typescript
<QuestionBlock
  question="설치할 공간의 크기를 알려주세요."
  explanation="가로, 세로, 높이를 입력해주시면 적합한 시스템을 추천해드립니다. 정확하지 않아도 괜찮습니다."
  required
>
  <div className="grid grid-cols-3 gap-4">
    <FormField name="space.width" label="가로 (m)">
      <Input
        type="number"
        step="0.1"
        {...register('space.width', { valueAsNumber: true })}
        placeholder="5.0"
      />
    </FormField>
    <FormField name="space.length" label="세로 (m)">
      <Input
        type="number"
        step="0.1"
        {...register('space.length', { valueAsNumber: true })}
        placeholder="4.0"
      />
    </FormField>
    <FormField name="space.height" label="높이 (m)">
      <Input
        type="number"
        step="0.1"
        {...register('space.height', { valueAsNumber: true })}
        placeholder="3.0"
      />
    </FormField>
  </div>
  <div className="mt-2 text-xs text-gray-500">
    💡 공간 크기를 모르시나요? 대략적인 수치로 입력해주셔도 됩니다.
  </div>
</QuestionBlock>
```

**봇 멘트**: "설치할 공간의 크기를 알려주세요."

**설명**: 가로, 세로, 높이를 입력해주시면 적합한 시스템을 추천해드립니다. 정확하지 않아도 괜찮습니다.

#### 질문 2: 예산 범위
```typescript
<QuestionBlock
  question="예상 예산 범위를 알려주세요."
  explanation="예산 범위에 맞는 시스템 구성을 제안해드립니다."
  required
>
  <Select {...register('space.budgetRange')}>
    <option value="">선택해주세요</option>
    <option value="~500">500만원 이하</option>
    <option value="500-1000">500만원 ~ 1,000만원</option>
    <option value="1000-3000">1,000만원 ~ 3,000만원</option>
    <option value="3000+">3,000만원 이상</option>
  </Select>
  <div className="mt-2 text-xs text-gray-500">
    💡 예산이 정해지지 않으셨다면 대략적인 범위만 선택해주세요.
  </div>
</QuestionBlock>
```

**봇 멘트**: "예상 예산 범위를 알려주세요."

**설명**: 예산 범위에 맞는 시스템 구성을 제안해드립니다.

#### 질문 3: 작물 선택
```typescript
<QuestionBlock
  question="어떤 작물을 재배하실 계획인가요?"
  explanation="여러 작물을 선택하실 수 있습니다. 주로 재배하실 작물을 선택해주세요."
  required
>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {CROP_OPTIONS.map((crop) => (
      <label key={crop.value} className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          {...register('crops.selectedCrops')}
          value={crop.value}
        />
        <span>{crop.label}</span>
      </label>
    ))}
  </div>
  <div className="mt-2 text-xs text-gray-500">
    💡 여러 작물을 선택하셔도 됩니다. 나중에 변경 가능합니다.
  </div>
</QuestionBlock>
```

**봇 멘트**: "어떤 작물을 재배하실 계획인가요?"

**설명**: 여려 작물을 선택하실 수 있습니다. 주로 재배하실 작물을 선택해주세요.

#### 질문 4: 주 재배 작물
```typescript
<QuestionBlock
  question="주로 재배하실 작물을 선택해주세요."
  explanation="주 재배 작물을 기준으로 시스템을 구성합니다."
  required
>
  <RadioGroup {...register('crops.primaryCrop')}>
    {selectedCrops.map((crop) => (
      <Radio key={crop} value={crop}>
        {CROP_LABELS[crop]}
      </Radio>
    ))}
  </RadioGroup>
</QuestionBlock>
```

**봇 멘트**: "주로 재배하실 작물을 선택해주세요."

**설명**: 주 재배 작물을 기준으로 시스템을 구성합니다.

---

### 3.3 STEP 3: 시스템 구성

#### 인트로 멘트 (ChatSection)
```typescript
const STEP3_INTRO = [
  "이제 시스템 구성을 선택해주세요.",
  "스마트가든과 무빙랙을 기본으로 추천드리며, 고정식도 선택 가능합니다."
];
```

#### 질문 1: 시스템 타입
```typescript
<QuestionBlock
  question="어떤 시스템을 원하시나요?"
  explanation="스마트가든과 무빙랙은 공간 활용도가 높아 권장드립니다."
  required
>
  <div className="space-y-3">
    <label className="flex items-start space-x-3 p-4 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50">
      <input
        type="radio"
        {...register('system.systemType')}
        value="smartgarden"
        className="mt-1"
      />
      <div>
        <div className="font-medium">스마트가든 (권장) ⭐</div>
        <div className="text-sm text-gray-600">
          공간 활용도가 높고 관리가 편리합니다.
        </div>
      </div>
    </label>
    
    <label className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
      <input
        type="radio"
        {...register('system.systemType')}
        value="movingrack"
        className="mt-1"
      />
      <div>
        <div className="font-medium">무빙랙 (권장) ⭐</div>
        <div className="text-sm text-gray-600">
          이동식 랙으로 공간을 효율적으로 활용할 수 있습니다.
        </div>
      </div>
    </label>
    
    <label className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
      <input
        type="radio"
        {...register('system.systemType')}
        value="fixed"
        className="mt-1"
      />
      <div>
        <div className="font-medium">고정식</div>
        <div className="text-sm text-gray-600">
          전통적인 고정형 랙 시스템입니다.
        </div>
      </div>
    </label>
  </div>
</QuestionBlock>
```

**봇 멘트**: "어떤 시스템을 원하시나요?"

**설명**: 스마트가든과 무빙랙은 공간 활용도가 높아 권장드립니다.

#### 질문 2: 고정식 단수 (조건부)
```typescript
{systemType === 'fixed' && (
  <QuestionBlock
    question="고정식 시스템의 단수를 선택해주세요."
    explanation="4단 이하를 권장드립니다. 5단 이상은 설치 및 관리가 복잡할 수 있습니다."
    required
  >
    <Select {...register('system.fixedRackTiers')}>
      <option value="">선택해주세요</option>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((tier) => (
        <option key={tier} value={tier}>
          {tier}단 {tier >= 5 && '⚠️'}
        </option>
      ))}
    </Select>
    {fixedRackTiers >= 5 && (
      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-sm text-yellow-800">
          ⚠️ 5단 이상은 설치 및 관리가 복잡할 수 있습니다. 스마트가든 또는 무빙랙을 권장드립니다.
        </div>
      </div>
    )}
  </QuestionBlock>
)}
```

**봇 멘트**: "고정식 시스템의 단수를 선택해주세요."

**설명**: 4단 이하를 권장드립니다. 5단 이상은 설치 및 관리가 복잡할 수 있습니다.

#### 질문 3: 수경재배 방식
```typescript
<QuestionBlock
  question="수경재배 방식을 선택해주세요."
  explanation="수경재배 방식을 선택하지 않으시면 토경재배로 진행됩니다."
  required
>
  <RadioGroup {...register('system.hydroponicType')}>
    <Radio value="nft">NFT (영양막 수경재배)</Radio>
    <Radio value="dwc">DWC (심수식 수경재배)</Radio>
    <Radio value="ebb">Ebb & Flow (침수 배수식)</Radio>
    <Radio value="none">토경재배</Radio>
  </RadioGroup>
  <div className="mt-2 text-xs text-gray-500">
    💡 수경재배 방식이 무엇인지 모르시나요? 토경재배를 선택하셔도 됩니다.
  </div>
</QuestionBlock>
```

**봇 멘트**: "수경재배 방식을 선택해주세요."

**설명**: 수경재배 방식을 선택하지 않으시면 토경재배로 진행됩니다.

#### 질문 4: 환경 제어 시스템 포함 여부
```typescript
<QuestionBlock
  question="환경 제어 시스템을 포함하시겠습니까?"
  explanation="온도, 습도, CO2 등을 자동으로 제어하는 시스템입니다. 포함하시면 더 정확한 견적을 제공해드립니다."
  required
>
  <div className="flex items-center space-x-4">
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        {...register('system.envControlIncluded')}
        value="true"
      />
      <span>포함</span>
    </label>
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        {...register('system.envControlIncluded')}
        value="false"
      />
      <span>미포함</span>
    </label>
  </div>
</QuestionBlock>
```

**봇 멘트**: "환경 제어 시스템을 포함하시겠습니까?"

**설명**: 온도, 습도, CO2 등을 자동으로 제어하는 시스템입니다. 포함하시면 더 정확한 견적을 제공해드립니다.

#### 질문 5: HVAC 시스템 (조건부)
```typescript
{envControlIncluded && (
  <QuestionBlock
    question="HVAC 시스템 사양을 알려주세요."
    explanation="냉난방 용량과 타입을 선택해주시면 정확한 견적을 제공해드립니다."
    required
  >
    <div className="space-y-4">
      <FormField name="system.hvac.capacity" label="냉난방 용량 (kcal/h)">
        <Input
          type="number"
          {...register('system.hvac.capacity', { valueAsNumber: true })}
          placeholder="5000"
        />
      </FormField>
      <FormField name="system.hvac.type" label="HVAC 타입">
        <Select {...register('system.hvac.type')}>
          <option value="">선택해주세요</option>
          <option value="split">분리형 (Split)</option>
          <option value="package">패키지형 (Package)</option>
          <option value="vrf">VRF (Variable Refrigerant Flow)</option>
        </Select>
      </FormField>
    </div>
    <div className="mt-2 text-xs text-gray-500">
      💡 정확한 용량을 모르시나요? 공간 크기를 기준으로 추천해드릴 수 있습니다.
    </div>
  </QuestionBlock>
)}
```

**봇 멘트**: "HVAC 시스템 사양을 알려주세요."

**설명**: 냉난방 용량과 타입을 선택해주시면 정확한 견적을 제공해드립니다.

#### 질문 6: 양액 시스템 (조건부)
```typescript
{hydroponicType !== 'none' && (
  <QuestionBlock
    question="양액 시스템을 선택해주세요."
    explanation="양액 공급 방식을 선택해주시면 시스템 구성에 반영됩니다."
    required
  >
    <div className="space-y-4">
      <FormField name="system.nutrientSystem.type" label="양액 시스템 타입">
        <Select {...register('system.nutrientSystem.type')}>
          <option value="">선택해주세요</option>
          <option value="manual">수동형</option>
          <option value="semi-auto">반자동형</option>
          <option value="full-auto">전자동형</option>
        </Select>
      </FormField>
      <FormField name="system.nutrientSystem.tankCapacity" label="탱크 용량 (L)">
        <Input
          type="number"
          {...register('system.nutrientSystem.tankCapacity', { valueAsNumber: true })}
          placeholder="200"
        />
      </FormField>
    </div>
  </QuestionBlock>
)}
```

**봇 멘트**: "양액 시스템을 선택해주세요."

**설명**: 양액 공급 방식을 선택해주시면 시스템 구성에 반영됩니다.

#### 질문 7: 냉각기 포함 여부
```typescript
<QuestionBlock
  question="냉각기를 포함하시겠습니까?"
  explanation="수온 조절이 필요한 경우 냉각기를 추가할 수 있습니다."
>
  <div className="flex items-center space-x-4">
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        {...register('system.chiller.included')}
      />
      <span>냉각기 포함</span>
    </label>
  </div>
</QuestionBlock>
```

**봇 멘트**: "냉각기를 포함하시겠습니까?"

**설명**: 수온 조절이 필요한 경우 냉각기를 추가할 수 있습니다.

---

### 3.4 STEP 4: 운영/재무 정보

#### 인트로 멘트 (ChatSection)
```typescript
const STEP4_INTRO = [
  "마지막 단계입니다! 운영 및 재무 정보를 알려주세요.",
  "이 정보를 바탕으로 사업성 분석 리포트를 제공해드립니다."
];
```

#### 질문 1: 운영 기간
```typescript
<QuestionBlock
  question="운영 기간을 선택해주세요."
  explanation="운영 기간에 따라 투자 회수 기간을 분석해드립니다."
  required
>
  <RadioGroup {...register('operation.operationPeriod')}>
    <Radio value="1year">1년</Radio>
    <Radio value="3years">3년</Radio>
    <Radio value="5years">5년</Radio>
    <Radio value="longterm">장기 운영</Radio>
  </RadioGroup>
</QuestionBlock>
```

**봇 멘트**: "운영 기간을 선택해주세요."

**설명**: 운영 기간에 따라 투자 회수 기간을 분석해드립니다.

#### 질문 2: 목표 매출
```typescript
<QuestionBlock
  question="목표 매출을 알려주세요."
  explanation="월간 또는 연간 목표 매출을 입력해주시면 수익성 분석에 활용됩니다. 예상치로 입력해주셔도 됩니다."
  required
>
  <div className="space-y-4">
    <FormField name="operation.targetRevenue" label="목표 매출 (원)">
      <Input
        type="number"
        {...register('operation.targetRevenue', { valueAsNumber: true })}
        placeholder="5000000"
      />
    </FormField>
    <FormField name="operation.revenueUnit" label="매출 단위">
      <Select {...register('operation.revenueUnit')}>
        <option value="monthly">월간</option>
        <option value="yearly">연간</option>
      </Select>
    </FormField>
  </div>
  <div className="mt-2 text-xs text-gray-500">
    💡 정확한 수치가 아니어도 괜찮습니다. 대략적인 예상치로 입력해주세요.
  </div>
</QuestionBlock>
```

**봇 멘트**: "목표 매출을 알려주세요."

**설명**: 월간 또는 연간 목표 매출을 입력해주시면 수익성 분석에 활용됩니다. 예상치로 입력해주셔도 됩니다.

#### 질문 3: 판매 채널
```typescript
<QuestionBlock
  question="주요 판매 채널을 선택해주세요."
  explanation="판매 채널에 따라 마케팅 비용을 고려한 분석을 제공해드립니다."
  required
>
  <RadioGroup {...register('operation.salesChannel')}>
    <Radio value="self">자체 소비</Radio>
    <Radio value="direct">직판 (농산물 직거래)</Radio>
    <Radio value="distribution">유통 (마트, 백화점 등)</Radio>
    <Radio value="mixed">혼합 (여러 채널)</Radio>
  </RadioGroup>
</QuestionBlock>
```

**봇 멘트**: "주요 판매 채널을 선택해주세요."

**설명**: 판매 채널에 따라 마케팅 비용을 고려한 분석을 제공해드립니다.

#### 질문 4: 대출 사용 여부
```typescript
<QuestionBlock
  question="대출을 사용하실 계획이신가요?"
  explanation="대출을 사용하시는 경우 이자 비용을 고려한 분석을 제공해드립니다."
  required
>
  <div className="flex items-center space-x-4">
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        {...register('operation.useLoan')}
        value="true"
      />
      <span>예, 대출을 사용합니다</span>
    </label>
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        {...register('operation.useLoan')}
        value="false"
      />
      <span>아니요, 자금으로 진행합니다</span>
    </label>
  </div>
</QuestionBlock>
```

**봇 멘트**: "대출을 사용하실 계획이신가요?"

**설명**: 대출을 사용하시는 경우 이자 비용을 고려한 분석을 제공해드립니다.

#### 질문 5: 대출 정보 (조건부)
```typescript
{useLoan && (
  <>
    <QuestionBlock
      question="대출 금액을 알려주세요."
      explanation="대출 금액을 입력해주시면 이자 비용을 계산해드립니다."
      required
    >
      <FormField name="operation.loanAmount">
        <Input
          type="number"
          {...register('operation.loanAmount', { valueAsNumber: true })}
          placeholder="10000000"
        />
      </FormField>
    </QuestionBlock>
    
    <QuestionBlock
      question="대출 이자율을 알려주세요."
      explanation="예상 이자율을 입력해주시면 됩니다. 정확하지 않아도 괜찮습니다."
      required
    >
      <FormField name="operation.loanInterestRate">
        <Input
          type="number"
          step="0.01"
          {...register('operation.loanInterestRate', { valueAsNumber: true })}
          placeholder="3.5"
        />
        <span className="text-sm text-gray-500 ml-2">% (연이율)</span>
      </FormField>
    </QuestionBlock>
    
    <QuestionBlock
      question="대출 기간을 알려주세요."
      explanation="대출 상환 기간을 입력해주시면 월 상환액을 계산해드립니다."
      required
    >
      <FormField name="operation.loanTerm">
        <Input
          type="number"
          {...register('operation.loanTerm', { valueAsNumber: true })}
          placeholder="5"
        />
        <span className="text-sm text-gray-500 ml-2">년</span>
      </FormField>
    </QuestionBlock>
  </>
)}
```

**봇 멘트**: "대출 금액을 알려주세요.", "대출 이자율을 알려주세요.", "대출 기간을 알려주세요."

**설명**: 각각 대출 정보 입력에 대한 설명 제공

---

## 4. 고정식(5단 이상) 선택 시 경고 모달 UX

### 4.1 경고 모달 트리거 조건

**조건**: `system.systemType === 'fixed' && system.fixedRackTiers >= 5`

**트리거 시점**: 사용자가 고정식 5단 이상을 선택한 직후

### 4.2 경고 모달 멘트

```typescript
// components/estimate/ui/FixedRackWarningModal.tsx
interface FixedRackWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onChange: () => void;
  selectedTiers: number;
}

export function FixedRackWarningModal({
  isOpen,
  onClose,
  onContinue,
  onChange,
  selectedTiers,
}: FixedRackWarningModalProps) {
  if (!isOpen) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="mb-4">
          <div className="text-2xl mb-2">⚠️ 확인이 필요합니다</div>
          <div className="text-gray-600">
            고정식 {selectedTiers}단 시스템을 선택하셨습니다.
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-yellow-800 space-y-2">
            <p>
              <strong>고정식 5단 이상 시스템은 다음과 같은 제약이 있을 수 있습니다:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>설치 및 유지보수가 복잡할 수 있습니다</li>
              <li>상단 작물 관리가 어려울 수 있습니다</li>
              <li>공간 활용도가 상대적으로 낮을 수 있습니다</li>
            </ul>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">💡 권장사항</p>
            <p>
              공간 활용도와 관리 편의성을 고려하면, <strong>스마트가든 4단</strong> 또는 
              <strong>무빙랙</strong>을 권장드립니다.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onChange}>
            시스템 변경하기
          </Button>
          <Button variant="primary" onClick={onContinue}>
            그래도 진행하기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

### 4.3 모달 멘트 상세

#### 제목
**텍스트**: "⚠️ 확인이 필요합니다"

#### 본문
**텍스트**: "고정식 {selectedTiers}단 시스템을 선택하셨습니다."

#### 경고 내용
**텍스트**:
```
고정식 5단 이상 시스템은 다음과 같은 제약이 있을 수 있습니다:
• 설치 및 유지보수가 복잡할 수 있습니다
• 상단 작물 관리가 어려울 수 있습니다
• 공간 활용도가 상대적으로 낮을 수 있습니다
```

#### 권장사항
**텍스트**:
```
💡 권장사항
공간 활용도와 관리 편의성을 고려하면, 스마트가든 4단 또는 무빙랙을 권장드립니다.
```

#### 버튼
- **"시스템 변경하기"**: 시스템 선택 단계로 돌아가기
- **"그래도 진행하기"**: 경고를 무시하고 계속 진행

### 4.4 "그래도 진행" 선택 시 처리

#### 데이터 표기
**견적서에 표기**:
```typescript
{
  systemType: 'fixed',
  fixedRackTiers: 5,
  warningAcknowledged: true,  // 경고 확인 여부
  warningAcknowledgedAt: '2024-01-15T10:30:00Z',  // 확인 시각
}
```

#### 분석 리포트에 반영
**리포트에 포함될 내용**:
```typescript
{
  recommendations: [
    "고정식 5단 이상 시스템을 선택하셨습니다. 설치 및 유지보수 비용이 추가로 발생할 수 있습니다.",
    "관리 편의성을 고려하면 스마트가든 또는 무빙랙으로의 전환을 검토해보시기 바랍니다."
  ],
  riskFactors: [
    {
      type: "high_maintenance",
      message: "고정식 5단 이상 시스템은 유지보수 비용이 높을 수 있습니다."
    }
  ]
}
```

#### UI 표시
**요약 사이드바에 표시**:
```typescript
{systemType === 'fixed' && fixedRackTiers >= 5 && (
  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
    ⚠️ 고정식 {fixedRackTiers}단 시스템 선택됨 (경고 확인 완료)
  </div>
)}
```

---

## 5. 에러/검증 메시지 톤 앤 매너

### 5.1 기본 원칙

**원칙**:
- 부정적 표현 지양, 긍정적이고 도움이 되는 메시지
- 사용자가 바로 수정할 수 있도록 구체적인 안내
- 친절하고 이해하기 쉬운 표현

### 5.2 필수값 누락 에러

#### 일반적인 필수값 누락
**❌ 나쁜 예시**:
```
"이 필드는 필수입니다."
"값을 입력해주세요."
"필수 항목을 입력하지 않았습니다."
```

**✅ 좋은 예시**:
```
"성함을 입력해주세요."
"이메일 주소를 입력해주시면 견적서를 보내드릴 수 있습니다."
"공간 크기를 알려주시면 적합한 시스템을 추천해드립니다."
```

#### 구현 예시
```typescript
// Zod 에러 메시지 커스터마이징
export const customerSchema = z.object({
  name: z.string().min(1, "성함을 입력해주세요."),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  phone: z.string().min(1, "연락처를 입력해주세요."),
});
```

### 5.3 형식 에러

#### 이메일 형식 에러
**❌ 나쁜 예시**:
```
"잘못된 이메일 형식입니다."
"이메일 형식 오류"
```

**✅ 좋은 예시**:
```
"올바른 이메일 형식이 아닙니다. example@email.com 형식으로 입력해주세요."
"이메일 주소에 @ 기호가 포함되어야 합니다."
```

#### 전화번호 형식 에러
**❌ 나쁜 예시**:
```
"전화번호 형식이 올바르지 않습니다."
"잘못된 전화번호"
```

**✅ 좋은 예시**:
```
"올바른 전화번호 형식이 아닙니다. 010-1234-5678 형식으로 입력해주세요."
"전화번호는 010, 011 등으로 시작하는 11자리 숫자여야 합니다."
```

#### 숫자 형식 에러
**❌ 나쁜 예시**:
```
"숫자만 입력 가능합니다."
"잘못된 숫자 형식"
```

**✅ 좋은 예시**:
```
"숫자만 입력해주세요."
"공간 크기는 숫자로 입력해주세요. 예: 5.0"
```

### 5.4 범위 에러

#### 최소값 에러
**❌ 나쁜 예시**:
```
"값이 너무 작습니다."
"최소값 미달"
```

**✅ 좋은 예시**:
```
"공간 크기는 최소 1㎡ 이상이어야 합니다."
"시스템 수량은 최소 1개 이상이어야 합니다."
```

#### 최대값 에러
**❌ 나쁜 예시**:
```
"값이 너무 큽니다."
"최대값 초과"
```

**✅ 좋은 예시**:
```
"공간 크기는 최대 10,000㎡까지 입력 가능합니다."
"시스템 수량은 최대 100개까지 입력 가능합니다."
```

### 5.5 조건부 필수 필드 에러

#### 대출 관련 필드
**❌ 나쁜 예시**:
```
"대출 금액을 입력해야 합니다."
"필수 항목 누락"
```

**✅ 좋은 예시**:
```
"대출을 사용하시는 경우 대출 금액을 입력해주세요."
"대출을 선택하셨으니 대출 금액, 이자율, 기간을 모두 입력해주세요."
```

#### 기타 작물명
**❌ 나쁜 예시**:
```
"기타 작물명을 입력하세요."
```

**✅ 좋은 예시**:
```
"'기타' 작물을 선택하셨으니 작물명을 입력해주세요."
"선택하신 작물 중 '기타'가 있으니 작물명을 알려주세요."
```

### 5.6 에러 메시지 컴포넌트

```typescript
// components/estimate/ui/ErrorMessage.tsx
interface ErrorMessageProps {
  message: string;
  field?: string;
}

export function ErrorMessage({ message, field }: ErrorMessageProps) {
  return (
    <div className="mt-1 flex items-start space-x-1">
      <span className="text-red-500 text-sm">⚠️</span>
      <span className="text-sm text-red-600">{message}</span>
    </div>
  );
}
```

### 5.7 인라인 에러 메시지 예시

```typescript
// FormField 컴포넌트 내부
<FormField name="customer.email">
  <Input
    {...register('customer.email')}
    placeholder="example@email.com"
    aria-invalid={!!errors.customer?.email}
  />
  {errors.customer?.email && (
    <ErrorMessage message={errors.customer.email.message as string} />
  )}
</FormField>
```

---

## 6. 향후 멀티 에이전트/다국어 확장 시 고려사항

### 6.1 언어팩/문구 JSON 분리

#### 구조 설계
```typescript
// lib/locales/ko.ts
export const ko = {
  agent: {
    name: "팜비트",
    greeting: "안녕하세요! 팜비트입니다. 😊",
  },
  steps: {
    step1: {
      intro: [
        "안녕하세요! 팜비트입니다. 😊",
        "스마트팜 견적을 도와드리기 위해 몇 가지 정보를 알려주시면 됩니다.",
        "정확하지 않아도 괜찮으니 편하게 답변해주세요."
      ],
      questions: {
        customerType: {
          question: "먼저 어떤 용도로 사용하실 계획인가요?",
          explanation: "용도에 따라 적합한 시스템과 예산 범위를 추천해드립니다.",
          options: {
            education: "교육용 (학교, 대학 실습)",
            medical: "의료용 (병원 내 재배)",
            startup: "창업용 (스마트팜 사업 시작)",
            enterprise: "기업용 (사내 시설)"
          }
        },
        name: {
          question: "성함을 알려주세요.",
          explanation: "나중에 견적서에 표기됩니다.",
          placeholder: "홍길동"
        },
        // ... 기타 질문
      }
    },
    // ... 기타 Step
  },
  errors: {
    required: {
      name: "성함을 입력해주세요.",
      email: "이메일 주소를 입력해주세요.",
      phone: "연락처를 입력해주세요."
    },
    format: {
      email: "올바른 이메일 형식이 아닙니다. example@email.com 형식으로 입력해주세요.",
      phone: "올바른 전화번호 형식이 아닙니다. 010-1234-5678 형식으로 입력해주세요."
    }
  },
  warnings: {
    fixedRackHighTiers: {
      title: "⚠️ 확인이 필요합니다",
      message: "고정식 {tiers}단 시스템을 선택하셨습니다.",
      details: [
        "설치 및 유지보수가 복잡할 수 있습니다",
        "상단 작물 관리가 어려울 수 있습니다",
        "공간 활용도가 상대적으로 낮을 수 있습니다"
      ],
      recommendation: "공간 활용도와 관리 편의성을 고려하면, 스마트가든 4단 또는 무빙랙을 권장드립니다."
    }
  }
};
```

#### 영어 버전 예시
```typescript
// lib/locales/en.ts
export const en = {
  agent: {
    name: "FarmBit",
    greeting: "Hello! I'm FarmBit. 😊",
  },
  steps: {
    step1: {
      intro: [
        "Hello! I'm FarmBit. 😊",
        "I'll help you get a smart farm estimate. I need a few pieces of information from you.",
        "Don't worry if you're not sure about exact numbers. Just give me your best estimate."
      ],
      questions: {
        customerType: {
          question: "What will you be using this for?",
          explanation: "I'll recommend the best system and budget range based on your purpose.",
          options: {
            education: "Education (School, University)",
            medical: "Medical (Hospital)",
            startup: "Startup (Smart Farm Business)",
            enterprise: "Enterprise (Corporate Facility)"
          }
        },
        // ... 기타 질문
      }
    }
  },
  errors: {
    required: {
      name: "Please enter your name.",
      email: "Please enter your email address.",
      phone: "Please enter your phone number."
    }
  }
};
```

### 6.2 다국어 지원 컴포넌트

```typescript
// components/estimate/ui/QuestionBlock.tsx
import { useLocale } from '@/hooks/useLocale';

interface QuestionBlockProps {
  questionKey: string;  // 'steps.step1.questions.name.question'
  explanationKey?: string;
  children: React.ReactNode;
}

export function QuestionBlock({ questionKey, explanationKey, children }: QuestionBlockProps) {
  const { t } = useLocale();
  
  return (
    <div className="space-y-3">
      <ChatBubble type="bot" text={t(questionKey)} />
      {explanationKey && (
        <div className="ml-4 text-xs text-gray-500 italic">
          {t(explanationKey)}
        </div>
      )}
      <Card className="p-4">
        {children}
      </Card>
    </div>
  );
}
```

### 6.3 useLocale 훅

```typescript
// hooks/useLocale.ts
import { useRouter } from 'next/router';
import { ko } from '@/lib/locales/ko';
import { en } from '@/lib/locales/en';

const locales = { ko, en };

export function useLocale() {
  const router = useRouter();
  const locale = (router.locale || 'ko') as 'ko' | 'en';
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: any = locales[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value === 'string' && params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return String(params[paramKey] || '');
      });
    }
    
    return value || key;
  };
  
  return { t, locale };
}
```

### 6.4 멀티 에이전트 확장

#### 에이전트 타입별 말투 차별화
```typescript
// lib/agents/types.ts
export type AgentPersona = 'professional' | 'friendly' | 'casual';

export const agentPersonas: Record<AgentPersona, {
  greeting: string;
  tone: string;
  closing: string;
}> = {
  professional: {
    greeting: "안녕하세요. 팜비트 컨설턴트입니다.",
    tone: "정중하고 전문적인",
    closing: "감사합니다."
  },
  friendly: {
    greeting: "안녕하세요! 팜비트입니다. 😊",
    tone: "친근하고 편안한",
    closing: "도움이 되셨다면 좋겠습니다!"
  },
  casual: {
    greeting: "안녕! 팜비트야.",
    tone: "캐주얼하고 친근한",
    closing: "수고했어!"
  }
};
```

#### 에이전트별 언어팩 구조
```typescript
// lib/locales/ko/agents.ts
export const agents = {
  default: {
    // 기본 에이전트 (현재 사용 중)
  },
  professional: {
    // 전문가형 에이전트
    greeting: "안녕하세요. 팜비트 전문 컨설턴트입니다.",
    questions: {
      customerType: {
        question: "어떤 용도로 사용하실 예정인지 알려주시겠습니까?",
        // 더 격식적인 표현
      }
    }
  },
  friendly: {
    // 친근한 에이전트
    greeting: "안녕하세요! 팜비트예요. 😊",
    questions: {
      customerType: {
        question: "어떤 용도로 사용하실 거예요?",
        // 더 캐주얼한 표현
      }
    }
  }
};
```

### 6.5 확장 시 고려사항

#### 1. 문구 길이 차이
- 언어별로 문구 길이가 다를 수 있음
- UI 레이아웃이 깨지지 않도록 주의
- CSS `min-height` 또는 `max-width` 설정 고려

#### 2. 문화적 차이
- 존댓말/반말 차이 (한국어)
- 직접적/간접적 표현 차이 (영어 vs 한국어)
- 이모지 사용 여부

#### 3. 날짜/숫자 형식
- 날짜 형식: 한국 (YYYY-MM-DD) vs 미국 (MM/DD/YYYY)
- 숫자 형식: 천 단위 구분자 (한국: 쉼표, 유럽: 점)
- 통화 표시: 원화 (₩) vs 달러 ($)

#### 4. RTL (Right-to-Left) 언어 지원
- 아랍어, 히브리어 등
- CSS `direction: rtl` 지원
- 레이아웃 미러링 고려

---

## 7. 대사 스크립트 요약표

### 7.1 STEP별 인트로 멘트

| STEP | 인트로 멘트 |
|------|------------|
| STEP 1 | "안녕하세요! 팜비트입니다. 😊"<br>"스마트팜 견적을 도와드리기 위해 몇 가지 정보를 알려주시면 됩니다."<br>"정확하지 않아도 괜찮으니 편하게 답변해주세요." |
| STEP 2 | "좋습니다! 이제 설치할 공간에 대해 알려주세요."<br>"정확한 수치가 아니어도 괜찮습니다. 대략적인 크기만 알려주시면 됩니다." |
| STEP 3 | "이제 시스템 구성을 선택해주세요."<br>"스마트가든과 무빙랙을 기본으로 추천드리며, 고정식도 선택 가능합니다." |
| STEP 4 | "마지막 단계입니다! 운영 및 재무 정보를 알려주세요."<br>"이 정보를 바탕으로 사업성 분석 리포트를 제공해드립니다." |

### 7.2 자주 사용되는 표현

| 상황 | 표현 |
|------|------|
| 정확하지 않아도 괜찮음 | "정확하지 않아도 괜찮습니다."<br>"대략적인 수치로도 가능합니다."<br>"예상치로 입력해주셔도 됩니다." |
| 나중에 수정 가능 | "나중에 수정 가능합니다."<br>"언제든지 변경하실 수 있습니다." |
| 왜 묻는지 설명 | "~해주시면 적합한 시스템을 추천해드립니다."<br>"~에 따라 견적에 반영됩니다." |
| 선택사항 안내 | "(선택사항)"<br>"입력하지 않으셔도 됩니다." |

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024년  
**작성자**: 개발팀

