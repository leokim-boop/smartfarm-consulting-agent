# 폼 스키마 및 검증 설계 문서

## 1. 전체 폼 구조 개요

### 1.1 최상위 오브젝트 구조

**전체 폼 데이터 구조**:
```typescript
interface EstimateFormData {
  customer: CustomerInfo;      // STEP 1: 기본 정보
  space: SpaceInfo;            // STEP 2: 공간 정보
  crops: CropsInfo;           // STEP 2: 작물 정보
  system: SystemInfo;         // STEP 3: 시스템 구성
  operation: OperationInfo;  // STEP 4: 운영/재무 정보
}
```

### 1.2 각 오브젝트별 역할

| 오브젝트 | STEP | 역할 | 필수 여부 |
|----------|------|------|-----------|
| `customer` | 1 | 고객 기본 정보 (이름, 연락처, 이메일 등) | 필수 |
| `space` | 2 | 공간 크기, 용도, 예산 범위 | 필수 |
| `crops` | 2 | 재배 작물 선택 및 목표 생산량 | 필수 |
| `system` | 3 | 시스템 타입, 구성, 환경 제어 옵션 | 필수 |
| `operation` | 4 | 운영 기간, 재무 정보, 대출 여부 | 필수 |

### 1.3 JSON Schema ↔ Zod ↔ React Hook Form 매핑

**매핑 구조**:
```
JSON Schema (서버 검증)
  ↕
Zod Schema (클라이언트 검증)
  ↕
React Hook Form (폼 상태 관리)
```

**파일 구조**:
- `lib/schemas/estimate.json`: JSON Schema 정의
- `lib/schemas/estimate.ts`: Zod Schema 정의 (JSON Schema와 동기화)
- `hooks/useEstimateForm.ts`: React Hook Form + Zod Resolver 통합

---

## 2. STEP 1: 기본 정보 필드 정의

### 2.1 customer 오브젝트 구조

**오브젝트 경로**: `customer.*`

**설명**: 고객의 기본 연락처 및 신원 정보

### 2.2 필드 상세 표

| 필드명 (name) | Label | Type | Placeholder | 검증 규칙 | 필수 여부 | 비고 |
|---------------|-------|------|-------------|-----------|-----------|------|
| `customer.name` | 성함 | `string` | "홍길동" | - 최소 2자, 최대 50자<br>- 한글/영문/숫자만 허용<br>- 공백 제거 후 검증 | ✅ 필수 | React Hook Form: `customerInfo.name` |
| `customer.email` | 이메일 | `string` | "example@email.com" | - 이메일 형식 검증<br>- 최대 100자<br>- RFC 5322 호환 | ✅ 필수 | React Hook Form: `customerInfo.email` |
| `customer.phone` | 연락처 | `string` | "010-1234-5678" | - 한국 전화번호 형식<br>- 010/011/016/017/018/019로 시작<br>- 하이픈 포함/미포함 모두 허용<br>- 정규식: `^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$` | ✅ 필수 | React Hook Form: `customerInfo.phone` |
| `customer.company` | 회사/기관명 | `string` | "OO대학교" | - 최대 100자<br>- 선택사항 | ❌ 선택 | React Hook Form: `customerInfo.company` |
| `customer.position` | 직책 | `string` | "교수" | - 최대 50자<br>- 선택사항 | ❌ 선택 | React Hook Form: `customerInfo.position` |

### 2.3 JSON Schema 예시

```json
{
  "type": "object",
  "properties": {
    "customer": {
      "type": "object",
      "required": ["name", "email", "phone"],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 2,
          "maxLength": 50,
          "pattern": "^[가-힣a-zA-Z0-9\\s]+$"
        },
        "email": {
          "type": "string",
          "format": "email",
          "maxLength": 100
        },
        "phone": {
          "type": "string",
          "pattern": "^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$"
        },
        "company": {
          "type": "string",
          "maxLength": 100
        },
        "position": {
          "type": "string",
          "maxLength": 50
        }
      }
    }
  }
}
```

### 2.4 Zod Schema 예시

```typescript
// lib/schemas/estimate.ts
import { z } from 'zod';

export const customerSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 최소 2자 이상이어야 합니다.')
    .max(50, '이름은 최대 50자까지 입력 가능합니다.')
    .regex(/^[가-힣a-zA-Z0-9\s]+$/, '한글, 영문, 숫자만 입력 가능합니다.')
    .transform((val) => val.trim()),
  
  email: z
    .string()
    .email('올바른 이메일 형식이 아닙니다.')
    .max(100, '이메일은 최대 100자까지 입력 가능합니다.'),
  
  phone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '올바른 전화번호 형식이 아닙니다.')
    .transform((val) => val.replace(/-/g, '')), // 하이픈 제거 후 저장
  
  company: z.string().max(100).optional(),
  position: z.string().max(50).optional(),
});
```

### 2.5 React Hook Form 필드명

**매핑**:
- JSON Schema: `customer.name` → React Hook Form: `customerInfo.name`
- JSON Schema: `customer.email` → React Hook Form: `customerInfo.email`
- JSON Schema: `customer.phone` → React Hook Form: `customerInfo.phone`

