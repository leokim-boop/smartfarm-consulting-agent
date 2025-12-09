# API/백엔드 설계 문서

## 1. 백엔드 아키텍처 개요

### 1.1 아키텍처 다이어그램

```
┌─────────────────┐
│  Next.js Client │
│  (React)        │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌──────────────────┐
│ Next.js Route   │  │ Supabase Client  │
│ Handlers        │  │ (Direct Call)    │
│ /app/api/**     │  │                  │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         │                    │
         ▼                    ▼
┌─────────────────────────────────────┐
│         Supabase Backend            │
│  ┌──────────┐  ┌─────────────────┐ │
│  │ Postgres │  │  Edge Functions │ │
│  │   DB     │  │  (LLM 호출)     │ │
│  └──────────┘  └─────────────────┘ │
└─────────────────────────────────────┘
```

### 1.2 레이어별 역할

#### Supabase = 데이터 저장 및 기본 인증
- **PostgreSQL 데이터베이스**: 견적 데이터, 리포트 데이터 저장
- **인증 서비스**: 향후 사용자 로그인/회원가입 (현재는 익명 사용자 지원)
- **Row Level Security (RLS)**: 향후 사용자별 데이터 접근 제어
- **실시간 구독**: 향후 실시간 업데이트 필요 시 활용

#### Next.js Route Handlers (`/app/api/**`) = 비즈니스 로직/API 엔드포인트
- **역할**:
  - 클라이언트 요청 검증 (Zod 스키마)
  - 비즈니스 로직 실행 (견적 계산, 데이터 변환)
  - Supabase 호출 및 에러 처리
  - 외부 API 호출 (LLM 등)
- **장점**:
  - 서버 사이드에서 실행되어 API 키 보호 가능
  - Vercel Serverless Functions로 자동 스케일링
  - TypeScript 타입 안정성

#### Edge Functions (선택사항) = LLM 호출 및 무거운 작업
- **용도**: AI 리포트 생성 등 시간이 오래 걸리는 작업
- **장점**: Edge에서 실행되어 지연 시간 감소
- **대안**: Route Handler에서 직접 LLM 호출도 가능 (초기 구현)

### 1.3 데이터 흐름 예시

**견적 저장 플로우:**
```
Client (폼 제출)
  → Route Handler POST /api/estimates
    → Zod 검증
    → 비즈니스 로직 (견적 계산)
    → Supabase Client (서버 사이드)
      → Postgres INSERT
    → Response 반환
```

**AI 리포트 생성 플로우:**
```
Client (리포트 생성 요청)
  → Route Handler POST /api/estimates/{id}/generate-report
    → Supabase에서 estimate 조회
    → OpenAI API 호출 (또는 Edge Function 호출)
    → 리포트 데이터 생성
    → Supabase에 리포트 저장
    → Response 반환
```

---

## 2. 주요 유스케이스별 API 정리

### 2.1 견적 초안 저장 (폼 중간 저장)

**목적**: 사용자가 폼 입력 중간에 브라우저를 닫거나 이탈해도 데이터 보존

**구현 방식**:
- **옵션 1**: 클라이언트에서 직접 Supabase 호출 (익명 사용자)
- **옵션 2**: Route Handler 경유 (`POST /api/estimates/draft`)

**권장**: 옵션 1 (클라이언트 직접 호출)
- 이유: 중간 저장은 빠른 응답이 중요, 서버 검증 불필요
- Supabase RLS로 익명 사용자도 `draft_estimates` 테이블에 INSERT 허용

**데이터 구조**:
```typescript
{
  step: number; // 현재 진행 단계 (1-4)
  formData: {
    // STEP 1-4의 모든 입력 데이터 (JSON)
  };
  sessionId?: string; // 브라우저 세션 ID (선택)
}
```

### 2.2 최종 견적 제출 → estimates 테이블 insert

**목적**: 사용자가 모든 단계를 완료하고 최종 견적을 제출

