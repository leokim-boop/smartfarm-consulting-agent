// src/app/api/estimates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { estimateFormSchema } from "@/lib/estimateSchema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod 스키마로 검증
    const validatedData = estimateFormSchema.parse(body);

    const supabase = createServerClient();

    // 1. customers 테이블에 고객 정보 저장
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        name: validatedData.customer.name,
        phone: validatedData.customer.phone,
        email: validatedData.customer.email,
        customer_type: validatedData.customer.customerType,
        customer_type_other: validatedData.customer.customerTypeOther || null,
      })
      .select()
      .single();

    if (customerError) {
      console.error("Customer insert error:", customerError);
      return NextResponse.json(
        { error: "고객 정보 저장 실패", details: customerError.message },
        { status: 500 }
      );
    }

    // 2. estimates 테이블에 견적 데이터 저장
    const { data: estimate, error: estimateError } = await supabase
      .from("estimates")
      .insert({
        customer_id: customer.id,
        form_json: validatedData,
        customer_json: validatedData.customer,
        space_json: validatedData.space,
        crops_json: validatedData.crops,
        system_json: validatedData.system,
        operation_json: validatedData.operation,
        status: "submitted",
      })
      .select()
      .single();

    if (estimateError) {
      console.error("Estimate insert error:", estimateError);
      return NextResponse.json(
        { error: "견적 저장 실패", details: estimateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        estimateId: estimate.id,
        customerId: customer.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("API error:", error);
    
    // Zod 검증 오류
    if (error.issues) {
      return NextResponse.json(
        { error: "입력 데이터 검증 실패", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "서버 오류", details: error.message },
      { status: 500 }
    );
  }
}

