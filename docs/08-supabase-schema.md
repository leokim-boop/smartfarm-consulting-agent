# Supabase 데이터베이스 스키마 문서

## 1. 개요

이 문서는 **팜비트 "실내 스마트팜 자동견적 + AI 비즈니스 리포트"** 플랫폼에서 사용하는 Supabase(PostgreSQL) 데이터베이스 구조를 정리합니다.

### 주요 테이블 역할

- **`customers`**: 고객 기본 정보(이름, 연락처, 고객 유형 등)를 저장
- **`estimates`**: 견적/설문 데이터를 JSONB 형태로 저장하며, 계산된 투자비/매출/ROI 등의 수치도 포함
- **`ai_reports`**: AI가 생성한 비즈니스 리포트(ROI 분석, 캐시플로우, 가정 등)를 저장
- **`audit_logs`**: 시스템 이벤트 및 로그 기록용 테이블(선택적)

### 데이터 흐름

1. 고객이 설문을 작성 → `customers` 테이블에 고객 정보 저장
2. 설문 제출 → `estimates` 테이블에 설문 데이터(`form_json`) 및 계산 결과 저장
3. AI 리포트 생성 → `ai_reports` 테이블에 분석 결과 저장(1:1 관계)
4. 이벤트 기록 → `audit_logs` 테이블에 로그 저장(선택적)

---

## 2. Enum 타입 정의

데이터베이스에서 일관된 값만 허용하기 위해 PostgreSQL의 ENUM 타입을 사용합니다.

### 2.1 customer_type_enum

고객 유형을 분류하는 열거형입니다.

**가능한 값:**
- `school`: 학교
- `hospital`: 병원
- `welfare`: 복지시설
- `startup`: 스타트업
- `cafe_restaurant`: 카페/식당
- `lab`: 연구소
- `other`: 기타

### 2.2 estimate_status_enum

견적서의 진행 상태를 나타내는 열거형입니다.

**가능한 값:**
- `draft`: 작성 중(저장만, 아직 제출 안 함)
- `submitted`: 최종 제출 완료
- `analyzed`: AI 리포트 생성 완료
- `archived`: 보관/종료 상태

### 2.3 marketing_budget_enum

마케팅 예산 구간을 나타내는 열거형입니다.

**가능한 값:**
- `none_0_20`: 없음 ~ 2천만원
- `small_20_50`: 2천만원 ~ 5천만원
- `medium_50_100`: 5천만원 ~ 1억원
- `large_100_plus`: 1억원 이상
- `unknown`: 미정

### SQL 코드

```sql
-- 고객 유형
create type customer_type_enum as enum (
  'school',
  'hospital',
  'welfare',
  'startup',
  'cafe_restaurant',
  'lab',
  'other'
);

-- 견적 상태
create type estimate_status_enum as enum (
  'draft',        -- 작성 중 (저장만)
  'submitted',    -- 최종 제출
  'analyzed',     -- AI 리포트 생성 완료
  'archived'      -- 보관/종료
);

-- 마케팅 예산 구간
create type marketing_budget_enum as enum (
  'none_0_20',
  'small_20_50',
  'medium_50_100',
  'large_100_plus',
  'unknown'
);
```

---

## 3. customers 테이블

고객의 기본 정보를 저장하는 테이블입니다.

### 3.1 목적

- 고객의 이름, 연락처(전화번호, 이메일), 고객 유형을 저장
- 향후 조직명, 부서, 직책 등의 정보도 확장 가능한 구조

### 3.2 주요 컬럼

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | 고객 고유 식별자 |
| `name` | `text` | NOT NULL | 고객 이름 |
| `phone` | `text` | NOT NULL | 전화번호 |
| `email` | `text` | NOT NULL | 이메일 주소 |
| `customer_type` | `customer_type_enum` | NOT NULL | 고객 유형(ENUM) |
| `customer_type_other` | `text` | NULL | 고객 유형이 'other'일 경우 상세 설명 |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 수정 시각(트리거로 자동 갱신) |

### 3.3 인덱스

- **`idx_customers_email`**: 이메일로 고객 검색 최적화
- **`idx_customers_created_at`**: 생성일 기준 정렬/필터링 최적화

### 3.4 트리거

- **`trg_customers_set_updated_at`**: 레코드 업데이트 시 `updated_at` 컬럼을 자동으로 현재 시각으로 갱신

### SQL 코드

