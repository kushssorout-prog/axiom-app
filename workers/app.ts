import { createRequestHandler } from "react-router";
export { AxiomDO } from "./axiom-do";
export { GeoEngine, JURISDICTIONS } from "./geo-engine";
export { LocalDataProxyService } from "./data-proxy";
export { LocalConnectionsService } from "./connections";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    // Route all /api/* calls to the Durable Object
    // EXCEPT /api/ai/* which are handled by React Router server actions
    if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/ai/') && !url.pathname.startsWith('/api/public/') && !url.pathname.startsWith('/api/telegram/') && !url.pathname.startsWith('/api/discord/')) {
      const id = env.AXIOM_DO.idFromName('global');
      const stub = env.AXIOM_DO.get(id);
      return stub.fetch(request);
    }

    return requestHandler(request, { cloudflare: { env, ctx } });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runMarketingCron(env));
  },
} satisfies ExportedHandler<Env>;

async function runMarketingCron(env: Env) {
  const { createWorkersAI } = await import('workers-ai-provider');
  const { generateText } = await import('ai');

  const workersai = createWorkersAI({ binding: env.AI });

  const verticals = ['legal', 'finance', 'healthcare'];
  const contentTypes = ['linkedin_post', 'blog_intro', 'email_subject'];

  const doId = env.AXIOM_DO.idFromName('global');
  const stub = env.AXIOM_DO.get(doId);

  for (const vertical of verticals) {
    for (const type of contentTypes) {
      try {
        const prompt = getContentPrompt(vertical, type);
        const result = await generateText({
          model: workersai('auto', {}),
          messages: [{ role: 'user', content: prompt }],
          maxTokens: 400,
        });

        await stub.fetch(new Request('http://do/api/marketing/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vertical, type, content: result.text,
            title: `${vertical} ${type} - ${new Date().toISOString().slice(0,10)}`
          })
        }));
      } catch (e) {
        console.error(`Content gen failed: ${vertical} ${type}`, e);
      }
    }
  }
}

function getContentPrompt(vertical: string, type: string): string {
  const verticalContext = {
    legal: 'law firms using AI for legal drafting, compliance, and client advice',
    finance: 'financial services firms using AI for research, trading, and client communications',
    healthcare: 'healthcare organisations using AI for clinical decision support and administrative workflows',
  }[vertical] || vertical;

  const prompts: Record<string, string> = {
    linkedin_post: `Write a compelling LinkedIn post (150-200 words) for Axiom, an AI governance platform for ${verticalContext}. Focus on a specific risk that firms face when using AI without governance. Include a thought-provoking statistic or question. End with a subtle CTA to learn more. Do NOT use hashtags. Tone: authoritative, concerned, helpful. Brand: Axiom (useaxiom.io).`,
    blog_intro: `Write a blog post introduction (200-250 words) for Axiom's blog. Topic: "Why ${vertical === 'legal' ? 'Law Firms' : vertical === 'finance' ? 'Financial Services Firms' : 'Healthcare Organisations'} Cannot Ignore AI Governance in 2026". Open with a compelling scenario or statistic. Establish credibility. Preview what the article will cover. Tone: expert, practical.`,
    email_subject: `Generate 5 cold email subject lines for Axiom targeting ${verticalContext}. Each should be under 50 characters, personalisation-ready (use [FIRM] or [NAME] placeholder), create urgent curiosity about AI risk without being clickbait. Output as a numbered list, subject lines only, no explanations.`,
  };
  return prompts[type] || `Write marketing content for Axiom AI governance platform targeting ${verticalContext}.`;
}
