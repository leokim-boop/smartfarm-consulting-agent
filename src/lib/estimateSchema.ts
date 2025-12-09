// src/lib/estimateSchema.ts
import { z } from "zod";

export const customerSchema = z.object({
  customerType: z.enum([
    "school",
    "hospital",
    "welfare",
    "startup",
    "cafe_restaurant",
    "lab",
    "other",
  ]),
  customerTypeOther: z.string().optional(),
  name: z.string().min(2, "이름은 2자 이상 입력해 주세요.").max(50),
  phone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, "휴대폰 번호 형식이 아닙니다."),
  email: z.string().email("유효한 이메일 형식이 아닙니다."),
});

export const spaceSchema = z.object({
  spaceType: z.enum([
    "empty_room",
    "greenhouse_partial",
    "hospital_space",
    "factory_warehouse",
    "other",
  ]),
  spaceTypeOther: z.string().optional(),
  widthM: z
    .number({ invalid_type_error: "숫자를 입력해 주세요." })
    .min(1)
    .max(100),
  lengthM: z
    .number({ invalid_type_error: "숫자를 입력해 주세요." })
    .min(1)
    .max(100),
  heightM: z
    .number({ invalid_type_error: "숫자를 입력해 주세요." })
    .min(2.0)
    .max(10.0),
});

export const cropsSchema = z.object({
  selectedCrops: z
    .array(
      z.enum([
        "europe_lettuce",
        "herb",
        "microgreen",
        "strawberry",
        "wasabi",
        "ornamental",
        "other",
      ])
    )
    .min(1, "최소 1개 이상 선택해 주세요."),
  cropOther: z.string().optional(),
  primaryCrop: z
    .enum([
      "europe_lettuce",
      "herb",
      "microgreen",
      "strawberry",
      "wasabi",
      "ornamental",
      "other",
    ])
    .optional(),
});

export const systemSchema = z.object({
  systemType: z.enum([
    "smart_garden_4tier",
    "moving_rack_4tier",
    "fixed_rack_custom",
  ]),
  fixedRackTiers: z.union([z.literal(5), z.literal(6), z.literal(7), z.literal(8)]).optional(),
  hydroponicType: z.enum(["ebb_flow", "aeroponic"]),
  envControlIncluded: z.boolean(),
  hvac: z
    .object({
      ac: z.boolean().optional(),
      heatExchanger: z.boolean().optional(),
      circulationFan: z.boolean().optional(),
      airCirculator: z.boolean().optional(),
      useDefaultRecommended: z.boolean().optional(),
    })
    .optional(),
  nutrientSystem: z
    .object({
      autoAB: z.boolean().optional(),
      autoC: z.boolean().optional(),
      autoEC: z.boolean().optional(),
      autoPH: z.boolean().optional(),
      useDefaultRecommended: z.boolean().optional(),
    })
    .optional(),
  chiller: z
    .object({
      mode: z.enum(["manual", "auto"]).default("auto"),
      hp: z.number().optional(),
    })
    .optional(),
});

export const operationSchema = z.object({
  staffCount: z.number().min(0).max(10).optional(),
  monthlySalaryPerStaff: z.number().min(100).max(600).optional(),
  isRented: z.boolean().optional(),
  monthlyRent: z.number().min(0).max(2000).optional(),
  useLoan: z.boolean().optional(),
  loanAmount: z.number().min(0).max(100000).optional(),
  loanInterestRate: z.number().min(0).max(20).optional(),
  loanTermYears: z.union([z.literal(3), z.literal(5), z.literal(7), z.literal(10)]).optional(),
  gracePeriodYears: z.union([z.literal(0), z.literal(1)]).optional(),
  targetMonthlyRevenue: z.number().min(0).max(100000).optional(),
  marketingBudget: z
    .enum(["none_0_20", "small_20_50", "medium_50_100", "large_100_plus", "unknown"])
    .optional(),
});

export const estimateFormSchema = z.object({
  customer: customerSchema,
  space: spaceSchema,
  crops: cropsSchema,
  system: systemSchema,
  operation: operationSchema,
});

export type EstimateFormValues = z.infer<typeof estimateFormSchema>;

