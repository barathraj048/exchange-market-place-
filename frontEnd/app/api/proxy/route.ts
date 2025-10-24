import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const interval = searchParams.get("interval");
  const startTime = searchParams.get("startTime");
  const endTime = searchParams.get("endTime");

  const targetUrl = `https://api.backpack.exchange/api/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Next.js Server Proxy",
        "Accept": "application/json",
      },
    });

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch from target API" }, { status: 500 });
  }
}
