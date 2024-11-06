// app/api/create-room/route.ts

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
	const roomId = uuidv4();
	return NextResponse.json({ roomId });
}
