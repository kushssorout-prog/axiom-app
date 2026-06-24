import { data } from "react-router";
import type { Route } from "./+types/api.public.check";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = await request.json() as any;
  const apiKey = request.headers.get("X-Axiom-Key") || body.apiKey || "";

  if (!apiKey) return data({ error: "API key required. Pass X-ACCRNOVA-Key header." }, { status: 401 });

  const doId = env.AXIOM_DO.idFromName("global");
  const stub  = env.AXIOM_DO.get(doId);

  const keyRes  = await stub.fetch(new Request("http://do/api/keys/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: apiKey }) }));
  const keyData = await keyRes.json() as any;
  if (!keyData.valid) return data({ error: "Invalid or revoked API key." }, { status: 401 });

  if (!body.prompt) return data({ error: "prompt is required" }, { status: 400 });

  const sessRes  = await stub.fetch(new Request("http://do/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operatorId: keyData.operatorId, operatorName: keyData.operatorName, sessionType: body.sessionType || "general", module: body.module || "core", promptText: body.prompt }),
  }));
  const sess = await sessRes.json() as any;

  return data({
    sessionId:     sess.sessionId,
    status:        sess.status,
    allowed:       sess.status !== "blocked",
    riskScore:     sess.riskScore,
    energyScore:   sess.energyScore,
    triggeredRules: (sess.triggeredRules || []).map((r: any) => ({ name: r.name, severity: r.severity, scoreImpact: r.score_impact })),
    approvalId:    sess.approvalId || null,
    message:       sess.status === "blocked" ? "Session blocked by Circuit Breaker. No AI call made." :
                   sess.status === "frozen"  ? "Session frozen. Human approval required." : "Session cleared.",
  });
}
