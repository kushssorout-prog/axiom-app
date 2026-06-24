import { data } from "react-router";
import type { Route } from "./+types/api.telegram.webhook";

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const body = await request.json() as any;

  const message = body.message;
  const callbackQuery = body.callback_query;
  const chatId = message?.chat?.id ?? callbackQuery?.message?.chat?.id;
  const text = (message?.text || "").trim();
  const BOT_TOKEN = (env as any).TELEGRAM_BOT_TOKEN || "";

  async function send(chat: number, msg: string, markup?: any) {
    if (!BOT_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: msg, parse_mode: "HTML", reply_markup: markup }),
    });
  }

  const doId = env.AXIOM_DO.idFromName("global");
  const stub = env.AXIOM_DO.get(doId);

  await stub.fetch(new Request("http://do/api/bots/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: "telegram", chatId: String(chatId) }),
  }));

  if (text === "/start") {
    await send(chatId, `🔐 <b>ACCRNOVA Circuit Breaker</b>\n\nConnected. You'll receive alerts when AI sessions are frozen.\n\nCommands:\n/status — Platform overview\n/approvals — Pending reviews\n/help — All commands`);
  } else if (text === "/status") {
    const res = await stub.fetch(new Request("http://do/api/dashboard"));
    const s = await res.json() as any;
    await send(chatId, `⚡ <b>ACCRNOVA Status</b>\n\n🟢 Circuit Breaker: Active\n📊 Sessions: ${s.totalSessions}\n🛡 Blocked Today: ${s.blockedToday}\n⏳ Pending: ${s.pendingApprovals}\n👥 Operators: ${s.totalOperators}`);
  } else if (text === "/approvals" || text === "/pending") {
    const res = await stub.fetch(new Request("http://do/api/approvals?status=pending"));
    const approvals = await res.json() as any[];
    if (!approvals.length) {
      await send(chatId, "✅ No pending approvals.");
    } else {
      for (const apr of approvals.slice(0, 3)) {
        const preview = (apr.prompt_text || "").slice(0, 120) + "...";
        const kb = { inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve:${apr.id}` },
          { text: "❌ Reject",  callback_data: `reject:${apr.id}`  },
        ]]};
        await send(chatId, `⚠️ <b>Frozen Session</b>\nID: <code>${apr.id}</code>\nRisk: ${apr.risk_score}/100\n\n<i>${preview}</i>`, kb);
      }
      if (approvals.length > 3) await send(chatId, `...and ${approvals.length - 3} more pending. Visit the dashboard to review all.`);
    }
  } else if (text === "/help") {
    await send(chatId, `/start — Connect\n/status — Platform stats\n/approvals — Pending reviews\n/help — This message`);
  }

  if (callbackQuery) {
    const [action, approvalId] = (callbackQuery.data || "").split(":");
    if ((action === "approve" || action === "reject") && approvalId) {
      const decision = action === "approve" ? "approved" : "rejected";
      await stub.fetch(new Request(`http://do/api/approvals/${approvalId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerId: "telegram-bot", reviewerName: `Telegram (chat ${chatId})`, decision, signature: `tg-${Date.now()}`, notes: "Reviewed via Telegram bot" }),
      }));
      const icon = decision === "approved" ? "✅" : "❌";
      await send(chatId, `${icon} <code>${approvalId}</code> <b>${decision}</b>. Logged to Audit Ledger.`);
    }
    if (BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQuery.id }),
      });
    }
  }

  return data({ ok: true });
}
