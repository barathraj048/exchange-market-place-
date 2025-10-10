import { NextResponse } from "next/server";

export async function GET() {
  const uri = "https://api.backpack.exchange/api/v1/markets";

  try {
    const res = await fetch(uri, {
      headers: {
        "Content-Type": "application/json",
      },
      // Avoid Next.js caching issues (optional)
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Upstream API Error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
