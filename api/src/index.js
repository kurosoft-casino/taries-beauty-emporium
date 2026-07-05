/**
 * Taries Beauty API — Cloudflare Worker
 * REST API backed by D1, with HTTP-only cookie auth.
 */

const SESSION_COOKIE = 'tbe_session';
const SESSION_TTL_DAYS = 30;

// ---------- utils ----------
const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });

const err = (status, message, extra = {}) =>
  json({ ok: false, error: message, ...extra }, { status });

const ok = (data = {}) => json({ ok: true, ...data });

const uid = (prefix = '') => prefix + crypto.randomUUID();

const nowIso = () => new Date().toISOString();

const lower = (s) => (s || '').toString().trim().toLowerCase();
const digitsOnly = (s) => (s || '').toString().replace(/\D/g, '');
const normalizeCountry = (value) => {
  const country = (value || '').toString().trim();
  if (country === 'Nigeria' || country === 'Ghana' || country === 'China') return country;
  return 'Other';
};
const ADMIN_EMAILS = new Set(['tarimoboere18@gmail.com']);
const isAdminEmail = (email) => ADMIN_EMAILS.has(lower(email));
const getEffectiveRole = (email, role) => (isAdminEmail(email) ? 'admin' : (role || 'customer'));
const FX_RATES = { NGN: 1620, GHS: 16.2, USD: 1, CNY: 7.25 };
const FLW_SETTLE_CURRENCY = new Set(['NGN', 'GHS', 'USD']);

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function toChargeCurrency(orderCurrency) {
  if (FLW_SETTLE_CURRENCY.has(orderCurrency)) return orderCurrency;
  return 'USD';
}

function toChargeAmount(grandTotalUsd, orderCurrency) {
  const currency = toChargeCurrency(orderCurrency);
  const fx = FX_RATES[currency] || 1;
  return { currency, amount: round2(Number(grandTotalUsd || 0) * fx) };
}

async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2(password, salt, iter = 100_000) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: iter, hash: 'SHA-256' },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(req, name) {
  const c = req.headers.get('cookie') || '';
  const m = c.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function getBearerToken(req) {
  const auth = (req.headers.get('authorization') || '').trim();
  if (!auth) return null;
  const [scheme, ...rest] = auth.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token || null;
}

function getRequestSessionToken(req) {
  return getBearerToken(req) || getCookie(req, SESSION_COOKIE);
}

function setCookieHeader(value, maxAgeSec) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=None`;
}

function clearCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
}

function corsHeaders(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-csrf-token',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function withCors(res, env, origin) {
  const headers = new Headers(res.headers);
  Object.entries(corsHeaders(env, origin)).forEach(([k, v]) => headers.set(k, v));
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('cross-origin-resource-policy', 'same-site');
  return new Response(res.body, { status: res.status, headers });
}

function constantTimeEqual(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (sa.length !== sb.length) return false;
  let out = 0;
  for (let i = 0; i < sa.length; i += 1) out |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return out === 0;
}

// ---------- auth ----------
async function getSession(req, env) {
  const tok = getRequestSessionToken(req);
  if (!tok) return null;
  const tokenHash = await sha256Hex(tok);
  const row = await env.DB.prepare(
    `SELECT
        s.id,
        s.user_id,
        s.token_hash,
        s.role AS session_role,
        s.created_at,
        s.expires_at,
        s.last_seen_at,
        u.email,
        u.role AS user_role,
        u.first_name,
        u.last_name,
        u.avatar
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(row.id).run();
    return null;
  }
  // touch
  await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').bind(nowIso(), row.id).run();
  const role = getEffectiveRole(row.email, row.user_role || row.session_role);
  if (role !== row.user_role) {
    await env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, nowIso(), row.user_id).run();
  }
  if (role !== row.session_role) {
    await env.DB.prepare('UPDATE sessions SET role = ? WHERE id = ?').bind(role, row.id).run();
  }
  return { ...row, role };
}

async function requireAuth(req, env, role = null) {
  const s = await getSession(req, env);
  if (!s) return { error: err(401, 'unauthenticated') };
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(s.role)) return { error: err(403, 'forbidden') };
  }
  return { session: s };
}

// ---------- routes ----------
const routes = [];
function route(method, pattern, handler) {
  // pattern like '/users' or '/users/:id'
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1));
        return '([^/]+)';
      }) +
      '/?$'
  );
  routes.push({ method, regex, keys, handler });
}

// ----- health -----
route('GET', '/health', () => ok({ service: 'taries-beauty-api', time: nowIso() }));

