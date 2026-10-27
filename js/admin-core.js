/* Noyau du dashboard : accès par rôle, mise en page, tableaux, formulaires, CRUD générique, export CSV */
(function () {
  'use strict';
  const { esc, icon, $ } = MPP;
  const A = (MPP.admin = {});
  A.ROLES = { president: 'Président', admin: 'Administrateur', moderateur: 'Modérateur' };

  const NAV = [
    { g: 'Pilotage', items: [['index', "Vue d'ensemble", 'home', 'staff']] },
    { g: 'Campagne', items: [['participants', 'Participants', 'users', 'admin', 'a_verifier'], ['tirage', 'Tirage au sort', 'trophy', 'admin'], ['points', "Points d'inscription", 'pin', 'admin'], ['parking', 'Parking', 'car', 'admin'], ['agenda', 'Agenda', 'calendar', 'admin'], ['cloture', 'Clôture', 'archive', 'admin']] },
    { g: 'Communauté', items: [['chat', 'Chat et modération', 'chat', 'staff', 'messages_masques'], ['idees', 'Idées', 'bulb', 'staff', 'idees_signalees'], ['sondages', 'Sondages', 'chart', 'admin'], ['avis', 'Avis sur le bureau', 'star', 'admin', 'avis_a_examiner']] },
    { g: 'Bureau', items: [['contenus', 'Contenus', 'edit', 'admin'], ['equipe', 'Équipe', 'users', 'admin'], ['benevoles', 'Bénévoles', 'users', 'admin', 'benevoles_nouveaux'], ['aide', "Demandes d'aide", 'help', 'admin', 'aides_nouvelles']] },
    { g: 'Réservé au président', items: [['promesses', 'Promesses de vote', 'heart', 'president'], ['audit', "Journal d'audit", 'shield', 'president']] },
    { g: 'Système', items: [['parametres', 'Paramètres', 'sliders', 'admin']] }
  ];
  const rank = { moderateur: 1, admin: 2, president: 3 };
  const NEED = { staff: 1, admin: 2, president: 3 };
  A.allowed = (role, need) => (rank[role] || 0) >= (NEED[need || 'staff'] || 1);

  /** Point d'entrée : A.page({ nav: 'tirage', need: 'admin' }, async ({ sb, S, me, el }) => { ... }) */
  A.page = (opts, fn) => {
    const run = async () => {
      const app = $('#app');
      try {
        await MPP.ready;
        const sb = MPP.sb;
        const file = location.pathname.split('/').pop() || 'index.html';
        const toLogin = () => location.replace('connexion.html?next=' + encodeURIComponent(file));
        const { data } = await sb.auth.getSession();
        if (!data || !data.session) return toLogin();
        const rows = await MPP.q(sb.from('admins').select('*').eq('user_id', data.session.user.id));
        const me = rows[0];
        const S = await MPP.settings(true);
        if (!me) {
          app.innerHTML = '<div class="login-wrap"><div class="login"><h1>Compte non autorisé</h1><p class="muted center">Ce compte n\'a pas accès au dashboard du MPPE.</p><button class="btn btn-block" id="out">Se déconnecter</button></div></div>';
          $('#out').addEventListener('click', async () => { await sb.auth.signOut(); toLogin(); });
          return;
        }
        if (!MPP.demo && S.require_2fa !== false) {
          const aal = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
          if (!aal.data || aal.data.currentLevel !== 'aal2') return toLogin();
        }
        A.me = me; A.S = S;
        const ok = A.allowed(me.role, opts.need);
        shell(me, opts.nav, sb);
        const el = $('#content');
        if (!ok) { el.innerHTML = '<div class="panel"><h1 style="margin:0 0 6px">Accès refusé</h1><p class="muted" style="margin:0">Votre rôle (' + esc(A.ROLES[me.role]) + ') ne donne pas accès à cette page.</p></div>'; return; }
        sb.rpc('heartbeat'); setInterval(() => sb.rpc('heartbeat'), 60000);
        await fn({ sb, S, me, el });
      } catch (e) {
        console.error(e);
        app.innerHTML = '<div class="main">' + MPP.alert('error', '<b>Erreur.</b> ' + esc(e.message)) + '</div>';
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  };

  function shell(me, current, sb) {
    const items = NAV.map((g) => ({ g: g.g, items: g.items.filter((it) => A.allowed(me.role, it[3])) })).filter((g) => g.items.length);
    const side = '<aside class="side" id="side"><a class="s-brand" href="index.html"><img src="../assets/logo.svg" width="40" height="40" alt=""><span>MPPE<small>Dashboard</small></span></a>' +
      items.map((g) => '<div class="grp">' + g.g + '</div>' + g.items.map((it) => '<a class="s-link" href="' + it[0] + '.html"' + (current === it[0] ? ' aria-current="page"' : '') + '>' + icon(it[2]) + '<span>' + it[1] + '</span>' + (it[4] ? '<span class="s-badge" data-badge="' + it[4] + '" hidden></span>' : '') + '</a>').join('')).join('') +
      '<a class="s-link" href="../index.html" target="_blank" style="margin-top:10px">' + icon('eye') + '<span>Voir le site</span></a>' +
      '<div class="s-me"><b>' + esc(me.nom_affiche || me.email) + '</b><span>' + esc(A.ROLES[me.role]) + (me.poste ? ' · ' + esc(me.poste) : '') + '</span><button class="btn btn-sm btn-ghost-light" id="logout" type="button">' + icon('logout') + ' Se déconnecter</button></div></aside>';
    $('#app').innerHTML = (MPP.demo ? '<div class="demo-strip">Mode démo : données locales. <button type="button" id="reset">Réinitialiser la démo</button></div>' : '') +
      '<div class="main-top"><button type="button" id="burger" aria-label="Menu">' + icon('menu') + '</button><b>Dashboard MPPE</b><span></span></div><div class="side-bg" id="sbg"></div><div class="adm">' + side + '<main class="main" id="content"><div class="loading">Chargement…</div></main></div>';
    const toggle = (o) => { $('#side').classList.toggle('open', o); $('#sbg').classList.toggle('open', o); };
    $('#burger').addEventListener('click', () => toggle(true)); $('#sbg').addEventListener('click', () => toggle(false));
    $('#logout').addEventListener('click', async () => { await sb.auth.signOut(); location.replace('connexion.html'); });
    const rs = $('#reset'); if (rs) rs.addEventListener('click', async () => { if (await MPP.confirm('Remettre la démo à zéro ?', { ok: 'Réinitialiser', danger: true })) { sb.__reset(); location.replace('connexion.html'); } });
    sb.rpc('stats_dashboard').then(({ data }) => { if (data && data.ok) document.querySelectorAll('[data-badge]').forEach((b) => { const n = data[b.dataset.badge]; if (n > 0) { b.textContent = n; b.hidden = false; } }); });
  }

  // ---------- éléments d'interface ----------
  A.head = (title, sub, actions) => '<div class="pg-head"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="row">' + (actions || '') + '</div></div>';
  A.err = (e) => MPP.toast(e && e.message ? e.message : String(e), 'error');
  A.chip = (map, v) => { const m = map[v]; return m ? '<span class="chip ' + (m[1] || '') + '">' + esc(m[0]) + '</span>' : esc(v == null ? '' : v); };
  A.when = (d) => (d ? esc(MPP.fmtDate(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) : '—');

  /** Tableau responsive. cols = [{ l: 'Titre', fn: (r) => html, cls: 'wide' }] ; acts = (r) => html */
  A.tbl = (cols, rows, acts, empty) => {
    if (!rows.length) return '<div class="empty">' + (empty || 'Aucun élément.') + '</div>';
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map((c) => '<th>' + esc(c.l) + '</th>').join('') + (acts ? '<th></th>' : '') + '</tr></thead><tbody>' +
      rows.map((r, i) => '<tr data-i="' + i + '">' + cols.map((c) => '<td data-l="' + esc(c.l) + '" class="' + (c.cls || '') + '">' + c.fn(r) + '</td>').join('') + (acts ? '<td class="acts">' + acts(r, i) + '</td>' : '') + '</tr>').join('') + '</tbody></table></div>';
  };
  A.btn = (label, attrs, cls, ic) => '<button type="button" class="btn btn-sm ' + (cls || 'btn-ghost') + '" ' + (attrs || '') + '>' + (ic ? icon(ic) + ' ' : '') + label + '</button>';

  A.modal = (title, html, o) => {
    o = o || {};
    const m = MPP.el('<div class="modal-bg"><div class="modal ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true"><div class="row between" style="margin-bottom:10px"><b style="font-size:1.1rem">' + esc(title) + '</b><button class="icon-btn" type="button" data-x aria-label="Fermer">' + icon('x') + '</button></div>' + html + '</div></div>');
    const close = () => m.remove();
    m.addEventListener('mousedown', (e) => { if (e.target === m) close(); });
    m.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) close(); });
    document.body.appendChild(m);
    const first = m.querySelector('input:not([type=hidden]),textarea,select'); if (first && !o.noFocus) first.focus();
    return { el: m, close, $: (s) => m.querySelector(s) };
  };

  // ---------- formulaires générés ----------
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  A.formHtml = (fields, v) => {
    v = v || {};
    return fields.map((f) => {
      const val = v[f.k] != null ? v[f.k] : f.def != null ? f.def : '';
      const req = f.req ? ' required' : '';
      const hint = f.hint ? '<div class="hint">' + f.hint + '</div>' : '';
      if (f.t === 'check') return '<label class="check"><input type="checkbox" name="' + f.k + '"' + (val === true || val === 'true' ? ' checked' : '') + '><span>' + f.l + (f.hint ? '<br><span class="muted small">' + f.hint + '</span>' : '') + '</span></label>';
      let inp;
      if (f.t === 'textarea' || f.t === 'md') inp = '<textarea name="' + f.k + '"' + req + ' rows="' + (f.rows || 4) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + '>' + esc(val) + '</textarea>';
      else if (f.t === 'select') inp = '<select name="' + f.k + '"' + req + '>' + (f.req ? '' : '<option value="">—</option>') + f.opts.map((o) => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? ' selected' : '') + '>' + esc(ol) + '</option>'; }).join('') + '</select>';
      else if (f.t === 'datetime') inp = '<input type="datetime-local" name="' + f.k + '"' + req + ' value="' + esc(toLocalInput(val)) + '">';
      else if (f.t === 'tags') inp = '<input type="text" name="' + f.k + '"' + req + ' value="' + esc(Array.isArray(val) ? val.join(', ') : val) + '">';
      else inp = '<input type="' + ({ number: 'number', date: 'date', time: 'time', url: 'url', tel: 'tel', email: 'email' }[f.t] || 'text') + '" name="' + f.k + '"' + req + ' value="' + esc(val) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.min != null ? ' min="' + f.min + '"' : '') + (f.t === 'number' ? ' step="' + (f.step || 1) + '"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
      return '<label class="field"><span>' + f.l + (f.req ? ' *' : '') + '</span>' + inp + hint + '</label>';
    }).join('');
  };
  A.readForm = (form, fields) => {
    const out = {}; const fd = new FormData(form);
    fields.forEach((f) => {
      const raw = fd.get(f.k);
      if (f.t === 'check') out[f.k] = form.elements[f.k].checked;
      else if (f.t === 'number') out[f.k] = raw === '' || raw == null ? null : Number(raw);
      else if (f.t === 'datetime') out[f.k] = raw ? new Date(raw).toISOString() : null;
      else if (f.t === 'tags') out[f.k] = String(raw || '').split(',').map((s) => s.trim()).filter(Boolean);
      else { const s = String(raw == null ? '' : raw).trim(); out[f.k] = s === '' ? (f.req ? '' : null) : s; }
    });
    return out;
  };

  // ---------- CSV ----------
  A.csv = (name, headers, rows) => {
    const q = (v) => { const s = v == null ? '' : String(v); return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const text = '﻿' + [headers.map(q).join(';')].concat(rows.map((r) => r.map(q).join(';'))).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name + '-' + MPP.ymd(new Date()) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  /** Récupère toutes les lignes d'une requête par pages de 1000 (limite de l'API). */
  A.fetchAll = async (make, max) => {
    const all = []; const step = 1000;
    for (let from = 0; from < (max || 20000); from += step) {
      const part = await MPP.q(make().range(from, from + step - 1));
      all.push(...part); if (part.length < step) break;
    }
    return all;
  };

  A.saveParams = async (obj) => {
    const rows = Object.entries(obj).map(([cle, valeur]) => ({ cle, valeur }));
    const { error } = await MPP.sb.from('parametres').upsert(rows, { onConflict: 'cle' });
    if (error) throw new Error(error.message);
    await MPP.settings(true); A.S = await MPP.settings();
  };

  A.hbars = (obj, total) => {
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...entries.map((e) => e[1]));
    return entries.length ? entries.map(([k, n]) => '<div class="hbar"><span>' + esc(k) + '</span><i style="width:' + Math.round((n / max) * 100) + '%"></i><b>' + n + '</b></div>').join('') : '<p class="muted small">Pas encore de données.</p>';
  };

  /** CRUD générique : liste + formulaire dans une fenêtre. */
  A.crud = async (host, cfg) => {
    const sb = MPP.sb; const pk = cfg.pk || 'id'; let rows = [];
    const canAdd = cfg.canAdd !== false, canEdit = cfg.canEdit !== false, canDel = cfg.canDelete !== false;
    async function load() {
      let q = sb.from(cfg.table).select('*'); (cfg.order || []).forEach(([c, asc]) => { q = q.order(c, { ascending: asc !== false }); });
      rows = await MPP.q(q); if (cfg.filter) rows = rows.filter(cfg.filter); draw();
    }
    function draw() {
      host.innerHTML = (cfg.title ? '<div class="row between" style="margin-bottom:12px"><h2 style="margin:0;font-size:1.15rem">' + esc(cfg.title) + '</h2>' : '<div class="row between" style="margin-bottom:12px"><span></span>') +
        '<div class="row">' + (cfg.toolbar || '') + (canAdd ? A.btn('Ajouter', 'data-add', 'btn-primary', 'plus') : '') + '</div></div>' +
        (cfg.intro ? '<p class="muted small" style="margin-top:-6px">' + cfg.intro + '</p>' : '') +
        A.tbl(cfg.cols, rows, (r) => (cfg.rowActs ? cfg.rowActs(r) : '') + (canEdit ? A.btn('Modifier', 'data-edit="' + r[pk] + '"', 'btn-ghost', 'edit') : '') + (canDel ? A.btn('', 'data-del="' + r[pk] + '" aria-label="Supprimer"', 'btn-ghost', 'trash') : ''), cfg.empty);
    }
    async function edit(row) {
      const m = A.modal((row ? 'Modifier' : 'Ajouter') + ' — ' + (cfg.label || ''), '<form novalidate>' + A.formHtml(cfg.fields, row || cfg.defaults || {}) + '<div class="row end"><button type="button" class="btn btn-ghost" data-x>Annuler</button><button class="btn" type="submit">Enregistrer</button></div></form>', { wide: true });
      m.$('form').addEventListener('submit', async (e) => {
        e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
        let v = A.readForm(f, cfg.fields); if (cfg.beforeSave) v = cfg.beforeSave(v, row) || v;
        const btn = m.$('button[type=submit]'); MPP.busy(btn, true, 'Enregistrement…');
        try {
          const r = row ? await sb.from(cfg.table).update(v).eq(pk, row[pk]) : await sb.from(cfg.table).insert(v);
          if (r.error) throw new Error(r.error.message);
          m.close(); MPP.toast('Enregistré', 'ok'); await load(); if (cfg.after) cfg.after();
        } catch (err) { A.err(err); MPP.busy(btn, false); }
      });
    }
    host.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-add')) edit(null);
      else if (b.dataset.edit) edit(rows.find((r) => String(r[pk]) === b.dataset.edit));
      else if (b.dataset.del) {
        if (!(await MPP.confirm('Supprimer cet élément définitivement ?', { ok: 'Supprimer', danger: true }))) return;
        try { const r = await sb.from(cfg.table).delete().eq(pk, b.dataset.del); if (r.error) throw new Error(r.error.message); MPP.toast('Supprimé'); await load(); if (cfg.after) cfg.after(); } catch (err) { A.err(err); }
      } else if (b.dataset.act && cfg.actions && cfg.actions[b.dataset.act]) {
        try { await cfg.actions[b.dataset.act](rows.find((r) => String(r[pk]) === b.dataset.id), load); } catch (err) { A.err(err); }
      }
    });
    await load(); return { reload: load, rows: () => rows };
  };
})();