**이유**: 기존 API 설계 문서와의 호환성을 위해 `customerInfo`로 매핑

---

## 3. STEP 2: 공간 & 작물 필드 정의

### 3.1 space 오브젝트 구조

**오브젝트 경로**: `space.*`

**설명**: 설치 공간의 크기, 용도, 예산 정보

### 3.2 space 필드 상세 표

| 필드명 (name) | Label | Type | Placeholder | 검증 규칙 | 필수 여부 | 비고 |
|---------------|-------|------|-------------|-----------|-----------|------|
| `space.size` | 공간 크기 | `number` | "50" | - 최소 1, 최대 10000<br>- 소수점 1자리까지 허용 | ✅ 필수 | 단위는 `space.unit`으로 분리 |
| `space.unit` | 단위 | `"sqm" \| "pyeong"` | - | - "sqm" 또는 "pyeong"만 허용<br>- 기본값: "sqm" | ✅ 필수 | 드롭다운 선택 |
| `space.purpose` | 용도 | `"education" \| "medical" \| "startup" \| "enterprise"` | - | - 4가지 값 중 하나만 허용 | ✅ 필수 | 라디오 버튼 |
| `space.budgetRange` | 예산 범위 | `string` | - | - "~500" \| "500-1000" \| "1000-3000" \| "3000+"<br>- 단위: 만원 | ✅ 필수 | 드롭다운 선택 |
| `space.ceilingHeight` | 천장 높이 | `number` | "3.0" | - 최소 2.0m, 최대 10.0m<br>- 소수점 1자리까지 허용 | ❌ 선택 | 단위: m (미터) |
| `space.hasWindows` | 창문 유무 | `boolean` | - | - true/false | ❌ 선택 | 체크박스 |

### 3.3 crops 오브젝트 구조

**오브젝트 경로**: `crops.*`

**설명**: 재배할 작물 정보 및 목표 생산량

### 3.4 crops 필드 상세 표

| 필드명 (name) | Label | Type | Placeholder | 검증 규칙 | 필수 여부 | 비고 |
|---------------|-------|------|-------------|-----------|-----------|------|
| `crops.selectedCrops` | 재배 작물 | `string[]` | - | - 최소 1개, 최대 10개 선택<br>- 허용 값: ["lettuce", "basil", "strawberry", "tomato", "pepper", "herbs", "microgreens", "other"] | ✅ 필수 | 멀티 셀렉트 (체크박스) |
| `crops.primaryCrop` | 주 재배 작물 | `string` | - | - `selectedCrops` 배열에 포함된 값이어야 함<br>- `selectedCrops`가 1개일 때 자동 설정 | ✅ 필수 | 라디오 버튼 (selectedCrops 기반) |
| `crops.targetProduction` | 목표 생산량 | `number` | "100" | - 최소 1, 최대 100000<br>- 정수만 허용 | ✅ 필수 | - |
| `crops.productionUnit` | 생산량 단위 | `"kg_per_month" \| "kg_per_year" \| "units_per_month"` | - | - 3가지 값 중 하나만 허용<br>- 기본값: "kg_per_month" | ✅ 필수 | 드롭다운 선택 |
| `crops.otherCropName` | 기타 작물명 | `string` | "기타 작물명 입력" | - `selectedCrops`에 "other"가 포함된 경우 필수<br>- 최대 50자 | 조건부 필수 | 텍스트 입력 |

### 3.5 JSON Schema 예시 (space + crops)

```json
{
  "type": "object",
  "properties": {
    "space": {
      "type": "object",
      "required": ["size", "unit", "purpose", "budgetRange"],
      "properties": {
        "size": {
          "type": "number",
          "minimum": 1,
          "maximum": 10000,
          "multipleOf": 0.1
        },
        "unit": {
          "type": "string",
          "enum": ["sqm", "pyeong"]
        },
        "purpose": {
          "type": "string",
          "enum": ["education", "medical", "startup", "enterprise"]
        },
        "budgetRange": {
          "type": "string",
          "enum": ["~500", "500-1000", "1000-3000", "3000+"]
        },
        "ceilingHeight": {
          "type": "number",
          "minimum": 2.0,
          "maximum": 10.0,
          "multipleOf": 0.1
        },
        "hasWindows": {
          "type": "boolean"
        }
      }
    },
    "crops": {
      "type": "object",
      "required": ["selectedCrops", "primaryCrop", "targetProduction", "productionUnit"],
      "properties": {
        "selectedCrops": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["lettuce", "basil", "strawberry", "tomato", "pepper", "herbs", "microgreens", "other"]
          },
          "minItems": 1,
          "maxItems": 10,
          "uniqueItems": true
        },
        "primaryCrop": {
          "type": "string"
        },
        "targetProduction": {
          "type": "number",
          "minimum": 1,
          "maximum": 100000
        },
        "productionUnit": {
          "type": "string",
          "enum": ["kg_per_month", "kg_per_year", "units_per_month"]
        },
        "otherCropName": {
          "type": "string",
          "maxLength": 50
        }
      },
      "if": {
        "properties": {
          "selectedCrops": {
            "contains": {
              "const": "other"
            }
          }
        }
      },
      "then": {
        "required": ["otherCropName"]
      }
    }
  }
}
```