// ----- auth -----
route('POST', '/auth/register', async (req, env) => {
  const body = await req.json().catch(() => ({}));
  const email = lower(body.email);
  const password = body.password || '';
  if (!email || !email.includes('@')) return err(400, 'invalid email');
  if (password.length < 6) return err(400, 'password too short');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return err(409, 'email already registered');

  const salt = randomToken(16);
  const hash = await pbkdf2(password, salt);
  const id = uid('usr_');
  const now = nowIso();
  const role = getEffectiveRole(email, 'customer');
  const metadata = JSON.stringify({ country: normalizeCountry(body.country) });

  await env.DB.prepare(
    `INSERT INTO users (id, role, first_name, last_name, email, phone, password_hash, password_salt, password_version, avatar, whatsapp, created_at, updated_at, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      role,
      body.firstName || body.first_name || 'Friend',
      body.lastName || body.last_name || '',
      email,
      body.phone || null,
      hash,
      salt,
      body.avatar || null,
      body.whatsapp || null,
      now,
      now,
      metadata
    )
    .run();

  const tok = randomToken(32);
  const tokenHash = await sha256Hex(tok);
  const sid = uid('ses_');
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400e3).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, role, created_at, expires_at, last_seen_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(sid, id, tokenHash, role, now, expires, now, req.headers.get('cf-connecting-ip') || null, req.headers.get('user-agent') || null)
    .run();

  const csrf = randomToken(16);
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', setCookieHeader(tok, SESSION_TTL_DAYS * 86400));
  headers.append('set-cookie', `tbe_csrf=${csrf}; Path=/; Max-Age=${SESSION_TTL_DAYS * 86400}; Secure; SameSite=None`);
  return new Response(JSON.stringify({
    ok: true,
    csrfToken: csrf,
    sessionToken: tok,
    user: {
      id,
      email,
      role,
      firstName: body.firstName || body.first_name || 'Friend',
      lastName: body.lastName || body.last_name || '',
      country: normalizeCountry(body.country),
      phone: body.phone || null,
      whatsapp: body.whatsapp || null,
    },
  }), {
    status: 200,
    headers,
  });
});

route('POST', '/auth/login', async (req, env) => {
  const body = await req.json().catch(() => ({}));
  const email = lower(body.email);
  const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!u) return err(401, 'invalid credentials');
  const hash = await pbkdf2(body.password || '', u.password_salt || '');
  if (hash !== u.password_hash) return err(401, 'invalid credentials');
  const role = getEffectiveRole(u.email, u.role);
  if (role !== u.role) {
    await env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, nowIso(), u.id).run();
  }

  const tok = randomToken(32);
  const tokenHash = await sha256Hex(tok);
  const sid = uid('ses_');
  const now = nowIso();
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400e3).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, role, created_at, expires_at, last_seen_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(sid, u.id, tokenHash, role, now, expires, now, req.headers.get('cf-connecting-ip') || null, req.headers.get('user-agent') || null)
    .run();

  const csrf = randomToken(16);
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', setCookieHeader(tok, SESSION_TTL_DAYS * 86400));
  headers.append('set-cookie', `tbe_csrf=${csrf}; Path=/; Max-Age=${SESSION_TTL_DAYS * 86400}; Secure; SameSite=None`);
  return new Response(
    JSON.stringify({
      ok: true,
      csrfToken: csrf,
      sessionToken: tok,
      user: {
        id: u.id,
        email: u.email,
        role,
        firstName: u.first_name,
        lastName: u.last_name,
        country: normalizeCountry((() => {
          try { return JSON.parse(u.metadata_json || '{}').country; } catch { return 'Other'; }
        })()),
        avatar: u.avatar,
        phone: u.phone,
        whatsapp: u.whatsapp,
      },
    }),
    { status: 200, headers }
  );
});

route('POST', '/auth/logout', async (req, env) => {
  const tok = getRequestSessionToken(req);
  if (tok) {
    const tokenHash = await sha256Hex(tok);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', clearCookieHeader());
  headers.append('set-cookie', clearCsrfCookieHeader());
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
});

route('GET', '/auth/me', async (req, env) => {
  const s = await getSession(req, env);
  if (!s) return ok({ user: null });
  const u = await env.DB.prepare('SELECT id, email, role, first_name, last_name, avatar, phone, whatsapp, created_at, metadata_json FROM users WHERE id = ?')
    .bind(s.user_id)
    .first();
  const role = u ? getEffectiveRole(u.email, u.role) : null;
  if (u && role !== u.role) {
    await env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind(role, nowIso(), u.id).run();
  }
  const country = normalizeCountry((() => {
    try { return JSON.parse(u?.metadata_json || '{}').country; } catch { return 'Other'; }
  })());
  const headers = new Headers({ 'content-type': 'application/json' });
  const csrf = await ensureCsrfCookie(req, headers);
  return new Response(JSON.stringify({
    ok: true,
    csrfToken: csrf,
    user: u
      ? {
          id: u.id,
          email: u.email,
          role,
          firstName: u.first_name,
          lastName: u.last_name,
          country,
          avatar: u.avatar,
          phone: u.phone,
          whatsapp: u.whatsapp,
          createdAt: u.created_at,
        }
      : null,
  }), { status: 200, headers });
});

route('PATCH', '/auth/profile', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const body = await req.json().catch(() => ({}));
  const existing = await env.DB.prepare('SELECT id, email, role, first_name, last_name, avatar, phone, whatsapp, created_at, metadata_json FROM users WHERE id = ?')
    .bind(a.session.user_id)
    .first();
  if (!existing) return err(404, 'not found');

  const firstName = (body.firstName ?? existing.first_name ?? '').toString().trim();
  const lastName = (body.lastName ?? existing.last_name ?? '').toString().trim();
  const phone = body.phone == null ? existing.phone : (body.phone || '').toString().trim();
  const avatar = body.avatar == null ? existing.avatar : (body.avatar || null);
  let metadata = {};
  try { metadata = JSON.parse(existing.metadata_json || '{}') || {}; } catch {}
  metadata = { ...metadata, country: normalizeCountry(body.country ?? metadata.country) };

  if (!firstName) return err(400, 'firstName required');
  if (!lastName) return err(400, 'lastName required');

  await env.DB.prepare(
    'UPDATE users SET first_name = ?, last_name = ?, phone = ?, avatar = ?, metadata_json = ?, updated_at = ? WHERE id = ?'
  ).bind(firstName, lastName, phone || null, avatar, JSON.stringify(metadata), nowIso(), a.session.user_id).run();

  return ok({
    user: {
      id: existing.id,
      email: existing.email,
      role: getEffectiveRole(existing.email, existing.role),
      firstName,
      lastName,
      country: normalizeCountry(metadata.country),
      avatar: avatar || undefined,
      phone: phone || '',
      whatsapp: existing.whatsapp,
      createdAt: existing.created_at,
    },
  });
});

route('GET', '/auth/csrf', async (req, env) => {
  const s = await getSession(req, env);
  if (!s) return err(401, 'not authenticated');
  const headers = new Headers({ 'content-type': 'application/json' });
  const csrf = await ensureCsrfCookie(req, headers);
  return new Response(JSON.stringify({ ok: true, csrfToken: csrf }), { status: 200, headers });
});

// ----- users (admin) -----
route('GET', '/admin/users', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const { results } = await env.DB.prepare(
    'SELECT id, role, first_name, last_name, email, phone, avatar, created_at FROM users ORDER BY created_at DESC LIMIT 500'
  ).all();
  return ok({ users: results });
});

route('PATCH', '/admin/users/:id', async (req, env, params) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const body = await req.json().catch(() => ({}));
  const fields = [];
  const vals = [];
  if (body.role) {
    fields.push('role = ?');
    vals.push(body.role);
  }
  if (!fields.length) return err(400, 'nothing to update');
  vals.push(nowIso(), params.id);
  await env.DB.prepare(`UPDATE users SET ${fields.join(',')}, updated_at = ? WHERE id = ?`).bind(...vals).run();
  return ok();
});

// ----- vendors -----
route('POST', '/vendors/apply', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const body = await req.json().catch(() => ({}));
  const existing = await env.DB.prepare('SELECT id, status FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  if (existing) return ok({ vendor: existing });
  const id = uid('vnd_');
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO vendors (id, user_id, brand_name, business_name, display_name, bio, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  )
    .bind(id, a.session.user_id, body.brandName || '', body.businessName || '', body.displayName || '', body.bio || '', now, now)
    .run();
  return ok({ vendor: { id, status: 'pending' } });
});

route('GET', '/vendors/me', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const v = await env.DB.prepare('SELECT * FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  return ok({ vendor: v });
});

route('PATCH', '/vendors/me', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const body = await req.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE vendors SET brand_name = COALESCE(?, brand_name), business_name = COALESCE(?, business_name),
       display_name = COALESCE(?, display_name), bio = COALESCE(?, bio), updated_at = ? WHERE user_id = ?`
  )
    .bind(body.brandName ?? null, body.businessName ?? null, body.displayName ?? null, body.bio ?? null, nowIso(), a.session.user_id)
    .run();
  return ok();
});

route('GET', '/admin/vendors', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const { results } = await env.DB.prepare(
    `SELECT v.*, u.email, u.first_name, u.last_name, u.avatar, u.phone
     FROM vendors v JOIN users u ON u.id = v.user_id
     ORDER BY v.created_at DESC LIMIT 500`
  ).all();
  return ok({ vendors: results });
});

route('PATCH', '/admin/vendors/:id', async (req, env, params) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const body = await req.json().catch(() => ({}));
  if (!['pending', 'approved', 'featured', 'removed'].includes(body.status)) return err(400, 'invalid status');
  const v = await env.DB.prepare('SELECT user_id FROM vendors WHERE id = ?').bind(params.id).first();
  if (!v) return err(404, 'vendor not found');
  await env.DB.prepare('UPDATE vendors SET status = ?, updated_at = ? WHERE id = ?')
    .bind(body.status, nowIso(), params.id)
    .run();
  // promote user role
  if (body.status === 'approved' || body.status === 'featured') {
    await env.DB.prepare("UPDATE users SET role = 'vendor', updated_at = ? WHERE id = ? AND role = 'customer'")
      .bind(nowIso(), v.user_id)
      .run();
  }
  return ok();
});

// ----- products -----
route('GET', '/products', async (req, env) => {
  const { results } = await env.DB.prepare(
    `SELECT vp.*, v.brand_name, v.display_name, u.whatsapp as vendor_whatsapp, u.email as vendor_email
     FROM vendor_products vp
     JOIN vendors v ON v.id = vp.vendor_id
     JOIN users u ON u.id = v.user_id
     WHERE vp.active = 1 AND vp.status IN ('approved','featured')
     ORDER BY vp.added_at DESC LIMIT 500`
  ).all();
  return ok({ products: results });
});

route('GET', '/products/overrides', async (req, env) => {
  const { results } = await env.DB.prepare('SELECT * FROM product_overrides').all();
  return ok({ overrides: results });
});

async function ensureAdminVendor(env, userId) {
  const existing = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(userId).first();
  if (existing?.id) return existing.id;
  const now = nowIso();
  const id = uid('vnd_');
  await env.DB.prepare(
    `INSERT INTO vendors (id, user_id, brand_name, business_name, display_name, bio, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'featured', ?, ?)`
  )
    .bind(id, userId, 'Taries Beauty Emporium', 'Taries Beauty Emporium', 'Taries Beauty Emporium', 'Store-managed products', now, now)
    .run();
  return id;
}

route('GET', '/admin/products', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const { results } = await env.DB.prepare(
    `SELECT vp.*, v.brand_name, v.display_name
     FROM vendor_products vp
     LEFT JOIN vendors v ON v.id = vp.vendor_id
     ORDER BY vp.added_at DESC
     LIMIT 500`
  ).all();
  return ok({ products: results });
});

