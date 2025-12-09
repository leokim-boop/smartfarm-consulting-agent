# 배포 및 환경 변수 설정 문서

## 1. Supabase 프로젝트 준비

### 1.1 Supabase 프로젝트 생성

#### 단계별 가이드

1. **Supabase 계정 생성**
   - [Supabase 공식 사이트](https://supabase.com) 접속
   - GitHub 계정으로 로그인 (권장) 또는 이메일 회원가입

2. **새 프로젝트 생성**
   - Dashboard에서 "New Project" 클릭
   - 프로젝트 정보 입력:
     - **Name**: `smartfarm-consulting-agent` (또는 원하는 이름)
     - **Database Password**: 강력한 비밀번호 생성 및 안전하게 보관
     - **Region**: `Northeast Asia (Seoul)` (한국 사용자 권장) 또는 `West US`
     - **Pricing Plan**: Free tier로 시작 (필요시 업그레이드)

3. **프로젝트 생성 완료 대기**
   - 약 2-3분 소요
   - 프로젝트가 준비되면 Dashboard로 이동

### 1.2 프로젝트 설정 확인

#### API 키 확인 위치
- Dashboard → Settings → API
- 다음 정보 확인:
  - **Project URL**: `https://xxxxx.supabase.co`
  - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (비밀 유지)

### 1.3 DB 테이블/스키마 적용 방법

#### 방법 1: SQL Editor 사용 (권장)

1. **SQL Editor 접근**
   - Dashboard → SQL Editor 클릭
   - "New query" 클릭

2. **스키마 SQL 실행**
   - 프로젝트의 `supabase/migrations/` 디렉토리에 있는 SQL 파일 복사
   - 또는 아래 예시 SQL을 실행:

```sql
-- estimates 테이블 생성
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_info JSONB NOT NULL,
  space_info JSONB NOT NULL,
  crops_info JSONB NOT NULL,
  system_info JSONB NOT NULL,
  operation_info JSONB NOT NULL,
  estimated_price JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ai_reports 테이블 생성
CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  report_data JSONB,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- draft_estimates 테이블 생성 (선택사항)
CREATE TABLE IF NOT EXISTS draft_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  step INTEGER NOT NULL,
  form_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_estimate_id ON ai_reports(estimate_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_status ON ai_reports(status);
CREATE INDEX IF NOT EXISTS idx_draft_estimates_session_id ON draft_estimates(session_id);
CREATE INDEX IF NOT EXISTS idx_draft_estimates_expires_at ON draft_estimates(expires_at);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_estimates ENABLE ROW LEVEL SECURITY;

-- 익명 사용자도 견적 생성 가능
CREATE POLICY "Allow anonymous insert on estimates"
ON estimates
FOR INSERT
TO anon
WITH CHECK (true);

-- 익명 사용자도 모든 견적 조회 가능 (또는 session_id 기반으로 제한)
CREATE POLICY "Allow anonymous select on estimates"
ON estimates
FOR SELECT
TO anon
USING (true);

-- 익명 사용자도 초안 저장 가능
CREATE POLICY "Allow anonymous insert on draft_estimates"
ON draft_estimates
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous select on draft_estimates"
ON draft_estimates
FOR SELECT
TO anon
USING (true);
```

3. **SQL 실행**
   - "Run" 버튼 클릭 또는 `Ctrl/Cmd + Enter`
   - 성공 메시지 확인

#### 방법 2: Supabase CLI 사용 (고급)

```bash
# Supabase CLI 설치
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

### 1.4 anon/public 키와 service role 키 개념

#### anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
- **용도**: 클라이언트 사이드에서 사용
- **권한**: RLS (Row Level Security) 정책에 따라 제한됨
- **노출 가능**: 브라우저에 노출되어도 안전 (RLS로 보호)
- **사용 위치**: 
  - `lib/supabase/client.ts` (클라이언트 컴포넌트)
  - 브라우저에서 직접 Supabase 호출 시

#### service_role key (SUPABASE_SERVICE_ROLE_KEY)
- **용도**: 서버 사이드에서만 사용
- **권한**: RLS 정책을 우회하여 모든 데이터 접근 가능
- **비밀 유지**: 절대 클라이언트에 노출되면 안 됨
- **사용 위치**:
  - `lib/supabase/server.ts` (서버 컴포넌트, Route Handlers)
  - Next.js API Routes
  - 서버 사이드 비즈니스 로직

#### 키 선택 가이드

| 사용 케이스 | 사용할 키 |
|------------|----------|
| 클라이언트에서 직접 Supabase 호출 | `anon public key` |
| Route Handler에서 Supabase 호출 | `service_role key` |
| 관리자 기능 (RLS 우회 필요) | `service_role key` |
| 사용자 인증이 필요한 작업 | `anon public key` (RLS 정책 적용) |

---

## 2. 환경 변수 설계

### 2.1 환경 변수 목록

| 변수명 | 용도 | 클라이언트 노출 | 필수 여부 | 비고 |
|--------|------|----------------|-----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 예 | ✅ 필수 | 브라우저에 노출됨 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | ✅ 예 | ✅ 필수 | 브라우저에 노출됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ❌ 아니오 | ✅ 필수 | 서버 전용, 비밀 유지 |
| `OPENAI_API_KEY` | OpenAI API 키 (AI 리포트 생성) | ❌ 아니오 | ❌ 선택 | 향후 기능 |
| `NODE_ENV` | 환경 구분 (development/production) | ❌ 아니오 | ✅ 필수 | 자동 설정됨 |
| `VERCEL_URL` | Vercel 배포 URL | ❌ 아니오 | ❌ 선택 | Vercel에서 자동 제공 |

### 2.2 각 변수 상세 설명

#### NEXT_PUBLIC_SUPABASE_URL
**값 예시**: `https://xxxxx.supabase.co`

**용도**:
- Supabase 클라이언트 초기화 시 사용
- 클라이언트와 서버 양쪽에서 사용

**설정 위치**:
- Supabase Dashboard → Settings → API → Project URL

**사용 예시**:
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

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
**값 예시**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDE5NzY4MDAsImV4cCI6MTk1NzU1MjgwMH0.xxxxx`

**용도**:
- 클라이언트 사이드 Supabase 호출 시 인증
- RLS 정책에 따라 데이터 접근 제어

**설정 위치**:
- Supabase Dashboard → Settings → API → anon public key

**보안 고려사항**:
- 브라우저에 노출되지만 RLS로 보호됨
- RLS 정책을 제대로 설정해야 안전함

#### SUPABASE_SERVICE_ROLE_KEY
**값 예시**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0MTk3NjgwMCwiZXhwIjoxOTU3NTUyODAwfQ.xxxxx`

**용도**:
- 서버 사이드에서만 사용
- RLS 정책 우회하여 관리자 작업 수행
- 비즈니스 로직 실행 시 사용

**설정 위치**:
- Supabase Dashboard → Settings → API → service_role key

**보안 고려사항**:
- **절대 클라이언트에 노출되면 안 됨**
- `.env.local`에만 저장 (Git에 커밋 금지)
- Vercel 환경 변수에만 설정

**사용 예시**:
```typescript
// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';

export function createClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서버 전용 키 사용
    {
      auth: {
        persistSession: false,
      },
    }
  );
}
```

#### OPENAI_API_KEY
**값 예시**: `sk-xxxxx...`

**용도**:
- AI 리포트 생성 시 OpenAI API 호출
- 향후 기능 (현재는 선택사항)

**설정 위치**:
- [OpenAI Platform](https://platform.openai.com/api-keys)에서 생성

**사용 예시**:
```typescript
// app/api/estimates/[id]/generate-report/route.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

#### NODE_ENV
**값**: `development` | `production` | `test`

**용도**:
- 환경 구분 (개발/프로덕션)
- Next.js가 자동으로 설정
- Vercel 배포 시 자동으로 `production` 설정

**설정**:
- 로컬: 자동 설정 (개발 모드)
- Vercel: 자동 설정 (프로덕션)

**사용 예시**:
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
```

### 2.3 환경 변수 사용 위치 정리

| 변수명 | 사용 위치 | 파일 경로 |
|--------|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라이언트/서버 | `lib/supabase/client.ts`, `lib/supabase/server.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 | `lib/supabase/client.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 | `lib/supabase/server.ts`, `app/api/**/*.ts` |
| `OPENAI_API_KEY` | 서버 전용 | `app/api/estimates/[id]/generate-report/route.ts` |

---

## 3. Vercel 설정

### 3.1 새 프로젝트 연결 (GitHub 레포 연동)

#### 단계별 가이드

1. **Vercel 계정 생성**
   - [Vercel 공식 사이트](https://vercel.com) 접속
   - GitHub 계정으로 로그인 (권장)

2. **프로젝트 가져오기**
   - Dashboard → "Add New..." → "Project" 클릭
   - GitHub 레포지토리 선택 또는 "Import Git Repository" 클릭
   - 레포지토리 검색 및 선택

3. **프로젝트 설정**
   - **Framework Preset**: Next.js (자동 감지)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (자동 설정)
   - **Output Directory**: `.next` (자동 설정)
   - **Install Command**: `npm install` (자동 설정)

4. **환경 변수 설정** (아래 섹션 참조)

5. **배포**
   - "Deploy" 버튼 클릭
   - 첫 빌드 시작 (약 2-3분 소요)

### 3.2 Environment Variables 입력

#### Vercel Dashboard에서 설정

1. **환경 변수 페이지 접근**
   - 프로젝트 → Settings → Environment Variables

2. **환경 변수 추가**
   - 각 환경 변수를 개별적으로 추가:
     - **Key**: 변수명 (예: `NEXT_PUBLIC_SUPABASE_URL`)
     - **Value**: 변수 값
     - **Environment**: 적용 환경 선택
       - Production: 프로덕션 환경
       - Preview: Preview 배포 (PR 등)
       - Development: 로컬 개발 (Vercel CLI 사용 시)

3. **추가할 환경 변수 목록**

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | All (Production, Preview, Development) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview |
| `OPENAI_API_KEY` | `sk-xxxxx...` | Production, Preview |

#### 환경별 설정 전략

- **Production**: 모든 환경 변수 포함
- **Preview**: Production과 동일 (테스트용)
- **Development**: 공개 가능한 변수만 (서비스 키 제외)

### 3.3 빌드 명령 및 출력 디렉토리

#### Next.js 기본 설정 (자동 감지)

**빌드 명령**: `npm run build`

**출력 디렉토리**: `.next`

**설정 확인**:
- Vercel Dashboard → Settings → General → Build & Development Settings
- Next.js는 자동으로 감지되므로 수동 설정 불필요

#### 커스텀 빌드 설정 (필요 시)

**예시**: TypeScript 타입 체크 포함
```json
// package.json
{
  "scripts": {
    "build": "tsc --noEmit && next build",
    "vercel-build": "npm run build"
  }
}
```

**Vercel 설정**:
- Build Command: `npm run vercel-build`

---

## 4. 로컬 개발 환경

### 4.1 .env.local 예시

**파일 위치**: 프로젝트 루트 디렉토리

**파일명**: `.env.local` (Git에 커밋하지 않음)

**내용 예시**:
```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDE5NzY4MDAsImV4cCI6MTk1NzU1MjgwMH0.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0MTk3NjgwMCwiZXhwIjoxOTU3NTUyODAwfQ.xxxxx

# OpenAI API (선택사항)
OPENAI_API_KEY=sk-xxxxx...

# 환경 설정
NODE_ENV=development
```

### 4.2 .env.example 파일 생성 (권장)

**목적**: 팀원들이 필요한 환경 변수를 파악할 수 있도록 템플릿 제공

**파일명**: `.env.example`

**내용**:
```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI API (선택사항)
OPENAI_API_KEY=your_openai_api_key

# 환경 설정
NODE_ENV=development
```

**Git에 커밋**: ✅ 예 (실제 값 없이 템플릿만)

### 4.3 .gitignore 설정

**확인 사항**: `.env.local`이 `.gitignore`에 포함되어 있는지 확인

```gitignore
# .gitignore
# 환경 변수 파일
.env*.local
.env.local
.env.development.local
.env.test.local
.env.production.local

# 기타
node_modules/
.next/
out/
```

### 4.4 npm install 및 npm run dev 플로우

#### 초기 설정

```bash
# 1. 레포지토리 클론
git clone https://github.com/your-org/smartfarm-consulting-agent.git
cd smartfarm-consulting-agent

# 2. 의존성 설치
npm install

# 3. 환경 변수 파일 생성
cp .env.example .env.local

# 4. .env.local 파일 편집하여 실제 값 입력
# (Supabase URL, 키 등)

# 5. 개발 서버 실행
npm run dev
```

#### 개발 서버 접속

- 로컬: `http://localhost:3000`
- 네트워크: 터미널에 표시된 네트워크 주소 사용

### 4.5 환경 변수 로드 확인

**확인 방법**:
```typescript
// 임시로 페이지에 추가하여 확인 (개발 중에만)
export default function TestPage() {
  return (
    <div>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 미설정'}</p>
      <p>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 미설정'}</p>
      <p>Service Role Key: {process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 미설정'}</p>
    </div>
  );
}
```

**주의**: 프로덕션에서는 환경 변수 값 자체를 노출하지 않도록 주의

---

## 5. 배포 파이프라인

### 5.1 main 브랜치 push → Vercel 자동 빌드/배포

#### 자동 배포 플로우

```
GitHub Repository
  ↓ (main 브랜치에 push)
Vercel Webhook 감지
  ↓
자동 빌드 시작
  ↓
환경 변수 주입
  ↓
npm install
  ↓
npm run build
  ↓
배포 완료
  ↓
프로덕션 URL 제공
```

#### 배포 확인

1. **Vercel Dashboard 확인**
   - 프로젝트 → Deployments 탭
   - 최신 배포 상태 확인:
     - ✅ Ready: 배포 성공
     - ⏳ Building: 빌드 중
     - ❌ Error: 빌드 실패 (로그 확인)

2. **배포 URL 확인**
   - Vercel Dashboard → 프로젝트 → Settings → Domains
   - 기본 URL: `https://your-project.vercel.app`
   - 커스텀 도메인 설정 가능

### 5.2 Preview 배포 (Pull Request)

#### 자동 Preview 배포

- GitHub에서 Pull Request 생성 시 자동으로 Preview 배포 생성
- Preview URL: `https://your-project-git-branch-name.vercel.app`
- 각 PR마다 독립적인 환경 제공

#### Preview 환경 변수

- Preview 환경에도 환경 변수 설정 가능
- Production과 동일한 변수 사용 권장 (테스트 목적)

### 5.3 Supabase 스키마 변경 시 적용 전략 (마이그레이션)

#### 전략 1: SQL Editor 사용 (간단한 변경)

**적용 순서**:
1. Supabase Dashboard → SQL Editor 접근
2. 변경 SQL 작성 및 실행
3. 프로덕션에 즉시 적용

**장점**: 빠르고 간단
**단점**: 변경 이력 관리 어려움

#### 전략 2: 마이그레이션 파일 관리 (권장)

**구조**:
```
supabase/
└── migrations/
    ├── 20240101000000_create_estimates_table.sql
    ├── 20240102000000_create_ai_reports_table.sql
    └── 20240103000000_add_indexes.sql
```

**마이그레이션 파일 명명 규칙**:
- 형식: `YYYYMMDDHHMMSS_description.sql`
- 예시: `20240115103000_add_user_id_to_estimates.sql`

**적용 방법**:

**방법 A: Supabase CLI 사용**
```bash
# 마이그레이션 파일 생성
supabase migration new add_user_id_to_estimates

# 마이그레이션 파일 편집
# supabase/migrations/20240115103000_add_user_id_to_estimates.sql

# 로컬에서 테스트
supabase db reset

# 프로덕션에 적용
supabase db push --linked
```

**방법 B: 수동 적용**
1. 마이그레이션 파일을 SQL Editor에서 실행
2. Git에 커밋하여 변경 이력 관리

#### 전략 3: 롤백 계획

**롤백 SQL 준비**:
```sql
-- 마이그레이션 롤백 예시
-- 20240115103000_add_user_id_to_estimates.sql의 롤백

ALTER TABLE estimates DROP COLUMN IF EXISTS user_id;
DROP INDEX IF EXISTS idx_estimates_user_id;
```

**롤백 실행**:
- Supabase SQL Editor에서 롤백 SQL 실행
- 또는 Supabase CLI: `supabase db reset` (로컬만)

### 5.4 데이터베이스 백업 전략

#### Supabase 자동 백업

- **Free tier**: 일일 자동 백업 (7일 보관)
- **Pro tier**: 더 자주 백업 가능

#### 수동 백업 (중요 변경 전)

**방법 1: Supabase Dashboard**
- Dashboard → Database → Backups
- "Create backup" 클릭

**방법 2: pg_dump 사용**
```bash
# Supabase 연결 정보 확인
# Dashboard → Settings → Database → Connection string

# 백업 실행
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup.sql

# 복원 (필요 시)
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" < backup.sql
```

---

## 6. 운영 시 모니터링 포인트

### 6.1 Vercel 로그 확인

#### 로그 접근 방법

1. **Vercel Dashboard**
   - 프로젝트 → Deployments → 특정 배포 클릭
   - "Functions" 탭에서 함수별 로그 확인

2. **실시간 로그**
   - 프로젝트 → Logs 탭
   - 실시간 로그 스트림 확인

3. **Vercel CLI**
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그 확인
vercel logs your-project-name
```

#### 확인할 로그 항목

| 항목 | 확인 방법 | 중요도 |
|------|----------|--------|
| 빌드 에러 | Deployments → 빌드 로그 | 높음 |
| 런타임 에러 | Functions → 함수 로그 | 높음 |
| API 응답 시간 | Analytics → Performance | 중간 |
| 함수 실행 횟수 | Analytics → Usage | 중간 |

### 6.2 Supabase 쿼리/에러 확인

#### Supabase Dashboard

1. **Database → Logs**
   - 쿼리 실행 로그 확인
   - 느린 쿼리 감지
   - 에러 로그 확인

2. **Database → Query Performance**
   - 쿼리 성능 분석
   - 인덱스 사용 여부 확인

3. **API → Logs**
   - API 호출 로그
   - 에러 응답 확인

#### 확인할 항목

| 항목 | 확인 방법 | 중요도 |
|------|----------|--------|
| 느린 쿼리 | Database → Query Performance | 높음 |
| 인덱스 미사용 | Database → Query Performance | 중간 |
| RLS 정책 위반 | API → Logs | 높음 |
| 연결 풀 고갈 | Database → Connection Pooling | 높음 |

### 6.3 예상되는 병목 및 대응 방안

#### 병목 1: LLM API 속도

**증상**:
- AI 리포트 생성 시 응답 시간 10초 이상
- 타임아웃 에러 발생

**대응 방안**:
1. **비동기 처리**
   - 리포트 생성 요청 시 즉시 응답
   - 백그라운드에서 리포트 생성
   - 완료 후 알림 (Webhook, Polling 등)

2. **캐싱**
   - 동일한 견적에 대한 리포트 캐싱
   - Redis 또는 Supabase Storage 활용

3. **타임아웃 설정**
   - Vercel Function 타임아웃: 최대 60초
   - Edge Function 사용 고려 (더 긴 타임아웃)

**구현 예시**:
```typescript
// app/api/estimates/[id]/generate-report/route.ts
export async function POST(request: NextRequest) {
  // 리포트 생성 중 상태로 저장
  await supabase.from('ai_reports').insert({
    estimate_id: id,
    status: 'processing'
  });
  
  // 비동기로 리포트 생성 (백그라운드 작업)
  generateReportAsync(id);
  
  // 즉시 응답
  return NextResponse.json({
    success: true,
    status: 'processing',
    message: '리포트 생성이 시작되었습니다. 잠시 후 다시 확인해주세요.'
  });
}
```

#### 병목 2: DB I/O

**증상**:
- 쿼리 실행 시간 1초 이상
- 동시 접속 시 응답 지연

**대응 방안**:
1. **인덱스 최적화**
   - 자주 조회되는 컬럼에 인덱스 추가
   - 복합 인덱스 활용

2. **쿼리 최적화**
   - 불필요한 JOIN 제거
   - SELECT 컬럼 최소화
   - 페이지네이션 적용

3. **연결 풀 설정**
   - Supabase Connection Pooling 활용
   - 연결 수 제한 설정

**인덱스 추가 예시**:
```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_estimates_status_created_at 
ON estimates(status, created_at DESC);

-- 복합 인덱스 (여러 조건 동시 검색)
CREATE INDEX IF NOT EXISTS idx_estimates_user_status 
ON estimates(user_id, status) 
WHERE user_id IS NOT NULL;
```

#### 병목 3: Vercel Function 콜드 스타트

**증상**:
- 첫 요청 시 응답 시간 2-3초
- 이후 요청은 빠름

**대응 방안**:
1. **Keep-alive 설정**
   - Vercel Pro tier에서 제공
   - 함수를 항상 warm 상태로 유지

2. **Edge Functions 활용**
   - 더 빠른 콜드 스타트
   - 단, Node.js API 제한 있음

3. **예열 (Warming)**
   - Cron Job으로 주기적으로 함수 호출
   - Vercel Cron Jobs 활용

#### 병목 4: 대용량 데이터 처리

**증상**:
- 많은 견적 데이터 조회 시 메모리 부족
- 응답 시간 증가

**대응 방안**:
1. **페이지네이션**
   - 한 번에 많은 데이터 조회 방지
   - Cursor-based pagination 활용

2. **데이터 아카이빙**
   - 오래된 데이터는 별도 테이블로 이동
   - Supabase Storage 또는 외부 스토리지 활용

3. **캐싱**
   - 자주 조회되는 데이터 캐싱
   - Vercel Edge Network 활용

### 6.4 모니터링 도구 통합 (선택사항)

#### Vercel Analytics

**설정**:
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**확인 항목**:
- 페이지뷰
- 성능 메트릭
- 에러 발생률

#### Sentry (에러 추적)

**설정**:
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

**확인 항목**:
- 런타임 에러
- API 에러
- 성능 문제

#### Supabase 실시간 모니터링

**확인 항목**:
- 데이터베이스 연결 수
- 쿼리 실행 시간
- 스토리지 사용량
- API 호출 횟수

---

## 7. 체크리스트

### 7.1 초기 배포 전 체크리스트

- [ ] Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 테이블 생성 완료
- [ ] RLS 정책 설정 완료
- [ ] 환경 변수 준비 완료 (Supabase URL, 키 등)
- [ ] Vercel 프로젝트 생성 및 GitHub 연동 완료
- [ ] Vercel 환경 변수 설정 완료
- [ ] 로컬에서 빌드 테스트 완료 (`npm run build`)
- [ ] 로컬에서 개발 서버 테스트 완료 (`npm run dev`)

### 7.2 배포 후 체크리스트

- [ ] 프로덕션 URL 접속 확인
- [ ] 폼 제출 테스트
- [ ] 데이터베이스 저장 확인
- [ ] API 엔드포인트 동작 확인
- [ ] 에러 로그 확인 (Vercel, Supabase)
- [ ] 성능 확인 (응답 시간 등)

### 7.3 정기 점검 항목

- [ ] 주간: Vercel 로그 확인
- [ ] 주간: Supabase 쿼리 성능 확인
- [ ] 월간: 데이터베이스 백업 확인
- [ ] 월간: 환경 변수 보안 점검
- [ ] 분기: 의존성 업데이트 (`npm audit`)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024년  
**작성자**: 개발팀