### 3.6 Zod Schema 예시 (space + crops)

```typescript
// lib/schemas/estimate.ts
export const spaceSchema = z.object({
  size: z
    .number()
    .min(1, '공간 크기는 최소 1 이상이어야 합니다.')
    .max(10000, '공간 크기는 최대 10000까지 입력 가능합니다.')
    .multipleOf(0.1, '소수점 1자리까지 입력 가능합니다.'),
  
  unit: z.enum(['sqm', 'pyeong'], {
    errorMap: () => ({ message: '단위를 선택해주세요.' })
  }),
  
  purpose: z.enum(['education', 'medical', 'startup', 'enterprise'], {
    errorMap: () => ({ message: '용도를 선택해주세요.' })
  }),
  
  budgetRange: z.enum(['~500', '500-1000', '1000-3000', '3000+'], {
    errorMap: () => ({ message: '예산 범위를 선택해주세요.' })
  }),
  
  ceilingHeight: z
    .number()
    .min(2.0, '천장 높이는 최소 2.0m 이상이어야 합니다.')
    .max(10.0, '천장 높이는 최대 10.0m까지 입력 가능합니다.')
    .multipleOf(0.1)
    .optional(),
  
  hasWindows: z.boolean().optional(),
});

export const cropsSchema = z.object({
  selectedCrops: z
    .array(z.enum(['lettuce', 'basil', 'strawberry', 'tomato', 'pepper', 'herbs', 'microgreens', 'other']))
    .min(1, '최소 1개 이상의 작물을 선택해주세요.')
    .max(10, '최대 10개까지 선택 가능합니다.')
    .refine((val) => new Set(val).size === val.length, {
      message: '중복된 작물을 선택할 수 없습니다.'
    }),
  
  primaryCrop: z.string(),
  
  targetProduction: z
    .number()
    .int('생산량은 정수만 입력 가능합니다.')
    .min(1, '목표 생산량은 최소 1 이상이어야 합니다.')
    .max(100000, '목표 생산량은 최대 100000까지 입력 가능합니다.'),
  
  productionUnit: z.enum(['kg_per_month', 'kg_per_year', 'units_per_month'], {
    errorMap: () => ({ message: '생산량 단위를 선택해주세요.' })
  }),
  
  otherCropName: z.string().max(50).optional(),
}).refine(
  (data) => {
    // primaryCrop이 selectedCrops에 포함되어야 함
    return data.selectedCrops.includes(data.primaryCrop as any);
  },
  {
    message: '주 재배 작물은 선택한 작물 목록에 포함되어야 합니다.',
    path: ['primaryCrop'],
  }
).refine(
  (data) => {
    // "other"가 선택된 경우 otherCropName 필수
    if (data.selectedCrops.includes('other')) {
      return !!data.otherCropName && data.otherCropName.trim().length > 0;
    }
    return true;
  },
  {
    message: '기타 작물을 선택한 경우 작물명을 입력해주세요.',
    path: ['otherCropName'],
  }
);
```

### 3.7 React Hook Form 필드명 매핑

**매핑**:
- JSON Schema: `space.size` → React Hook Form: `spaceAndCrops.spaceSize`
- JSON Schema: `space.unit` → React Hook Form: `spaceAndCrops.spaceSizeUnit`
- JSON Schema: `crops.selectedCrops` → React Hook Form: `spaceAndCrops.selectedCrops`

---

## 4. STEP 3: 시스템 구성 필드 정의

### 4.1 system 오브젝트 구조

**오브젝트 경로**: `system.*`

**설명**: 스마트팜 시스템 타입, 구성, 환경 제어 옵션

### 4.2 system 필드 상세 표

