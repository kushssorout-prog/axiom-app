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
} satisfies ExportedHandler<Env>;