```sql
create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  phone             text not null,
  email             text not null,
  customer_type     customer_type_enum not null,
  customer_type_other text null,
  -- 향후: 조직명, 부서, 직책 등 추가 가능
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_customers_email
  on public.customers (email);

create index if not exists idx_customers_created_at
  on public.customers (created_at);

-- updated_at 자동 갱신 트리거 (원하지 않으면 생략 가능)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customers_set_updated_at on public.customers;

create trigger trg_customers_set_updated_at
before update on public.customers
for each row
execute procedure public.set_updated_at();
```

---

## 4. estimates 테이블

견적/설문 데이터를 저장하는 핵심 테이블입니다.

### 4.1 목적

- 고객이 작성한 설문 전체 데이터를 JSONB 형태로 저장
- 섹션별로 분리된 JSONB 필드도 제공하여 쿼리 성능 최적화
- 계산된 투자비, 예상 매출, ROI 등의 수치를 별도 컬럼으로 저장

### 4.2 주요 컬럼

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | 견적 고유 식별자 |
| `customer_id` | `uuid` | NOT NULL, FK → `customers.id` | 고객 ID(외래키, CASCADE 삭제) |
| `form_json` | `jsonb` | NOT NULL | 설문 전체 데이터(프론트엔드의 `EstimateFormValues` 구조 그대로 저장 가능) |
| `customer_json` | `jsonb` | NULL | 고객 정보 섹션만 분리 저장(선택적) |
| `space_json` | `jsonb` | NULL | 공간 정보 섹션만 분리 저장(선택적) |
| `crops_json` | `jsonb` | NULL | 작물 정보 섹션만 분리 저장(선택적) |
| `system_json` | `jsonb` | NULL | 시스템 정보 섹션만 분리 저장(선택적) |
| `operation_json` | `jsonb` | NULL | 운영 정보 섹션만 분리 저장(선택적) |
| `status` | `estimate_status_enum` | NOT NULL, DEFAULT `'draft'` | 견적 상태 |
| `summary` | `text` | NULL | 견적/분석 결과 요약(사람이 읽기 좋은 텍스트) |
| `total_investment_krw` | `numeric(14,2)` | NULL | 총 투자비(원화) |
| `expected_monthly_revenue_krw` | `numeric(14,2)` | NULL | 예상 월 매출(원화) |
| `expected_roi_percent` | `numeric(7,2)` | NULL | ROI(%) |
| `payback_period_months` | `integer` | NULL | 투자 회수 기간(월 단위) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 생성 시각 |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 수정 시각(트리거로 자동 갱신) |

### 4.3 JSONB 필드 사용 이유

- **`form_json`**: 프론트엔드에서 제출한 전체 설문 데이터를 그대로 저장하여 유연성 확보
- **섹션별 JSONB 필드**(`space_json`, `system_json` 등): 특정 섹션만 조회하거나 인덱싱할 때 성능 최적화

### 4.4 인덱스

- **`idx_estimates_customer_id`**: 특정 고객의 견적 목록 조회 최적화
- **`idx_estimates_status`**: 상태별 필터링 최적화
- **`idx_estimates_created_at`**: 생성일 기준 정렬/필터링 최적화

### 4.5 트리거

- **`trg_estimates_set_updated_at`**: 레코드 업데이트 시 `updated_at` 컬럼을 자동으로 현재 시각으로 갱신

### SQL 코드

```sql
create table if not exists public.estimates (
  id                  uuid primary key default gen_random_uuid(),

  customer_id         uuid not null
    references public.customers (id)
    on delete cascade,

  -- 설문 전체 데이터를 jsonb로 저장
  -- front의 EstimateFormValues 구조(customer/space/crops/system/operation)를 그대로 넣어도 됨
  form_json           jsonb not null,

  -- 섹션별로 쪼개서도 저장하고 싶다면 아래 컬럼 활용
  customer_json       jsonb null,
  space_json          jsonb null,
  crops_json          jsonb null,
  system_json         jsonb null,
  operation_json      jsonb null,

  status              estimate_status_enum not null default 'draft',

  -- 견적/분석 결과 요약 (사람이 읽기 좋은 텍스트)
  summary             text null,

  -- 계산된 숫자 값 (선택적)
  total_investment_krw numeric(14,2) null,   -- 총 투자비
  expected_monthly_revenue_krw numeric(14,2) null, -- 예상 월 매출
  expected_roi_percent numeric(7,2) null,    -- ROI(%)
  payback_period_months integer null,        -- 투자 회수 기간(월 단위)

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_estimates_customer_id
  on public.estimates (customer_id);

create index if not exists idx_estimates_status
  on public.estimates (status);

create index if not exists idx_estimates_created_at
  on public.estimates (created_at);

drop trigger if exists trg_estimates_set_updated_at on public.estimates;

create trigger trg_estimates_set_updated_at
before update on public.estimates
for each row
execute procedure public.set_updated_at();
```

