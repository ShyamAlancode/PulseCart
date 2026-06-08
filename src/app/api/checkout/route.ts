import { auth } from "@/auth";
import { createOrder } from "@/lib/checkout";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Get user session
    const session = await auth();
    const user = session?.user as any;
    
    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be signed in to make a purchase." },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { dropId, productId } = body;

    // 3. Validate required fields
    if (!dropId || !productId) {
      return NextResponse.json(
        { error: "Bad Request", message: "Missing required fields: dropId, productId." },
        { status: 400 }
      );
    }

    // 4. Execute checkout transaction
    const result = await createOrder({
      dropId,
      productId,
      userId: user.id,
      email: user.email || undefined,
    });

    // 5. Check outcome and return status codes accordingly
    if (result.success) {
      return NextResponse.json(
        { success: true, orderId: result.orderId },
        { status: 200 }
      );
    }

    if (result.reason === "SOLD_OUT") {
      return NextResponse.json(
        { success: false, reason: "SOLD_OUT" },
        { status: 409 }
      );
    }

    // Default error case
    return NextResponse.json(
      { success: false, reason: "ERROR" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Critical error in POST /api/checkout:", error);
    return NextResponse.json(
      { success: false, reason: "ERROR", message: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