route('POST', '/admin/products', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  if (!b.name || !b.price) return err(400, 'name and price required');
  if (!b.weightKg || Number(b.weightKg) <= 0) return err(400, 'weightKg required (must be > 0)');
  const vendorId = await ensureAdminVendor(env, a.session.user_id);
  const id = uid('prd_');
  const slug = (b.slug || b.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(-6);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO vendor_products
       (id, vendor_id, slug, name, category, price, original_price, description, short_desc,
        features_json, variants_json, images_json, video, badge, whatsapp,
        in_stock, stock_count, weight_kg, sensitive, model_3d, active, status, added_at, updated_at, videos_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'featured', ?, ?, ?)`
  )
    .bind(
      id,
      vendorId,
      slug,
      b.name,
      b.category || 'beauty',
      Number(b.price),
      b.originalPrice ? Number(b.originalPrice) : null,
      b.description || '',
      b.shortDesc || '',
      JSON.stringify(b.features || []),
      JSON.stringify(b.variants || []),
      JSON.stringify(b.images || []),
      b.video || null,
      b.badge || null,
      b.whatsapp || null,
      b.inStock !== false ? 1 : 0,
      b.stockCount ?? null,
      Number(b.weightKg),
      b.sensitive ? 1 : 0,
      b.model3d || null,
      now,
      now,
      JSON.stringify(Array.isArray(b.videos) ? b.videos : [])
    )
    .run();
  return ok({ id, slug });
});

route('GET', '/vendors/me/products', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const v = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  if (!v) return ok({ products: [] });
  const { results } = await env.DB.prepare(
    'SELECT * FROM vendor_products WHERE vendor_id = ? ORDER BY added_at DESC'
  )
    .bind(v.id)
    .all();
  return ok({ products: results });
});

route('POST', '/vendors/me/products', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const v = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  if (!v) return err(403, 'not a vendor');
  const b = await req.json().catch(() => ({}));
  if (!b.name || !b.price) return err(400, 'name and price required');
  if (!b.weightKg || Number(b.weightKg) <= 0) return err(400, 'weightKg required (must be > 0)');
  const id = uid('prd_');
  const slug = (b.slug || b.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(-6);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO vendor_products
       (id, vendor_id, slug, name, category, price, original_price, description, short_desc,
        features_json, variants_json, images_json, video, badge, whatsapp,
        in_stock, stock_count, weight_kg, sensitive, model_3d, active, status, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?)`
  )
    .bind(
      id,
      v.id,
      slug,
      b.name,
      b.category || 'beauty',
      Number(b.price),
      b.originalPrice ? Number(b.originalPrice) : null,
      b.description || '',
      b.shortDesc || '',
      JSON.stringify(b.features || []),
      JSON.stringify(b.variants || []),
      JSON.stringify(b.images || []),
      b.video || null,
      b.badge || null,
      b.whatsapp || null,
      b.inStock !== false ? 1 : 0,
      b.stockCount ?? null,
      Number(b.weightKg),
      b.sensitive ? 1 : 0,
      b.model3d || null,
      now,
      now
    )
    .run();
  // store videos array
  if (b.videos && Array.isArray(b.videos)) {
    try { await env.DB.prepare('UPDATE vendor_products SET videos_json = ? WHERE id = ?').bind(JSON.stringify(b.videos), id).run(); } catch {}
  }
  return ok({ id, slug });
});

route('PATCH', '/vendors/me/products/:id', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const v = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  if (!v) return err(403, 'not a vendor');
  const b = await req.json().catch(() => ({}));
  const map = {
    name: 'name',
    category: 'category',
    price: 'price',
    originalPrice: 'original_price',
    description: 'description',
    shortDesc: 'short_desc',
    features: 'features_json',
    variants: 'variants_json',
    images: 'images_json',
    videos: 'videos_json',
    video: 'video',
    badge: 'badge',
    whatsapp: 'whatsapp',
    inStock: 'in_stock',
    stockCount: 'stock_count',
    weightKg: 'weight_kg',
    sensitive: 'sensitive',
    model3d: 'model_3d',
    active: 'active',
  };
  const fields = [];
  const vals = [];
  for (const k of Object.keys(b)) {
    if (!(k in map)) continue;
    fields.push(`${map[k]} = ?`);
    let v = b[k];
    if (k === 'features' || k === 'variants' || k === 'images' || k === 'videos') v = JSON.stringify(v || []);
    if (k === 'inStock' || k === 'sensitive' || k === 'active') v = v ? 1 : 0;
    vals.push(v);
  }
  if (!fields.length) return err(400, 'nothing to update');
  fields.push('updated_at = ?');
  vals.push(nowIso(), params.id, v.id);
  await env.DB.prepare(`UPDATE vendor_products SET ${fields.join(',')} WHERE id = ? AND vendor_id = ?`).bind(...vals).run();
  return ok();
});

route('DELETE', '/vendors/me/products/:id', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const v = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  if (!v) return err(403, 'not a vendor');
  await env.DB.prepare('DELETE FROM vendor_products WHERE id = ? AND vendor_id = ?').bind(params.id, v.id).run();
  return ok();
});

route('PATCH', '/admin/products/:id', async (req, env, params) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  if (b.status && !['pending', 'approved', 'featured', 'removed'].includes(b.status)) return err(400, 'invalid status');
  const fields = [];
  const vals = [];
  if (b.status) {
    fields.push('status = ?');
    vals.push(b.status);
  }
  if (typeof b.active === 'boolean') {
    fields.push('active = ?');
    vals.push(b.active ? 1 : 0);
  }
  if (!fields.length) return err(400, 'nothing to update');
  fields.push('updated_at = ?');
  vals.push(nowIso(), params.id);
  await env.DB.prepare(`UPDATE vendor_products SET ${fields.join(',')} WHERE id = ?`).bind(...vals).run();
  return ok();
});

