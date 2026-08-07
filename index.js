// ============================================================
// WORKER "flashtopup-proxy" — intermediario entre tu sitio y la
// API de FlashTopup.
//
// POR QUÉ EXISTE: tu sitio (XITERKING STORE) es HTML/JS puro, sin
// servidor propio. Si la clave secreta de FlashTopup (la "Clave
// API") estuviera en un archivo .js de tu sitio, cualquiera que
// abra el código fuente de la página se la podría llevar y hacer
// recargas gratis a tu costa. Este Worker vive aparte, en los
// servidores de Cloudflare, y es el ÚNICO lugar donde esa clave
// existe. Tu sitio le pide cosas a ESTE worker (con una clave
// propia tuya, mucho menos grave si se filtra) y el worker es
// quien realmente le habla a FlashTopup.
// ============================================================

const MODO_SANDBOX = true;

// IMPORTANTE: estos números (542, 543, etc.) son los que usa tu
// SITIO para identificar cada paquete de diamantes — pero NO son
// necesariamente el "service_code" real que espera la API de
// FlashTopup. Usá la ruta temporal /listar-servicios (al final de
// este archivo) para ver los service_code reales y completar el
// mapeo de abajo, en SERVICE_CODES_FLASHTOPUP.
const PAQUETES_FREE_FIRE = {
  542: 110,
  543: 341,
  544: 572,
  545: 1166,
  546: 2398,
  547: 6160,
};

// Mapeo entre el ID que usa tu sitio (serviceId, ej 542) y el
// service_code REAL que pide la API de FlashTopup (ej "ff_diamonds_542").
// Completalo con lo que te devuelva /listar-servicios.
const SERVICE_CODES_FLASHTOPUP = {
  542: null, // <-- completar
  543: null, // <-- completar
  544: null, // <-- completar
  545: null, // <-- completar
  546: null, // <-- completar
  547: null, // <-- completar
};

const FT_HOST = 'https://api.flashtopup.com';

// ---------- utilidades de firma HMAC-SHA256 (según la doc de FlashTopup) ----------