**구현 방식**: Route Handler 경유 필수
- 이유: 최종 검증, 견적 금액 계산, 비즈니스 로직 실행 필요

**플로우**:
1. 클라이언트에서 `POST /api/estimates` 호출
2. Route Handler에서 Zod 스키마로 전체 데이터 검증
3. 견적 금액 계산 (비즈니스 로직)
4. Supabase에 `estimates` 테이블에 INSERT
5. 생성된 estimate ID 반환

**데이터 구조**: 아래 엔드포인트 설계 섹션 참조

### 2.3 특정 estimate 상세 조회

**목적**: 견적 결과 페이지에서 상세 정보 표시

**구현 방식**: 
- **옵션 1**: 클라이언트에서 직접 Supabase 호출
- **옵션 2**: Route Handler 경유 (`GET /api/estimates/{id}`)

**권장**: 옵션 2 (Route Handler 경유)
- 이유: 향후 인증 추가 시 권한 체크 용이, 데이터 변환/가공 가능

**응답 데이터**:
- estimate 기본 정보
- 계산된 견적 금액 및 상세 내역
- 연결된 AI 리포트 (있는 경우)

### 2.4 AI 리포트 생성 요청 → LLM 호출 후 ai_reports 테이블에 저장

**목적**: 사용자가 리포트 생성 버튼 클릭 시 AI 리포트 생성

**구현 방식**: Route Handler 경유 필수
- 이유: OpenAI API 키 보호, 긴 처리 시간, 에러 처리 필요

**플로우**:
1. 클라이언트에서 `POST /api/estimates/{id}/generate-report` 호출
2. Route Handler에서 estimate 조회
3. OpenAI API 호출 (또는 Edge Function 호출)
4. 생성된 리포트를 `ai_reports` 테이블에 저장
5. 리포트 ID 및 리포트 데이터 반환

**비동기 처리 고려사항**:
- 리포트 생성은 시간이 오래 걸릴 수 있음 (5-30초)
- 초기 구현: 동기 처리 (클라이언트에서 로딩 표시)
- 향후 개선: 비동기 처리 (Job Queue, Webhook 등)

---

## 3. 엔드포인트 설계

### 3.1 POST /api/estimates

**목적**: 새로운 견적 생성 (최종 제출)

**Request Body**:
```json
{
  "basicInfo": {
    "spaceSize": 50,           // ㎡
    "spaceSizeUnit": "sqm",    // "sqm" | "pyeong"
    "purpose": "education",    // "education" | "medical" | "startup" | "enterprise"
    "budgetRange": "1000-3000" // "~500" | "500-1000" | "1000-3000" | "3000+"
  },
  "systemSelection": {
    "systemType": "smartgarden", // "smartgarden" | "movingrack" | "fixed"
    "systemTiers": 4,            // 고정식인 경우에만 필요
    "selectionReason": "cost"    // 선택사항
  },
  "detailedSettings": {
    "quantity": 2,
    "options": ["led_lighting", "auto_watering"], // 선택사항 배열
    "installationEnv": {
      "powerCapacity": "220V",
      "ceilingHeight": 3.0       // m
    }
  },
  "operationInfo": {
    "operationPeriod": "3years", // "1year" | "3years" | "5years" | "longterm"
    "targetProduction": {
      "amount": 100,
      "unit": "kg_per_month"
    },
    "salesChannel": "direct"     // "self" | "direct" | "distribution"
  },
  "contactInfo": {
    "name": "홍길동",
    "email": "hong@example.com",
    "phone": "010-1234-5678"
  }
}
```