// ----- orders -----
route('POST', '/orders', async (req, env) => {
  const b = await req.json().catch(() => ({}));
  if (!b.orderId || !b.items) return err(400, 'orderId + items required');
  const s = await getSession(req, env);
  const now = nowIso();
  const subtotalUsd = Number(b.subtotalUsd ?? b.subtotalUSD ?? 0);
  const shippingUsd = Number(b.shippingUsd ?? b.shippingUSD ?? 0);
  const grandTotalUsd = Number(b.grandTotalUsd ?? b.grandTotalUSD ?? 0);
  const discountUsd = Number(b.discountUsd ?? b.discountUSD ?? 0);
  await env.DB.prepare(
    `INSERT INTO orders (order_id, user_id, date, status, payment_status, payment_method, currency,
      subtotal_usd, shipping_usd, grand_total_usd, discount_usd, coupon_code,
      customer_json, shipping_json, notes, gift_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET
       user_id = excluded.user_id,
       date = excluded.date,
       status = excluded.status,
       payment_status = excluded.payment_status,
       payment_method = excluded.payment_method,
       currency = excluded.currency,
       subtotal_usd = excluded.subtotal_usd,
       shipping_usd = excluded.shipping_usd,
       grand_total_usd = excluded.grand_total_usd,
       discount_usd = excluded.discount_usd,
       coupon_code = excluded.coupon_code,
       customer_json = excluded.customer_json,
       shipping_json = excluded.shipping_json,
       notes = excluded.notes,
       gift_message = excluded.gift_message,
       updated_at = excluded.updated_at`
  )
    .bind(
      b.orderId,
      s ? s.user_id : null,
      b.date || now,
      b.status || 'pending',
      b.paymentStatus || 'pending',
      b.paymentMethod || 'unknown',
      b.currency || 'USD',
      Number.isFinite(subtotalUsd) ? subtotalUsd : 0,
      Number.isFinite(shippingUsd) ? shippingUsd : 0,
      Number.isFinite(grandTotalUsd) ? grandTotalUsd : 0,
      Number.isFinite(discountUsd) ? discountUsd : 0,
      b.couponCode || null,
      JSON.stringify(b.customer || {}),
      JSON.stringify(b.shipping || {}),
      b.notes || null,
      b.giftMessage || null,
      now,
      now
    )
    .run();
  await env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(b.orderId).run();
  for (const it of b.items || []) {
    const productId = it.productId || it.id || it.product?.id || 'unknown';
    const productName = it.productName || it.name || it.product?.name || 'Item';
    const unitPriceUsd = Number(it.unitPriceUsd ?? it.priceUsd ?? it.product?.price ?? 0);
    const quantity = Math.max(1, Number(it.quantity || 1));
    await env.DB.prepare(
      `INSERT INTO order_items (id, order_id, product_id, product_name, unit_price_usd, quantity, selected_variants_json, product_snapshot_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        uid('itm_'),
        b.orderId,
        productId,
        productName,
        Number.isFinite(unitPriceUsd) ? unitPriceUsd : 0,
        quantity,
        JSON.stringify(it.selectedVariants || {}),
        JSON.stringify(it.productSnapshot || it.product || it),
        now
      )
      .run();
  }
  return ok({ orderId: b.orderId });
});

route('GET', '/orders/:id', async (req, env, params) => {
  const url = new URL(req.url);
  const emailQuery = lower(url.searchParams.get('email') || '');
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_id = ?').bind(params.id).first();
  if (!o) return err(404, 'not found');
  const session = await getSession(req, env);
  const isAdmin = session?.role === 'admin';
  const isOwner = Boolean(session?.user_id && o.user_id && session.user_id === o.user_id);
  let customerEmail = '';
  try {
    const customer = JSON.parse(o.customer_json || '{}');
    customerEmail = lower(customer.email);
  } catch {}
  const hasEmailMatch = Boolean(emailQuery && customerEmail && emailQuery === customerEmail);
  if (!isAdmin && !isOwner && !hasEmailMatch) return err(403, 'forbidden');
  const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(params.id).all();
  return ok({ order: o, items: items.results });
});

route('GET', '/orders/me', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const { results } = await env.DB.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').bind(a.session.user_id).all();
  return ok({ orders: results });
});

route('GET', '/admin/orders', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const { results } = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500').all();
  return ok({ orders: results });
});

route('PATCH', '/admin/orders/:id', async (req, env, params) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  const fields = [];
  const vals = [];
  if (b.status) {
    fields.push('status = ?');
    vals.push(b.status);
  }
  if (b.paymentStatus) {
    fields.push('payment_status = ?');
    vals.push(b.paymentStatus);
  }
  if (!fields.length) return err(400, 'nothing to update');
  fields.push('updated_at = ?');
  vals.push(nowIso(), params.id);
  await env.DB.prepare(`UPDATE orders SET ${fields.join(',')} WHERE order_id = ?`).bind(...vals).run();
  return ok();
});

async function verifyFlutterwaveAndMarkOrderPaid(env, txRef, transactionId = null) {
  const secretKey = env.FLW_SECRET_KEY;
  if (!secretKey) return { error: 'flutterwave not configured' };
  if (!txRef) return { error: 'tx_ref required' };

  const order = await env.DB.prepare(
    'SELECT order_id, grand_total_usd, currency, payment_status FROM orders WHERE order_id = ? LIMIT 1'
  ).bind(txRef).first();
  if (!order) return { error: 'order not found' };

  let verifyUrl = null;
  if (transactionId) {
    verifyUrl = `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`;
  } else {
    verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
  }
  const response = await fetch(verifyUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json().catch(() => null);
  const data = payload?.data;
  if (!response.ok || !data) {
    return { error: payload?.message || 'flutterwave verification failed' };
  }

  const expected = toChargeAmount(order.grand_total_usd, order.currency || 'USD');
  const chargedAmount = Number(data.amount ?? data.charged_amount ?? 0);
  const chargedCurrency = String(data.currency || '').toUpperCase();
  const status = String(data.status || '').toLowerCase();
  const sameRef = String(data.tx_ref || '').trim() === txRef;
  const amountOk = Math.abs(chargedAmount - expected.amount) <= 0.5;
  const currencyOk = chargedCurrency === expected.currency;
  const paid = status === 'successful' && sameRef && currencyOk && amountOk;

  const wasAlreadyPaid = String(order.payment_status || '').toLowerCase() === 'paid';
  if (paid) {
    await env.DB.prepare(
      `UPDATE orders
       SET payment_status = 'paid',
           status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
           updated_at = ?
       WHERE order_id = ?`
    ).bind(nowIso(), txRef).run();
    if (!wasAlreadyPaid) {
      try { await finalizeOrderAfterPayment(env, txRef); } catch {}
    }
  }

  return {
    ok: paid,
    txRef,
    expected,
    chargedAmount,
    chargedCurrency,
    verificationStatus: status || 'unknown',
    paymentStatus: paid ? 'paid' : order.payment_status,
  };
}

async function finalizeOrderAfterPayment(env, orderId) {
  const o = await env.DB.prepare('SELECT * FROM orders WHERE order_id = ?').bind(orderId).first();
  if (!o) return false;
  const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(orderId).all();
  for (const it of items.results || []) {
    try {
      await env.DB.prepare('UPDATE vendor_products SET stock_count = MAX(COALESCE(stock_count, 0) - ?, 0) WHERE id = ?')
        .bind(Number(it.quantity || 1), it.product_id).run();
      await env.DB.prepare('INSERT INTO stock_movements (id, product_id, delta, reason, ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(uid('stk_'), it.product_id, -Number(it.quantity || 1), 'order', orderId, nowIso()).run();
    } catch {}
  }
  let cust = {};
  try { cust = JSON.parse(o.customer_json || '{}'); } catch {}
  if (cust.email) {
    await sendEmail(cust.email, `Order ${orderId} confirmed`,
      brandedEmail('Thank you for your order ✨',
        `<p>Your order <strong>${orderId}</strong> has been received and payment was confirmed.</p>
         <p>Total: <strong>${o.currency} ${Number(o.grand_total_usd || 0).toFixed(2)}</strong></p>
         <p>You will receive tracking information when your parcel ships.</p>`));
  }
  return true;
}

route('POST', '/payments/flutterwave/initialize', async (req, env) => {
  const secretKey = env.FLW_SECRET_KEY;
  if (!secretKey) return err(503, 'flutterwave not configured');

  const b = await req.json().catch(() => ({}));
  const txRef = String(b.orderId || '').trim();
  const customer = b.customer || {};
  const email = lower(customer.email);
  const name = String(customer.name || `${customer.firstName || ''} ${customer.lastName || ''}` || 'Customer').trim();
  const phone = String(customer.phone || customer.phone_number || '').trim();
  if (!txRef || !email.includes('@')) return err(400, 'orderId and customer email required');

  const order = await env.DB.prepare(
    'SELECT order_id, grand_total_usd, currency, customer_json FROM orders WHERE order_id = ? LIMIT 1'
  ).bind(txRef).first();
  if (!order) return err(404, 'order not found');
  let orderCustomerEmail = '';
  try {
    const orderCustomer = JSON.parse(order.customer_json || '{}');
    orderCustomerEmail = lower(orderCustomer.email);
  } catch {}
  if (orderCustomerEmail && orderCustomerEmail !== email) return err(400, 'customer email mismatch');

  const { currency, amount } = toChargeAmount(order.grand_total_usd, order.currency || 'USD');
  const baseSiteUrl = (env.PUBLIC_SITE_URL || 'https://www.tariesbeauty.com').replace(/\/+$/, '');
  const redirectUrl = `${baseSiteUrl}/checkout/complete`;
  const paymentMethod = String(b.paymentMethod || 'card');
  const paymentOptions = paymentMethod === 'mobile' ? 'card, mobilemoneyghana, banktransfer' : 'card, banktransfer, ussd';

  const initResponse = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency,
      redirect_url: redirectUrl,
      payment_options: paymentOptions,
      customer: {
        email,
        name: name || 'Customer',
        phonenumber: phone || undefined,
      },
      customizations: {
        title: 'Taries Beauty Emporium',
        description: `Order ${txRef}`,
      },
      meta: {
        order_id: txRef,
      },
    }),
  });
  const initPayload = await initResponse.json().catch(() => null);
  const link = initPayload?.data?.link;
  if (!initResponse.ok || !link) {
    return err(502, initPayload?.message || 'flutterwave initialization failed');
  }

  return ok({
    txRef,
    link,
    chargeAmount: amount,
    chargeCurrency: currency,
  });
});

route('GET', '/payments/flutterwave/verify', async (req, env) => {
  const url = new URL(req.url);
  const txRef = String(url.searchParams.get('tx_ref') || '').trim();
  const transactionId = url.searchParams.get('transaction_id');
  const result = await verifyFlutterwaveAndMarkOrderPaid(env, txRef, transactionId);
  if (result.error) return err(400, result.error);
  return ok(result);
});

route('POST', '/payments/flutterwave/webhook', async (req, env) => {
  const secretHash = String(env.FLW_WEBHOOK_HASH || '').trim();
  if (!secretHash) return err(503, 'webhook hash not configured');
  const signature = req.headers.get('verif-hash') || req.headers.get('flutterwave-signature') || '';
  if (!constantTimeEqual(secretHash, signature)) return err(401, 'invalid webhook signature');

  const body = await req.json().catch(() => ({}));
  const txRef = String(body?.data?.tx_ref || body?.tx_ref || '').trim();
  const txStatus = String(body?.data?.status || body?.status || '').toLowerCase();
  if (!txRef) return ok({ ignored: true });
  if (txStatus !== 'successful') return ok({ ignored: true, status: txStatus || 'unknown' });

  const txId = body?.data?.id || body?.id || null;
  const result = await verifyFlutterwaveAndMarkOrderPaid(env, txRef, txId);
  if (result.error) return err(400, result.error);
  return ok({ received: true, ...result });
});

// ----- newsletter / stock alerts -----
route('POST', '/newsletter', async (req, env) => {
  const b = await req.json().catch(() => ({}));
  const email = lower(b.email);
  if (!email.includes('@')) return err(400, 'invalid email');
  await env.DB.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email, source, created_at) VALUES (?, ?, ?)')
    .bind(email, b.source || 'footer', nowIso())
    .run();
  return ok();
});

route('POST', '/stock-alerts', async (req, env) => {
  const b = await req.json().catch(() => ({}));
  if (!b.slug || !b.email) return err(400, 'slug and email required');
  await env.DB.prepare(
    'INSERT OR IGNORE INTO stock_alert_requests (id, slug, email, created_at) VALUES (?, ?, ?, ?)'
  )
    .bind(uid('alt_'), b.slug, lower(b.email), nowIso())
    .run();
  return ok();
});

// ----- store settings -----
route('GET', '/settings', async (req, env) => {
  const s = await env.DB.prepare('SELECT * FROM store_settings WHERE id = 1').first();
  return ok({ settings: s });
});

route('PATCH', '/admin/settings', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE store_settings SET
       store_name = COALESCE(?, store_name),
       announcement = COALESCE(?, announcement),
       whatsapp = COALESCE(?, whatsapp),
       email = COALESCE(?, email),
       maintenance_mode = COALESCE(?, maintenance_mode),
       updated_at = ? WHERE id = 1`
  )
    .bind(b.storeName ?? null, b.announcement ?? null, b.whatsapp ?? null, b.email ?? null,
          typeof b.maintenanceMode === 'boolean' ? (b.maintenanceMode ? 1 : 0) : null, nowIso())
    .run();
  return ok();
});

// ----- admin stats -----
route('GET', '/admin/stats', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const userCount = await env.DB.prepare('SELECT COUNT(*) as n FROM users').first();
  const vendorCount = await env.DB.prepare('SELECT COUNT(*) as n FROM vendors').first();
  const pendingVendors = await env.DB.prepare("SELECT COUNT(*) as n FROM vendors WHERE status = 'pending'").first();
  const productCount = await env.DB.prepare('SELECT COUNT(*) as n FROM vendor_products WHERE active = 1').first();
  const pendingProducts = await env.DB.prepare("SELECT COUNT(*) as n FROM vendor_products WHERE status = 'pending'").first();
  const orderCount = await env.DB.prepare('SELECT COUNT(*) as n FROM orders').first();
  const revenue = await env.DB.prepare("SELECT COALESCE(SUM(grand_total_usd),0) as r FROM orders WHERE payment_status = 'paid'").first();
  return ok({
    stats: {
      users: userCount.n,
      vendors: vendorCount.n,
      pendingVendors: pendingVendors.n,
      products: productCount.n,
      pendingProducts: pendingProducts.n,
      orders: orderCount.n,
      revenueUsd: revenue.r,
    },
  });
});