---

## 5. ai_reports 테이블

AI가 생성한 비즈니스 리포트를 저장하는 테이블입니다.

### 5.1 목적

- AI가 분석한 ROI, 캐시플로우, 가정 등을 JSONB 형태로 저장
- LLM 응답 원문도 저장하여 추후 재분석 또는 디버깅에 활용

### 5.2 주요 컬럼

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | 리포트 고유 식별자 |
| `estimate_id` | `uuid` | NOT NULL, FK → `estimates.id`, UNIQUE | 견적 ID(외래키, CASCADE 삭제, 1:1 관계) |
| `summary` | `text` | NULL | 요약 문구(3~5줄 요약 등) |
| `roi_json` | `jsonb` | NULL | ROI, 투자회수기간, 각종 지표 등을 JSON으로 저장 |
| `cashflow_json` | `jsonb` | NULL | 연/월 단위 캐시플로우 데이터 |
| `assumptions_json` | `jsonb` | NULL | AI가 분석에 사용한 가정/전제들 |
| `raw_llm_response` | `jsonb` | NULL | LLM 응답 원문(디버깅/재분석용) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 생성 시각 |

### 5.3 1:1 관계

- **`estimate_id`에 UNIQUE 인덱스 적용**: 하나의 견적(`estimates`)당 하나의 AI 리포트만 존재하도록 보장
- `estimates` 테이블의 레코드가 삭제되면 관련 `ai_reports` 레코드도 자동 삭제(CASCADE)

### 5.4 인덱스

- **`idx_ai_reports_estimate_id_unique`**: UNIQUE 인덱스로 1:1 관계 보장 및 조회 최적화
- **`idx_ai_reports_created_at`**: 생성일 기준 정렬/필터링 최적화

### SQL 코드

```sql
create table if not exists public.ai_reports (
  id                 uuid primary key default gen_random_uuid(),

  estimate_id        uuid not null
    references public.estimates (id)
    on delete cascade,

  -- 요약 문구 (3~5줄 요약 등)
  summary            text null,

  -- ROI, 투자회수기간, 각종 지표 등을 JSON으로 저장
  roi_json           jsonb null,
  cashflow_json      jsonb null,      -- 연/월 단위 캐시플로우 데이터
  assumptions_json   jsonb null,       -- AI가 분석에 사용한 가정/전제들

  -- LLM 응답 원문(원하면 jsonb나 text 중 선택)
  raw_llm_response   jsonb null,

  created_at         timestamptz not null default now()
);

create unique index if not exists idx_ai_reports_estimate_id_unique
  on public.ai_reports (estimate_id);

create index if not exists idx_ai_reports_created_at
  on public.ai_reports (created_at);
```

---

## 6. audit_logs 테이블 (선택)

시스템 이벤트 및 로그를 기록하는 테이블입니다.

### 6.1 목적

- 견적 생성, 리포트 생성, 상태 변경 등의 이벤트를 기록
- 디버깅, 감사(audit), 사용자 행동 분석 등에 활용

### 6.2 주요 컬럼

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT `gen_random_uuid()` | 로그 고유 식별자 |
| `estimate_id` | `uuid` | NULL, FK → `estimates.id` | 관련 견적 ID(외래키, CASCADE 삭제, 선택적) |
| `event_type` | `text` | NOT NULL | 이벤트 타입(예: 'ESTIMATE_CREATED', 'REPORT_GENERATED' 등) |
| `payload` | `jsonb` | NULL | 이벤트 관련 추가 데이터(JSON 형태) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | 생성 시각 |

### 6.3 이벤트 타입 예시

- `ESTIMATE_CREATED`: 견적 생성
- `ESTIMATE_SUBMITTED`: 견적 제출
- `REPORT_GENERATED`: AI 리포트 생성 완료
- `ESTIMATE_UPDATED`: 견적 수정
- `CUSTOMER_CREATED`: 고객 생성

