import "server-only";
import { publicConfigured, publicRpc } from "@/lib/crew/public";
export type TemplateCode = "style-1" | "style-2";
export async function activeTemplate(): Promise<TemplateCode> {
  if (!publicConfigured) return "style-1";
  try {
    const code = await publicRpc<string>("public_template", {}, 3000);
    return code === "style-2" ? "style-2" : "style-1";
  } catch {
    return "style-1";
  }
}