| 필드명 (name) | Label | Type | Placeholder | 검증 규칙 | 필수 여부 | 비고 |
|---------------|-------|------|-------------|-----------|-----------|------|
| `system.systemType` | 시스템 타입 | `"smartgarden" \| "movingrack" \| "fixed"` | - | - 3가지 값 중 하나만 허용<br>- 기본 추천: "smartgarden", "movingrack" | ✅ 필수 | 라디오 버튼 (권장 표시) |
| `system.fixedRackTiers` | 고정식 단수 | `number` | "4" | - `systemType`이 "fixed"인 경우 필수<br>- 최소 1단, 최대 10단<br>- 5단 이상 선택 시 경고 모달 표시 | 조건부 필수 | 숫자 입력 (고정식만) |
| `system.hydroponicType` | 수경재배 방식 | `"nft" \| "dwc" \| "ebb" \| "none"` | - | - 4가지 값 중 하나만 허용<br>- "none": 토경재배 | ✅ 필수 | 드롭다운 선택 |
| `system.envControlIncluded` | 환경 제어 시스템 포함 | `boolean` | - | - true/false<br>- 기본값: false | ✅ 필수 | 체크박스 |
| `system.quantity` | 시스템 수량 | `number` | "2" | - 최소 1, 최대 100<br>- 정수만 허용 | ✅ 필수 | 숫자 입력 |
| `system.hvac` | HVAC 시스템 | `object` | - | - `envControlIncluded`가 true인 경우 필수 | 조건부 필수 | 중첩 오브젝트 |
| `system.hvac.capacity` | 냉난방 용량 | `number` | "5000" | - 최소 1000, 최대 50000<br>- 단위: kcal/h | 조건부 필수 | HVAC 하위 필드 |
| `system.hvac.type` | HVAC 타입 | `"split" \| "package" \| "vrf"` | - | - 3가지 값 중 하나만 허용 | 조건부 필수 | HVAC 하위 필드 |
| `system.nutrientSystem` | 양액 시스템 | `object` | - | - `hydroponicType`이 "none"이 아닌 경우 필수 | 조건부 필수 | 중첩 오브젝트 |
| `system.nutrientSystem.type` | 양액 시스템 타입 | `"manual" \| "semi-auto" \| "full-auto"` | - | - 3가지 값 중 하나만 허용 | 조건부 필수 | nutrientSystem 하위 필드 |
| `system.nutrientSystem.tankCapacity` | 탱크 용량 | `number` | "200" | - 최소 50, 최대 5000<br>- 단위: L (리터) | 조건부 필수 | nutrientSystem 하위 필드 |
| `system.chiller` | 냉각기 | `object` | - | - 선택사항 | ❌ 선택 | 중첩 오브젝트 |
| `system.chiller.included` | 냉각기 포함 | `boolean` | - | - true/false | ❌ 선택 | chiller 하위 필드 |
| `system.chiller.capacity` | 냉각 용량 | `number` | "1000" | - `chiller.included`가 true인 경우 필수<br>- 최소 500, 최대 10000<br>- 단위: kcal/h | 조건부 필수 | chiller 하위 필드 |

### 4.3 비즈니스 규칙: 고정식 5단 이상 비추천

**규칙 설명**:
- `systemType`이 "fixed"이고 `fixedRackTiers`가 5 이상인 경우 경고 모달 표시
- 경고 메시지: "고정식 5단 이상은 설치 및 관리가 복잡합니다. 스마트가든 또는 무빙랙을 권장합니다."
- 사용자가 "계속 진행"을 선택하면 허용, "변경하기"를 선택하면 시스템 타입 선택으로 돌아감

**구현 위치**: `StepSystemConfig` 컴포넌트

### 4.4 JSON Schema 예시 (system)

```json
{
  "type": "object",
  "properties": {
    "system": {
      "type": "object",
      "required": ["systemType", "hydroponicType", "envControlIncluded", "quantity"],
      "properties": {
        "systemType": {
          "type": "string",
          "enum": ["smartgarden", "movingrack", "fixed"]
        },
        "fixedRackTiers": {
          "type": "number",
          "minimum": 1,
          "maximum": 10
        },
        "hydroponicType": {
          "type": "string",
          "enum": ["nft", "dwc", "ebb", "none"]
        },
        "envControlIncluded": {
          "type": "boolean"
        },
        "quantity": {
          "type": "number",
          "minimum": 1,
          "maximum": 100
        },
        "hvac": {
          "type": "object",
          "properties": {
            "capacity": {
              "type": "number",
              "minimum": 1000,
              "maximum": 50000
            },
            "type": {
              "type": "string",
              "enum": ["split", "package", "vrf"]
            }
          },
          "required": ["capacity", "type"]
        },
        "nutrientSystem": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": ["manual", "semi-auto", "full-auto"]
            },
            "tankCapacity": {
              "type": "number",
              "minimum": 50,
              "maximum": 5000
            }
          },
          "required": ["type", "tankCapacity"]
        },
        "chiller": {
          "type": "object",
          "properties": {
            "included": {
              "type": "boolean"
            },
            "capacity": {
              "type": "number",
              "minimum": 500,
              "maximum": 10000
            }
          }
        }
      },
      "if": {
        "properties": {
          "systemType": {
            "const": "fixed"
          }
        }
      },
      "then": {
        "required": ["fixedRackTiers"]
      },
      "if": {
        "properties": {
          "envControlIncluded": {
            "const": true
          }
        }
      },
      "then": {
        "required": ["hvac"]
      },
      "if": {
        "properties": {
          "hydroponicType": {
            "not": {
              "const": "none"
            }
          }
        }
      },
      "then": {
        "required": ["nutrientSystem"]
      },
      "if": {
        "properties": {
          "chiller": {
            "properties": {
              "included": {
                "const": true
              }
            }
          }
        }
      },
      "then": {
        "required": ["chiller.capacity"]
      }
    }
  }
}
```

### 4.5 Zod Schema 예시 (system)