**Response (Success - 201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "estimatedPrice": {
      "total": 2500000,
      "breakdown": {
        "systemCost": 2000000,
        "installationCost": 300000,
        "operationCost": 200000
      },
      "currency": "KRW"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (Error - 400 Bad Request)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력 데이터 검증 실패",
    "details": [
      {
        "field": "basicInfo.spaceSize",
        "message": "공간 크기는 1 이상이어야 합니다."
      }
    ]
  }
}
```

**구현 예시 (Route Handler)**:
```typescript
// app/api/estimates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { estimateSchema } from '@/lib/schemas/estimate';
import { calculateEstimate } from '@/lib/business/estimate-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod 검증
    const validatedData = estimateSchema.parse(body);
    
    // 견적 금액 계산
    const estimatedPrice = calculateEstimate(validatedData);
    
    // Supabase 클라이언트 생성 (서버 사이드)
    const supabase = createClient();
    
    // DB 저장
    const { data, error } = await supabase
      .from('estimates')
      .insert({
        ...validatedData,
        estimated_price: estimatedPrice,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    // 에러 처리 (아래 에러 처리 섹션 참조)
    return handleError(error);
  }
}
```

### 3.2 GET /api/estimates/{id}

**목적**: 특정 견적 상세 조회

**Path Parameters**:
- `id` (string, UUID): 견적 ID

**Response (Success - 200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "basicInfo": { /* ... */ },
    "systemSelection": { /* ... */ },
    "detailedSettings": { /* ... */ },
    "operationInfo": { /* ... */ },
    "contactInfo": { /* ... */ },
    "estimatedPrice": {
      "total": 2500000,
      "breakdown": { /* ... */ }
    },
    "status": "completed",
    "createdAt": "2024-01-15T10:30:00Z",
    "report": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "status": "completed",
      "generatedAt": "2024-01-15T10:35:00Z"
    }
  }
}
```

**Response (Error - 404 Not Found)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "견적을 찾을 수 없습니다."
  }
}
```

**구현 예시**:
```typescript
// app/api/estimates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('estimates')
      .select(`
        *,
        ai_reports (
          id,
          status,
          generated_at
        )
      `)
      .eq('id', params.id)
      .single();
    
    if (error || !data) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '견적을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}