// =====================================================================
// v1.1.0 — additions: media, chat (translation), email, reports, labels,
// reviews, wishlist, change-password, search, audit, rate-limit, CSRF.
// =====================================================================

const CSRF_COOKIE = 'tbe_csrf';
function setCsrfCookieHeader(value) {
  return `${CSRF_COOKIE}=${value}; Path=/; Max-Age=${SESSION_TTL_DAYS * 86400}; Secure; SameSite=None`;
}
function clearCsrfCookieHeader() {
  return `${CSRF_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=None`;
}
async function ensureCsrfCookie(req, headers) {
  const existing = getCookie(req, CSRF_COOKIE);
  if (existing) return existing;
  const tok = randomToken(16);
  headers.append('set-cookie', setCsrfCookieHeader(tok));
  return tok;
}
function csrfGuard(req, method) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return null;
  if (getBearerToken(req)) return null;
  // Allow auth bootstrap routes (login/register/logout) to set the cookie.
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  if (path.startsWith('/auth/login') || path.startsWith('/auth/register') || path.startsWith('/auth/logout')) return null;
  // Bypass when no session — public endpoints like /orders, /newsletter are
  // open writes by design and don't need CSRF (no privileged action).
  const sess = getCookie(req, SESSION_COOKIE);
  if (!sess) return null;
  const cookie = getCookie(req, CSRF_COOKIE);
  const header = req.headers.get('x-csrf-token');
  if (!cookie || !header || cookie !== header) return err(403, 'csrf token mismatch');
  return null;
}

// ----- rate limiting (KV) -----
async function rateLimit(env, key, limit, windowSec) {
  if (!env.CACHE) return true;
  const k = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const cur = parseInt((await env.CACHE.get(k)) || '0', 10);
  if (cur >= limit) return false;
  await env.CACHE.put(k, String(cur + 1), { expirationTtl: Math.max(windowSec * 2, 60) });
  return true;
}
async function rateLimitGuard(req, env) {
  const ip = req.headers.get('cf-connecting-ip') || 'anon';
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  const isAuth = path.startsWith('/auth/');
  const ok = await rateLimit(env, `${isAuth ? 'a' : 'g'}:${ip}`, isAuth ? 10 : 60, 1);
  if (!ok) return err(429, 'rate limited');
  return null;
}

// ----- audit log -----
async function audit(env, req, userId, action, targetType = null, targetId = null, meta = null) {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (id, user_id, action, target_type, target_id, meta_json, ip, ua, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(uid('aud_'), userId, action, targetType, targetId, meta ? JSON.stringify(meta) : null,
      req.headers.get('cf-connecting-ip') || null, req.headers.get('user-agent') || null, nowIso()).run();
  } catch {}
}

// ----- input validation helper -----
function strField(v, max, opts = {}) {
  if (v == null) return opts.required ? { error: 'required' } : { value: null };
  const s = String(v).trim();
  if (opts.required && !s) return { error: 'required' };
  if (s.length > max) return { error: `max length ${max}` };
  return { value: s };
}

// ============================================================
// MEDIA — base64 fallback (R2 not enabled on account)
// Endpoints: POST /media/upload (multipart), DELETE /media/:id, GET /media/:id
// To upgrade to R2: enable R2 in dashboard, add r2_buckets binding to
// wrangler.jsonc, swap the storage path below.
// ============================================================

const MEDIA_LIMITS = {
  image: { max: 5 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] },
  video: { max: 5 * 1024 * 1024, mimes: ['video/mp4', 'video/webm'] }, // 5MB cap until R2
};

