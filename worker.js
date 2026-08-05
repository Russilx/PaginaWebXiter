// ============================================================
// TELEGRAM → FIRESTORE — Cloudflare Worker
// ------------------------------------------------------------
// Recibe los mensajes que vos le escribís a tu bot de Telegram
// y los guarda en la colección "mensajes" de Firestore, para que
// notificaciones.js los muestre en la web.
//
// COMANDOS QUE ENTENDÉS ESCRIBIRLE AL BOT:
//   /todos <mensaje>           -> lo ve toda la gente (con o sin cuenta)
//   /logueados <mensaje>       -> solo gente con cuenta logueada
//   /visitantes <mensaje>      -> solo gente SIN cuenta / no logueada
//   /usuario <email> <mensaje> -> solo esa persona puntual (si tiene
//                                  cuenta y está logueada con ese email)
//
// No hace falta tarjeta ni plan pago: esto corre en el plan
// gratuito de Cloudflare Workers (100.000 requests/día).
// ============================================================

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('OK - este endpoint espera el webhook de Telegram', { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response('Bad request', { status: 400 });
    }

    const mensaje = update.message;
    if (!mensaje || !mensaje.text) {
      return new Response('OK', { status: 200 });
    }

    // Solo aceptamos mensajes que vengan de TU chat (el admin).
    // TELEGRAM_CHAT_ID se configura como variable/secret del Worker.
    const chatId = String(mensaje.chat.id);
    if (chatId !== env.TELEGRAM_CHAT_ID) {
      return new Response('OK', { status: 200 });
    }

    const texto = mensaje.text.trim();
    let destinatario = null;
    let contenido = null;

    if (texto.startsWith('/todos ')) {
      destinatario = 'todos';
      contenido = texto.slice('/todos '.length).trim();
    } else if (texto.startsWith('/logueados ')) {
      destinatario = 'logueados';
      contenido = texto.slice('/logueados '.length).trim();
    } else if (texto.startsWith('/visitantes ')) {
      destinatario = 'visitantes';
      contenido = texto.slice('/visitantes '.length).trim();
    } else if (texto.startsWith('/usuario ')) {
      const resto = texto.slice('/usuario '.length).trim();
      const espacio = resto.indexOf(' ');
      if (espacio > -1) {
        destinatario = resto.slice(0, espacio).trim(); // el email
        contenido = resto.slice(espacio + 1).trim();
      }
    }

    if (!destinatario || !contenido) {
      await avisarTelegram(env, mensaje.chat.id,
        'No entendí el formato. Usá:\n' +
        '/todos <mensaje>\n' +
        '/logueados <mensaje>\n' +
        '/visitantes <mensaje>\n' +
        '/usuario <email> <mensaje>');
      return new Response('OK', { status: 200 });
    }

    try {
      await guardarEnFirestore(env, destinatario, contenido);
      await avisarTelegram(env, mensaje.chat.id, '✅ Notificación enviada a: ' + destinatario);
    } catch (err) {
      await avisarTelegram(env, mensaje.chat.id, '❌ Error al guardar la notificación: ' + err.message);
    }

    return new Response('OK', { status: 200 });
  }
};

async function guardarEnFirestore(env, destinatario, contenido) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/mensajes`;
  const body = {
    fields: {
      destinatario: { stringValue: destinatario },
      texto: { stringValue: contenido },
      fecha: { timestampValue: new Date().toISOString() }
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const detalle = await resp.text();
    throw new Error('Firestore respondió ' + resp.status + ': ' + detalle);
  }
}

async function avisarTelegram(env, chatId, texto) {
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texto })
    });
  } catch (e) {
    // si falla el aviso no pasa nada grave, era solo confirmación
  }
}