### 6.4 인덱스

- **`idx_audit_logs_estimate_id`**: 특정 견적의 로그 조회 최적화
- **`idx_audit_logs_event_type`**: 이벤트 타입별 필터링 최적화

### SQL 코드

```sql
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  estimate_id   uuid null
    references public.estimates (id)
    on delete cascade,
  event_type    text not null,  -- 예: 'ESTIMATE_CREATED', 'REPORT_GENERATED' 등
  payload       jsonb null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_logs_estimate_id
  on public.audit_logs (estimate_id);

create index if not exists idx_audit_logs_event_type
  on public.audit_logs (event_type);
```

---

## 7. RLS/보안 정책 메모

### 7.1 현재 상태

현재 PoC(Proof of Concept) 단계에서는 **RLS(Row Level Security)가 비활성화**되어 있습니다. 모든 사용자가 모든 데이터에 접근할 수 있는 상태입니다.

### 7.2 향후 설계 방향

로그인/계정 체계가 구축되면 다음 단계로 RLS를 적용할 수 있습니다:

1. **사용자 테이블 추가**: Supabase Auth의 `auth.users` 테이블 활용 또는 별도 `users` 테이블 생성
2. **외래키 추가**: `customers`, `estimates` 테이블에 `user_id` 컬럼 추가
3. **RLS 정책 작성**: 사용자별로 자신의 데이터만 조회/수정/삭제할 수 있도록 정책 설정

### 7.3 예시 RLS 정책 (주석 처리됨)

```sql
-- alter table public.customers enable row level security;
-- alter table public.estimates enable row level security;
-- alter table public.ai_reports enable row level security;

-- 예시 정책 (유저별 구분이 생기면 user_id 컬럼 추가 후 적용)
-- create policy "allow_all_for_now_customers"
--   on public.customers
--   for all
--   using (true);

-- create policy "allow_all_for_now_estimates"
--   on public.estimates
--   for all
--   using (true);
```

---

## 8. 전체 SQL 스키마

아래는 전체 스키마를 한 번에 실행할 수 있는 SQL 코드입니다.

