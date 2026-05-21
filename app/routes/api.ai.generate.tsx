import type { Route } from './+types/api.ai.generate';
import { data } from 'react-router';
import { createWorkersAI } from 'workers-ai-provider';
import { generateText } from 'ai';

export async function action({ request, context }: Route.ActionArgs) {
  const { sessionId, prompt, module, sessionType } = await request.json() as {
    sessionId: string;
    prompt: string;
    module: string;
    sessionType: string;
  };

  const env = context.cloudflare.env as any;

  const sectorLabel =
    module === 'legal' ? 'law firms' :
    module === 'finance' ? 'financial services' :
    module === 'intelligence' ? 'intelligence and research teams' :
    module === 'kinetic' ? 'robotics and automation' :
    module === 'pricing' ? 'pricing and commercial strategy' :
    'professional services';

  const systemPrompt = `You are Axiom, a compliant AI assistant for ${sectorLabel}. You provide accurate, measured, professional responses. You acknowledge the limits of AI and defer to human judgment for consequential decisions. Keep responses concise and professional (2-4 paragraphs max). Do not fabricate facts, case names, or figures. Always note if something requires professional review.`;

  const workersai = createWorkersAI({ binding: env.AI });

  const result = await generateText({
    model: workersai('auto', {}),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  });

  // Complete the session in the Durable Object
  const doId = env.AXIOM_DO.idFromName('global');
  const stub = env.AXIOM_DO.get(doId);
  await stub.fetch(
    new Request('http://do/api/sessions/' + sessionId + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responseText: result.text,
        tokensUsed: result.usage?.totalTokens || 0,
      }),
    })
  );

  return data({
    responseText: result.text,
    tokensUsed: result.usage?.totalTokens || 0,
  });
}
