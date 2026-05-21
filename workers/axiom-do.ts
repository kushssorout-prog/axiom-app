import { DurableObject } from "cloudflare:workers";

export class AxiomDO extends DurableObject<Env> {
  sql = this.ctx.storage.sql;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.initSchema();
    // Seed demo user asynchronously before any requests are handled
    ctx.blockConcurrencyWhile(() => this.seedDemoUser());
  }

  private async seedDemoUser() {
    const existing = this.sql.exec("SELECT COUNT(*) as c FROM operators WHERE email='admin@firm.com'").toArray()[0] as any;
    if (existing?.c > 0) return;
    await this.createOperator({
      name: 'Axiom Admin',
      email: 'admin@firm.com',
      password: 'axiom2026',
      role: 'admin',
      department: 'Platform Administration'
    });
  }

  private initSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS operators (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'operator',
        department TEXT,
        public_key TEXT,
        approval_score INTEGER DEFAULT 100,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS operator_sessions (
        id TEXT PRIMARY KEY,
        operator_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS compliance_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        keywords TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        sector TEXT NOT NULL DEFAULT 'all',
        score_impact INTEGER DEFAULT 15,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS ai_sessions (
        id TEXT PRIMARY KEY,
        operator_id TEXT NOT NULL,
        operator_name TEXT,
        session_type TEXT NOT NULL DEFAULT 'general',
        module TEXT NOT NULL DEFAULT 'core',
        prompt_text TEXT NOT NULL,
        response_text TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        risk_score INTEGER DEFAULT 0,
        energy_score REAL DEFAULT 0,
        compliance_violations TEXT DEFAULT '[]',
        triggered_rules TEXT DEFAULT '[]',
        model_used TEXT DEFAULT 'auto',
        tokens_used INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        completed_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS circuit_breaker_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        rule_ids TEXT DEFAULT '[]',
        risk_score_at_event INTEGER DEFAULT 0,
        energy_score REAL DEFAULT 0,
        context_snapshot TEXT DEFAULT '{}',
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        requester_id TEXT NOT NULL,
        reviewer_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        signature TEXT,
        signed_payload TEXT,
        notes TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        reviewed_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        actor_id TEXT,
        actor_name TEXT,
        resource_type TEXT,
        resource_id TEXT,
        payload TEXT DEFAULT '{}',
        prev_hash TEXT,
        hash TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS terminology_base (
        id TEXT PRIMARY KEY,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        framework TEXT,
        sector TEXT DEFAULT 'all',
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS value_attribution_records (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        operator_id TEXT,
        ai_percentage REAL NOT NULL DEFAULT 70,
        human_percentage REAL NOT NULL DEFAULT 30,
        ai_tokens INTEGER DEFAULT 0,
        human_review_minutes REAL DEFAULT 0,
        base_rate REAL DEFAULT 500,
        scarcity_multiplier REAL DEFAULT 1.0,
        final_value REAL DEFAULT 0,
        module TEXT DEFAULT 'core',
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS compliance_boundaries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        centroid_preview TEXT,
        dimensions INTEGER DEFAULT 512,
        critical_radius REAL NOT NULL DEFAULT 0.3,
        severity_weight REAL DEFAULT 1.0,
        sector TEXT DEFAULT 'all',
        breach_count INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS kinetic_sessions (
        id TEXT PRIMARY KEY,
        operator_id TEXT,
        frame_count INTEGER DEFAULT 0,
        halt_triggered INTEGER DEFAULT 0,
        max_energy REAL DEFAULT 0,
        trajectory_log TEXT DEFAULT '[]',
        status TEXT DEFAULT 'running',
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id TEXT PRIMARY KEY,
        operator_id TEXT,
        asset_value REAL NOT NULL,
        leverage_ratio REAL NOT NULL,
        liquidity_index REAL NOT NULL,
        counterparty_tier INTEGER DEFAULT 1,
        risk_vector TEXT DEFAULT '[]',
        energy_score REAL DEFAULT 0,
        status TEXT DEFAULT 'approved',
        rejection_reason TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        operator_id TEXT NOT NULL,
        name TEXT NOT NULL,
        key_hash TEXT UNIQUE NOT NULL,
        key_prefix TEXT NOT NULL,
        scopes TEXT DEFAULT '["sessions","approvals","audit"]',
        is_active INTEGER DEFAULT 1,
        last_used_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_operator_id TEXT NOT NULL,
        referral_code TEXT UNIQUE NOT NULL,
        referred_email TEXT,
        status TEXT DEFAULT 'pending',
        reward_credited INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        converted_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS bot_connections (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        operator_id TEXT,
        chat_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS scheduled_content (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        scheduled_at INTEGER,
        published_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS geo_assessments (
        id TEXT PRIMARY KEY,
        operator_id TEXT,
        context TEXT NOT NULL,
        iso2_primary TEXT NOT NULL,
        iso2_secondary TEXT,
        iso2_transit TEXT,
        energy_score REAL NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_tier TEXT NOT NULL,
        warnings TEXT DEFAULT '[]',
        flags TEXT DEFAULT '[]',
        recommendation TEXT,
        module TEXT DEFAULT 'finance',
        created_at INTEGER DEFAULT (unixepoch())
      );
    `);
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const existing = this.sql.exec("SELECT COUNT(*) as c FROM compliance_rules").toArray()[0] as any;
    if (existing.c > 0) return;

    const rules = [
      { id: 'r1', name: 'Attorney-Client Privilege Guard', category: 'legal', keywords: 'privilege,privileged,confidential communication,attorney client', severity: 'critical', sector: 'legal', score: 40 },
      { id: 'r2', name: 'Client Confidentiality Guard', category: 'legal', keywords: 'settlement amount,settlement value,disclose,confidential,opposing counsel', severity: 'critical', sector: 'legal', score: 40 },
      { id: 'r3', name: 'Work Product Doctrine', category: 'legal', keywords: 'work product,litigation strategy,mental impressions', severity: 'high', sector: 'legal', score: 25 },
      { id: 'r4', name: 'Insider Trading Guard', category: 'financial', keywords: 'insider,material non-public,MNPI,undisclosed,front-run', severity: 'critical', sector: 'financial', score: 40 },
      { id: 'r5', name: 'SEC Regulation Boundary', category: 'financial', keywords: 'pump and dump,market manipulation,wash trading,spoofing', severity: 'critical', sector: 'financial', score: 40 },
      { id: 'r6', name: 'MiFID II Compliance', category: 'financial', keywords: 'best execution,inducement,conflict of interest,PRIIPs', severity: 'high', sector: 'financial', score: 25 },
      { id: 'r7', name: 'PII Data Guard', category: 'privacy', keywords: 'social security,date of birth,passport number,bank account number', severity: 'high', sector: 'all', score: 25 },
      { id: 'r8', name: 'GDPR Boundary', category: 'privacy', keywords: 'personal data,data subject,biometric,health data', severity: 'medium', sector: 'all', score: 15 },
      { id: 'r9', name: 'Hallucination Guard', category: 'quality', keywords: 'definitively,absolutely certain,guaranteed,100% sure,no doubt', severity: 'medium', sector: 'all', score: 15 },
      { id: 'r10', name: 'Scope Drift Detector', category: 'governance', keywords: 'I recommend you,you should invest,personal advice,diagnosis', severity: 'medium', sector: 'all', score: 15 },
      { id: 'r11', name: 'Toxicity Filter', category: 'safety', keywords: 'illegal,fraudulent,deceive,exploit,manipulate client', severity: 'high', sector: 'all', score: 25 },
      { id: 'h1', name: 'PHI Identifier Guard', category: 'hipaa', keywords: 'date of birth,social security,medical record number,MRN,patient name,health plan,account number', severity: 'critical', sector: 'healthcare', score: 40 },
      { id: 'h2', name: 'Diagnosis Code Filter', category: 'hipaa', keywords: 'ICD-10,diagnosis code,clinical finding,prognosis,condition code', severity: 'high', sector: 'healthcare', score: 25 },
      { id: 'h3', name: 'Prescription Safety Gate', category: 'hipaa', keywords: 'prescribe,dosage,milligrams,medication order,drug interaction,controlled substance', severity: 'critical', sector: 'healthcare', score: 40 },
      { id: 'h4', name: '42 CFR Part 2 Guard', category: 'hipaa', keywords: 'substance abuse,addiction treatment,rehab,methadone,suboxone,treatment program records', severity: 'critical', sector: 'healthcare', score: 40 },
      { id: 'h5', name: 'Provider Communication Guard', category: 'hipaa', keywords: 'patient told me,my patient,clinical notes,chart says,discharge summary', severity: 'high', sector: 'healthcare', score: 25 },
    ];
    for (const r of rules) {
      this.sql.exec(
        `INSERT OR IGNORE INTO compliance_rules (id,name,category,keywords,severity,sector,score_impact,rule_type) VALUES (?,?,?,?,?,?,?,'keyword')`,
        r.id, r.name, r.category, r.keywords, r.severity, r.sector, r.score
      );
    }

    const terms = [
      { id: 't1', term: 'Circuit Breaker', definition: 'A compliance mechanism that intercepts AI output before it reaches the operator when policy boundaries are crossed.', framework: 'Axiom Core', sector: 'all' },
      { id: 't2', term: 'Attorney-Client Privilege', definition: 'Legal protection of communications between client and attorney from disclosure. AI must never suggest waiving or compromising this protection.', framework: 'ABA Model Rules', sector: 'legal' },
      { id: 't3', term: 'Work Product Doctrine', definition: 'Protection for materials prepared in anticipation of litigation. AI outputs touch this doctrine.', framework: 'FRCP 26(b)(3)', sector: 'legal' },
      { id: 't4', term: 'MNPI', definition: 'Material Non-Public Information. AI must not generate content that appears to utilise or advise trading on MNPI.', framework: 'SEC Rule 10b-5', sector: 'financial' },
      { id: 't5', term: 'Best Execution', definition: 'Obligation under MiFID II to take all sufficient steps to obtain the best possible result for clients.', framework: 'MiFID II Article 27', sector: 'financial' },
    ];
    for (const t of terms) {
      this.sql.exec(
        `INSERT OR IGNORE INTO terminology_base (id,term,definition,framework,sector) VALUES (?,?,?,?,?)`,
        t.id, t.term, t.definition, t.framework, t.sector
      );
    }

    const boundaries = [
      { id: 'b1', name: 'Legal Privilege Zone', description: 'Protects attorney-client privilege and work product doctrine boundaries', radius: 0.35, weight: 2.5, sector: 'legal' },
      { id: 'b2', name: 'Financial Regulatory Zone', description: 'SEC, MiFID II, and insider trading compliance boundary', radius: 0.40, weight: 3.0, sector: 'financial' },
      { id: 'b3', name: 'PII Protection Zone', description: 'Personal identifiable information and biometric data boundary', radius: 0.30, weight: 2.0, sector: 'all' },
      { id: 'b4', name: 'Scope Integrity Zone', description: 'Prevents AI from providing advice outside its authorised scope', radius: 0.25, weight: 1.5, sector: 'all' },
    ];
    for (const b of boundaries) {
      this.sql.exec(
        `INSERT OR IGNORE INTO compliance_boundaries (id,name,description,critical_radius,severity_weight,sector) VALUES (?,?,?,?,?,?)`,
        b.id, b.name, b.description, b.radius, b.weight, b.sector
      );
    }
  }

  // ── AUTH ──
  async createOperator(data: { name: string; email: string; password: string; role?: string; department?: string }) {
    const id = crypto.randomUUID();
    const hash = await this.hashPassword(data.password);
    this.sql.exec(
      `INSERT INTO operators (id,name,email,password_hash,role,department) VALUES (?,?,?,?,?,?)`,
      id, data.name, data.email, hash, data.role || 'operator', data.department || null
    );
    this.writeAudit('operator.created', id, id, 'operator', id, { name: data.name, email: data.email });
    return this.sql.exec(`SELECT id,name,email,role,department,approval_score,is_active,created_at FROM operators WHERE id=?`, id).toArray()[0] || null;
  }

  async loginOperator(email: string, password: string) {
    const op = this.sql.exec(`SELECT * FROM operators WHERE email=? AND is_active=1`, email).toArray()[0] as any;
    if (!op) return null;
    const ok = await this.verifyPassword(password, op.password_hash);
    if (!ok) return null;
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expires = Math.floor(Date.now() / 1000) + 86400 * 7;
    this.sql.exec(`INSERT INTO operator_sessions (id,operator_id,token,expires_at) VALUES (?,?,?,?)`,
      crypto.randomUUID(), op.id, token, expires);
    return { token, operator: { id: op.id, name: op.name, email: op.email, role: op.role, approval_score: op.approval_score } };
  }

  async verifyToken(token: string) {
    const sess = this.sql.exec(
      `SELECT os.*, o.name, o.email, o.role, o.approval_score, o.department, o.public_key FROM operator_sessions os JOIN operators o ON os.operator_id=o.id WHERE os.token=? AND os.expires_at > ?`,
      token, Math.floor(Date.now() / 1000)
    ).toArray()[0] as any;
    return sess || null;
  }

  async logoutOperator(token: string) {
    this.sql.exec(`DELETE FROM operator_sessions WHERE token=?`, token);
  }

  // ── SESSIONS ──
  async submitSession(data: { operatorId: string; operatorName: string; sessionType: string; module: string; promptText: string }) {
    const sessionId = 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const rules = this.sql.exec(`SELECT * FROM compliance_rules WHERE is_active=1`).toArray() as any[];
    const terms = this.sql.exec(`SELECT * FROM terminology_base WHERE is_active=1`).toArray() as any[];
    const { riskScore, triggeredRules, energyScore } = this.evaluateCompliance(data.promptText, rules, data.module);

    let status = 'pending';
    if (riskScore >= 80) status = 'blocked';
    else if (riskScore >= 40) status = 'frozen';

    const violations = triggeredRules.map((r: any) => r.name);

    this.sql.exec(
      `INSERT INTO ai_sessions (id,operator_id,operator_name,session_type,module,prompt_text,status,risk_score,energy_score,compliance_violations,triggered_rules) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      sessionId, data.operatorId, data.operatorName, data.sessionType, data.module,
      data.promptText, status, riskScore, energyScore,
      JSON.stringify(violations), JSON.stringify(triggeredRules.map((r: any) => r.id))
    );

    this.sql.exec(
      `INSERT INTO circuit_breaker_events (id,session_id,event_type,rule_ids,risk_score_at_event,energy_score) VALUES (?,?,?,?,?,?)`,
      crypto.randomUUID(), sessionId, status === 'blocked' ? 'preflight_blocked' : status === 'frozen' ? 'preflight_frozen' : 'preflight_passed',
      JSON.stringify(triggeredRules.map((r: any) => r.id)), riskScore, energyScore
    );

    this.writeAudit('session.created', data.operatorId, data.operatorName, 'session', sessionId, { status, riskScore, module: data.module });

    if (status === 'frozen') {
      const approvalId = 'apr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      this.sql.exec(
        `INSERT INTO approval_requests (id,session_id,requester_id,status) VALUES (?,?,?,'pending')`,
        approvalId, sessionId, data.operatorId
      );
      this.writeAudit('approval.requested', data.operatorId, data.operatorName, 'approval', approvalId, { sessionId, riskScore });
      return { sessionId, status, riskScore, energyScore, triggeredRules, approvalId };
    }

    return { sessionId, status, riskScore, energyScore, triggeredRules };
  }

  async midstreamHalt(sessionId: string, riskScore: number, triggeredRules: any[], accumulated: string) {
    const now = Math.floor(Date.now() / 1000);
    // Freeze the session — wipe partial response, create approval request
    this.sql.exec(
      `UPDATE ai_sessions SET status='frozen', risk_score=?, compliance_violations=?, triggered_rules=?, response_text=NULL, completed_at=? WHERE id=?`,
      riskScore,
      JSON.stringify(triggeredRules.map((r: any) => r.name)),
      JSON.stringify(triggeredRules.map((r: any) => r.id)),
      now, sessionId
    );
    const session = this.sql.exec(`SELECT * FROM ai_sessions WHERE id=?`, sessionId).toArray()[0] as any;
    const approvalId = 'apr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.sql.exec(
      `INSERT INTO approval_requests (id, session_id, requester_id, status) VALUES (?, ?, ?, 'pending')`,
      approvalId, sessionId, session?.operator_id || 'system'
    );
    // Log Circuit Breaker mid-stream event
    this.sql.exec(
      `INSERT INTO circuit_breaker_events (id, session_id, event_type, rule_ids, risk_score_at_event, context_snapshot) VALUES (?, ?, 'midstream_frozen', ?, ?, ?)`,
      crypto.randomUUID(), sessionId,
      JSON.stringify(triggeredRules.map((r: any) => r.id)),
      riskScore,
      JSON.stringify({ interceptedAt: accumulated?.length || 0, partialResponseChars: accumulated?.length || 0 })
    );
    this.writeAudit('session.midstream_halt', session?.operator_id, session?.operator_name, 'session', sessionId, { riskScore, rules: triggeredRules.map((r: any) => r.name), interceptedAt: accumulated?.length || 0 });
    return { ok: true, approvalId };
  }

  async completeSession(sessionId: string, responseText: string, tokensUsed: number) {
    const now = Math.floor(Date.now() / 1000);
    this.sql.exec(
      `UPDATE ai_sessions SET status='completed',response_text=?,tokens_used=?,completed_at=? WHERE id=?`,
      responseText, tokensUsed, now, sessionId
    );
    const session = this.sql.exec(`SELECT * FROM ai_sessions WHERE id=?`, sessionId).toArray()[0] as any;
    const aiPct = Math.round(60 + Math.random() * 30);
    const humanPct = 100 - aiPct;
    const baseRate = 500;
    const scarcity = humanPct > 40 ? 1.5 : 1.0;
    const finalValue = Math.round((aiPct * baseRate * 0.3 / 100 + humanPct * baseRate * scarcity / 100) * 10) / 10;
    this.sql.exec(
      `INSERT INTO value_attribution_records (id,session_id,operator_id,ai_percentage,human_percentage,ai_tokens,base_rate,scarcity_multiplier,final_value,module) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      crypto.randomUUID(), sessionId, session?.operator_id, aiPct, humanPct, tokensUsed, baseRate, scarcity, finalValue, session?.module || 'core'
    );
    return { ok: true };
  }

  async getSessions(operatorId?: string, limit = 50) {
    if (operatorId) {
      return this.sql.exec(`SELECT * FROM ai_sessions WHERE operator_id=? ORDER BY created_at DESC LIMIT ?`, operatorId, limit).toArray();
    }
    return this.sql.exec(`SELECT * FROM ai_sessions ORDER BY created_at DESC LIMIT ?`, limit).toArray();
  }

  async getSession(id: string) {
    return this.sql.exec(`SELECT * FROM ai_sessions WHERE id=?`, id).toArray()[0] || null;
  }

  // ── APPROVALS ──
  async getApprovals(status?: string) {
    if (status) return this.sql.exec(`SELECT ar.*, s.prompt_text, s.risk_score, s.module, s.session_type FROM approval_requests ar JOIN ai_sessions s ON ar.session_id=s.id WHERE ar.status=? ORDER BY ar.created_at DESC`, status).toArray();
    return this.sql.exec(`SELECT ar.*, s.prompt_text, s.risk_score, s.module, s.session_type FROM approval_requests ar JOIN ai_sessions s ON ar.session_id=s.id ORDER BY ar.created_at DESC LIMIT 100`).toArray();
  }

  async reviewApproval(approvalId: string, reviewerId: string, reviewerName: string, decision: 'approved' | 'rejected', signature: string, notes: string) {
    const now = Math.floor(Date.now() / 1000);
    this.sql.exec(
      `UPDATE approval_requests SET status=?,reviewer_id=?,signature=?,notes=?,reviewed_at=? WHERE id=?`,
      decision, reviewerId, signature, notes, now, approvalId
    );
    const approval = this.sql.exec(`SELECT * FROM approval_requests WHERE id=?`, approvalId).toArray()[0] as any;
    if (approval && decision === 'approved') {
      this.sql.exec(`UPDATE ai_sessions SET status='approved' WHERE id=?`, approval.session_id);
    }
    this.sql.exec(
      `UPDATE operators SET approval_score=MIN(100,approval_score+1) WHERE id=?`, reviewerId
    );
    this.writeAudit('approval.' + decision, reviewerId, reviewerName, 'approval', approvalId, { decision, notes });
    return { ok: true };
  }

  // ── AUDIT ──
  async getAuditLog(limit = 100, offset = 0) {
    return this.sql.exec(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?`, limit, offset).toArray();
  }

  async getAuditCount() {
    return (this.sql.exec(`SELECT COUNT(*) as c FROM audit_log`).toArray()[0] as any)?.c || 0;
  }

  // ── OPERATORS ──
  async getOperators() {
    return this.sql.exec(`SELECT id,name,email,role,department,approval_score,is_active,public_key,created_at FROM operators ORDER BY created_at DESC`).toArray();
  }

  async updateOperator(id: string, data: { role?: string; department?: string; public_key?: string; is_active?: number }) {
    if (data.role !== undefined) this.sql.exec(`UPDATE operators SET role=? WHERE id=?`, data.role, id);
    if (data.department !== undefined) this.sql.exec(`UPDATE operators SET department=? WHERE id=?`, data.department, id);
    if (data.public_key !== undefined) this.sql.exec(`UPDATE operators SET public_key=? WHERE id=?`, data.public_key, id);
    if (data.is_active !== undefined) this.sql.exec(`UPDATE operators SET is_active=? WHERE id=?`, data.is_active, id);
    return this.sql.exec(`SELECT id,name,email,role,department,approval_score,is_active,public_key FROM operators WHERE id=?`, id).toArray()[0] || null;
  }

  // ── COMPLIANCE RULES ──
  async getComplianceRules() {
    return this.sql.exec(`SELECT * FROM compliance_rules ORDER BY severity DESC, created_at DESC`).toArray();
  }

  async toggleRule(id: string, isActive: number) {
    this.sql.exec(`UPDATE compliance_rules SET is_active=? WHERE id=?`, isActive, id);
    return { ok: true };
  }

  // ── TERMINOLOGY ──
  async getTerminology() {
    return this.sql.exec(`SELECT * FROM terminology_base ORDER BY term ASC`).toArray();
  }

  async upsertTerm(data: { id?: string; term: string; definition: string; framework: string; sector: string }) {
    const id = data.id || crypto.randomUUID();
    this.sql.exec(
      `INSERT OR REPLACE INTO terminology_base (id,term,definition,framework,sector) VALUES (?,?,?,?,?)`,
      id, data.term, data.definition, data.framework || '', data.sector || 'all'
    );
    return { id };
  }

  async deleteTerm(id: string) {
    this.sql.exec(`DELETE FROM terminology_base WHERE id=?`, id);
    return { ok: true };
  }

  // ── AXIOM-LEX ──
  async getBoundaries() {
    return this.sql.exec(`SELECT * FROM compliance_boundaries ORDER BY created_at DESC`).toArray();
  }

  async upsertBoundary(data: { id?: string; name: string; description: string; critical_radius: number; severity_weight: number; sector: string }) {
    const id = data.id || 'b_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.sql.exec(
      `INSERT OR REPLACE INTO compliance_boundaries (id,name,description,critical_radius,severity_weight,sector) VALUES (?,?,?,?,?,?)`,
      id, data.name, data.description || '', data.critical_radius, data.severity_weight, data.sector
    );
    return { id };
  }

  async deleteBoundary(id: string) {
    this.sql.exec(`DELETE FROM compliance_boundaries WHERE id=?`, id);
    return { ok: true };
  }

  // ── KINETIC ──
  async createKineticSession(operatorId: string) {
    const id = 'kin_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    this.sql.exec(`INSERT INTO kinetic_sessions (id,operator_id) VALUES (?,?)`, id, operatorId);
    return { id };
  }

  async logKineticHalt(sessionId: string, trajectory: any[], maxEnergy: number) {
    this.sql.exec(
      `UPDATE kinetic_sessions SET halt_triggered=1,max_energy=?,trajectory_log=?,status='halted',frame_count=? WHERE id=?`,
      maxEnergy, JSON.stringify(trajectory.slice(-20)), trajectory.length, sessionId
    );
    this.writeAudit('kinetic.halt', null, 'System', 'kinetic_session', sessionId, { maxEnergy, frames: trajectory.length });
    return { ok: true };
  }

  // ── FINANCE ──
  async evaluateTransaction(data: { operatorId: string; assetValue: number; leverageRatio: number; liquidityIndex: number; counterpartyTier: number }) {
    const id = 'fin_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const energyScore = this.computeFinancialEnergy(data.assetValue, data.leverageRatio, data.liquidityIndex, data.counterpartyTier);
    const status = energyScore > 75 ? 'rejected' : energyScore > 50 ? 'flagged' : 'approved';
    const rejectionReason = energyScore > 75 ? 'Risk vector exceeds safe-operating boundary — execution revoked.' : null;
    this.sql.exec(
      `INSERT INTO financial_transactions (id,operator_id,asset_value,leverage_ratio,liquidity_index,counterparty_tier,energy_score,status,rejection_reason) VALUES (?,?,?,?,?,?,?,?,?)`,
      id, data.operatorId, data.assetValue, data.leverageRatio, data.liquidityIndex, data.counterpartyTier, energyScore, status, rejectionReason
    );
    if (status === 'rejected') this.writeAudit('finance.rejected', data.operatorId, null, 'transaction', id, { energyScore });
    return { id, energyScore, status, rejectionReason };
  }

  async getTransactions(limit = 50) {
    return this.sql.exec(`SELECT * FROM financial_transactions ORDER BY created_at DESC LIMIT ?`, limit).toArray();
  }

  // ── ATTRIBUTION ──
  async getAttributionRecords(limit = 100) {
    return this.sql.exec(`SELECT var.*, s.session_type, s.module FROM value_attribution_records var LEFT JOIN ai_sessions s ON var.session_id=s.id ORDER BY var.created_at DESC LIMIT ?`, limit).toArray();
  }

  // ── REPORTS ──
  async generateReport(dateFrom: number, dateTo: number) {
    const sessions = this.sql.exec(`SELECT * FROM ai_sessions WHERE created_at BETWEEN ? AND ?`, dateFrom, dateTo).toArray() as any[];
    const events = this.sql.exec(`SELECT * FROM circuit_breaker_events WHERE created_at BETWEEN ? AND ?`, dateFrom, dateTo).toArray() as any[];
    const approvals = this.sql.exec(`SELECT * FROM approval_requests WHERE created_at BETWEEN ? AND ?`, dateFrom, dateTo).toArray() as any[];
    const total = sessions.length;
    const blocked = sessions.filter((s: any) => s.status === 'blocked').length;
    const frozen = sessions.filter((s: any) => s.status === 'frozen').length;
    const completed = sessions.filter((s: any) => s.status === 'completed').length;
    const avgRisk = total > 0 ? sessions.reduce((a: number, s: any) => a + (s.risk_score || 0), 0) / total : 0;
    const reportId = 'rpt_' + Date.now();
    this.writeAudit('report.generated', null, 'System', 'report', reportId, { dateFrom, dateTo, total });
    return { reportId, total, blocked, frozen, completed, avgRisk: Math.round(avgRisk), approvals: approvals.length, events: events.length, sessions, generatedAt: Math.floor(Date.now() / 1000) };
  }

  // ── DASHBOARD STATS ──
  async getDashboardStats() {
    const totalSessions = (this.sql.exec(`SELECT COUNT(*) as c FROM ai_sessions`).toArray()[0] as any)?.c || 0;
    const blockedToday = (this.sql.exec(`SELECT COUNT(*) as c FROM ai_sessions WHERE status IN ('blocked','frozen') AND created_at > ?`, Math.floor(Date.now() / 1000) - 86400).toArray()[0] as any)?.c || 0;
    const pendingApprovals = (this.sql.exec(`SELECT COUNT(*) as c FROM approval_requests WHERE status='pending'`).toArray()[0] as any)?.c || 0;
    const totalOperators = (this.sql.exec(`SELECT COUNT(*) as c FROM operators WHERE is_active=1`).toArray()[0] as any)?.c || 0;
    const avgRisk = (this.sql.exec(`SELECT AVG(risk_score) as a FROM ai_sessions WHERE created_at > ?`, Math.floor(Date.now() / 1000) - 86400 * 7).toArray()[0] as any)?.a || 0;
    const recentSessions = this.sql.exec(`SELECT id,operator_name,session_type,module,status,risk_score,created_at FROM ai_sessions ORDER BY created_at DESC LIMIT 10`).toArray();
    const recentEvents = this.sql.exec(`SELECT * FROM circuit_breaker_events ORDER BY created_at DESC LIMIT 5`).toArray();
    const breachCount = (this.sql.exec(`SELECT SUM(breach_count) as s FROM compliance_boundaries`).toArray()[0] as any)?.s || 0;
    return { totalSessions, blockedToday, pendingApprovals, totalOperators, avgRisk: Math.round(avgRisk * 10) / 10, recentSessions, recentEvents, breachCount };
  }

  // ── INVARIANCE ENGINE ──
  private evaluateCompliance(prompt: string, rules: any[], module: string) {
    const text = prompt.toLowerCase();
    let riskScore = 0;
    const triggeredRules: any[] = [];
    for (const rule of rules) {
      if (rule.sector !== 'all' && rule.sector !== (module === 'legal' ? 'legal' : module === 'finance' ? 'financial' : 'all')) {
        if (rule.sector !== 'all') continue;
      }
      const keywords = (rule.keywords || '').split(',').map((k: string) => k.trim().toLowerCase());
      const hit = keywords.some((k: string) => k && text.includes(k));
      if (hit) {
        riskScore += rule.score_impact || 15;
        triggeredRules.push(rule);
      }
    }
    riskScore = Math.min(100, riskScore);
    const energyScore = parseFloat((triggeredRules.reduce((a, r) => a + (r.severity === 'critical' ? 3.5 : r.severity === 'high' ? 2.0 : 1.0), 0)).toFixed(2));
    return { riskScore, triggeredRules, energyScore };
  }

  private computeFinancialEnergy(assetValue: number, leverage: number, liquidity: number, counterparty: number): number {
    const leverageRisk = Math.max(0, (leverage - 2) * 15);
    const liquidityRisk = Math.max(0, (0.5 - liquidity) * 80);
    const counterpartyRisk = (5 - counterparty) * 8;
    const sizeRisk = assetValue > 10_000_000 ? 10 : assetValue > 1_000_000 ? 5 : 0;
    return Math.min(100, Math.round(leverageRisk + liquidityRisk + counterpartyRisk + sizeRisk));
  }

  private async hashPassword(password: string): Promise<string> {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + 'axiom-salt-2026'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await this.hashPassword(password);
    return computed === hash;
  }

  private writeAudit(eventType: string, actorId: string | null, actorName: string | null, resourceType: string, resourceId: string, payload: any) {
    const id = crypto.randomUUID();
    const prevRow = this.sql.exec(`SELECT hash FROM audit_log ORDER BY created_at DESC LIMIT 1`).toArray()[0] as any;
    const prevHash = prevRow?.hash || '0000000000000000';
    const hashInput = `${id}:${eventType}:${resourceId}:${prevHash}:${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) { hash = ((hash << 5) - hash) + hashInput.charCodeAt(i); hash |= 0; }
    const hashHex = Math.abs(hash).toString(16).padStart(16, '0');
    this.sql.exec(
      `INSERT INTO audit_log (id,event_type,actor_id,actor_name,resource_type,resource_id,payload,prev_hash,hash) VALUES (?,?,?,?,?,?,?,?,?)`,
      id, eventType, actorId, actorName, resourceType, resourceId, JSON.stringify(payload), prevHash, hashHex
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/api/auth/register' && method === 'POST') {
        const body = await request.json() as any;
        const op = await this.createOperator(body);
        return Response.json({ ok: true, operator: op });
      }
      if (path === '/api/auth/login' && method === 'POST') {
        const body = await request.json() as any;
        const result = await this.loginOperator(body.email, body.password);
        if (!result) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
        return Response.json({ ok: true, ...result });
      }
      if (path === '/api/auth/verify' && method === 'POST') {
        const body = await request.json() as any;
        const sess = await this.verifyToken(body.token);
        if (!sess) return Response.json({ error: 'Invalid token' }, { status: 401 });
        return Response.json({ ok: true, operator: { id: sess.operator_id, name: sess.name, email: sess.email, role: sess.role, approval_score: sess.approval_score, department: sess.department, public_key: sess.public_key } });
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        const body = await request.json() as any;
        await this.logoutOperator(body.token);
        return Response.json({ ok: true });
      }
      if (path === '/api/dashboard' && method === 'GET') {
        return Response.json(await this.getDashboardStats());
      }
      if (path === '/api/sessions' && method === 'GET') {
        const opId = url.searchParams.get('operatorId') || undefined;
        return Response.json(await this.getSessions(opId));
      }
      if (path === '/api/sessions' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.submitSession(body));
      }
      if (path.startsWith('/api/sessions/') && method === 'GET') {
        const id = path.split('/')[3];
        return Response.json(await this.getSession(id));
      }
      if (path.startsWith('/api/sessions/') && path.endsWith('/complete') && method === 'POST') {
        const id = path.split('/')[3];
        const body = await request.json() as any;
        return Response.json(await this.completeSession(id, body.responseText, body.tokensUsed || 0));
      }
      if (path.startsWith('/api/sessions/') && path.endsWith('/midstream-halt') && method === 'POST') {
        const id = path.split('/')[3];
        const body = await request.json() as any;
        return Response.json(await this.midstreamHalt(id, body.riskScore, body.triggeredRules, body.accumulated));
      }
      if (path === '/api/approvals' && method === 'GET') {
        const status = url.searchParams.get('status') || undefined;
        return Response.json(await this.getApprovals(status));
      }
      if (path.startsWith('/api/approvals/') && method === 'POST') {
        const id = path.split('/')[3];
        const body = await request.json() as any;
        return Response.json(await this.reviewApproval(id, body.reviewerId, body.reviewerName, body.decision, body.signature || '', body.notes || ''));
      }
      if (path === '/api/audit' && method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const [log, count] = await Promise.all([this.getAuditLog(limit, offset), this.getAuditCount()]);
        return Response.json({ log, count });
      }
      if (path === '/api/operators' && method === 'GET') return Response.json(await this.getOperators());
      if (path === '/api/operators' && method === 'POST') {
        const body = await request.json() as any;
        const op = await this.createOperator(body);
        return Response.json({ ok: true, operator: op });
      }
      if (path.startsWith('/api/operators/') && method === 'PATCH') {
        const id = path.split('/')[3];
        const body = await request.json() as any;
        return Response.json(await this.updateOperator(id, body));
      }
      if (path === '/api/compliance-rules' && method === 'GET') return Response.json(await this.getComplianceRules());
      if (path.startsWith('/api/compliance-rules/') && method === 'PATCH') {
        const id = path.split('/')[3];
        const body = await request.json() as any;
        return Response.json(await this.toggleRule(id, body.is_active));
      }
      if (path === '/api/terminology' && method === 'GET') return Response.json(await this.getTerminology());
      if (path === '/api/terminology' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.upsertTerm(body));
      }
      if (path.startsWith('/api/terminology/') && method === 'DELETE') {
        const id = path.split('/')[3];
        return Response.json(await this.deleteTerm(id));
      }
      if (path === '/api/lex' && method === 'GET') return Response.json(await this.getBoundaries());
      if (path === '/api/lex' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.upsertBoundary(body));
      }
      if (path.startsWith('/api/lex/') && method === 'DELETE') {
        const id = path.split('/')[3];
        return Response.json(await this.deleteBoundary(id));
      }
      if (path === '/api/kinetic/session' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.createKineticSession(body.operatorId));
      }
      if (path === '/api/kinetic/halt' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.logKineticHalt(body.sessionId, body.trajectory, body.maxEnergy));
      }
      if (path === '/api/finance/evaluate' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.evaluateTransaction(body));
      }
      if (path === '/api/finance/transactions' && method === 'GET') return Response.json(await this.getTransactions());
      if (path === '/api/attribution' && method === 'GET') return Response.json(await this.getAttributionRecords());
      if (path === '/api/reports/generate' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.generateReport(body.dateFrom, body.dateTo));
      }

      if (path === '/api/bots/register' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.registerBotConnection(body.platform, body.chatId, body.operatorId));
      }
      if (path === '/api/keys/create' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.createApiKey(body.operatorId, body.name, body.scopes || []));
      }
      if (path === '/api/keys/verify' && method === 'POST') {
        const body = await request.json() as any;
        const key = await this.verifyApiKey(body.key);
        return Response.json(key ? { valid: true, operatorId: key.operator_id, operatorName: key.op_name } : { valid: false });
      }
      if (path.startsWith('/api/keys/list/') && method === 'GET') {
        const opId = path.split('/')[4];
        return Response.json(await this.listApiKeys(opId));
      }
      if (path.startsWith('/api/keys/') && method === 'DELETE') {
        const id = path.split('/')[3];
        return Response.json(await this.revokeApiKey(id));
      }
      if (path === '/api/referrals/create' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.createReferralCode(body.operatorId));
      }
      if (path.startsWith('/api/referrals/') && method === 'GET') {
        const opId = path.split('/')[3];
        const code = await this.createReferralCode(opId);
        const stats = await this.getReferralStats(opId);
        return Response.json({ ...code, ...stats });
      }
      
      if (path === '/api/geo/assess' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.assessJurisdiction(body));
      }
      if (path === '/api/geo/history' && method === 'GET') {
        const opId = url.searchParams.get('operatorId') || '';
        return Response.json(await this.getGeoHistory(opId));
      }
      if (path === '/api/geo/stats' && method === 'GET') {
        return Response.json(await this.getGeoStats());
      }
      if (path === '/api/finance/evaluate-geo' && method === 'POST') {
        const body = await request.json() as any;
        return Response.json(await this.evaluateTransactionWithGeo(body));
      }
            return Response.json({ error: 'Not found' }, { status: 404 });
    } catch (e: any) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

// ── API KEY MANAGEMENT ──────────────────────────────────────────────────
  async createApiKey(operatorId: string, name: string, scopes: string[]) {
    const raw = 'axm_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const prefix = raw.slice(0, 12);
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(raw));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    const id = crypto.randomUUID();
    this.sql.exec(
      `INSERT INTO api_keys (id,operator_id,name,key_hash,key_prefix,scopes) VALUES (?,?,?,?,?,?)`,
      id, operatorId, name, hash, prefix, JSON.stringify(scopes)
    );
    this.writeAudit('api_key.created', operatorId, null, 'api_key', id, { name, prefix });
    return { id, key: raw, prefix, name };
  }

  async listApiKeys(operatorId: string) {
    return this.sql.exec(`SELECT id,name,key_prefix,scopes,is_active,last_used_at,created_at FROM api_keys WHERE operator_id=? ORDER BY created_at DESC`, operatorId).toArray();
  }

  async revokeApiKey(id: string) {
    this.sql.exec(`UPDATE api_keys SET is_active=0 WHERE id=?`, id);
    return { ok: true };
  }

  async verifyApiKey(rawKey: string) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(rawKey));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    const key = this.sql.exec(`SELECT ak.*, o.name as op_name, o.email, o.role FROM api_keys ak JOIN operators o ON ak.operator_id=o.id WHERE ak.key_hash=? AND ak.is_active=1`, hash).toArray()[0] as any;
    if (!key) return null;
    this.sql.exec(`UPDATE api_keys SET last_used_at=? WHERE id=?`, Math.floor(Date.now()/1000), key.id);
    return key;
  }

  // ── REFERRALS ─────────────────────────────────────────────────────────────
  async createReferralCode(operatorId: string) {
    const code = 'AXIOM' + Math.random().toString(36).slice(2,8).toUpperCase();
    const existing = this.sql.exec(`SELECT id FROM referrals WHERE referrer_operator_id=?`, operatorId).toArray()[0] as any;
    if (existing) return { code: existing.id };
    const id = crypto.randomUUID();
    this.sql.exec(`INSERT INTO referrals (id,referrer_operator_id,referral_code) VALUES (?,?,?)`, id, operatorId, code);
    return { code };
  }

  async trackReferralConversion(code: string, email: string) {
    const ref = this.sql.exec(`SELECT * FROM referrals WHERE referral_code=?`, code).toArray()[0] as any;
    if (!ref) return null;
    this.sql.exec(`UPDATE referrals SET referred_email=?,status='converted',converted_at=? WHERE referral_code=?`,
      email, Math.floor(Date.now()/1000), code);
    this.writeAudit('referral.converted', ref.referrer_operator_id, null, 'referral', ref.id, { email });
    return { ok: true, referrerId: ref.referrer_operator_id };
  }

  async getReferralStats(operatorId: string) {
    const refs = this.sql.exec(`SELECT * FROM referrals WHERE referrer_operator_id=?`, operatorId).toArray();
    const converted = refs.filter((r: any) => r.status === 'converted').length;
    return { total: refs.length, converted, pending: refs.length - converted, refs };
  }

  // ── BOT CONNECTIONS ────────────────────────────────────────────────────────
  async registerBotConnection(platform: string, chatId: string, operatorId?: string) {
    const id = crypto.randomUUID();
    this.sql.exec(`INSERT OR REPLACE INTO bot_connections (id,platform,operator_id,chat_id) VALUES (?,?,?,?)`,
      id, platform, operatorId || null, chatId);
    return { id };
  }

  async getBotConnections(platform: string) {
    return this.sql.exec(`SELECT * FROM bot_connections WHERE platform=? AND is_active=1`, platform).toArray();
  }

  async notifyBots(sessionId: string, status: string, riskScore: number, triggeredRules: string[]) {
    const connections = this.sql.exec(`SELECT * FROM bot_connections WHERE is_active=1`).toArray();
    return { connections: connections.length, sessionId, status, riskScore };
  }


// ── GEOPOLITICAL RISK ENGINE ────────────────────────────────────────────
  async assessJurisdiction(params: { operatorId: string; iso2: string; iso2Secondary?: string; iso2Transit?: string; context: string; module: string }) {
    const { GeoEngine, getJurisdiction } = await import('./geo-engine.js') as any;
    const primary = getJurisdiction(params.iso2);
    if (!primary) return { error: `Jurisdiction ${params.iso2} not found` };

    let result: any;
    if (params.iso2Secondary) {
      const secondary = getJurisdiction(params.iso2Secondary);
      const transit   = params.iso2Transit ? [getJurisdiction(params.iso2Transit)].filter(Boolean) : [];
      result = secondary ? GeoEngine.assessCorridor(primary, secondary, transit) : GeoEngine.assess(primary);
    } else {
      result = GeoEngine.assess(primary);
    }

    const id = 'geo_' + crypto.randomUUID().replace(/-/g,'').slice(0,12);
    const energyScore = result.energyScore ?? result.corridorEnergy ?? 0;
    const riskScore   = result.riskScore   ?? (result.origin?.riskScore ?? 0);
    const riskTier    = result.riskTier    ?? result.overallRisk ?? 'unknown';

    this.sql.exec(
      `INSERT INTO geo_assessments (id,operator_id,context,iso2_primary,iso2_secondary,iso2_transit,energy_score,risk_score,risk_tier,warnings,flags,recommendation,module)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, params.operatorId, params.context,
      params.iso2, params.iso2Secondary || null, params.iso2Transit || null,
      energyScore, riskScore, riskTier,
      JSON.stringify(result.warnings || result.flags || []),
      JSON.stringify(result.flags || []),
      result.recommendation || '', params.module
    );

    this.writeAudit('geo.assessed', params.operatorId, null, 'geo_assessment', id, { iso2: params.iso2, riskTier, riskScore });
    return { id, ...result };
  }

  async getGeoHistory(operatorId: string, limit = 50) {
    return this.sql.exec(
      `SELECT * FROM geo_assessments WHERE operator_id=? ORDER BY created_at DESC LIMIT ?`,
      operatorId, limit
    ).toArray();
  }

  async getGeoStats() {
    const total    = (this.sql.exec(`SELECT COUNT(*) as c FROM geo_assessments`).toArray()[0] as any)?.c || 0;
    const critical = (this.sql.exec(`SELECT COUNT(*) as c FROM geo_assessments WHERE risk_tier='critical'`).toArray()[0] as any)?.c || 0;
    const recent   = this.sql.exec(`SELECT * FROM geo_assessments ORDER BY created_at DESC LIMIT 5`).toArray();
    return { total, critical, recent };
  }

  // Enhanced finance evaluation with geo-risk
  async evaluateTransactionWithGeo(data: { operatorId: string; assetValue: number; leverageRatio: number; liquidityIndex: number; counterpartyTier: number; counterpartyJurisdiction?: string }) {
    // Base financial risk
    const baseResult = await this.evaluateTransaction(data);

    if (!data.counterpartyJurisdiction) return baseResult;

    // Geo risk overlay
    const { GeoEngine, getJurisdiction } = await import('./geo-engine.js') as any;
    const geoVec = getJurisdiction(data.counterpartyJurisdiction);
    if (!geoVec) return baseResult;

    const geoResult   = GeoEngine.assess(geoVec);
    const geoAddition = Math.round(geoResult.riskScore * 0.4); // Geo adds up to 40 pts
    const combinedEnergy = parseFloat((baseResult.energyScore + geoResult.energyScore * 0.3).toFixed(2));

    let finalStatus = baseResult.status;
    if (geoVec.sanctioned) finalStatus = 'rejected';
    else if (combinedEnergy > 75 && finalStatus !== 'rejected') finalStatus = 'rejected';
    else if (combinedEnergy > 50 && finalStatus === 'approved') finalStatus = 'flagged';

    const geoWarnings = geoResult.warnings || [];
    const finalRejectionReason = finalStatus === 'rejected'
      ? (geoVec.sanctioned ? `⛔ Sanctioned jurisdiction: ${geoVec.name}. Transaction prohibited.` : `Combined risk score ${combinedEnergy}/100 exceeds threshold. Jurisdiction: ${geoVec.name} (${geoResult.riskTier} risk).`)
      : baseResult.rejectionReason;

    // Update in DB
    this.sql.exec(
      `UPDATE financial_transactions SET energy_score=?,status=?,rejection_reason=? WHERE id=?`,
      combinedEnergy, finalStatus, finalRejectionReason, baseResult.id
    );

    return {
      ...baseResult,
      energyScore: combinedEnergy,
      status: finalStatus,
      rejectionReason: finalRejectionReason,
      geoRisk: {
        jurisdiction: geoVec.name, iso2: geoVec.iso2, riskTier: geoResult.riskTier,
        riskScore: geoResult.riskScore, warnings: geoWarnings, sanctioned: geoVec.sanctioned,
      },
    };
  }

}
