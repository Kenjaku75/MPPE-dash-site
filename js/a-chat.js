/* Dashboard : chat en direct, messages signalés, messages officiels, mots interdits, appareils bloqués, planning */
MPP.admin.page({ nav: 'chat' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const isAdmin = A.allowed(me.role, 'admin');
  const STM = { visible: ['Visible', 'green'], masque: ['Masqué', 'gold'], supprime: ['Supprimé', 'red'] };
  const TABS = [['direct', 'En direct'], ['examiner', 'À examiner'], ['officiel', 'Message officiel', true], ['mots', 'Mots interdits', true], ['bloques', 'Appareils bloqués'], ['planning', 'Planning de modération']].filter((t) => !t[2] || isAdmin);
  let tab = TABS.some((t) => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'direct';
  let msgs = [], filter = '';

  el.innerHTML = A.head('Chat et modération', 'Messages en direct, signalements, messages officiels du bureau et réglages du filtre. Les messages signalés par 2 appareils différents sont masqués automatiquement.') +
    '<div class="tabs-adm" role="tablist" id="tabs"></div><div id="pane"></div>';

  const pending = () => msgs.filter((m) => m.statut === 'masque').length;
  function tabs() {
    $('#tabs').innerHTML = TABS.map(([k, l]) => '<button role="tab" data-tab="' + k + '" aria-selected="' + (k === tab) + '">' + l + (k === 'examiner' && pending() ? ' <span class="s-badge">' + pending() + '</span>' : '') + '</button>').join('');
  }
  async function loadMsgs() { msgs = (await MPP.q(sb.from('chat_messages').select('*').order('id', { ascending: false }).limit(150))); tabs(); if (tab === 'direct' || tab === 'examiner') paneMsgs(); }

  function msgHtml(m) {
    const cls = m.statut === 'masque' ? 'hidden' : m.statut === 'supprime' ? 'gone' : '';
    return '<div class="mod-msg ' + cls + '"><div class="meta"><b style="color:var(--green-d)">' + esc(m.pseudo) + '</b>' + (m.officiel ? '<span class="chip gold">Officiel' + (m.epingle ? ' · épinglé' : '') + '</span>' : '') + '<span>' + A.when(m.created_at) + '</span>' + A.chip(STM, m.statut) +
      (m.nb_signalements ? '<span class="chip red">' + icon('flag') + ' ' + m.nb_signalements + ' signalement' + (m.nb_signalements > 1 ? 's' : '') + '</span>' : '') + (m.retabli ? '<span class="chip green">Rétabli</span>' : '') + '</div>' +
      '<p>' + esc(m.contenu) + '</p>' + (m.motif_suppression ? '<div class="small muted">Motif : ' + esc(m.motif_suppression) + '</div>' : '') +
      '<div class="acts">' + (m.statut !== 'supprime' ? A.btn('Supprimer', 'data-del="' + m.id + '"', 'btn-ghost', 'trash') : '') + (m.statut !== 'visible' && !m.officiel ? A.btn('Rétablir', 'data-restore="' + m.id + '"', 'btn-primary', 'check') : '') +
      (m.officiel && isAdmin ? A.btn(m.epingle ? 'Désépingler' : 'Épingler', 'data-pin="' + m.id + '"') : '') + (!m.officiel && m.device_hash ? A.btn('Bloquer l\'appareil', 'data-block="' + m.id + '"', 'btn-ghost') : '') + '</div></div>';
  }
  function paneMsgs() {
    const list = tab === 'examiner' ? msgs.filter((m) => m.statut === 'masque') : msgs.filter((m) => !filter || (m.contenu + ' ' + m.pseudo).toLowerCase().includes(filter));
    const keep = $('#flt') ? $('#flt').value : ''; const focus = document.activeElement && document.activeElement.id === 'flt';
    $('#pane').innerHTML = (tab === 'direct' ? '<div class="toolbar"><input id="flt" class="grow" type="search" placeholder="Filtrer les messages…" value="' + esc(keep) + '"><span class="muted small"><span class="dot on"></span>Actualisation automatique</span></div>' : '<p class="muted small">Messages masqués après 2 signalements. <b>Rétablir</b> un message le remet dans le chat et il ne pourra plus être signalé. <b>Supprimer</b> le retire (le public voit « Message supprimé par la modération »). Cas douteux : transmettre au président avant toute suppression. Objectif : moins de 15 minutes.</p>') +
      (list.length ? list.map(msgHtml).join('') : '<div class="empty">' + (tab === 'examiner' ? 'Aucun message à examiner. 🎉' : 'Aucun message.') + '</div>');
    if (focus) { const f = $('#flt'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  }

  async function paneOfficiel() {
    const off = msgs.filter((m) => m.officiel);
    $('#pane').innerHTML = '<div class="panel"><h2>Publier un message officiel du bureau</h2><p class="sub">Affiché dans le chat avec le badge « Bureau MPPE » et votre poste (' + esc(me.poste || me.nom_affiche || '') + '). Le badge est attribué par le serveur : personne d\'autre ne peut se l\'attribuer. Ces messages peuvent contenir des coordonnées.</p>' +
      '<form id="of" novalidate><label class="field"><textarea name="c" rows="3" maxlength="800" required placeholder="Votre message au chat…"></textarea></label><label class="check"><input type="checkbox" name="p"><span>Épingler en haut du chat</span></label><button class="btn" type="submit">' + icon('megaphone') + ' Publier</button></form></div>' +
      '<div class="panel"><h2>Derniers messages officiels</h2>' + (off.length ? off.map(msgHtml).join('') : '<p class="muted">Aucun pour le moment.</p>') + '</div>';
    $('#of').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) return f.reportValidity();
      try { const r = await MPP.rpc('post_official', { p_content: f.c.value, p_epingle: f.p.checked }); if (!r.ok) return MPP.toast(r.message, 'error'); MPP.toast('Message publié', 'ok'); await loadMsgs(); paneOfficiel(); } catch (err) { A.err(err); }
    });
  }
  async function paneMots() {
    const words = await MPP.q(sb.from('mots_interdits').select('*').order('mot'));
    $('#pane').innerHTML = '<div class="panel"><h2>Mots interdits (' + words.length + ')</h2><p class="sub">Le filtre repère aussi les variantes d\'écriture (accents, chiffres à la place des lettres, lettres répétées ou espacées pour les mots de 6 lettres et plus). Il est imparfait : la modération humaine reste indispensable.</p>' +
      '<form id="aw" class="toolbar"><input name="w" class="grow" placeholder="Ajouter un mot ou une expression" maxlength="40" required><button class="btn btn-sm" type="submit">' + icon('plus') + ' Ajouter</button></form>' +
      '<div class="tag-list">' + words.map((w) => '<span class="chip">' + esc(w.mot) + '<button type="button" data-rmw="' + w.id + '" aria-label="Retirer ' + esc(w.mot) + '">×</button></span>').join('') + '</div></div>' +
      '<div class="panel"><h2>Tester le filtre</h2><div class="toolbar"><input id="tt" class="grow" placeholder="Saisissez un message à tester…"><span id="tr" class="chip">—</span></div></div>';
    $('#aw').addEventListener('submit', async (e) => { e.preventDefault(); const w = e.target.w.value.trim(); if (!w) return; const r = await sb.from('mots_interdits').insert({ mot: w }); if (r.error) A.err(r.error); else { MPP.toast('Mot ajouté', 'ok'); paneMots(); } });
    $('#tt').addEventListener('input', (e) => { const v = MPP_FILTERS.check(e.target.value, words.map((x) => x.mot)); $('#tr').className = 'chip ' + (v ? 'red' : 'green'); $('#tr').textContent = v ? 'Refusé : ' + v : e.target.value ? 'Accepté' : '—'; });
  }
  async function paneBloques() {
    const rows = await MPP.q(sb.from('appareils_bloques').select('*').order('created_at', { ascending: false }));
    $('#pane').innerHTML = '<div class="panel"><h2>Appareils bloqués (' + rows.length + ')</h2><p class="sub">Un appareil est identifié par un jeton chiffré, sans lien avec une identité. Le blocage empêche d\'écrire dans le chat, de déposer des idées et de s\'inscrire.</p>' +
      A.tbl([{ l: 'Appareil', fn: (r) => '<code>' + esc(String(r.device_hash).slice(0, 10)) + '…</code>' }, { l: 'Motif', fn: (r) => esc(r.motif || '—'), cls: 'wide' }, { l: 'Depuis', fn: (r) => A.when(r.created_at) }], rows, (r) => A.btn('Débloquer', 'data-unblock="' + esc(r.device_hash) + '"'), 'Aucun appareil bloqué.') + '</div>';
  }
  async function panePlanning() {
    $('#pane').innerHTML = '<div class="panel"><h2>Planning de modération</h2><p class="sub">Chaque créneau d\'ouverture du chat doit avoir au moins deux modérateurs désignés (un titulaire et un remplaçant). Si aucun modérateur n\'est connecté, le chat passe en lecture seule (si cette option est activée dans les paramètres).</p><div id="crud"></div></div>';
    await A.crud($('#crud'), { table: 'creneaux_moderation', label: 'Créneau', canAdd: isAdmin, canEdit: isAdmin, canDelete: isAdmin, order: [['jour', true], ['debut', true]], empty: 'Aucun créneau planifié.',
      cols: [{ l: 'Jour', fn: (r) => esc(MPP.fmtDate(r.jour, { weekday: 'short', day: 'numeric', month: 'short' })) }, { l: 'Horaire', fn: (r) => esc(String(r.debut).slice(0, 5) + ' – ' + String(r.fin).slice(0, 5)) }, { l: 'Titulaire', fn: (r) => esc(r.moderateur) }, { l: 'Remplaçant', fn: (r) => esc(r.remplacant || '⚠ à désigner') }],
      fields: [{ k: 'jour', l: 'Jour', t: 'date', req: true }, { k: 'debut', l: 'Début', t: 'time', req: true }, { k: 'fin', l: 'Fin', t: 'time', req: true }, { k: 'moderateur', l: 'Modérateur titulaire', t: 'text', req: true }, { k: 'remplacant', l: 'Remplaçant', t: 'text' }] });
  }
  async function render() {
    tabs(); location.hash = tab;
    if (tab === 'direct' || tab === 'examiner') paneMsgs(); else if (tab === 'officiel') await paneOfficiel(); else if (tab === 'mots') await paneMots(); else if (tab === 'bloques') await paneBloques(); else await panePlanning();
  }

  async function setMsg(id, patch, okMsg) { const r = await sb.from('chat_messages').update(patch).eq('id', id); if (r.error) throw new Error(r.error.message); MPP.toast(okMsg, 'ok'); await loadMsgs(); if (tab === 'officiel') paneOfficiel(); }
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.tab) { tab = b.dataset.tab; await render(); }
      else if (b.dataset.del) { const motif = await MPP.confirm('Supprimer ce message ? Le public verra « Message supprimé par la modération ».', { input: 'Motif (conservé côté bureau)', ok: 'Supprimer', danger: true }); if (motif === false) return; await setMsg(b.dataset.del, { statut: 'supprime', motif_suppression: motif && motif !== true ? motif : 'Contraire à la charte', supprime_par: me.user_id }, 'Message supprimé'); }
      else if (b.dataset.restore) await setMsg(b.dataset.restore, { statut: 'visible', retabli: true, motif_suppression: null }, 'Message rétabli : il ne peut plus être signalé');
      else if (b.dataset.pin) { const m = msgs.find((x) => String(x.id) === b.dataset.pin); await setMsg(m.id, { epingle: !m.epingle }, m.epingle ? 'Message désépinglé' : 'Message épinglé'); }
      else if (b.dataset.block) {
        const m = msgs.find((x) => String(x.id) === b.dataset.block);
        const motif = await MPP.confirm('Bloquer l\'appareil à l\'origine de ce message ? Il ne pourra plus écrire, proposer d\'idées ni s\'inscrire.', { input: 'Motif', ok: 'Bloquer', danger: true }); if (motif === false) return;
        const r = await sb.from('appareils_bloques').insert({ device_hash: m.device_hash, motif: motif && motif !== true ? motif : 'Abus du chat' }); if (r.error) throw new Error(r.error.message); MPP.toast('Appareil bloqué', 'ok');
      } else if (b.dataset.unblock) { const r = await sb.from('appareils_bloques').delete().eq('device_hash', b.dataset.unblock); if (r.error) throw new Error(r.error.message); MPP.toast('Appareil débloqué', 'ok'); paneBloques(); }
      else if (b.dataset.rmw) { const r = await sb.from('mots_interdits').delete().eq('id', b.dataset.rmw); if (r.error) throw new Error(r.error.message); paneMots(); }
    } catch (err) { A.err(err); }
  });
  el.addEventListener('input', (e) => { if (e.target.id === 'flt') { filter = e.target.value.trim().toLowerCase(); paneMsgs(); } });

  await loadMsgs(); await render();
  MPP.poll(async () => { if (tab === 'direct' || tab === 'examiner') await loadMsgs(); }, 5000);
});
