/* Noyau commun à toutes les pages publiques et du dashboard :
   connexion à la base (réelle ou démo), paramètres, mise en page, outils. */
(function () {
  'use strict';
  const C = window.MPP_CONFIG || {};
  const base = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');
  // Mode démo : pas de clés renseignées, OU poste local (localhost) sauf si ?live=1 a été demandé (?live=0 pour revenir à la démo)
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let live = false;
  try {
    const q = (location.search.match(/[?&]live=([01])/) || [])[1];
    if (q) localStorage.setItem('mpp_live', q);
    live = localStorage.getItem('mpp_live') === '1';
  } catch (e) { /* ignore */ }
  const MPP = (window.MPP = { cfg: C, demo: !(C.supabaseUrl && C.supabaseKey) || (isLocalHost && !live), root: base.replace(/js\/$/, ''), sb: null });

  // ---------- chargement des dépendances ----------
  const ver = (((document.currentScript && document.currentScript.src) || '').match(/[?&]v=([\w.-]+)/) || [])[1] || '';
  const load = (src) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src + (ver && src.indexOf(base) === 0 ? '?v=' + ver : ''); s.onload = res; s.onerror = () => rej(new Error('Chargement impossible : ' + src));
    document.head.appendChild(s);
  });
  MPP.ready = (async () => {
    await load(base + 'filters.js');
    if (MPP.demo) {
      await load(base + 'seed-data.js');
      await load(base + 'mock.js');
      MPP.sb = window.MPP_MOCK.create();
    } else {
      await load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js');
      MPP.sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
    }
  })();

  // ---------- petits outils ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Object.assign(MPP, { $, $$, esc });
  MPP.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  MPP.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const ICONS = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    gift: '<path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
    car: '<path d="M5 17h14M3 13l2-6h14l2 6v4H3zM7 17v2M17 17v2M7 13h.01M17 13h.01"/>',
    star: '<path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/>',
    users: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.9"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 5V5L7 10H4a1 1 0 0 0-1 1zM19 8a5 5 0 0 1 0 8"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    flag: '<path d="M4 22V3M4 4h13l-2 4 2 4H4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    up: '<path d="M7 10v11H3V10zM7 10l4-8a3 3 0 0 1 3 3v4h6a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.6 21H7"/>',
    down: '<path d="M17 14V3h4v11zM17 14l-4 8a3 3 0 0 1-3-3v-4H4a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.4 3H17"/>',
    alert: '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    archive: '<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>', image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  MPP.icon = (n, cls) => '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || '') + '</svg>';

  // ---------- dates ----------
  const parseDate = (s) => {
    if (s instanceof Date) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(s))) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
    return new Date(s);
  };
  MPP.parseDate = parseDate;
  MPP.ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  MPP.fmtDate = (d, o) => (d ? new Intl.DateTimeFormat('fr-FR', o || { day: 'numeric', month: 'long', year: 'numeric' }).format(parseDate(d)) : '');
  MPP.fmtDay = (d) => MPP.fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
  MPP.fmtTime = (d) => (d ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(parseDate(d)) : '');
  MPP.fmtDateTime = (d) => (d ? MPP.fmtDate(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  MPP.fmtMonth = (m) => { const [y, mo] = String(m).split('-').map(Number); return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(y, mo - 1, 1)); };
  MPP.ago = (d) => {
    const s = Math.max(0, Math.round((Date.now() - parseDate(d).getTime()) / 1000));
    if (s < 45) return "à l'instant";
    if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    return 'il y a ' + Math.round(s / 86400) + ' j';
  };
  MPP.hhmm = (t) => String(t || '').replace(/^(\d{1,2}):(\d{2}).*$/, (_, h, m) => Number(h) + ' h' + (m === '00' ? '' : ' ' + m));

  // ---------- texte : mini-markdown et variables ----------
  MPP.md = (text) => {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
    const lines = String(text || '').replace(/\r/g, '').split('\n'); const out = []; let list = false; let para = [];
    const flush = () => { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } };
    const endList = () => { if (list) { out.push('</ul>'); list = false; } };
    for (const ln of lines) {
      if (/^\s*$/.test(ln)) { flush(); endList(); continue; }
      const h = ln.match(/^(#{1,3})\s+(.*)$/);
      if (h) { flush(); endList(); out.push('<h' + (h[1].length + 1) + '>' + inline(h[2]) + '</h' + (h[1].length + 1) + '>'); continue; }
      const li = ln.match(/^\s*[-•]\s+(.*)$/);
      if (li) { flush(); if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + inline(li[1]) + '</li>'); continue; }
      endList(); para.push(inline(ln));
    }
    flush(); endList();
    return out.join('');
  };
  MPP.tpl = (text, S) => String(text || '').replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (_, k, fb) => {
    let v = null;
    if (k === 'campagne_debut' || k === 'campagne_fin') v = S[k] ? MPP.fmtDate(S[k]) : null;
    else if (k === 'heure_tirage') v = S.heure_tirage ? MPP.hhmm(S.heure_tirage) : null;
    else if (k === 'validite') { const n = Number(S.validite_repas_jours); v = n === 0 ? 'la fin du jour du tirage' : n === 1 ? 'la fin du jour suivant le tirage' : n + ' jours après le tirage'; }
    else if (k === 'chat_horaires') v = S.chat_debut && S.chat_fin ? 'de ' + MPP.hhmm(S.chat_debut) + ' à ' + MPP.hhmm(S.chat_fin) : null;
    else v = S[k] || null;
    return v ? esc(v) : '[' + esc(fb || k) + ']';
  });
  MPP.waLink = (S, text) => 'https://wa.me/' + String(S.whatsapp_numero || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text || S.whatsapp_message || '');
  MPP.telLink = (n) => 'tel:' + String(n || '').replace(/[^\d+]/g, '');

  // ---------- appareil, appels serveur ----------
  MPP.device = () => {
    try {
      let d = localStorage.getItem('mpp_device');
      if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); localStorage.setItem('mpp_device', d); }
      return d;
    } catch (e) { return (window.__mppDev = window.__mppDev || String(Date.now()) + Math.random().toString(16).slice(2)); }
  };
  MPP.store = {
    get: (k, d) => { try { const v = localStorage.getItem('mpp_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem('mpp_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  MPP.rpc = async (name, args) => {
    const { data, error } = await MPP.sb.rpc(name, args || {});
    if (error) throw new Error(error.message || 'Erreur serveur');
    return data;
  };
  MPP.q = async (query) => { const r = await query; if (r.error) throw new Error(r.error.message || 'Erreur serveur'); return r.data; };

  let _S = null;
  MPP.settings = async (fresh) => {
    if (!_S || fresh) {
      const rows = await MPP.q(MPP.sb.from('parametres').select('*'));
      _S = {}; (rows || []).forEach((r) => { _S[r.cle] = r.valeur; });
    }
    return _S;
  };

  MPP.poll = (fn, ms) => {
    let t = null; let stop = false;
    const tick = async () => { if (stop) return; if (!document.hidden) { try { await fn(); } catch (e) { /* ignore */ } } t = setTimeout(tick, ms); };
    t = setTimeout(tick, ms);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !stop) { clearTimeout(t); tick(); } });
    return () => { stop = true; clearTimeout(t); };
  };

  // ---------- retours visuels ----------
  MPP.toast = (msg, kind) => {
    let box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = MPP.el('<div class="toast ' + (kind || '') + '">' + esc(msg) + '</div>');
    box.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, kind === 'error' ? 5200 : 3200);
  };
  MPP.alert = (kind, html) => '<div class="alert ' + kind + '" role="' + (kind === 'error' ? 'alert' : 'status') + '">' + html + '</div>';
  MPP.confirm = (message, o) => new Promise((resolve) => {
    o = o || {};
    const m = MPP.el('<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><p>' + esc(message) + '</p>' +
      (o.input ? '<label class="field"><span>' + esc(o.input) + '</span><input type="text" class="m-in" autocomplete="off"></label>' : '') +
      '<div class="row end"><button class="btn btn-ghost" data-r="0">Annuler</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-r="1">' + esc(o.ok || 'Confirmer') + '</button></div></div></div>');
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (b || e.target === m) { const inp = $('.m-in', m); const val = inp ? inp.value : true; m.remove(); resolve(b && b.dataset.r === '1' ? val : false); }
    });
    document.body.appendChild(m); const i = $('.m-in', m) || $('[data-r="1"]', m); i.focus();
  });
  MPP.busy = (btn, on, label) => { if (!btn) return; if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.innerHTML = label || 'Envoi…'; } else { btn.disabled = false; if (btn.dataset.l) btn.innerHTML = btn.dataset.l; } };
  MPP.countdown = (el, target, onDone) => {
    const draw = () => {
      let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      if (s === 0 && onDone) { onDone(); onDone = null; }
      const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
      const cell = (n, l) => '<div class="cd"><b>' + String(n).padStart(2, '0') + '</b><span>' + l + '</span></div>';
      el.innerHTML = cell(d, 'jours') + cell(h, 'heures') + cell(m, 'min') + cell(s, 'sec');
    };
    draw(); return setInterval(draw, 1000);
  };

  // ---------- partage ----------
  // Liens entre le site public et le dashboard (qui peuvent être déployés à deux adresses différentes)
  // En local (localhost) on ignore ces adresses : les liens restent dans le dossier de travail.
  const trimUrl = (u) => String(u || '').replace(/\/+$/, '');
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const siteU = LOCAL ? '' : trimUrl(C.siteUrl), dashU = LOCAL ? '' : trimUrl(C.dashUrl);
  MPP.dashLink = (page) => (dashU ? dashU + '/' + (page || 'connexion.html') : MPP.root + 'admin/' + (page || 'connexion.html'));
  MPP.siteLink = (page) => (siteU ? siteU + '/' + (page || '') : /\/admin\//.test(location.pathname) ? MPP.root + (page || '') : null);

  MPP.pageUrl = (hash) => {
    const file = location.pathname.split('/').pop() || 'index.html';
    const u = siteU ? siteU + '/' + file : location.href.split('#')[0].split('?')[0];
    return u + (hash || '');
  };
  MPP.shareHtml = (title, hash) =>
    '<div class="share" data-title="' + esc(title) + '" data-hash="' + esc(hash || '') + '"><button type="button" class="btn btn-sm btn-ghost" data-share="wa">' + MPP.icon('share') + ' WhatsApp</button><button type="button" class="btn btn-sm btn-ghost" data-share="copy">' + MPP.icon('link') + ' Copier le lien</button></div>';
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-share]'); if (!b) return;
    const box = b.closest('.share'); const url = MPP.pageUrl(box.dataset.hash); const title = box.dataset.title;
    if (b.dataset.share === 'wa') window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + url), '_blank', 'noopener');
    else {
      try { await navigator.clipboard.writeText(url); } catch (err) { const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e2) { /* ignore */ } t.remove(); }
      MPP.toast('Lien copié');
    }
  });

  // ---------- images ----------
  MPP.compressImage = (file, o) => new Promise((resolve, reject) => {
    o = Object.assign({ max: 900, quality: 0.8, square: false }, o);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Format accepté : JPG, PNG ou WebP.'));
    if (file.size > 12 * 1024 * 1024) return reject(new Error('Image trop lourde (12 Mo max).'));
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (o.square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
      const k = Math.min(1, o.max / Math.max(sw, sh)); const w = Math.round(sw * k), h = Math.round(sh * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Compression impossible.'))), 'image/jpeg', o.quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
    img.src = url;
  });
  MPP.uploadImage = async (bucket, blob) => {
    const name = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)) + '.jpg';
    const { error } = await MPP.sb.storage.from(bucket).upload(name, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message || "Échec de l'envoi de l'image");
    return MPP.sb.storage.from(bucket).getPublicUrl(name).data.publicUrl;
  };

  MPP.initials = (p, n) => ((p || '').trim()[0] || '') + ((n || '').trim()[0] || '');
  MPP.STATUT_IDEE = { recue: ['Reçue', ''], a_etude: ["À l'étude", 'gold'], retenue: ['Retenue', 'green'], realisee: ['Réalisée', 'green'], non_retenue: ['Non retenue', 'red'] };
  MPP.STATUT_PROJET = { prevu: ['Prévu', ''], en_cours: ['En cours', 'gold'], realise: ['Réalisé', 'green'] };
  MPP.CATEGORIES = ['vie académique', 'infrastructures', 'restauration', 'vie associative', 'numérique', 'autre'];

  // ---------- état de la campagne ----------
  MPP.campaign = (S) => {
    const today = MPP.ymd(new Date());
    const closed = !!S.campagne_cloturee;
    const set = !!(S.campagne_debut && S.campagne_fin);
    let phase = 'inconnue';
    if (closed) phase = 'cloturee';
    else if (set) phase = today < S.campagne_debut ? 'avant' : today > S.campagne_fin ? 'apres' : 'en_cours';
    const dayNo = set && phase === 'en_cours' ? Math.round((parseDate(today) - parseDate(S.campagne_debut)) / 864e5) + 1 : null;
    const total = set ? Math.round((parseDate(S.campagne_fin) - parseDate(S.campagne_debut)) / 864e5) + 1 : null;
    return { closed, set, phase, dayNo, total, today };
  };

  // ---------- mise en page ----------
  const NAV = [
    { g: 'Le MPPE', items: [['mouvement', 'Le mouvement', 'flag'], ['projets', 'Vision et projets', 'bulb'], ['equipe', "L'équipe", 'users'], ['annonces', 'Annonces', 'megaphone'], ['agenda', 'Agenda', 'calendar'], ['soutenir', 'Soutenir le MPPE', 'heart', 'promesse'], ['rejoindre', "Rejoindre l'équipe", 'users']] },
    { g: 'Participer', items: [['inscription', 'Tirage au sort', 'gift', 'tirage'], ['gagnant', 'Gagnant du jour', 'trophy', 'tirage'], ['idees', 'Boîte à idées', 'bulb'], ['chat', 'Chat anonyme', 'chat'], ['sondages', 'Sondages', 'chart'], ['avis', 'Avis sur le bureau', 'star']] },
    { g: 'Infos pratiques', items: [['parking', 'Parking gratuit', 'car'], ['faq', 'FAQ et règles', 'help'], ['liens', 'Liens utiles', 'link'], ['aide', "Besoin d'aide ?", 'help']] }
  ];
  const TOP = [['index', 'Accueil'], ['mouvement', 'Le mouvement'], ['projets', 'Projets'], ['equipe', 'Équipe'], ['idees', 'Idées'], ['chat', 'Chat']];

  async function layout(S) {
    const body = document.body; const cur = body.dataset.nav || body.dataset.page || '';
    const camp = MPP.campaign(S);
    const hidden = (it) => (it[3] === 'tirage' && camp.closed) || (it[3] === 'promesse' && (camp.closed || S.promesse_active === false));
    const link = (id) => MPP.root + id + '.html';
    const items = NAV.map((g) => ({ g: g.g, items: g.items.filter((it) => !hidden(it)) }));
    if (S.merci_active) items[0].items.push(['merci', 'Remerciements et résultats', 'trophy']);
    const header = MPP.el(
      '<header class="site-header"><div class="stripe"></div><div class="wrap bar">' +
      '<a class="brand" href="' + link('index') + '" aria-label="Accueil MPPE"><img src="' + MPP.root + 'assets/logo.svg" alt="" width="40" height="40"><span><b>MPPE</b><small>Progrès estudiantin</small></span></a>' +
      '<nav class="top-nav" aria-label="Navigation principale">' + TOP.map(([id, l]) => '<a href="' + link(id) + '"' + (cur === id ? ' aria-current="page"' : '') + '>' + l + '</a>').join('') + '</nav>' +
      '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="drawer">' + MPP.icon('menu') + '<span>Menu</span></button></div></header>');
    const drawer = MPP.el(
      '<div class="drawer-bg" hidden><aside class="drawer" id="drawer" aria-label="Menu"><div class="row between"><b>Menu</b><button class="icon-btn" type="button" data-close aria-label="Fermer">' + MPP.icon('x') + '</button></div>' +
      '<a class="d-link" href="' + link('index') + '">' + MPP.icon('home') + 'Accueil</a>' +
      items.map((g) => '<div class="d-group">' + g.g + '</div>' + g.items.map((it) => '<a class="d-link" href="' + link(it[0]) + '"' + (cur === it[0] ? ' aria-current="page"' : '') + '>' + MPP.icon(it[2]) + it[1] + '</a>').join('')).join('') +
      '<div class="d-group">Équipe du bureau</div><a class="d-link" href="' + MPP.dashLink() + '">' + MPP.icon('lock') + 'Espace bureau (dashboard)</a>' +
      '</aside></div>');
    const toggle = (open) => { drawer.hidden = !open; $('.menu-btn', header).setAttribute('aria-expanded', String(open)); document.body.classList.toggle('no-scroll', open); };
    $('.menu-btn', header).addEventListener('click', () => toggle(true));
    drawer.addEventListener('click', (e) => { if (e.target === drawer || e.target.closest('[data-close]') || e.target.closest('a')) toggle(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });

    const main = $('#app');
    if (MPP.demo) {
      const d = MPP.el('<div class="demo-strip">Mode démo : les données restent sur cet appareil. <button type="button">Réinitialiser la démo</button></div>');
      $('button', d).addEventListener('click', async () => { if (await MPP.confirm('Remettre la démo à zéro ? Toutes les données saisies seront perdues.', { ok: 'Réinitialiser', danger: true })) { MPP.sb.__reset(); location.reload(); } });
      body.prepend(d);
    }
    body.insertBefore(header, main); body.insertBefore(drawer, main);

    // pied de page
    let links = [];
    try { links = await MPP.q(MPP.sb.from('liens_officiels').select('*').order('ordre')); } catch (e) { /* ignore */ }
    const legal = [['mentions-legales', 'Mentions légales'], ['regles-tirage', 'Règles du tirage'], ['confidentialite', 'Confidentialité'], ['charte', 'Charte du chat']];
    const footer = MPP.el(
      '<footer class="site-footer"><div class="wrap"><div class="f-grid">' +
      '<div><div class="f-brand"><img src="' + MPP.root + 'assets/logo.svg" alt="" width="44" height="44"><b>MPPE</b></div><p>La force de la jeunesse, l\'avenir du Faso.</p>' +
      '<a class="btn btn-sm btn-gold" href="' + link('aide') + '">' + MPP.icon('help') + " Besoin d'aide ?</a></div>" +
      '<div><h4>Liens officiels de l\'UTM</h4><ul>' + links.slice(0, 4).map((l) => '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.libelle) + '</a></li>').join('') + '<li><a href="' + link('liens') + '">Tous les liens utiles →</a></li></ul></div>' +
      '<div><h4>Contact</h4><ul><li><a href="' + esc(MPP.waLink(S)) + '" target="_blank" rel="noopener noreferrer">' + MPP.icon('chat') + ' WhatsApp du bureau</a></li><li><a href="' + link('rejoindre') + '">Rejoindre l\'équipe</a></li></ul><button type="button" class="btn btn-sm btn-ghost-light" id="install" hidden>Installer l\'application</button></div>' +
      '</div><p class="f-note">Site de campagne du MPPE, indépendant de l\'administration de l\'UTM.</p>' +
      '<p class="f-legal">' + legal.map(([id, l]) => '<a href="' + link(id) + '">' + l + '</a>').join(' · ') + ' · <a href="' + MPP.dashLink() + '">Espace bureau</a></p></div></footer>');
    body.appendChild(footer);

    // bandeau du gagnant (fixe, en bas)
    if (!camp.closed && camp.set) {
      try {
        const w = await MPP.q(MPP.sb.from('gagnants_public').select('*').order('jour', { ascending: false }).limit(1));
        const g = w[0];
        if (g && g.statut_repas === 'en_attente' && (!g.valide_jusqu_au || new Date(g.valide_jusqu_au) > new Date())) {
          const txt = String(S.texte_bandeau || '').replace('{numero}', S.numero_gagnant || '');
          const b = MPP.el('<div class="winner-banner" role="note"><span class="wb-i">' + MPP.icon('phone') + '</span><p>' + esc(txt).replace(esc(S.numero_gagnant || '§'), '<a href="' + MPP.telLink(S.numero_gagnant) + '">' + esc(S.numero_gagnant) + '</a>') + '</p></div>');
          body.appendChild(b); body.classList.add('has-banner');
        }
      } catch (e) { /* ignore */ }
    }

    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; const b = $('#install'); if (b) b.hidden = false; });
    const ib = $('#install', footer); if (ib) ib.addEventListener('click', async () => { if (deferred) { deferred.prompt(); deferred = null; ib.hidden = true; } });

    try { MPP.sb.rpc('hit', { p_page: body.dataset.page || 'index' }); } catch (e) { /* ignore */ }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !body.dataset.admin) navigator.serviceWorker.register(MPP.root + 'sw.js').catch(() => { });
  }

  /** Point d'entrée des pages publiques : MPP.page(async ({ sb, S, el, camp }) => { ... }) */
  MPP.page = (fn, opts) => {
    const run = async () => {
      const app = $('#app');
      try {
        await MPP.ready;
        const S = await MPP.settings();
        if (!(opts && opts.bare)) await layout(S);
        await fn({ sb: MPP.sb, S, el: app, camp: MPP.campaign(S) });
      } catch (e) {
        console.error(e);
        if (app) app.innerHTML = '<div class="wrap section">' + MPP.alert('error', "<b>Chargement impossible.</b> Vérifiez votre connexion puis actualisez la page.<br><small>" + esc(e.message) + '</small>') + '</div>';
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  };
  MPP.layout = layout;
})();