```typescript
// lib/schemas/estimate.ts
export const hvacSchema = z.object({
  capacity: z
    .number()
    .int('냉난방 용량은 정수만 입력 가능합니다.')
    .min(1000, '냉난방 용량은 최소 1000 kcal/h 이상이어야 합니다.')
    .max(50000, '냉난방 용량은 최대 50000 kcal/h까지 입력 가능합니다.'),
  
  type: z.enum(['split', 'package', 'vrf'], {
    errorMap: () => ({ message: 'HVAC 타입을 선택해주세요.' })
  }),
});

export const nutrientSystemSchema = z.object({
  type: z.enum(['manual', 'semi-auto', 'full-auto'], {
    errorMap: () => ({ message: '양액 시스템 타입을 선택해주세요.' })
  }),
  
  tankCapacity: z
    .number()
    .int('탱크 용량은 정수만 입력 가능합니다.')
    .min(50, '탱크 용량은 최소 50L 이상이어야 합니다.')
    .max(5000, '탱크 용량은 최대 5000L까지 입력 가능합니다.'),
});

export const chillerSchema = z.object({
  included: z.boolean(),
  capacity: z
    .number()
    .int('냉각 용량은 정수만 입력 가능합니다.')
    .min(500, '냉각 용량은 최소 500 kcal/h 이상이어야 합니다.')
    .max(10000, '냉각 용량은 최대 10000 kcal/h까지 입력 가능합니다.')
    .optional(),
}).refine(
  (data) => {
    // included가 true인 경우 capacity 필수
    if (data.included) {
      return data.capacity !== undefined;
    }
    return true;
  },
  {
    message: '냉각기를 포함하는 경우 용량을 입력해주세요.',
    path: ['capacity'],
  }
);

export const systemSchema = z.object({
  systemType: z.enum(['smartgarden', 'movingrack', 'fixed'], {
    errorMap: () => ({ message: '시스템 타입을 선택해주세요.' })
  }),
  
  fixedRackTiers: z
    .number()
    .int('단수는 정수만 입력 가능합니다.')
    .min(1, '단수는 최소 1단 이상이어야 합니다.')
    .max(10, '단수는 최대 10단까지 입력 가능합니다.')
    .optional(),
  
  hydroponicType: z.enum(['nft', 'dwc', 'ebb', 'none'], {
    errorMap: () => ({ message: '수경재배 방식을 선택해주세요.' })
  }),
  
  envControlIncluded: z.boolean(),
  
  quantity: z
    .number()
    .int('시스템 수량은 정수만 입력 가능합니다.')
    .min(1, '시스템 수량은 최소 1개 이상이어야 합니다.')
    .max(100, '시스템 수량은 최대 100개까지 입력 가능합니다.'),
  
  hvac: hvacSchema.optional(),
  
  nutrientSystem: nutrientSystemSchema.optional(),
  
  chiller: chillerSchema.optional(),
}).refine(
  (data) => {
    // systemType이 "fixed"인 경우 fixedRackTiers 필수
    if (data.systemType === 'fixed') {
      return data.fixedRackTiers !== undefined;
    }
    return true;
  },
  {
    message: '고정식 시스템을 선택한 경우 단수를 입력해주세요.',
    path: ['fixedRackTiers'],
  }
).refine(
  (data) => {
    // envControlIncluded가 true인 경우 hvac 필수
    if (data.envControlIncluded) {
      return data.hvac !== undefined;
    }
    return true;
  },
  {
    message: '환경 제어 시스템을 포함하는 경우 HVAC 정보를 입력해주세요.',
    path: ['hvac'],
  }
).refine(
  (data) => {
    // hydroponicType이 "none"이 아닌 경우 nutrientSystem 필수
    if (data.hydroponicType !== 'none') {
      return data.nutrientSystem !== undefined;
    }
    return true;
  },
  {
    message: '수경재배 방식을 선택한 경우 양액 시스템 정보를 입력해주세요.',
    path: ['nutrientSystem'],
  }
);
```

### 4.6 React Hook Form 필드명 매핑

**매핑**:
- JSON Schema: `system.systemType` → React Hook Form: `systemConfig.systemType`
- JSON Schema: `system.fixedRackTiers` → React Hook Form: `systemConfig.fixedRackTiers`
- JSON Schema: `system.hvac.capacity` → React Hook Form: `systemConfig.hvac.capacity`

---

## 5. STEP 4: 운영/재무 필드 정의

### 5.1 operation 오브젝트 구조

**오브젝트 경로**: `operation.*`

**설명**: 운영 기간, 재무 정보, 대출 여부

### 5.2 operation 필드 상세 표

