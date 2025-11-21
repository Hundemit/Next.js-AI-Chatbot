import { loadInitialSuggestions } from "@/lib/loadDocuments";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const suggestions = await loadInitialSuggestions();
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error loading initial suggestions:", error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
