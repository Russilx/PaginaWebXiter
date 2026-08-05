// ============================================================
// NOTIFICACIONES — campanita flotante que muestra los mensajes
// que vos mandás desde Telegram (ver /telegram-worker en el
// paquete que armamos). Se agrega sola con este script, no hace
// falta tocar el HTML de cada página (ya está incluido).
//
// Cómo llegan los mensajes: vos le escribís a tu bot de Telegram
// con uno de estos comandos:
//   /todos <mensaje>          -> lo ve TODA la gente (logueada o no)
//   /logueados <mensaje>      -> solo gente con cuenta, logueada
//   /visitantes <mensaje>     -> solo gente SIN cuenta / no logueada
//   /usuario <email> <mensaje> -> solo esa persona (si está logueada)
// El worker de Telegram guarda eso en Firestore, colección "mensajes",
// y este script los lee y los muestra.
// ============================================================
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, getDocs }
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const LEIDOS_KEY = 'xiterking_mensajes_leidos';
const CANTIDAD_A_TRAER = 30;

function getUsuario(){
  try{
    const raw = sessionStorage.getItem('xiterking_user');
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function getLeidos(){
  try{ return JSON.parse(localStorage.getItem(LEIDOS_KEY) || '[]'); }
  catch(e){ return []; }
}

function marcarLeido(id){
  const leidos = getLeidos();
  if(!leidos.includes(id)){
    leidos.push(id);
    localStorage.setItem(LEIDOS_KEY, JSON.stringify(leidos.slice(-200)));
  }
}

function marcarTodosLeidos(ids){
  const leidos = getLeidos();
  ids.forEach(id => { if(!leidos.includes(id)) leidos.push(id); });
  localStorage.setItem(LEIDOS_KEY, JSON.stringify(leidos.slice(-200)));
}

function formatearFecha(fecha){
  if(!fecha) return '';
  try{
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return d.toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  }catch(e){ return ''; }
}

function esParaMi(msg, usuario){
  const dest = msg.destinatario;
  if(dest === 'todos') return true;
  if(dest === 'logueados') return !!usuario;
  if(dest === 'visitantes') return !usuario;
  if(usuario && dest === usuario.email) return true;
  return false;
}

async function traerMensajes(usuario){
  try{
    const q = query(collection(db, 'mensajes'), orderBy('fecha', 'desc'), limit(CANTIDAD_A_TRAER));
    const snap = await getDocs(q);
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return todos.filter(m => esParaMi(m, usuario));
  }catch(err){
    console.error('Error al traer notificaciones:', err);
    return [];
  }
}

function crearUI(){
  const cont = document.createElement('div');
  cont.className = 'notif-flotante';
  cont.id = 'notif-flotante';
  cont.innerHTML = `
    <button class="notif-btn" id="notif-btn" type="button" aria-label="Notificaciones">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="notif-badge" id="notif-badge" style="display:none;">0</span>
    </button>
    <div class="notif-panel" id="notif-panel">
      <div class="notif-panel-header">Notificaciones</div>
      <div class="notif-panel-lista" id="notif-panel-lista">
        <div class="notif-vacio">No tenés notificaciones todavía.</div>
      </div>
    </div>
  `;
  document.body.appendChild(cont);

  const btn = document.getElementById('notif-btn');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    cont.classList.toggle('open');
    if(cont.classList.contains('open')) onAbrirPanel();
  });
  document.addEventListener('click', (e) => {
    if(!cont.contains(e.target)) cont.classList.remove('open');
  });

  return cont;
}

let mensajesActuales = [];

function pintarBadge(){
  const leidos = getLeidos();
  const sinLeer = mensajesActuales.filter(m => !leidos.includes(m.id)).length;
  const badge = document.getElementById('notif-badge');
  if(sinLeer > 0){
    badge.style.display = 'flex';
    badge.textContent = sinLeer > 9 ? '9+' : String(sinLeer);
  }else{
    badge.style.display = 'none';
  }
}

function pintarLista(){
  const lista = document.getElementById('notif-panel-lista');
  if(mensajesActuales.length === 0){
    lista.innerHTML = '<div class="notif-vacio">No tenés notificaciones todavía.</div>';
    return;
  }
  const leidos = getLeidos();
  lista.innerHTML = mensajesActuales.map(m => `
    <div class="notif-item ${leidos.includes(m.id) ? '' : 'notif-item-nueva'}">
      <div class="notif-item-texto">${(m.texto || '').replace(/</g,'&lt;')}</div>
      <div class="notif-item-fecha">${formatearFecha(m.fecha)}</div>
    </div>
  `).join('');
}

function onAbrirPanel(){
  marcarTodosLeidos(mensajesActuales.map(m => m.id));
  pintarLista();
  pintarBadge();
}

async function iniciar(){
  crearUI();
  const usuario = getUsuario();
  mensajesActuales = await traerMensajes(usuario);
  pintarBadge();
  pintarLista();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', iniciar);
}else{
  iniciar();
}
