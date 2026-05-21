import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("sessions", "routes/sessions.tsx"),
  route("approvals", "routes/approvals.tsx"),
  route("audit", "routes/audit.tsx"),
  route("operators", "routes/operators.tsx"),
  route("lex", "routes/lex.tsx"),
  route("kinetic", "routes/kinetic.tsx"),
  route("finance", "routes/finance.tsx"),
  route("terminology", "routes/terminology.tsx"),
  route("reports", "routes/reports.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("api/ai/generate", "routes/api.ai.generate.tsx"),
] satisfies RouteConfig;
