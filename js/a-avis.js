/* Dashboard : avis mensuels sur le bureau (réponses publiques, modération, bilan du mois) */
MPP.admin.page({ nav: 'avis', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const THEMES = [['travail', 'Travail accompli'], ['communication', 'Communication'], ['ecoute', 'Écoute des étudiants'], ['promesses', 'Respect des promesses']];
  const STA = { visible: ['Publié', 'green'], masque: ['Masqué', 'red'], a_examiner: ['À examiner (signalé)', 'gold'] };
  let avis = [], reps = [], bilans = [], st = null; const f = { mois: '', note: '', rep: '', statut: '' };

  async function load() {
    [avis, reps, bilans, st] = await Promise.all([MPP.q(sb.from('avis_bureau').select('*').order('created_at', { ascending: false })), MPP.q(sb.from('avis_reponses').select('*').order('created_at')), MPP.q(sb.from('bilans_mensuels').select('*').order('mois', { ascending: false })), MPP.rpc('avis_status')]);
    draw();
  }
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x.note_globale, 0) / a.length : 0);
  function draw() {
    const months = Array.from(new Set(avis.map((a) => a.mois).concat([st.mois]))).sort().reverse();
    const mois = f.mois || st.mois; const inM = avis.filter((a) => a.mois === mois);
    const list = avis.filter((a) => (!f.mois || a.mois === f.mois) && (!f.note || String(a.note_globale) === f.note) && (!f.statut || a.statut === f.statut) && (!f.rep || (f.rep === 'oui') === reps.some((r) => String(r.avis_id) === String(a.id))));
    const byM = {}; avis.forEach((a) => { (byM[a.mois] = byM[a.mois] || []).push(a); });
    const ms = Object.keys(byM).sort().slice(-8);
    const bil = bilans.find((b) => b.mois === mois);
    el.innerHTML = A.head('Avis sur le bureau', 'Chaque mois, la zone se déverrouille pendant les derniers jours du mois. Répondez publiquement ; ne masquez que les avis contraires à la charte (jamais une opinion négative).', A.btn('Exporter', 'id="csv"', 'btn-ghost', 'download')) +
      '<div class="panel"><div class="row between"><div><b>' + (st.ouvert ? '<span class="chip green">Zone ouverte</span>' : '<span class="chip">Zone verrouillée</span>') + '</b> <span class="muted small">Période normale : du ' + esc(MPP.fmtDate(st.debut)) + ' au ' + esc(MPP.fmtDate(st.fin)) + ' (' + esc(S.avis_derniers_jours || 5) + ' derniers jours du mois).' + (S.avis_force_ouvert ? ' <b>Ouverture forcée.</b>' : '') + '</span></div>' + A.btn(S.avis_force_ouvert ? 'Rétablir le calendrier' : 'Ouvrir la zone maintenant', 'id="force"', 'btn-ghost', 'lock') + '</div></div>' +
      '<div class="cols-auto"><div class="panel"><h2>Note moyenne par mois</h2>' + (ms.length ? '<div class="vbars">' + ms.map((m) => '<div><b>' + avg(byM[m]).toFixed(1).replace('.', ',') + '</b><i style="height:' + Math.round((avg(byM[m]) / 5) * 90) + 'px"></i>' + esc(m.slice(5) + '/' + m.slice(2, 4)) + '<br><span class="mini">' + byM[m].length + ' avis</span></div>').join('') + '</div>' : '<p class="muted">Pas encore d\'avis.</p>') + '</div>' +
      '<div class="panel"><h2>Thèmes · ' + esc(MPP.fmtMonth(mois)) + '</h2>' + THEMES.map(([k, l]) => { const v = inM.filter((a) => a.notes_themes && a.notes_themes[k]).map((a) => a.notes_themes[k]); const m = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; return '<div class="hbar"><span>' + l + '</span><i style="width:' + Math.round((m / 5) * 100) + '%"></i><b>' + (m ? m.toFixed(1).replace('.', ',') : '–') + '</b></div>'; }).join('') + '<p class="small muted" style="margin:8px 0 0">' + inM.length + ' avis ce mois-là · moyenne ' + (inM.length ? avg(inM).toFixed(1).replace('.', ',') : '–') + ' / 5</p></div>' +
      '<div class="panel"><h2>Bilan mensuel · ' + esc(MPP.fmtMonth(mois)) + '</h2><p class="sub">Une réponse d\'ensemble publiée en fin de période : ce qui a été fait, ce qui va changer.</p><textarea id="bil" rows="4" maxlength="1500" placeholder="Bilan du mois…">' + esc(bil ? bil.texte : '') + '</textarea><div class="row" style="margin-top:8px">' + A.btn(bil ? 'Mettre à jour le bilan' : 'Publier le bilan', 'id="savebil" data-m="' + esc(mois) + '"', 'btn-primary') + '</div></div></div>' +
      '<div class="toolbar"><select id="fm"><option value="">Tous les mois</option>' + months.map((m) => '<option value="' + m + '"' + (m === f.mois ? ' selected' : '') + '>' + esc(MPP.fmtMonth(m)) + '</option>').join('') + '</select><select id="fn"><option value="">Toutes les notes</option>' + [5, 4, 3, 2, 1].map((n) => '<option' + (String(n) === f.note ? ' selected' : '') + '>' + n + '</option>').join('') + '</select><select id="fr"><option value="">Répondus ou non</option><option value="oui"' + (f.rep === 'oui' ? ' selected' : '') + '>Avec réponse</option><option value="non"' + (f.rep === 'non' ? ' selected' : '') + '>Sans réponse</option></select><select id="fs"><option value="">Tous les statuts</option>' + Object.entries(STA).map(([k, v]) => '<option value="' + k + '"' + (k === f.statut ? ' selected' : '') + '>' + v[0] + '</option>').join('') + '</select></div>' +
      (list.length ? list.map((a) => cardHtml(a)).join('') : '<div class="empty">Aucun avis pour ces filtres.</div>');
  }
  function cardHtml(a) {
    const r = reps.filter((x) => String(x.avis_id) === String(a.id));
    return '<article class="panel" style="' + (a.statut === 'a_examiner' ? 'border-color:#ecd27a;background:var(--gold-l)' : a.statut === 'masque' ? 'opacity:.7' : '') + '"><div class="row between"><div class="row"><b style="font-size:1.1rem;color:var(--gold-d)">' + '★'.repeat(a.note_globale) + '<span style="color:#cfc9b4">' + '★'.repeat(5 - a.note_globale) + '</span></b>' + A.chip(STA, a.statut) + (a.retabli ? '<span class="chip green">Rétabli</span>' : '') + (a.nb_signalements ? '<span class="chip red">' + icon('flag') + ' ' + a.nb_signalements + '</span>' : '') + '</div><span class="muted small">' + A.when(a.created_at) + ' · ' + esc(a.mois) + '</span></div>' +
      '<div class="row" style="gap:6px;margin:8px 0">' + THEMES.filter(([k]) => a.notes_themes && a.notes_themes[k]).map(([k, l]) => '<span class="chip">' + l + ' · ' + a.notes_themes[k] + '/5</span>').join('') + '</div>' +
      (a.commentaire ? '<p style="margin:0 0 6px">' + esc(a.commentaire) + '</p>' : '<p class="muted small">(sans commentaire)</p>') + (a.attente_mois_suivant ? '<p class="small" style="margin:0 0 6px"><b>Attente pour le mois suivant :</b> ' + esc(a.attente_mois_suivant) + '</p>' : '') +
      (a.motif_masquage ? '<p class="small muted">Motif du masquage : ' + esc(a.motif_masquage) + '</p>' : '') +
      r.map((x) => '<div class="reply"><b>' + esc(x.auteur_nom || 'Bureau') + (x.auteur_poste ? ' · ' + esc(x.auteur_poste) : '') + '</b> <span class="muted small">' + A.when(x.created_at) + (x.modifie_at ? ' (modifiée)' : '') + '</span><br>' + esc(x.texte) + '<div class="row" style="margin-top:6px">' + A.btn('Modifier', 'data-editrep="' + x.id + '"') + A.btn('', 'data-delrep="' + x.id + '" aria-label="Supprimer"', 'btn-ghost', 'trash') + '</div></div>').join('') +
      '<div class="row" style="margin-top:10px">' + A.btn('Répondre publiquement', 'data-rep="' + a.id + '"', 'btn-primary', 'chat') + (a.statut === 'visible' ? A.btn('Masquer (contraire à la charte)', 'data-hide="' + a.id + '"') : A.btn('Rétablir', 'data-restore="' + a.id + '"', 'btn-ghost', 'check')) + '</div></article>';
  }
  function replyModal(a, existing) {
    const m = A.modal(existing ? 'Modifier la réponse' : 'Répondre à cet avis', '<p class="muted small">« ' + esc((a.commentaire || '(sans commentaire)').slice(0, 200)) + ' »</p><form novalidate><label class="field"><span>Votre réponse (publique, signée avec votre poste)</span><textarea name="t" required maxlength="1000" rows="5">' + esc(existing ? existing.texte : '') + '</textarea></label><div class="row end"><button type="button" class="btn btn-ghost" data-x>Annuler</button><button class="btn" type="submit">Publier</button></div></form>');
    m.$('form').addEventListener('submit', async (e) => {
      e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return;
      try { const r = existing ? await sb.from('avis_reponses').update({ texte: t }).eq('id', existing.id) : await sb.from('avis_reponses').insert({ avis_id: a.id, texte: t }); if (r.error) throw new Error(r.error.message); m.close(); MPP.toast('Réponse publiée', 'ok'); await load(); } catch (err) { A.err(err); }
    });
  }
  async function upd(id, v, msg) { const r = await sb.from('avis_bureau').update(v).eq('id', id); if (r.error) throw new Error(r.error.message); MPP.toast(msg, 'ok'); await load(); }
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.id === 'force') { await A.saveParams({ avis_force_ouvert: !S.avis_force_ouvert }); MPP.toast(!S.avis_force_ouvert ? 'Zone ouverte' : 'Calendrier rétabli', 'ok'); location.reload(); }
      else if (b.id === 'csv') A.csv('avis-bureau', ['Mois', 'Note globale', 'Travail', 'Communication', 'Écoute', 'Promesses', 'Commentaire', 'Attente', 'Statut', 'Réponses'], avis.map((a) => [a.mois, a.note_globale, a.notes_themes.travail, a.notes_themes.communication, a.notes_themes.ecoute, a.notes_themes.promesses, a.commentaire, a.attente_mois_suivant, a.statut, reps.filter((r) => String(r.avis_id) === String(a.id)).map((r) => r.texte).join(' | ')]));
      else if (b.id === 'savebil') {
        const t = $('#bil').value.trim(); if (!t) return MPP.toast('Écrivez le bilan avant de le publier.', 'error');
        const ex = bilans.find((x) => x.mois === b.dataset.m); const r = ex ? await sb.from('bilans_mensuels').update({ texte: t }).eq('id', ex.id) : await sb.from('bilans_mensuels').insert({ mois: b.dataset.m, texte: t });
        if (r.error) throw new Error(r.error.message); MPP.toast('Bilan publié', 'ok'); await load();
      } else if (b.dataset.rep) replyModal(avis.find((a) => String(a.id) === b.dataset.rep));
      else if (b.dataset.editrep) { const x = reps.find((r) => String(r.id) === b.dataset.editrep); replyModal(avis.find((a) => String(a.id) === String(x.avis_id)), x); }
      else if (b.dataset.delrep && await MPP.confirm('Supprimer cette réponse ?', { ok: 'Supprimer', danger: true })) { const r = await sb.from('avis_reponses').delete().eq('id', b.dataset.delrep); if (r.error) throw new Error(r.error.message); await load(); }
      else if (b.dataset.hide) { const motif = await MPP.confirm('Masquer cet avis ? Uniquement s\'il est contraire à la charte (insultes, diffamation, données personnelles), jamais pour une opinion négative.', { input: 'Motif obligatoire', ok: 'Masquer', danger: true }); if (!motif || motif === true) return MPP.toast('Un motif est obligatoire.', 'error'); await upd(b.dataset.hide, { statut: 'masque', motif_masquage: motif }, 'Avis masqué'); }
      else if (b.dataset.restore) await upd(b.dataset.restore, { statut: 'visible', retabli: true, motif_masquage: null }, 'Avis rétabli');
    } catch (err) { A.err(err); }
  });
  el.addEventListener('change', (e) => { const m = { fm: 'mois', fn: 'note', fr: 'rep', fs: 'statut' }[e.target.id]; if (m) { f[m] = e.target.value; draw(); } });
  await load();
});