route('POST', '/media/upload', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const ctype = req.headers.get('content-type') || '';
  if (!ctype.startsWith('multipart/form-data')) return err(400, 'multipart/form-data required');
  let form;
  try { form = await req.formData(); } catch { return err(400, 'invalid form'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return err(400, 'file required');
  const mime = file.type || 'application/octet-stream';
  const isImage = MEDIA_LIMITS.image.mimes.includes(mime);
  const isVideo = MEDIA_LIMITS.video.mimes.includes(mime);
  if (!isImage && !isVideo) return err(400, 'unsupported mime');
  const kind = isImage ? 'image' : 'video';
  const limit = MEDIA_LIMITS[kind];
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.byteLength > limit.max) return err(413, `max size ${limit.max} bytes`);
  // base64 encode (chunked to avoid stack issues)
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  }
  const b64 = btoa(bin);
  const id = uid('med_');
  const url = `/media/${id}`;
  await env.DB.prepare(
    `INSERT INTO media_assets (id, owner_user_id, kind, url, data_b64, size_bytes, mime, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, a.session.user_id, kind, url, b64, buf.byteLength, mime, nowIso()).run();
  return ok({ id, url, kind, mime, size: buf.byteLength });
});

route('GET', '/media/:id', async (req, env, params) => {
  const row = await env.DB.prepare('SELECT mime, data_b64, url FROM media_assets WHERE id = ?').bind(params.id).first();
  if (!row) return err(404, 'not found');
  if (row.data_b64) {
    const bin = atob(row.data_b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Response(buf, {
      status: 200,
      headers: {
        'content-type': row.mime,
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  }
  // R2 path (future): redirect or proxy
  return Response.redirect(row.url, 302);
});

route('DELETE', '/media/:id', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const row = await env.DB.prepare('SELECT owner_user_id FROM media_assets WHERE id = ?').bind(params.id).first();
  if (!row) return err(404, 'not found');
  if (row.owner_user_id !== a.session.user_id && a.session.role !== 'admin') return err(403, 'forbidden');
  await env.DB.prepare('DELETE FROM media_assets WHERE id = ?').bind(params.id).run();
  return ok();
});

// ============================================================
// CHAT — conversations + messages + translation
// ============================================================

function hasCJK(s) { return /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(s || ''); }

async function translateText(env, text, srcLang, tgtLang) {
  if (!env.AI) return null;
  try {
    const out = await env.AI.run('@cf/meta/m2m100-1.2b', {
      text, source_lang: srcLang, target_lang: tgtLang,
    });
    return out?.translated_text || null;
  } catch (e) {
    return null;
  }
}

function canAccessConversation(conv, session) {
  if (session.role === 'admin') return true;
  if (conv.kind === 'support') return conv.customer_id === session.user_id || conv.admin_id === session.user_id;
  if (conv.kind === 'vendor') return conv.customer_id === session.user_id || conv.vendor_id === session.user_id;
  return false;
}

route('GET', '/conversations', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const role = a.session.role;
  let rows;
  if (role === 'admin') {
    rows = await env.DB.prepare(
      `SELECT c.*, u.first_name AS customer_first_name, u.last_name AS customer_last_name, u.email AS customer_email
       FROM conversations c LEFT JOIN users u ON u.id = c.customer_id ORDER BY COALESCE(c.last_message_at, c.created_at) DESC LIMIT 200`
    ).all();
  } else if (role === 'vendor') {
    const v = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
    rows = await env.DB.prepare(
      `SELECT c.*, u.first_name AS customer_first_name, u.last_name AS customer_last_name FROM conversations c
       LEFT JOIN users u ON u.id = c.customer_id WHERE c.vendor_id = ? ORDER BY COALESCE(c.last_message_at, c.created_at) DESC LIMIT 200`
    ).bind(v ? v.id : 'none').all();
  } else {
    rows = await env.DB.prepare(
      `SELECT c.*, v.brand_name AS vendor_brand_name FROM conversations c LEFT JOIN vendors v ON v.id = c.vendor_id
       WHERE c.customer_id = ? ORDER BY COALESCE(c.last_message_at, c.created_at) DESC LIMIT 200`
    ).bind(a.session.user_id).all();
  }
  return ok({ conversations: rows.results });
});

route('POST', '/conversations', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  const kind = b.kind === 'vendor' ? 'vendor' : 'support';
  const subject = strField(b.subject, 200).value || (kind === 'support' ? 'Support request' : 'New message');
  let vendorId = null, adminId = null;
  if (kind === 'vendor') {
    if (!b.vendor_id && !b.vendorId) return err(400, 'vendor_id required');
    vendorId = b.vendor_id || b.vendorId;
    // dedupe
    const existing = await env.DB.prepare(
      `SELECT id FROM conversations WHERE kind='vendor' AND customer_id=? AND vendor_id=?`
    ).bind(a.session.user_id, vendorId).first();
    if (existing) {
      if (b.initial_message || b.initialMessage) {
        await postMessageInternal(env, existing.id, a.session, { kind: 'text', body: b.initial_message || b.initialMessage });
      }
      return ok({ id: existing.id });
    }
  } else {
    // assign first available admin
    const admin = await env.DB.prepare(`SELECT id FROM users WHERE role='admin' ORDER BY created_at ASC LIMIT 1`).first();
    adminId = admin ? admin.id : null;
  }
  const id = uid('con_');
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO conversations (id, kind, customer_id, vendor_id, admin_id, subject, last_message_at, unread_customer, unread_vendor, unread_admin, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)`
  ).bind(id, kind, a.session.user_id, vendorId, adminId, subject, now, now).run();
  if (b.initial_message || b.initialMessage) {
    await postMessageInternal(env, id, a.session, { kind: 'text', body: b.initial_message || b.initialMessage });
  }
  return ok({ id });
});

async function postMessageInternal(env, conversationId, session, body) {
  const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(conversationId).first();
  if (!conv) return { error: err(404, 'conversation not found') };
  if (!canAccessConversation(conv, session)) return { error: err(403, 'forbidden') };
  const kind = ['text', 'image', 'video', 'emoji'].includes(body.kind) ? body.kind : 'text';
  const text = body.body || '';
  let originalLang = null;
  let translations = null;
  if ((kind === 'text' || kind === 'emoji') && text) {
    originalLang = hasCJK(text) ? 'zh' : 'en';
    const tgt = originalLang === 'zh' ? 'en' : 'zh';
    const translated = await translateText(env, text, originalLang === 'zh' ? 'chinese' : 'english', tgt === 'zh' ? 'chinese' : 'english');
    translations = { [originalLang]: text, [tgt]: translated || text };
  }
  const id = uid('msg_');
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO messages (id, conversation_id, sender_id, sender_role, kind, body, media_url, media_meta_json, original_lang, translations_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, conversationId, session.user_id, session.role, kind, text || null, body.media_url || null,
    body.media_meta ? JSON.stringify(body.media_meta) : null, originalLang, translations ? JSON.stringify(translations) : null, now).run();
  // bump conversation
  const incCustomer = session.user_id !== conv.customer_id ? 'unread_customer = unread_customer + 1,' : '';
  const incVendor = conv.vendor_id && session.user_id !== conv.vendor_id ? 'unread_vendor = unread_vendor + 1,' : '';
  const incAdmin = session.role !== 'admin' && conv.admin_id ? 'unread_admin = unread_admin + 1,' : '';
  await env.DB.prepare(
    `UPDATE conversations SET ${incCustomer}${incVendor}${incAdmin} last_message_at = ? WHERE id = ?`
  ).bind(now, conversationId).run();
  return { message: { id, conversation_id: conversationId, sender_id: session.user_id, sender_role: session.role, kind, body: text || null, media_url: body.media_url || null, original_lang: originalLang, translations_json: translations ? JSON.stringify(translations) : null, created_at: now } };
}

route('POST', '/conversations/:id/messages', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  const out = await postMessageInternal(env, params.id, a.session, b);
  if (out.error) return out.error;
  return ok(out);
});

route('GET', '/conversations/:id/messages', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(params.id).first();
  if (!conv) return err(404, 'not found');
  if (!canAccessConversation(conv, a.session)) return err(403, 'forbidden');
  const url = new URL(req.url);
  const after = url.searchParams.get('after');
  let q;
  if (after) {
    q = env.DB.prepare('SELECT * FROM messages WHERE conversation_id = ? AND id > ? ORDER BY created_at ASC LIMIT 200').bind(params.id, after);
  } else {
    q = env.DB.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 200').bind(params.id);
  }
  const { results } = await q.all();
  return ok({ conversation: conv, messages: results });
});

route('PATCH', '/conversations/:id/read', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(params.id).first();
  if (!conv) return err(404, 'not found');
  if (!canAccessConversation(conv, a.session)) return err(403, 'forbidden');
  let field = null;
  if (a.session.role === 'admin') field = 'unread_admin';
  else if (conv.vendor_id === a.session.user_id) field = 'unread_vendor';
  else if (conv.customer_id === a.session.user_id) field = 'unread_customer';
  if (field) await env.DB.prepare(`UPDATE conversations SET ${field} = 0 WHERE id = ?`).bind(params.id).run();
  await env.DB.prepare('UPDATE messages SET read_at = ? WHERE conversation_id = ? AND read_at IS NULL AND sender_id != ?')
    .bind(nowIso(), params.id, a.session.user_id).run();
  return ok();
});

route('PATCH', '/conversations/:id/typing', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const until = new Date(Date.now() + 5000).toISOString();
  try {
    await env.DB.prepare('UPDATE conversations SET typing_user_id = ?, typing_until = ? WHERE id = ?')
      .bind(a.session.user_id, until, params.id).run();
  } catch {}
  return ok();
});

route('GET', '/conversations/:id/poll', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(params.id).first();
  if (!conv) return err(404, 'not found');
  if (!canAccessConversation(conv, a.session)) return err(403, 'forbidden');
  const url = new URL(req.url);
  const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z';
  const start = Date.now();
  const deadline = start + 25000;
  let typingInfo = null;
  while (Date.now() < deadline) {
    const { results } = await env.DB.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 50'
    ).bind(params.id, since).all();
    if (results && results.length) {
      const fresh = await env.DB.prepare('SELECT typing_user_id, typing_until FROM conversations WHERE id = ?').bind(params.id).first();
      if (fresh && fresh.typing_until && new Date(fresh.typing_until).getTime() > Date.now() && fresh.typing_user_id !== a.session.user_id) {
        typingInfo = { user_id: fresh.typing_user_id };
      }
      return ok({ messages: results, typing: typingInfo });
    }
    const fresh = await env.DB.prepare('SELECT typing_user_id, typing_until FROM conversations WHERE id = ?').bind(params.id).first();
    if (fresh && fresh.typing_until && new Date(fresh.typing_until).getTime() > Date.now() && fresh.typing_user_id !== a.session.user_id) {
      typingInfo = { user_id: fresh.typing_user_id };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return ok({ messages: [], typing: typingInfo });
});

