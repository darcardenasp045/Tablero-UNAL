'use strict';
(() => {
const C = CONFIG, $ = id => document.getElementById(id);
const PUB = new URLSearchParams(location.search).get('vista') === 'publico';
document.body.classList.toggle('publico', PUB);

// ---------- Utilidades ----------
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
const si = v => norm(v) === 'SI';
const hecho = v => !['', 'NO', '-', '—'].includes(norm(v));
const num = v => { const n = parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const sum = (a, f) => a.reduce((t, r) => t + f(r), 0);
const por = (a, f) => a.reduce((m, r) => ((m[f(r)] ??= []).push(r), m), {});
const pct = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : 0;
const fmt = n => n.toLocaleString('es-CO');
// Todo el DOM se construye con textContent: los datos de la hoja nunca se interpretan como HTML (anti-XSS)
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
const K = Object.fromEntries(Object.entries(C.COLS).map(([k, v]) => [k, norm(v)]));
const g = (r, k) => r ? (r[K[k]] ?? '') : '';
const parseFecha = s => { const m = String(s).match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/) || String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null; return m[1].length === 4 ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(+m[3], m[2] - 1, +m[1]); };

const cargar = url => new Promise((ok, ko) => Papa.parse(url, { download: true, header: true, skipEmptyLines: true,
  transformHeader: norm, complete: r => r.data.length ? ok(r.data) : ko(new Error('Hoja vacía')), error: ko }));

// ---------- Estado ----------
let filas = [], charts = {}, orden = { k: 'nombre', asc: true };

// ---------- Carga y cruce por ID_UADMIN ----------
async function sincronizar() {
  const btn = $('btnSync'), msg = $('msg'); btn.disabled = true; msg.style.display = 'none';
  try {
    const [ctrl, seg] = await Promise.all([cargar(C.URL_CONTROL), cargar(C.URL_SEGUIMIENTO)]);
    const mapa = new Map();
    seg.forEach(r => { const id = String(g(r, 'segId')).trim(); if (id && !mapa.has(id)) mapa.set(id, r); });
    filas = ctrl.filter(c => String(g(c, 'id')).trim()).map(c => {
      const id = String(g(c, 'id')).trim(), s = mapa.get(id) || null, mesa = String(g(c, 'mesa')).trim();
      return { id, act: !!s, sede: g(c, 'sede') || 'Sin sede', nombre: g(c, 'nombre') || 'Sin nombre',
        org: si(g(c, 'esOrg')), mesa: hecho(mesa) ? mesa : '',
        reqPrel: si(g(c, 'llevaPrel')), reqFinal: si(g(c, 'llevaFinal')),
        actividad: g(s, 'actividad'), resp: String(g(s, 'responsable')).trim(), apoyo: g(s, 'apoyo'),
        serv: num(g(s, 'servidores')), cont: num(g(s, 'contratistas')),
        servLev: num(g(s, 'servLev')), contLev: num(g(s, 'contLev')),
        cancel: num(g(s, 'cancel')), reprog: num(g(s, 'reprog')), oficios: num(g(s, 'oficios')), instr: num(g(s, 'instrumentos')),
        solicitud: g(s, 'solicitud'), caracteriz: g(s, 'caracteriz'), unidadLev: g(s, 'unidadLev'),
        entrevista: g(s, 'entrevista'), prel: g(s, 'informePrel'), final: g(s, 'informeFinal'),
        fecha: g(s, 'fecha'), hora: g(s, 'hora'), lugar: g(s, 'lugar') };
    });
    filtros(); render();
  } catch (e) {
    console.error(e); msg.textContent = '⚠️ No se pudo cargar una de las hojas (' + (e.message || 'error de red') + '). Pulsa Sincronizar para reintentar.'; msg.style.display = 'block';
  } finally { btn.disabled = false; }
}

// ---------- Render ----------
function render() { kpis(); bloques(); embudo(); graficos(); operativas(); agenda(); alertas(); tabla(); }

function kpi(c, color, l, n, s, p) {
  const d = h('div', 'card kpi'); d.style.setProperty('--c', color);
  d.append(h('div', 'l', l), h('div', 'n', n));
  if (p !== undefined) { const b = h('div', 'bar'), i = h('i'); i.style.width = Math.min(p, 100) + '%'; i.style.background = color; b.append(i); d.append(b); }
  d.append(h('div', 's', s)); c.append(d);
}
function kpis() {
  const c = $('kpis'); c.replaceChildren();
  const mesas = new Set(filas.map(r => r.mesa).filter(Boolean)).size, cubiertas = filas.filter(r => r.mesa).length;
  const meta = C.META_SERVIDORES ?? sum(filas, r => r.serv), lev = sum(filas, r => r.servLev);
  const cont = sum(filas, r => r.cont), contLev = sum(filas, r => r.contLev);
  kpi(c, '#006633', 'Mesas de apertura realizadas', fmt(mesas), 'Mesas únicas (códigos distintos)');
  kpi(c, '#0891b2', 'Dependencias cubiertas por mesa', fmt(cubiertas), 'Dependencias con código de mesa');
  kpi(c, '#059669', 'Servidores con carga levantada', fmt(lev), `${pct(lev, meta)}% de ${fmt(meta)}` + (C.META_SERVIDORES ? ` · corte SARA ${C.CORTE_SARA}` : ''), pct(lev, meta));
  kpi(c, '#d97706', 'Contratistas con carga levantada', fmt(contLev), `${pct(contLev, cont)}% de ${fmt(cont)} identificados`, pct(contLev, cont));
}

function bloques() {
  const bl = (id, req, ok, tit) => {
    const a = filas.filter(req), d = a.filter(ok), box = $(id); box.replaceChildren();
    const n = h('div', 'kpi'); n.style.cssText = 'font-size:24px;font-weight:800;color:var(--v)'; n.textContent = `${d.length} / ${a.length}`;
    const b = h('div', 'bar'), i = h('i'); i.style.width = pct(d.length, a.length) + '%'; b.append(i);
    box.append(n, b, h('div', 's', `${pct(d.length, a.length)}% de ${tit} entregados`));
    box.lastChild.style.cssText = 'font-size:11px;color:var(--m);margin-top:6px';
  };
  bl('bFinal', r => r.reqFinal, r => hecho(r.final), 'informes finales');
  bl('bPrel', r => r.reqPrel, r => hecho(r.prel), 'informes preliminares');
}

function embudo() {
  const act = filas.filter(r => r.act), tot = filas.length;
  const et = [['Mesa de apertura', filas.filter(r => r.mesa).length], ['Solicitud de información', act.filter(r => hecho(r.solicitud)).length],
    ['Caracterización', act.filter(r => hecho(r.caracteriz)).length], ['Unidad levantada', act.filter(r => si(r.unidadLev)).length],
    ['Entrevista con el jefe', act.filter(r => hecho(r.entrevista)).length],
    ['Informe (prelim. o final)', filas.filter(r => hecho(r.prel) || hecho(r.final)).length]];
  const box = $('embudo'); box.replaceChildren();
  et.forEach(([t, n]) => { const row = h('div'), b = h('div', 'bar'), i = h('i'); i.style.width = pct(n, tot) + '%'; b.append(i);
    row.append(h('span', '', t), b, h('b', '', `${n} (${pct(n, tot)}%)`)); box.append(row); });
}

function chart(id, tipo, labels, sets, opts = {}) {
  charts[id]?.destroy();
  charts[id] = new Chart($(id), { type: tipo, data: { labels, datasets: sets.map(([label, data, backgroundColor]) => ({ label, data, backgroundColor, borderRadius: 4 })) },
    options: { responsive: true, ...opts, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}
function graficos() {
  const s = por(filas, r => r.sede), sedes = Object.keys(s).sort();
  chart('chMesas', 'bar', sedes, [['Mesas realizadas', sedes.map(k => new Set(s[k].map(r => r.mesa).filter(Boolean)).size), '#006633'],
    ['Dependencias cubiertas', sedes.map(k => s[k].filter(r => r.mesa).length), '#0891b2']]);
  chart('chLev', 'bar', sedes, [['Servidores', sedes.map(k => sum(s[k], r => r.servLev)), '#2563eb'], ['Contratistas', sedes.map(k => sum(s[k], r => r.contLev)), '#d97706']]);
  if (!PUB) { const a = por(filas.filter(r => r.resp), r => r.resp), an = Object.keys(a).sort();
    chart('chAnalista', 'bar', an, [['Asignadas', an.map(k => a[k].length), '#e5e7eb'], ['Levantadas', an.map(k => a[k].filter(r => si(r.unidadLev)).length), '#006633'],
      ['Con informe', an.map(k => a[k].filter(r => hecho(r.prel) || hecho(r.final)).length), '#2563eb']], { indexAxis: 'y' }); }
}

function operativas() {
  const box = $('oper'); box.replaceChildren();
  [['Cancelaciones', 'cancel'], ['Reprogramaciones', 'reprog'], ['Oficios proyectados', 'oficios'], ['Instrumentos de observación', 'instr']].forEach(([t, k]) => {
    const d = h('div'); d.append(h('div', 'l', t), h('div', 'n', fmt(sum(filas, r => r[k])))); d.firstChild.style.cssText = 'font-size:11px;color:var(--m);text-transform:uppercase';
    d.lastChild.style.cssText = 'font-size:22px;font-weight:800;color:var(--v)'; box.append(d); });
}

function agenda() {
  if (PUB) return; const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const prox = filas.map(r => ({ r, f: parseFecha(r.fecha) })).filter(x => x.f && x.f >= hoy).sort((a, b) => a.f - b.f).slice(0, C.AGENDA_MAX);
  const ul = $('agenda'); ul.replaceChildren();
  if (!prox.length) return ul.append(h('li', 'mu', 'Sin entrevistas programadas.'));
  prox.forEach(({ r }) => ul.append(h('li', '', `${r.fecha} ${r.hora} · ${r.nombre} · ${r.lugar || 'Lugar por definir'}`)));
}

function alertas() {
  if (PUB) return; const box = $('alertas'); box.replaceChildren();
  const reglas = [['Sin responsable asignado', r => r.act && !r.resp], ['Mesa realizada sin solicitud de información', r => r.mesa && r.act && !hecho(r.solicitud)],
    ['Carga levantada sin informe', r => si(r.unidadLev) && !(hecho(r.prel) || hecho(r.final))], ['Sin registro en hoja de analistas', r => !r.act]];
  reglas.forEach(([t, f]) => { const l = filas.filter(f), d = h('details'), s = h('summary', '', t), b = h('span', 'badge', l.length); s.append(b); d.append(s);
    const ul = h('ul'); l.slice(0, C.ALERTA_MAX).forEach(r => ul.append(h('li', '', `${r.nombre} (${r.id})`)));
    if (l.length > C.ALERTA_MAX) ul.append(h('li', 'mu', `… y ${l.length - C.ALERTA_MAX} más`)); d.append(ul); box.append(d); });
}

// ---------- Tabla ----------
const COLS = [['id', 'ID_UADMIN'], ['sede', 'Sede'], ['nombre', 'Dependencia'], ['org', 'Tipo'], ['resp', 'Responsable', 1], ['apoyo', 'Apoyo', 1], ['mesa', 'Mesa'],
  ['serv', 'Serv.'], ['servLev', 'Levant.'], ['avance', '% Avance'], ['solicitud', 'Solicitud'], ['caracteriz', 'Caracteriz.'], ['prel', 'Inf. prel.'], ['final', 'Inf. final']];
function filtros() {
  const llenar = (id, vals) => { const s = $(id), p = s.value; [...s.options].slice(1).forEach(o => o.remove()); vals.forEach(v => s.append(new Option(v, v))); s.value = p; };
  llenar('fSede', [...new Set(filas.map(r => r.sede))].sort()); llenar('fResp', [...new Set(filas.map(r => r.resp).filter(Boolean))].sort());
}
const marca = (v, req = true) => { if (!req) return h('span', 'mu', 'N/A'); const x = h('span'); if (!hecho(v)) { x.className = 'mu'; x.textContent = '—'; } else if (norm(v) === 'SI') { x.className = 'ok'; x.textContent = '✓'; } else x.textContent = v; return x; };
function tabla() {
  const th = $('thead'), tb = $('tbody'), q = norm($('fTxt').value), sd = $('fSede').value, tp = $('fTipo').value, rp = $('fResp').value, todas = $('fTodas').checked;
  th.replaceChildren(); const tr0 = h('tr');
  COLS.forEach(([k, t, p]) => { const c = h('th', p ? 'priv' : '', t + (orden.k === k ? (orden.asc ? ' ▲' : ' ▼') : '')); c.onclick = () => { orden = { k, asc: orden.k === k ? !orden.asc : true }; tabla(); }; tr0.append(c); }); th.append(tr0);
  const lista = filas.filter(r => (todas || r.act) && norm(r.nombre).includes(q) && (!sd || r.sede === sd) && (!tp || r.org === (tp === '1')) && (!rp || r.resp === rp))
    .map(r => ({ ...r, avance: pct(r.servLev, r.serv) })).sort((a, b) => { const d = (typeof a[orden.k] === 'number' || typeof a[orden.k] === 'boolean') ? a[orden.k] - b[orden.k] : String(a[orden.k]).localeCompare(String(b[orden.k]), 'es', { numeric: true }); return orden.asc ? d : -d; });
  tb.replaceChildren();
  if (!lista.length) { const t = h('tr'), d = h('td', 'c mu', 'Sin resultados.'); d.colSpan = COLS.length; t.append(d); return tb.append(t); }
  lista.forEach(r => { const t = h('tr'), add = (n, cls) => { const d = h('td', cls); d.append(n); t.append(d); };
    add(r.id, 'mu'); add(r.sede); add(h('b', '', r.nombre)); add(h('span', 'tag' + (r.org ? ' o' : ''), r.org ? 'Unidad org.' : 'Dependencia'));
    add(r.resp || '—', 'priv'); add(r.apoyo || '—', 'priv'); add(r.mesa ? h('span', 'ok', r.mesa) : marca(''), 'c');
    add(r.act ? String(r.serv) : '—', 'c'); add(r.act ? String(r.servLev) : '—', 'c'); add(r.act && r.serv ? r.avance + '%' : '—', 'c');
    add(marca(r.solicitud), 'c'); add(marca(r.caracteriz), 'c'); add(marca(r.prel, r.reqPrel), 'c'); add(marca(r.final, r.reqFinal), 'c'); tb.append(t); });
}

$('btnSync').onclick = sincronizar;
['fTxt', 'fSede', 'fTipo', 'fResp', 'fTodas'].forEach(id => $(id).addEventListener('input', tabla));
sincronizar();
})();