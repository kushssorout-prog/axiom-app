import type { Route } from "./+types/api.discord.interactions";

async function verifyDiscord(request: Request, pubKey: string): Promise<boolean> {
  const sig = request.headers.get("X-Signature-Ed25519") || "";
  const ts  = request.headers.get("X-Signature-Timestamp") || "";
  if (!sig || !ts) return false;
  try {
    const body = await request.clone().text();
    const msg  = new TextEncoder().encode(ts + body);
    const sigB = new Uint8Array((sig.match(/.{2}/g) || []).map((h: string) => parseInt(h, 16)));
    const keyB = new Uint8Array((pubKey.match(/.{2}/g) || []).map((h: string) => parseInt(h, 16)));
    const key  = await crypto.subtle.importKey("raw", keyB, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, sigB, msg);
  } catch { return false; }
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const PUB_KEY = (env as any).DISCORD_PUBLIC_KEY || "";

  if (PUB_KEY) {
    const ok = await verifyDiscord(request.clone(), PUB_KEY);
    if (!ok) return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json() as any;
  const doId = env.AXIOM_DO.idFromName("global");
  const stub = env.AXIOM_DO.get(doId);

  if (body.type === 1) return Response.json({ type: 1 }); // PING

  if (body.type === 2) { // APPLICATION_COMMAND
    const cmd = body.data?.name;
    await stub.fetch(new Request("http://do/api/bots/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "discord", chatId: body.channel_id || body.guild_id }),
    }));

    if (cmd === "status") {
      const s = await (await stub.fetch(new Request("http://do/api/dashboard"))).json() as any;
      return Response.json({ type: 4, data: { embeds: [{ title: "⚡ Axiom Status", color: 0x0D9488, fields: [
        { name: "🟢 Circuit Breaker", value: "Active", inline: true },
        { name: "📊 Sessions",        value: String(s.totalSessions), inline: true },
        { name: "🛡 Blocked Today",   value: String(s.blockedToday), inline: true },
        { name: "⏳ Pending",         value: String(s.pendingApprovals), inline: true },
        { name: "👥 Operators",       value: String(s.totalOperators), inline: true },
        { name: "📈 Avg Risk (7d)",   value: `${s.avgRisk}/100`, inline: true },
      ], footer: { text: "Axiom · useaxiom.io" } }] } });
    }

    if (cmd === "approvals") {
      const approvals = await (await stub.fetch(new Request("http://do/api/approvals?status=pending"))).json() as any[];
      if (!approvals.length) return Response.json({ type: 4, data: { content: "✅ No pending approvals." } });
      const apr = approvals[0];
      return Response.json({ type: 4, data: {
        embeds: [{ title: "⚠️ Frozen Session", description: (apr.prompt_text || "").slice(0, 200), color: 0xF59E0B,
          fields: [{ name: "Risk", value: `${apr.risk_score}/100`, inline: true }, { name: "Module", value: apr.module || "core", inline: true }, { name: "Total Pending", value: String(approvals.length), inline: true }] }],
        components: [{ type: 1, components: [
          { type: 2, style: 3, label: "✅ Approve", custom_id: `approve:${apr.id}` },
          { type: 2, style: 4, label: "❌ Reject",  custom_id: `reject:${apr.id}`  },
          { type: 2, style: 5, label: "Open Dashboard", url: "https://axiom-app-d1wced.camelai.app/approvals" },
        ]}],
      }});
    }
  }

  if (body.type === 3) { // MESSAGE_COMPONENT (button)
    const [act, id] = (body.data?.custom_id || "").split(":");
    if ((act === "approve" || act === "reject") && id) {
      const decision = act === "approve" ? "approved" : "rejected";
      await stub.fetch(new Request(`http://do/api/approvals/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: body.member?.user?.id || "discord", reviewerName: body.member?.user?.username || "Discord", decision, signature: `dc-${Date.now()}`, notes: "Reviewed via Discord bot" }),
      }));
      return Response.json({ type: 4, data: { content: `${act === "approve" ? "✅" : "❌"} **${id}** ${decision} by <@${body.member?.user?.id}>. Logged.` } });
    }
  }

  return Response.json({ type: 4, data: { content: "Unknown command." } });
}