```sql
-- =========================================================
-- 팜비트 실내 스마트팜 자동견적 플랫폼
-- Supabase / Postgres 스키마 v1
-- =========================================================

-- 확장 기능 (Supabase 기본 프로젝트에는 대부분 이미 설치되어 있음)
-- 필요시 주석 해제해서 사용
-- create extension if not exists "uuid-ossp";
-- create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. Enum 타입 정의 (필요시)
-- ---------------------------------------------------------

-- 고객 유형
create type customer_type_enum as enum (
  'school',
  'hospital',
  'welfare',
  'startup',
  'cafe_restaurant',
  'lab',
  'other'
);

-- 견적 상태
create type estimate_status_enum as enum (
  'draft',        -- 작성 중 (저장만)
  'submitted',    -- 최종 제출
  'analyzed',     -- AI 리포트 생성 완료
  'archived'      -- 보관/종료
);

-- 마케팅 예산 구간
create type marketing_budget_enum as enum (
  'none_0_20',
  'small_20_50',
  'medium_50_100',
  'large_100_plus',
  'unknown'
);

-- ---------------------------------------------------------
-- 2. customers : 고객 기본 정보
-- ---------------------------------------------------------

create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  phone             text not null,
  email             text not null,
  customer_type     customer_type_enum not null,
  customer_type_other text null,
  -- 향후: 조직명, 부서, 직책 등 추가 가능
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_customers_email
  on public.customers (email);

create index if not exists idx_customers_created_at
  on public.customers (created_at);

-- updated_at 자동 갱신 트리거 (원하지 않으면 생략 가능)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customers_set_updated_at on public.customers;

create trigger trg_customers_set_updated_at
before update on public.customers
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- 3. estimates : 견적/설문 데이터
-- ---------------------------------------------------------

create table if not exists public.estimates (
  id                  uuid primary key default gen_random_uuid(),

  customer_id         uuid not null
    references public.customers (id)
    on delete cascade,

  -- 설문 전체 데이터를 jsonb로 저장
  -- front의 EstimateFormValues 구조(customer/space/crops/system/operation)를 그대로 넣어도 됨
  form_json           jsonb not null,

  -- 섹션별로 쪼개서도 저장하고 싶다면 아래 컬럼 활용
  customer_json       jsonb null,
  space_json          jsonb null,
  crops_json          jsonb null,
  system_json         jsonb null,
  operation_json      jsonb null,

  status              estimate_status_enum not null default 'draft',

  -- 견적/분석 결과 요약 (사람이 읽기 좋은 텍스트)
  summary             text null,

  -- 계산된 숫자 값 (선택적)
  total_investment_krw numeric(14,2) null,   -- 총 투자비
  expected_monthly_revenue_krw numeric(14,2) null, -- 예상 월 매출
  expected_roi_percent numeric(7,2) null,    -- ROI(%)
  payback_period_months integer null,        -- 투자 회수 기간(월 단위)

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_estimates_customer_id
  on public.estimates (customer_id);

create index if not exists idx_estimates_status
  on public.estimates (status);

create index if not exists idx_estimates_created_at
  on public.estimates (created_at);

drop trigger if exists trg_estimates_set_updated_at on public.estimates;

create trigger trg_estimates_set_updated_at
before update on public.estimates
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------
-- 4. ai_reports : AI 비즈니스 리포트
-- ---------------------------------------------------------

create table if not exists public.ai_reports (
  id                 uuid primary key default gen_random_uuid(),

  estimate_id        uuid not null
    references public.estimates (id)
    on delete cascade,

  -- 요약 문구 (3~5줄 요약 등)
  summary            text null,

  -- ROI, 투자회수기간, 각종 지표 등을 JSON으로 저장
  roi_json           jsonb null,
  cashflow_json      jsonb null,      -- 연/월 단위 캐시플로우 데이터
  assumptions_json   jsonb null,       -- AI가 분석에 사용한 가정/전제들

  -- LLM 응답 원문(원하면 jsonb나 text 중 선택)
  raw_llm_response   jsonb null,

  created_at         timestamptz not null default now()
);

create unique index if not exists idx_ai_reports_estimate_id_unique
  on public.ai_reports (estimate_id);

create index if not exists idx_ai_reports_created_at
  on public.ai_reports (created_at);

-- ---------------------------------------------------------
-- 5. (선택) audit_logs : 이벤트/로그 기록
-- ---------------------------------------------------------

create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  estimate_id   uuid null
    references public.estimates (id)
    on delete cascade,
  event_type    text not null,  -- 예: 'ESTIMATE_CREATED', 'REPORT_GENERATED' 등
  payload       jsonb null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_logs_estimate_id
  on public.audit_logs (estimate_id);

create index if not exists idx_audit_logs_event_type
  on public.audit_logs (event_type);

-- ---------------------------------------------------------
-- 6. (선택) RLS 정책 초안
--    아직 로그인/계정 체계가 없다면 RLS는 나중에 추가해도 됨.
--    아래는 향후를 위해 주석 형태로 남겨둠.
-- ---------------------------------------------------------

-- alter table public.customers enable row level security;
-- alter table public.estimates enable row level security;
-- alter table public.ai_reports enable row level security;

-- 예시 정책 (유저별 구분이 생기면 user_id 컬럼 추가 후 적용)
-- create policy "allow_all_for_now_customers"
--   on public.customers
--   for all
--   using (true);

-- create policy "allow_all_for_now_estimates"
--   on public.estimates
--   for all
--   using (true);
```

---

## 9. 참고사항

### 9.1 외래키 CASCADE 삭제

모든 외래키 관계에서 `ON DELETE CASCADE`가 설정되어 있습니다:
- `customers` 삭제 → 관련 `estimates` 자동 삭제
- `estimates` 삭제 → 관련 `ai_reports`, `audit_logs` 자동 삭제

### 9.2 JSONB 활용 팁

- **인덱싱**: 자주 조회하는 JSONB 필드에 GIN 인덱스를 추가하면 성능 향상 가능
  ```sql
  create index idx_estimates_form_json_gin on public.estimates using gin (form_json);
  ```
- **쿼리**: JSONB 필드 내부 값 조회 시 `->`, `->>` 연산자 활용
  ```sql
  select * from estimates where form_json->>'customer_name' = '홍길동';
  ```

### 9.3 확장 가능성

- 향후 사용자 인증 시스템 구축 시 `user_id` 컬럼 추가
- 파일 첨부 기능 추가 시 별도 `attachments` 테이블 생성
- 알림 기능 추가 시 `notifications` 테이블 생성

