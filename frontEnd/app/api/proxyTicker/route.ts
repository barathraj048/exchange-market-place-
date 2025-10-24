import axios from "axios";
import { NextResponse } from "next/server";

export async function GET() {
  const uri = "https://api.backpack.exchange/api/v1/tickers";

  try {
    const res = await axios.get(uri);

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.error("Error fetching tickers:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