route('GET', '/admin/conversations', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const { results } = await env.DB.prepare(
    `SELECT c.*, u.first_name AS customer_first_name, u.last_name AS customer_last_name, u.email AS customer_email
     FROM conversations c LEFT JOIN users u ON u.id = c.customer_id
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC LIMIT 500`
  ).all();
  return ok({ conversations: results });
});

route('GET', '/vendors/me/conversations', async (req, env) => {
  const a = await requireAuth(req, env, ['vendor', 'admin']);
  if (a.error) return a.error;
  const v = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  if (!v) return ok({ conversations: [] });
  const { results } = await env.DB.prepare(
    `SELECT c.*, u.first_name AS customer_first_name, u.last_name AS customer_last_name FROM conversations c
     LEFT JOIN users u ON u.id = c.customer_id WHERE c.vendor_id = ? ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`
  ).bind(v.id).all();
  return ok({ conversations: results });
});

// ============================================================
// EMAIL — MailChannels (free outbound from CF Workers)
// ============================================================
const MAIL_FROM = { email: 'no-reply@tariesbeauty.com', name: 'Taries Beauty Emporium' };

async function sendEmail(to, subject, html) {
  try {
    const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: MAIL_FROM,
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    return r.ok;
  } catch { return false; }
}

function brandedEmail(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#0a0908;font-family:Georgia,serif;color:#f5e9d3">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#15110d;border:1px solid rgba(212,175,55,.2);border-radius:16px">
  <h1 style="margin:0 0 16px 0;font-size:22px;color:#d4af37;letter-spacing:.5px">${title}</h1>
  <div style="font-size:15px;line-height:1.6;color:#f5e9d3">${body}</div>
  <hr style="border:0;border-top:1px solid rgba(212,175,55,.15);margin:24px 0">
  <p style="font-size:12px;color:#9c8966">— Taries Beauty Emporium • <a href="https://tariesbeauty.com" style="color:#d4af37">tariesbeauty.com</a></p>
</div></body></html>`;
}

// hook newsletter to send welcome
route('POST', '/newsletter/subscribe', async (req, env) => {
  const b = await req.json().catch(() => ({}));
  const email = lower(b.email);
  if (!email.includes('@')) return err(400, 'invalid email');
  await env.DB.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email, source, created_at) VALUES (?, ?, ?)')
    .bind(email, b.source || 'footer', nowIso()).run();
  await sendEmail(email, "You're in 💌", brandedEmail("Welcome to the Emporium", "Thank you for subscribing! Expect first looks at new wig drops, bundle restocks, and exclusive subscriber-only deals."));
  return ok();
});

route('POST', '/admin/newsletter/broadcast', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  const subj = strField(b.subject, 200, { required: true });
  if (subj.error) return err(400, 'subject ' + subj.error);
  const html = strField(b.html, 50000, { required: true });
  if (html.error) return err(400, 'html ' + html.error);
  const { results } = await env.DB.prepare('SELECT email FROM newsletter_subscribers').all();
  let sent = 0;
  for (const row of results) {
    if (await sendEmail(row.email, subj.value, brandedEmail(subj.value, html.value))) sent++;
  }
  await audit(env, req, a.session.user_id, 'newsletter.broadcast', null, null, { count: sent });
  return ok({ sent });
});

// ============================================================
// CHANGE PASSWORD
// ============================================================
route('POST', '/auth/change-password', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  if (!b.currentPassword || !b.newPassword) return err(400, 'currentPassword and newPassword required');
  if (String(b.newPassword).length < 6) return err(400, 'password too short');
  const u = await env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').bind(a.session.user_id).first();
  if (!u) return err(404, 'not found');
  const cur = await pbkdf2(b.currentPassword, u.password_salt || '');
  if (cur !== u.password_hash) return err(401, 'invalid current password');
  const newSalt = randomToken(16);
  const newHash = await pbkdf2(b.newPassword, newSalt);
  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
    .bind(newHash, newSalt, nowIso(), a.session.user_id).run();
  await audit(env, req, a.session.user_id, 'auth.password_changed');
  return ok();
});

route('POST', '/auth/reset-password', async (req, env) => {
  const b = await req.json().catch(() => ({}));
  const email = lower(b.email);
  const phone = String(b.phone || '').trim();
  const newPassword = String(b.newPassword || '');
  if (!email || !email.includes('@')) return err(400, 'invalid email');
  if (!phone) return err(400, 'phone required');
  if (newPassword.length < 6) return err(400, 'password too short');

  const u = await env.DB.prepare('SELECT id, email, phone FROM users WHERE email = ?').bind(email).first();
  if (!u) return err(404, 'No account found with that email address.');
  if (digitsOnly(u.phone) !== digitsOnly(phone)) return err(401, 'Phone number does not match this account.');

  const newSalt = randomToken(16);
  const newHash = await pbkdf2(newPassword, newSalt);
  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?')
    .bind(newHash, newSalt, nowIso(), u.id).run();
  return ok();
});

// ============================================================
// WISHLIST
// ============================================================
route('GET', '/wishlist', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const { results } = await env.DB.prepare('SELECT slug, created_at FROM wishlists WHERE user_id = ? ORDER BY created_at DESC').bind(a.session.user_id).all();
  return ok({ items: results });
});
route('POST', '/wishlist', async (req, env) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  if (!b.slug) return err(400, 'slug required');
  await env.DB.prepare('INSERT OR IGNORE INTO wishlists (user_id, slug, created_at) VALUES (?, ?, ?)')
    .bind(a.session.user_id, b.slug, nowIso()).run();
  return ok();
});
route('DELETE', '/wishlist/:slug', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  await env.DB.prepare('DELETE FROM wishlists WHERE user_id = ? AND slug = ?').bind(a.session.user_id, params.slug).run();
  return ok();
});

// ============================================================
// REVIEWS
// ============================================================
route('GET', '/products/:slug/reviews', async (req, env, params) => {
  const { results } = await env.DB.prepare(
    `SELECT id, product_slug, user_name, rating, title, body, created_at FROM product_reviews
     WHERE product_slug = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 200`
  ).bind(params.slug).all();
  return ok({ reviews: results });
});
route('POST', '/products/:slug/reviews', async (req, env, params) => {
  const a = await requireAuth(req, env);
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  const rating = Math.max(1, Math.min(5, parseInt(b.rating, 10) || 0));
  if (!rating) return err(400, 'rating 1-5 required');
  const body = strField(b.body, 4000, { required: true });
  if (body.error) return err(400, 'body ' + body.error);
  const title = strField(b.title, 200).value;
  const u = await env.DB.prepare('SELECT first_name, last_name FROM users WHERE id = ?').bind(a.session.user_id).first();
  await env.DB.prepare(
    `INSERT INTO product_reviews (id, product_slug, user_id, user_name, rating, title, body, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(uid('rev_'), params.slug, a.session.user_id, `${u?.first_name || ''} ${u?.last_name || ''}`.trim() || 'Anonymous',
    rating, title, body.value, nowIso()).run();
  return ok();
});
route('PATCH', '/admin/reviews/:id', async (req, env, params) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  if (!['approved', 'rejected', 'pending'].includes(b.status)) return err(400, 'invalid status');
  await env.DB.prepare('UPDATE product_reviews SET status = ? WHERE id = ?').bind(b.status, params.id).run();
  await audit(env, req, a.session.user_id, 'review.moderate', 'review', params.id, { status: b.status });
  return ok();
});
route('GET', '/admin/reviews', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const { results } = await env.DB.prepare('SELECT * FROM product_reviews ORDER BY created_at DESC LIMIT 500').all();
  return ok({ reviews: results });
});

// ============================================================
// SEARCH (LIKE-based; FTS table available but optional)
// ============================================================
route('GET', '/search', async (req, env) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const cat = url.searchParams.get('category');
  const min = parseFloat(url.searchParams.get('min') || '');
  const max = parseFloat(url.searchParams.get('max') || '');
  let sql = `SELECT vp.*, v.brand_name FROM vendor_products vp JOIN vendors v ON v.id = vp.vendor_id
             WHERE vp.active = 1 AND vp.status IN ('approved','featured')`;
  const args = [];
  if (q) { sql += ' AND (vp.name LIKE ? OR vp.description LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  if (cat) { sql += ' AND vp.category = ?'; args.push(cat); }
  if (!isNaN(min)) { sql += ' AND vp.price >= ?'; args.push(min); }
  if (!isNaN(max)) { sql += ' AND vp.price <= ?'; args.push(max); }
  sql += ' ORDER BY vp.added_at DESC LIMIT 100';
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return ok({ products: results });
});