| 필드명 (name) | Label | Type | Placeholder | 검증 규칙 | 필수 여부 | 비고 |
|---------------|-------|------|-------------|-----------|-----------|------|
| `operation.operationPeriod` | 운영 기간 | `"1year" \| "3years" \| "5years" \| "longterm"` | - | - 4가지 값 중 하나만 허용 | ✅ 필수 | 드롭다운 선택 |
| `operation.targetRevenue` | 목표 매출 | `number` | "5000000" | - 최소 0, 최대 10000000000<br>- 단위: 원 (KRW)<br>- 정수만 허용 | ✅ 필수 | 숫자 입력 (천 단위 구분 표시) |
| `operation.revenueUnit` | 매출 단위 | `"monthly" \| "yearly"` | - | - "monthly" 또는 "yearly"<br>- 기본값: "monthly" | ✅ 필수 | 드롭다운 선택 |
| `operation.salesChannel` | 판매 채널 | `"self" \| "direct" \| "distribution" \| "mixed"` | - | - 4가지 값 중 하나만 허용 | ✅ 필수 | 라디오 버튼 |
| `operation.useLoan` | 대출 사용 여부 | `boolean` | - | - true/false<br>- 기본값: false | ✅ 필수 | 체크박스 |
| `operation.loanAmount` | 대출 금액 | `number` | "10000000" | - `useLoan`이 true인 경우 필수<br>- 최소 0, 최대 1000000000<br>- 단위: 원 (KRW)<br>- 정수만 허용 | 조건부 필수 | 숫자 입력 (천 단위 구분 표시) |
| `operation.loanInterestRate` | 대출 이자율 | `number` | "3.5" | - `useLoan`이 true인 경우 필수<br>- 최소 0.1, 최대 20.0<br>- 소수점 2자리까지 허용<br>- 단위: % (연이율) | 조건부 필수 | 숫자 입력 (소수점) |
| `operation.loanTerm` | 대출 기간 | `number` | "5" | - `useLoan`이 true인 경우 필수<br>- 최소 1, 최대 30<br>- 단위: 년<br>- 정수만 허용 | 조건부 필수 | 숫자 입력 |
| `operation.expectedStartDate` | 예상 시작일 | `string` | "2024-06-01" | - ISO 8601 날짜 형식 (YYYY-MM-DD)<br>- 오늘 이후 날짜만 허용<br>- 최대 2년 후까지 | ❌ 선택 | 날짜 선택기 |

### 5.3 JSON Schema 예시 (operation)

```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "object",
      "required": ["operationPeriod", "targetRevenue", "revenueUnit", "salesChannel", "useLoan"],
      "properties": {
        "operationPeriod": {
          "type": "string",
          "enum": ["1year", "3years", "5years", "longterm"]
        },
        "targetRevenue": {
          "type": "number",
          "minimum": 0,
          "maximum": 10000000000
        },
        "revenueUnit": {
          "type": "string",
          "enum": ["monthly", "yearly"]
        },
        "salesChannel": {
          "type": "string",
          "enum": ["self", "direct", "distribution", "mixed"]
        },
        "useLoan": {
          "type": "boolean"
        },
        "loanAmount": {
          "type": "number",
          "minimum": 0,
          "maximum": 1000000000
        },
        "loanInterestRate": {
          "type": "number",
          "minimum": 0.1,
          "maximum": 20.0,
          "multipleOf": 0.01
        },
        "loanTerm": {
          "type": "number",
          "minimum": 1,
          "maximum": 30
        },
        "expectedStartDate": {
          "type": "string",
          "format": "date"
        }
      },
      "if": {
        "properties": {
          "useLoan": {
            "const": true
          }
        }
      },
      "then": {
        "required": ["loanAmount", "loanInterestRate", "loanTerm"]
      }
    }
  }
}
```

### 5.4 Zod Schema 예시 (operation)

```typescript
// lib/schemas/estimate.ts
export const operationSchema = z.object({
  operationPeriod: z.enum(['1year', '3years', '5years', 'longterm'], {
    errorMap: () => ({ message: '운영 기간을 선택해주세요.' })
  }),
  
  targetRevenue: z
    .number()
    .int('목표 매출은 정수만 입력 가능합니다.')
    .min(0, '목표 매출은 0 이상이어야 합니다.')
    .max(10000000000, '목표 매출은 최대 100억원까지 입력 가능합니다.'),
  
  revenueUnit: z.enum(['monthly', 'yearly'], {
    errorMap: () => ({ message: '매출 단위를 선택해주세요.' })
  }),
  
  salesChannel: z.enum(['self', 'direct', 'distribution', 'mixed'], {
    errorMap: () => ({ message: '판매 채널을 선택해주세요.' })
  }),
  
  useLoan: z.boolean(),
  
  loanAmount: z
    .number()
    .int('대출 금액은 정수만 입력 가능합니다.')
    .min(0, '대출 금액은 0 이상이어야 합니다.')
    .max(1000000000, '대출 금액은 최대 10억원까지 입력 가능합니다.')
    .optional(),
  
  loanInterestRate: z
    .number()
    .min(0.1, '대출 이자율은 최소 0.1% 이상이어야 합니다.')
    .max(20.0, '대출 이자율은 최대 20.0%까지 입력 가능합니다.')
    .multipleOf(0.01, '대출 이자율은 소수점 2자리까지 입력 가능합니다.')
    .optional(),
  
  loanTerm: z
    .number()
    .int('대출 기간은 정수만 입력 가능합니다.')
    .min(1, '대출 기간은 최소 1년 이상이어야 합니다.')
    .max(30, '대출 기간은 최대 30년까지 입력 가능합니다.')
    .optional(),
  
  expectedStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)')
    .refine(
      (date) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const twoYearsLater = new Date();
        twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
        return selectedDate >= today && selectedDate <= twoYearsLater;
      },
      {
        message: '예상 시작일은 오늘부터 2년 이내의 날짜만 선택 가능합니다.'
      }
    )
    .optional(),
}).refine(
  (data) => {
    // useLoan이 true인 경우 대출 관련 필드 필수
    if (data.useLoan) {
      return (
        data.loanAmount !== undefined &&
        data.loanInterestRate !== undefined &&
        data.loanTerm !== undefined
      );
    }
    return true;
  },
  {
    message: '대출을 사용하는 경우 대출 금액, 이자율, 기간을 모두 입력해주세요.',
    path: ['loanAmount'],
  }
);
```

