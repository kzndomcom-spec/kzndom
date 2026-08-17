// Cloudflare Worker — приём заявки с сайта kzndom.com → создание ЛИДА в Bitrix24.
// Секрет (вебхук Bitrix) хранится в env.BITRIX_WEBHOOK (wrangler secret) — в браузер не попадает.
const CORS = {
  'Access-Control-Allow-Origin': '*',            // при желании сузить до 'https://kzndom.com'
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};
const reply = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return reply(405, { ok: false, error: 'method' });

    let data = {};
    try { data = await request.json(); } catch (e) {}
    const phone = String(data.phone || '').trim();
    if (!phone) return reply(400, { ok: false, error: 'no_phone' });
    const source = String(data.source || 'Заявка с сайта');
    const details = String(data.details || '');
    const city = String(data.city || '').trim();
    const title = String(data.title || ('Сайт kzndom.com: ' + source + (city ? ' — ' + city : '')));

    const base = (env.BITRIX_WEBHOOK || '').replace(/\/+$/, '');
    if (!base) return reply(500, { ok: false, error: 'no_webhook_env' });

    const fields = {
      TITLE: title,
      NAME: 'Заявка с сайта',
      SOURCE_ID: 'WEB',
      PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
      COMMENTS: 'Форма: ' + source + (city ? ('\nГород: ' + city) : '') + (details ? ('\n' + details) : '')
    };
    try {
      const r = await fetch(base + '/crm.lead.add.json', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: 'Y' } })
      });
      const res = await r.json();
      if (res.error) return reply(502, { ok: false, error: res.error_description || res.error });
      return reply(200, { ok: true, id: res.result });
    } catch (e) { return reply(502, { ok: false, error: String(e) }); }
  }
};

// deploy-check 2026-08-17T16:43Z