```

### 3.3 POST /api/estimates/{id}/generate-report

**목적**: AI 리포트 생성 요청

**Path Parameters**:
- `id` (string, UUID): 견적 ID

**Request Body** (선택사항):
```json
{
  "options": {
    "scenario": "conservative" // "conservative" | "normal" | "optimistic"
  }
}
```

**Response (Success - 200 OK)**:
```json
{
  "success": true,
  "data": {
    "reportId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "completed",
    "report": {
      "summary": "이 견적은 초기 투자 250만원으로...",
      "roi": {
        "percentage": 15.5,
        "breakEvenMonths": 18
      },
      "operatingCosts": {
        "monthly": 50000,
        "yearly": 600000
      },
      "scenarios": [
        {
          "type": "conservative",
          "monthlyRevenue": 150000,
          "monthlyProfit": 100000
        }
      ],
      "recommendations": [
        "스마트가든 시스템은 초기 투자 대비 높은 효율을 보입니다..."
      ]
    },
    "generatedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Response (Processing - 202 Accepted)**:
```json
{
  "success": true,
  "data": {
    "reportId": "660e8400-e29b-41d4-a716-446655440001",
    "status": "processing",
    "message": "리포트 생성 중입니다. 잠시 후 다시 조회해주세요."
  }
}
```

**구현 예시**:
```typescript
// app/api/estimates/[id]/generate-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAIReport } from '@/lib/business/ai-report-generator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Estimate 조회
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (estimateError || !estimate) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '견적을 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }
    
    // 리포트 생성 중 상태로 저장
    const { data: report, error: reportError } = await supabase
      .from('ai_reports')
      .insert({
        estimate_id: params.id,
        status: 'processing'
      })
      .select()
      .single();
    
    if (reportError) throw reportError;
    
    // AI 리포트 생성 (비동기 처리 고려)
    const reportData = await generateAIReport(estimate);
    
    // 리포트 업데이트
    const { data: updatedReport, error: updateError } = await supabase
      .from('ai_reports')
      .update({
        status: 'completed',
        report_data: reportData,
        generated_at: new Date().toISOString()
      })
      .eq('id', report.id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    return NextResponse.json({
      success: true,
      data: {
        reportId: updatedReport.id,
        status: 'completed',
        report: updatedReport.report_data,
        generatedAt: updatedReport.generated_at
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
```

---

## 4. Supabase 사용 패턴

### 4.1 서버 사이드 Supabase 클라이언트

**패키지**: `@supabase/supabase-js` 또는 `@supabase/auth-helpers-nextjs`

**서버 컴포넌트 / Route Handler에서 사용**:
```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서버 사이드에서는 service role key 사용
    {
      auth: {
        persistSession: false, // 서버 사이드에서는 세션 유지 불필요
      },
    }
  );
}
```

**사용 예시**:
```typescript
// Route Handler에서
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('estimates')
    .insert({ /* ... */ });
}
```

### 4.2 클라이언트 사이드 Supabase 클라이언트

**클라이언트 컴포넌트에서 사용**:
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**사용 예시**:
```typescript
'use client';

import { createClient } from '@/lib/supabase/client';

export function DraftSaveButton() {
  const supabase = createClient();
  
  const handleSave = async () => {
    const { error } = await supabase
      .from('draft_estimates')
      .insert({ formData: currentFormData });
  };
}
```

### 4.3 클라이언트 직접 호출 vs 서버 경유 기준

#### 클라이언트 직접 호출이 적합한 경우
- ✅ **읽기 전용 쿼리**: 단순 데이터 조회 (RLS로 보안 보장)
- ✅ **중간 저장**: 폼 초안 저장 (빠른 응답 필요)
- ✅ **실시간 구독**: 실시간 업데이트 필요 시
- ✅ **익명 사용자 데이터**: 로그인 없이 접근 가능한 공개 데이터

**예시**:
```typescript
// 클라이언트에서 직접 호출
const { data } = await supabase
  .from('estimates')
  .select('*')
  .eq('id', estimateId)
  .single();
```

#### 서버 경유가 적합한 경우
- ✅ **비즈니스 로직 필요**: 견적 계산, 데이터 변환
- ✅ **API 키 보호**: OpenAI 등 외부 API 호출
- ✅ **복잡한 검증**: 서버 사이드 추가 검증 필요
- ✅ **데이터 가공**: 여러 테이블 조인 후 가공
- ✅ **향후 인증**: 사용자 권한 체크 필요 시

**예시**:
```typescript
// Route Handler 경유
const response = await fetch('/api/estimates', {
  method: 'POST',
  body: JSON.stringify(formData)
});
```

### 4.4 RLS (Row Level Security) 정책 예시

**익명 사용자도 견적 생성 가능**:
```sql
-- estimates 테이블 INSERT 정책
CREATE POLICY "Allow anonymous insert"
ON estimates
FOR INSERT
TO anon
WITH CHECK (true);

-- estimates 테이블 SELECT 정책 (본인이 생성한 것만)
CREATE POLICY "Allow select own estimates"
ON estimates
FOR SELECT
TO anon
USING (true); -- 익명 사용자도 모든 견적 조회 가능 (또는 session_id 기반)
```

**향후 인증 도입 시**:
```sql
-- 인증된 사용자는 자신의 견적만 조회
CREATE POLICY "Users can view own estimates"
ON estimates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

---

## 5. 에러 처리 및 로깅 전략

### 5.1 에러 타입 분류

#### 검증 에러 (Zod)
**발생 시점**: Request Body 검증 실패
**HTTP 상태 코드**: 400 Bad Request
**응답 형식**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력 데이터 검증 실패",
    "details": [
      {
        "field": "basicInfo.spaceSize",
        "message": "공간 크기는 1 이상이어야 합니다."
      }
    ]
  }
}
```

**구현**:
```typescript
import { ZodError } from 'zod';

try {
  const validatedData = estimateSchema.parse(body);
} catch (error) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력 데이터 검증 실패',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      },
      { status: 400 }
    );
  }
}
```

#### 데이터베이스 에러 (Supabase)
**발생 시점**: DB 쿼리 실패 (제약 조건 위반, 연결 오류 등)
**HTTP 상태 코드**: 500 Internal Server Error (일반), 400 Bad Request (제약 조건)
**응답 형식**:
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "데이터베이스 오류가 발생했습니다.",
    "details": "duplicate key value violates unique constraint"
  }
}
```

**구현**:
```typescript
const { data, error } = await supabase
  .from('estimates')
  .insert({ /* ... */ });