// ============================================================
// SALES REPORTS (admin)
// ============================================================
route('GET', '/admin/reports/sales', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const url = new URL(req.url);
  const from = url.searchParams.get('from') || '1970-01-01';
  const to = url.searchParams.get('to') || '2999-12-31';
  const fmt = url.searchParams.get('format') || 'json';
  const { results } = await env.DB.prepare(
    `SELECT substr(date, 1, 10) AS day, COUNT(*) AS orders, SUM(grand_total_usd) AS revenue_usd, SUM(shipping_usd) AS shipping_usd
     FROM orders WHERE date >= ? AND date <= ? GROUP BY day ORDER BY day DESC`
  ).bind(from, to).all();
  if (fmt === 'csv') {
    const head = 'day,orders,revenue_usd,shipping_usd\n';
    const rows = results.map(r => `${r.day},${r.orders},${r.revenue_usd ?? 0},${r.shipping_usd ?? 0}`).join('\n');
    return new Response(head + rows + '\n', { status: 200, headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="sales.csv"' } });
  }
  return ok({ rows: results });
});

// ============================================================
// CSV IMPORT (vendor + admin)
// ============================================================
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(s => s.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // simple CSV: no quoted commas. Acceptable for the import template.
    const cols = lines[i].split(',');
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = (cols[idx] ?? '').trim()));
    rows.push(obj);
  }
  return rows;
}

async function importProductsForVendor(env, vendorId, csv) {
  const rows = parseCSV(csv);
  const errors = [];
  let imported = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r.name) { errors.push({ row: i + 2, reason: 'name required' }); continue; }
      if (!r.price) { errors.push({ row: i + 2, reason: 'price required' }); continue; }
      const wt = parseFloat(r.weightKg || r.weight_kg || '');
      if (!wt || wt <= 0) { errors.push({ row: i + 2, reason: 'weightKg > 0 required' }); continue; }
      const id = uid('prd_');
      const slug = (r.slug || r.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + id.slice(-6);
      const now = nowIso();
      const images = (r.image_urls || '').split('|').filter(Boolean);
      const videos = (r.video_urls || '').split('|').filter(Boolean);
      await env.DB.prepare(
        `INSERT INTO vendor_products (id, vendor_id, slug, name, category, price, original_price, description, short_desc,
          features_json, variants_json, images_json, videos_json, video, badge, whatsapp,
          in_stock, stock_count, weight_kg, sensitive, model_3d, active, status, added_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?, ?, NULL, NULL, 1, ?, ?, ?, NULL, 1, 'pending', ?, ?)`
      ).bind(id, vendorId, slug, r.name, r.category || 'beauty', parseFloat(r.price), r.originalPrice ? parseFloat(r.originalPrice) : null,
        r.description || '', r.short_desc || '', JSON.stringify(images), JSON.stringify(videos), videos[0] || null,
        r.stock ? parseInt(r.stock, 10) : null, wt, r.sensitive === '1' || r.sensitive === 'true' ? 1 : 0, now, now).run();
      imported++;
    } catch (e) {
      errors.push({ row: i + 2, reason: e.message || 'unknown' });
    }
  }
  return { imported, errors };
}

route('POST', '/vendors/me/products/import', async (req, env) => {
  const a = await requireAuth(req, env, ['vendor', 'admin']);
  if (a.error) return a.error;
  const v = await env.DB.prepare('SELECT id FROM vendors WHERE user_id = ?').bind(a.session.user_id).first();
  if (!v) return err(403, 'not a vendor');
  const text = await req.text();
  const out = await importProductsForVendor(env, v.id, text);
  return ok(out);
});

route('POST', '/admin/products/import', async (req, env) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const url = new URL(req.url);
  const vendorId = url.searchParams.get('vendor_id');
  if (!vendorId) return err(400, 'vendor_id query param required');
  const text = await req.text();
  const out = await importProductsForVendor(env, vendorId, text);
  await audit(env, req, a.session.user_id, 'products.import', 'vendor', vendorId, out);
  return ok(out);
});

// ============================================================
// SHIPPING LABEL — minimal hand-rolled PDF (no deps, valid PDF)
// ============================================================
function escapePdfText(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
function buildLabelPdf(order, items) {
  const customer = (() => { try { return JSON.parse(order.customer_json || '{}'); } catch { return {}; } })();
  const ship = (() => { try { return JSON.parse(order.shipping_json || '{}'); } catch { return {}; } })();
  const lines = [
    'TARIES BEAUTY EMPORIUM — SHIPPING LABEL',
    '',
    `Order: ${order.order_id}`,
    `Date: ${order.date || order.created_at}`,
    '',
    'TO:',
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer',
    ship.address || customer.address || '',
    `${ship.city || customer.city || ''}, ${ship.country || customer.country || ''}`,
    `Phone: ${customer.phone || ''}`,
    '',
    `Items: ${items.length}`,
    `Weight: declared`,
    `Total: ${order.currency} ${Number(order.grand_total_usd || 0).toFixed(2)}`,
    '',
    `Barcode: *${order.order_id}*`,
  ];
  let stream = 'BT /F1 12 Tf 50 780 Td 14 TL\n';
  lines.forEach((ln, i) => {
    stream += `(${escapePdfText(ln)}) Tj T*\n`;
  });
  stream += 'ET\n';
  // Simple barcode-like rectangle bars at bottom
  stream += '0 0 0 rg\n';
  const orderStr = String(order.order_id || '');
  for (let i = 0; i < orderStr.length; i++) {
    const x = 50 + i * 8;
    const w = (orderStr.charCodeAt(i) % 4) + 1;
    stream += `${x} 100 ${w} 50 re f\n`;
  }
  const objs = [];
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');
  objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { pdf += `${String(o).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

route('GET', '/admin/orders/:id/label.pdf', async (req, env, params) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const order = await env.DB.prepare('SELECT * FROM orders WHERE order_id = ?').bind(params.id).first();
  if (!order) return err(404, 'not found');
  const items = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(params.id).all();
  const pdf = buildLabelPdf(order, items.results);
  return new Response(pdf, { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="label-${params.id}.pdf"` } });
});

// ============================================================
// HEALTH (deep)
// ============================================================
route('GET', '/health/deep', async (req, env) => {
  const checks = { db: false, kv: false, ai: false };
  try { await env.DB.prepare('SELECT 1').first(); checks.db = true; } catch {}
  try { if (env.CACHE) { await env.CACHE.put('hc', '1', { expirationTtl: 60 }); checks.kv = true; } } catch {}
  try { if (env.AI) { checks.ai = true; } } catch {}
  return ok({ checks, time: nowIso() });
});

// ============================================================
// ORDER PLACEMENT EMAIL + STOCK DECREMENT — wraps existing /orders flow
// (This is a POST hook route; the original /orders insert still works, this
// adds a sibling endpoint for confirmed orders the frontend calls after
// success.)
// ============================================================
route('POST', '/orders/:id/confirm', async (req, env, params) => {
  const okConfirm = await finalizeOrderAfterPayment(env, params.id);
  if (!okConfirm) return err(404, 'not found');
  return ok();
});

// vendor application status emails (extends existing PATCH /admin/vendors/:id)
route('POST', '/admin/vendors/:id/notify', async (req, env, params) => {
  const a = await requireAuth(req, env, 'admin');
  if (a.error) return a.error;
  const b = await req.json().catch(() => ({}));
  const v = await env.DB.prepare('SELECT v.*, u.email FROM vendors v JOIN users u ON u.id = v.user_id WHERE v.id = ?').bind(params.id).first();
  if (!v) return err(404, 'not found');
  const subj = b.status === 'approved' ? 'Vendor application approved 🎉' : 'Vendor application update';
  const html = b.status === 'approved'
    ? '<p>Congratulations! Your vendor application has been approved. Sign in to your dashboard to start listing products.</p>'
    : `<p>Your vendor application status is now: <strong>${b.status}</strong>.</p>`;
  await sendEmail(v.email, subj, brandedEmail(subj, html));
  return ok();
});

// ---------- main fetch ----------
export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin');
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) });
    }
    // rate limit
    const rl = await rateLimitGuard(request, env);
    if (rl) return withCors(rl, env, origin);
    // csrf (best-effort double-submit cookie)
    const csrfRes = csrfGuard(request, request.method);
    if (csrfRes) return withCors(csrfRes, env, origin);

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '') || '/';
    for (const r of routes) {
      if (r.method !== request.method) continue;
      const m = path.match(r.regex);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      try {
        const res = await r.handler(request, env, params);
        return withCors(res, env, origin);
      } catch (e) {
        return withCors(err(500, e.message || 'internal error'), env, origin);
      }
    }
    return withCors(err(404, 'route not found', { path }), env, origin);
  },
};