### 5.5 React Hook Form 필드명 매핑

**매핑**:
- JSON Schema: `operation.operationPeriod` → React Hook Form: `operation.operationPeriod`
- JSON Schema: `operation.useLoan` → React Hook Form: `operation.useLoan`
- JSON Schema: `operation.loanAmount` → React Hook Form: `operation.loanAmount`

---

## 6. 검증/의존성 규칙

### 6.1 JSON Schema의 if/then 규칙 요약

**조건부 필수 필드 규칙**:

| 조건 | 필수 필드 | 설명 |
|------|-----------|------|
| `crops.selectedCrops`에 "other" 포함 | `crops.otherCropName` | 기타 작물 선택 시 작물명 필수 |
| `system.systemType` = "fixed" | `system.fixedRackTiers` | 고정식 선택 시 단수 필수 |
| `system.envControlIncluded` = true | `system.hvac` | 환경 제어 포함 시 HVAC 정보 필수 |
| `system.hydroponicType` ≠ "none" | `system.nutrientSystem` | 수경재배 선택 시 양액 시스템 필수 |
| `system.chiller.included` = true | `system.chiller.capacity` | 냉각기 포함 시 용량 필수 |
| `operation.useLoan` = true | `operation.loanAmount`, `operation.loanInterestRate`, `operation.loanTerm` | 대출 사용 시 대출 정보 필수 |

### 6.2 Zod에서의 조건부 검증 처리

#### 방법 1: `.refine()` 사용 (권장)

**장점**:
- 복잡한 조건부 로직 처리 가능
- 커스텀 에러 메시지 지정 가능
- `path`로 특정 필드에 에러 연결 가능

**예시**:
```typescript
export const cropsSchema = z.object({
  selectedCrops: z.array(z.string()),
  otherCropName: z.string().optional(),
}).refine(
  (data) => {
    if (data.selectedCrops.includes('other')) {
      return !!data.otherCropName && data.otherCropName.trim().length > 0;
    }
    return true;
  },
  {
    message: '기타 작물을 선택한 경우 작물명을 입력해주세요.',
    path: ['otherCropName'], // 에러를 특정 필드에 연결
  }
);
```

#### 방법 2: `.superRefine()` 사용 (복잡한 경우)

**사용 시기**: 여러 조건을 동시에 검증하거나, 조건에 따라 다른 검증 규칙을 적용해야 할 때

**예시**:
```typescript
export const systemSchema = z.object({
  systemType: z.enum(['smartgarden', 'movingrack', 'fixed']),
  fixedRackTiers: z.number().optional(),
  envControlIncluded: z.boolean(),
  hvac: hvacSchema.optional(),
}).superRefine((data, ctx) => {
  // 조건 1: 고정식인 경우 단수 필수
  if (data.systemType === 'fixed' && !data.fixedRackTiers) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '고정식 시스템을 선택한 경우 단수를 입력해주세요.',
      path: ['fixedRackTiers'],
    });
  }
  
  // 조건 2: 환경 제어 포함 시 HVAC 필수
  if (data.envControlIncluded && !data.hvac) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '환경 제어 시스템을 포함하는 경우 HVAC 정보를 입력해주세요.',
      path: ['hvac'],
    });
  }
});
```

#### 방법 3: 조건부 스키마 생성 (`.and()` / `.or()`)

**사용 시기**: 완전히 다른 스키마 구조가 필요한 경우

**예시**:
```typescript
const baseOperationSchema = z.object({
  operationPeriod: z.string(),
  targetRevenue: z.number(),
});

const operationWithLoanSchema = baseOperationSchema.extend({
  useLoan: z.literal(true),
  loanAmount: z.number(),
  loanInterestRate: z.number(),
  loanTerm: z.number(),
});

const operationWithoutLoanSchema = baseOperationSchema.extend({
  useLoan: z.literal(false),
});

export const operationSchema = z.discriminatedUnion('useLoan', [
  operationWithLoanSchema,
  operationWithoutLoanSchema,
]);
```

### 6.3 React Hook Form에서의 조건부 검증

**구현 방법**:
1. **Zod Schema의 `.refine()` 활용**: Zod에서 조건부 검증 처리
2. **`watch()`로 조건 감지**: React Hook Form의 `watch()`로 조건 필드 감시
3. **조건부 필드 렌더링**: 조건에 따라 필드 표시/숨김

**예시**:
```typescript
// StepOperation 컴포넌트 내부
export function StepOperation({ form }: StepOperationProps) {
  const useLoan = form.watch('operation.useLoan');
  
  return (
    <form>
      {/* useLoan 체크박스 */}
      <FormField name="operation.useLoan">
        <Checkbox {...form.register('operation.useLoan')} />
      </FormField>
      
      {/* 조건부 필드 렌더링 */}
      {useLoan && (
        <>
          <FormField name="operation.loanAmount">
            <Input {...form.register('operation.loanAmount')} />
          </FormField>
          <FormField name="operation.loanInterestRate">
            <Input {...form.register('operation.loanInterestRate')} />
          </FormField>
          <FormField name="operation.loanTerm">
            <Input {...form.register('operation.loanTerm')} />
          </FormField>
        </>
      )}
    </form>
  );
}
```