if (error) {
  // 제약 조건 위반 등 클라이언트 오류
  if (error.code === '23505') { // unique violation
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message: '이미 존재하는 데이터입니다.'
        }
      },
      { status: 400 }
    );
  }
  
  // 기타 DB 오류
  console.error('Database error:', error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: '데이터베이스 오류가 발생했습니다.'
      }
    },
    { status: 500 }
  );
}
```

#### LLM API 에러
**발생 시점**: OpenAI API 호출 실패
**HTTP 상태 코드**: 502 Bad Gateway 또는 500 Internal Server Error
**응답 형식**:
```json
{
  "success": false,
  "error": {
    "code": "LLM_API_ERROR",
    "message": "AI 리포트 생성 중 오류가 발생했습니다.",
    "details": "Rate limit exceeded"
  }
}
```

**구현**:
```typescript
try {
  const report = await generateAIReport(estimate);
} catch (error) {
  if (error instanceof OpenAIError) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LLM_API_ERROR',
          message: 'AI 리포트 생성 중 오류가 발생했습니다.',
          details: error.message
        }
      },
      { status: 502 }
    );
  }
}
```

### 5.2 통합 에러 핸들러

**구현**:
```typescript
// lib/api/error-handler.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function handleError(error: unknown): NextResponse {
  // Zod 검증 에러
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력 데이터 검증 실패',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      },
      { status: 400 }
    );
  }
  
  // Supabase 에러
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string };
    
    if (supabaseError.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ERROR',
            message: '이미 존재하는 데이터입니다.'
          }
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '데이터베이스 오류가 발생했습니다.'
        }
      },
      { status: 500 }
    );
  }
  
  // 알 수 없는 에러
  console.error('Unknown error:', error);
  return NextResponse.json(
    {
      success: false,
      error: {
       code: 'INTERNAL_ERROR',
        message: '서버 오류가 발생했습니다.'
      }
    },
    { status: 500 }
  );
}
```

### 5.3 로깅 전략

#### Vercel에서 로그 확인
- **Vercel Dashboard**: Functions 탭에서 실시간 로그 확인
- **CLI**: `vercel logs` 명령어로 로그 조회
- **환경 변수**: `VERCEL_ENV`로 환경 구분 (production, preview, development)

#### 로깅 포인트
```typescript
// Route Handler에서
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 요청 로깅
    console.log('[API] POST /api/estimates', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')
    });
    
    // 비즈니스 로직 실행
    const result = await processEstimate(data);
    
    // 성공 로깅
    console.log('[API] Success', {
      duration: Date.now() - startTime,
      estimateId: result.id
    });
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // 에러 로깅
    console.error('[API] Error', {
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return handleError(error);
  }
}
```

#### 구조화된 로깅 (선택사항)
향후 확장 시 구조화된 로깅 도구 활용:
- **Vercel Analytics**: 성능 모니터링
- **Sentry**: 에러 추적 및 알림
- **Logtail / Datadog**: 중앙화된 로그 관리

---

## 6. 향후 확장 포인트

### 6.1 인증 도입 시

#### API에 유저 기반 권한 추가

**변경 사항**:
1. **인증 미들웨어 추가**:
```typescript
// lib/api/auth-middleware.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function requireAuth(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } },
      { status: 401 }
    );
  }
  
  return { user };
}
```

2. **Route Handler에 적용**:
```typescript
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult; // 에러 응답
  }
  
  const { user } = authResult;
  
  // user.id를 estimate에 저장
  const { data } = await supabase
    .from('estimates')
    .insert({ ...data, user_id: user.id });
}
```

3. **RLS 정책 업데이트**:
```sql
-- 인증된 사용자는 자신의 견적만 조회
CREATE POLICY "Users can view own estimates"
ON estimates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 인증된 사용자는 자신의 견적만 수정
CREATE POLICY "Users can update own estimates"
ON estimates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
```

### 6.2 관리자용 API

#### GET /api/admin/estimates

**목적**: 관리자가 모든 견적 목록 조회

**Query Parameters**:
- `page` (number): 페이지 번호 (기본값: 1)
- `limit` (number): 페이지당 항목 수 (기본값: 20)
- `status` (string): 필터링할 상태 (선택사항)
- `purpose` (string): 용도 필터 (선택사항)
- `sortBy` (string): 정렬 기준 (기본값: "created_at")
- `sortOrder` (string): "asc" | "desc" (기본값: "desc")

**Response**:
```json
{
  "success": true,
  "data": {
    "estimates": [ /* ... */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

**구현**:
```typescript
// app/api/admin/estimates/route.ts
import { requireAdmin } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  // 관리자 권한 체크
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  
  const supabase = createClient();
  
  let query = supabase
    .from('estimates')
    .select('*', { count: 'exact' });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  return NextResponse.json({
    success: true,
    data: {
      estimates: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  });
}
```

#### GET /api/admin/estimates/search

**목적**: 견적 검색 (이름, 이메일, 전화번호 등)

**Query Parameters**:
- `q` (string): 검색어
- `field` (string): 검색 필드 ("name" | "email" | "phone")

**Response**:
```json
{
  "success": true,
  "data": {
    "estimates": [ /* ... */ ],
    "count": 5
  }
}
```

### 6.3 추가 확장 아이디어

#### Webhook 지원
- 견적 생성 시 외부 시스템에 알림
- 리포트 생성 완료 시 이메일 발송

#### Rate Limiting
- API 호출 횟수 제한 (예: 분당 10회)
- Vercel Edge Config 또는 Upstash Redis 활용

#### 캐싱 전략
- 견적 조회 결과 캐싱 (Vercel Edge Network)
- 리포트 생성 결과 캐싱 (동일한 견적에 대한 재생성 방지)

#### 배치 처리
- 리포트 생성 작업을 큐에 넣고 배치 처리
- Vercel Cron Jobs 또는 외부 큐 서비스 활용

---

## 7. 데이터베이스 스키마 참고

### 7.1 estimates 테이블

```sql
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basic_info JSONB NOT NULL,
  system_selection JSONB NOT NULL,
  detailed_settings JSONB NOT NULL,
  operation_info JSONB NOT NULL,
  contact_info JSONB NOT NULL,
  estimated_price JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id), -- 향후 인증 도입 시
  session_id VARCHAR(255), -- 익명 사용자 세션 추적
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX idx_estimates_user_id ON estimates(user_id); -- 향후 인증 도입 시
```

### 7.2 ai_reports 테이블

```sql
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  report_data JSONB,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_reports_estimate_id ON ai_reports(estimate_id);
CREATE INDEX idx_ai_reports_status ON ai_reports(status);
```

### 7.3 draft_estimates 테이블 (선택사항)

```sql
CREATE TABLE draft_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  step INTEGER NOT NULL,
  form_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_draft_estimates_session_id ON draft_estimates(session_id);
CREATE INDEX idx_draft_estimates_expires_at ON draft_estimates(expires_at);
```

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024년  
**작성자**: 개발팀

