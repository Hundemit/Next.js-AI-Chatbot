import { getAllDiagnostics } from "@/lib/diagnosticStore";

export async function GET() {
  return Response.json(getAllDiagnostics());
}
