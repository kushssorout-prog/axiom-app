import type { Route } from "./+types/api.ai.generate";
import { createWorkersAI } from "workers-ai-provider";
import { streamText } from "ai";

export async function action({ request, context }: Route.ActionArgs) {
  const { sessionId, prompt, module, sessionType, operatorId } =
    await request.json() as { sessionId: string; prompt: string; module: string; sessionType: string; operatorId?: string };

  const env = context.cloudflare.env;
  const doId = env.AXIOM_DO.idFromName("global");
  const stub = env.AXIOM_DO.get(doId);

  // Load active compliance rules from DO once — used for mid-stream evaluation
  const rulesRes = await stub.fetch(
    new Request("http://do/api/compliance-rules", { method: "GET" })
  );
  const allRules = (await rulesRes.json()) as any[];
  const activeRules = allRules.filter((r: any) => r.is_active);

  const sectorMap: Record<string, string> = {
    legal: "law firm",
    finance: "financial services firm",
    intelligence: "professional services firm",
    pricing: "professional services firm",
  };
  const sector = sectorMap[module] ?? "professional services firm";

  const systemPrompt = [
    `You are Axiom, the compliant AI assistant for a ${sector}.`,
    `Provide accurate, measured, professional responses.`,
    `Acknowledge limits of AI and defer to human judgment for consequential decisions.`,
    `Never disclose confidential client information, settlement amounts, privileged communications, or insider information.`,
    `Keep responses factual, sourced where possible, and 3–5 paragraphs.`,
  ].join(" ");

  const workersai = createWorkersAI({ binding: env.AI });

  const encoder = new TextEncoder();

  // ── Mid-stream compliance state ──────────────────────────────────────────
  let accumulated = "";
  let midRiskScore = 0;
  let halted = false;
  const triggeredMidStream: any[] = [];
  const checkedRuleIds = new Set<string>();

  // Evaluate accumulated text against rules not yet triggered.
  // Called every ~50 chars of new output to catch violations early.
  function evaluateAccumulated(): { newScore: number; newRules: any[] } {
    const lower = accumulated.toLowerCase();
    let newScore = 0;
    const newRules: any[] = [];
    for (const rule of activeRules) {
      if (checkedRuleIds.has(rule.id)) continue;
      const keywords = String(rule.keywords || "")
        .split(",")
        .map((k: string) => k.trim().toLowerCase())
        .filter(Boolean);
      const hit = keywords.some((k) => lower.includes(k));
      if (hit) {
        newScore += rule.score_impact ?? 15;
        newRules.push(rule);
        triggeredMidStream.push(rule);
        checkedRuleIds.add(rule.id);
      }
    }
    return { newScore, newRules };
  }

  // ── Build streaming response ─────────────────────────────────────────────
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  // Run the stream pipeline in the background — the Response returns immediately
  // and Cloudflare keeps the Worker alive until writer.close() is called.
  const ctx = context.cloudflare.ctx;
  ctx.waitUntil(
    (async () => {
      try {
        const result = streamText({
          model: workersai("auto", {}),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          maxTokens: 1200,
        });

        let charsSinceLastCheck = 0;

        for await (const chunk of result.textStream) {
          if (halted) break;

          accumulated += chunk;
          charsSinceLastCheck += chunk.length;

          // Send chunk immediately to client
          const line = JSON.stringify({ type: "chunk", text: chunk }) + "\n";
          await writer.write(encoder.encode(line));

          // Evaluate every ~60 chars of new output
          if (charsSinceLastCheck >= 60) {
            charsSinceLastCheck = 0;
            const { newScore, newRules } = evaluateAccumulated();

            if (newScore > 0) {
              midRiskScore += newScore;

              // Broadcast live risk update to client
              const riskLine = JSON.stringify({
                type: "risk_update",
                riskScore: midRiskScore,
                newRules: newRules.map((r) => ({ name: r.name, severity: r.severity })),
              }) + "\n";
              await writer.write(encoder.encode(riskLine));

              // MID-STREAM HALT threshold
              if (midRiskScore >= 40) {
                halted = true;

                // Tell the client the stream was intercepted
                const haltLine = JSON.stringify({
                  type: "halt",
                  reason: "mid_stream_intercept",
                  riskScore: midRiskScore,
                  interceptedAtChar: accumulated.length,
                  triggeredRules: triggeredMidStream.map((r) => ({
                    name: r.name,
                    severity: r.severity,
                    score: r.score_impact,
                  })),
                  partialText: accumulated,
                }) + "\n";
                await writer.write(encoder.encode(haltLine));

                // Persist halt in DO
                await stub.fetch(
                  new Request(
                    `http://do/api/sessions/${sessionId}/midstream-halt`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        riskScore: midRiskScore,
                        triggeredRules: triggeredMidStream,
                        accumulated: accumulated.slice(0, 500),
                      }),
                    }
                  )
                );
                break;
              }
            }
          }
        }

        if (!halted) {
          // Persist completed session
          const usage = await result.usage;
          const totalTokens = usage?.totalTokens ?? 0;

          await stub.fetch(
            new Request(`http://do/api/sessions/${sessionId}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                responseText: accumulated,
                tokensUsed: totalTokens,
              }),
            })
          );

          const doneLine = JSON.stringify({
            type: "done",
            tokensUsed: totalTokens,
            riskScore: midRiskScore,
            finalRiskScore: midRiskScore,
          }) + "\n";
          await writer.write(encoder.encode(doneLine));
        }
      } catch (err: any) {
        const errLine =
          JSON.stringify({ type: "error", message: err.message }) + "\n";
        try {
          await writer.write(encoder.encode(errLine));
        } catch {}
      } finally {
        try {
          await writer.close();
        } catch {}
      }
    })()
  );

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