async function sha256Hex(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(clave, mensaje) {
  const claveCrypto = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', claveCrypto, new TextEncoder().encode(mensaje));
  return [...new Uint8Array(firma)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Llama a un endpoint de FlashTopup ya firmado correctamente.
async function llamarFlashTopup(env, method, path, queryString, bodyObj) {
  const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';
  const bodyHash = await sha256Hex(bodyStr);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();

  const canonico = [method, path, timestamp, nonce, bodyHash].join('\n');
  const firma = await hmacSha256Hex(env.FT_API_KEY, canonico);

  const headers = {
    'X-FT-API-ID': env.FT_API_ID,
    'X-FT-Timestamp': timestamp,
    'X-FT-Nonce': nonce,
    'X-FT-Signature': firma,
  };
  if (bodyObj) headers['Content-Type'] = 'application/json';
  if (MODO_SANDBOX) headers['X-FT-Sandbox'] = 'true';

  const url = FT_HOST + path + (queryString ? '?' + queryString : '');
  const res = await fetch(url, {
    method,
    headers,
    body: bodyObj ? bodyStr : undefined,
  });

  let data;
  try { data = await res.json(); } catch (e) { data = null; }
  console.log('Respuesta de FlashTopup:', res.status, JSON.stringify(data));
  return { httpStatus: res.status, data };
}

// ---------- CORS + validación de que el pedido venga de tu propio sitio ----------

function headersCORS(origenPedido, env) {
  const permitido = origenPedido === env.ALLOWED_ORIGIN ? origenPedido : env.ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': permitido,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Site-Key',
    'Vary': 'Origin',
  };
}

function jsonResponse(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function siteKeyValida(request, env) {
  return request.headers.get('X-Site-Key') === env.SITE_KEY && !!env.SITE_KEY;
}

// ============================================================
// RUTAS QUE EXPONE ESTE WORKER (las que llama tu sitio)
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origenPedido = request.headers.get('Origin') || '';
    const cors = headersCORS(origenPedido, env);

    // preflight de CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, motivo: 'METODO_NO_PERMITIDO' }, 405, cors);
    }

    if (!siteKeyValida(request, env)) {
      return jsonResponse({ ok: false, motivo: 'NO_AUTORIZADO' }, 401, cors);
    }

    let body;
    try { body = await request.json(); } catch (e) {
      return jsonResponse({ ok: false, motivo: 'BODY_INVALIDO' }, 400, cors);
    }

    // ---------- RUTA TEMPORAL DE DIAGNÓSTICO: listar servicios ----------
    // Llamala una vez para ver los service_code reales de FlashTopup,
    // completá SERVICE_CODES_FLASHTOPUP arriba con esos valores, y
    // después podés borrar esta ruta si querés (no es necesaria para
    // el funcionamiento normal del sitio).
    if (url.pathname === '/listar-servicios') {
      const { httpStatus, data } = await llamarFlashTopup(
        env, 'GET', '/api/reseller/v2/services', null, null
      );
      return jsonResponse({ httpStatus, data }, 200, cors);
    }

    // ---------- POST /crear-orden ----------
    // body esperado: { serviceId: 542, uid: "123456789", referenceId: "uuid-unico" }
    if (url.pathname === '/crear-orden') {
      const { serviceId, uid, referenceId } = body;

      if (!PAQUETES_FREE_FIRE[serviceId]) {
        return jsonResponse({ ok: false, motivo: 'PAQUETE_DESCONOCIDO' }, 400, cors);
      }
      if (!uid || typeof uid !== 'string' || uid.trim().length < 3) {
        return jsonResponse({ ok: false, motivo: 'UID_INVALIDO' }, 400, cors);
      }
      if (!referenceId || typeof referenceId !== 'string') {
        return jsonResponse({ ok: false, motivo: 'REFERENCE_ID_FALTANTE' }, 400, cors);
      }

      const serviceCodeReal = SERVICE_CODES_FLASHTOPUP[serviceId];
      if (!serviceCodeReal) {
        return jsonResponse({
          ok: false,
          motivo: 'SERVICE_CODE_NO_CONFIGURADO',
          mensaje: 'Falta completar SERVICE_CODES_FLASHTOPUP en el worker para este paquete.',
        }, 500, cors);
      }

      const ordenBody = {
        service_code: serviceCodeReal,
        reference_id: referenceId,
        cantidad: 1,
        user_id: uid.trim(),
      };

      const { httpStatus, data } = await llamarFlashTopup(
        env, 'POST', '/api/reseller/v2/order', null, ordenBody
      );

      if (!data) {
        return jsonResponse({ ok: false, motivo: 'RESPUESTA_INVALIDA_DE_FLASHTOPUP' }, 502, cors);
      }
      if (!data.exito) {
        return jsonResponse({
          ok: false,
          motivo: data.error?.codigo || 'ERROR_DESCONOCIDO',
          mensaje: data.error?.mensaje || '',
          detalle: data.error || null,
        }, httpStatus, cors);
      }

      return jsonResponse({
        ok: true,
        orderId: data.datos.order_id,
        estado: data.datos.estado || data.datos.order_status,
        diamantes: PAQUETES_FREE_FIRE[serviceId],
      }, 200, cors);
    }

    // ---------- POST /consultar-orden ----------
    // body esperado: { orderId: "ORD1" }  ó  { referenceId: "uuid-unico" }
    if (url.pathname === '/consultar-orden') {
      const { orderId, referenceId } = body;
      if (!orderId && !referenceId) {
        return jsonResponse({ ok: false, motivo: 'FALTA_ORDER_ID_O_REFERENCE_ID' }, 400, cors);
      }

      const qs = orderId
        ? 'order_id=' + encodeURIComponent(orderId)
        : 'reference_id=' + encodeURIComponent(referenceId);

      const { httpStatus, data } = await llamarFlashTopup(
        env, 'GET', '/api/reseller/v2/order/status', qs, null
      );

      if (!data) {
        return jsonResponse({ ok: false, motivo: 'RESPUESTA_INVALIDA_DE_FLASHTOPUP' }, 502, cors);
      }
      if (!data.exito) {
        return jsonResponse({
          ok: false,
          motivo: data.error?.codigo || 'ERROR_DESCONOCIDO',
          mensaje: data.error?.mensaje || '',
        }, httpStatus, cors);
      }

      return jsonResponse({
        ok: true,
        orderId: data.datos.order_id,
        estado: data.datos.estado || data.datos.order_status,
        nota: data.datos.nota || '',
      }, 200, cors);
    }

    return jsonResponse({ ok: false, motivo: 'RUTA_NO_ENCONTRADA' }, 404, cors);
  },
};