### 6.4 검증 순서 및 에러 처리

**검증 순서**:
1. **기본 타입 검증**: Zod의 기본 검증 (타입, 최소/최대값 등)
2. **조건부 검증**: `.refine()` 또는 `.superRefine()`으로 조건부 필수 필드 검증
3. **비즈니스 규칙 검증**: 복잡한 비즈니스 로직 검증 (예: primaryCrop이 selectedCrops에 포함)

**에러 메시지 우선순위**:
1. 필드별 기본 검증 에러 (예: "이메일 형식이 올바르지 않습니다.")
2. 조건부 필수 필드 에러 (예: "대출을 사용하는 경우 대출 금액을 입력해주세요.")
3. 비즈니스 규칙 에러 (예: "주 재배 작물은 선택한 작물 목록에 포함되어야 합니다.")

### 6.5 전체 스키마 통합

**최종 Zod Schema**:
```typescript
// lib/schemas/estimate.ts
import { z } from 'zod';

export const estimateFormSchema = z.object({
  customer: customerSchema,
  space: spaceSchema,
  crops: cropsSchema,
  system: systemSchema,
  operation: operationSchema,
});

export type EstimateFormData = z.infer<typeof estimateFormSchema>;
```

**React Hook Form 통합**:
```typescript
// hooks/useEstimateForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { estimateFormSchema, type EstimateFormData } from '@/lib/schemas/estimate';

export function useEstimateForm() {
  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateFormSchema),
    mode: 'onChange', // 실시간 검증
    defaultValues: {
      customer: {
        name: '',
        email: '',
        phone: '',
      },
      // ... 기타 기본값
    },
  });
  
  return form;
}
```

---

## 7. 필드명 매핑 정리

### 7.1 JSON Schema ↔ React Hook Form 매핑 테이블

| JSON Schema 경로 | React Hook Form 경로 | 비고 |
|-----------------|---------------------|------|
| `customer.name` | `customerInfo.name` | API 호환성 |
| `customer.email` | `customerInfo.email` | API 호환성 |
| `customer.phone` | `customerInfo.phone` | API 호환성 |
| `space.size` | `spaceAndCrops.spaceSize` | API 호환성 |
| `space.unit` | `spaceAndCrops.spaceSizeUnit` | API 호환성 |
| `space.purpose` | `spaceAndCrops.purpose` | API 호환성 |
| `crops.selectedCrops` | `spaceAndCrops.selectedCrops` | API 호환성 |
| `crops.primaryCrop` | `spaceAndCrops.primaryCrop` | API 호환성 |
| `system.systemType` | `systemConfig.systemType` | API 호환성 |
| `system.fixedRackTiers` | `systemConfig.fixedRackTiers` | API 호환성 |
| `operation.operationPeriod` | `operation.operationPeriod` | 동일 |
| `operation.useLoan` | `operation.useLoan` | 동일 |

**매핑 함수 예시**:
```typescript
// lib/utils/form-mapper.ts
export function mapFormDataToAPI(formData: EstimateFormData) {
  return {
    customerInfo: {
      name: formData.customer.name,
      email: formData.customer.email,
      phone: formData.customer.phone,
      company: formData.customer.company,
      position: formData.customer.position,
    },
    spaceAndCrops: {
      spaceSize: formData.space.size,
      spaceSizeUnit: formData.space.unit,
      purpose: formData.space.purpose,
      budgetRange: formData.space.budgetRange,
      selectedCrops: formData.crops.selectedCrops,
      primaryCrop: formData.crops.primaryCrop,
      targetProduction: formData.crops.targetProduction,
      productionUnit: formData.crops.productionUnit,
    },
    systemConfig: {
      systemType: formData.system.systemType,
      fixedRackTiers: formData.system.fixedRackTiers,
      // ... 기타 필드
    },
    operation: {
      operationPeriod: formData.operation.operationPeriod,
      // ... 기타 필드
    },
  };
}
```

---

## 8. 검증 메시지 표준화

### 8.1 에러 메시지 형식

**표준 형식**:
- 한국어로 작성
- 명확하고 구체적인 안내
- 사용자가 바로 수정할 수 있도록 지시

**예시**:
- ❌ "잘못된 입력"
- ✅ "이메일 형식이 올바르지 않습니다."

### 8.2 필드별 표준 메시지

| 검증 타입 | 표준 메시지 템플릿 |
|-----------|-------------------|
| 필수 필드 | "{필드명}을(를) 입력해주세요." |
| 최소값 | "{필드명}은(는) 최소 {값} 이상이어야 합니다." |
| 최대값 | "{필드명}은(는) 최대 {값}까지 입력 가능합니다." |
| 형식 오류 | "올바른 {필드명} 형식이 아닙니다." |
| 조건부 필수 | "{조건}인 경우 {필드명}을(를) 입력해주세요." |

---

**문서 버전**: 1.0  
**최종 업데이트**: 2024년  
**작성자**: 개발팀

