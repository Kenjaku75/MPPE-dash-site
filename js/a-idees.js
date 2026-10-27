/* Dashboard : modération et suivi des idées */
MPP.admin.page({ nav: 'idees' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const isAdmin = A.allowed(me.role, 'admin');
  const STATUTS = [['recue', 'Reçue'], ['a_etude', "À l'étude"], ['retenue', 'Retenue'], ['realisee', 'Réalisée'], ['non_retenue', 'Non retenue']];
  let ideas = [], pub = {}, projets = [], fst = '', flag = false;

  el.innerHTML = A.head('Idées', 'Modérez les idées signalées' + (isAdmin ? ', mettez à jour leur statut et rattachez les idées retenues à un projet.' : '.') + ' Les idées sont publiées tout de suite puis modérées après coup.') +
    '<div class="toolbar"><select id="fst"><option value="">Tous les statuts</option>' + STATUTS.map(([v, l]) => '<option value="' + v + '">' + l + '</option>').join('') + '</select><label class="chip" style="cursor:pointer"><input type="checkbox" id="flag" style="width:auto;min-height:0"> Signalées / masquées seulement</label></div><div id="list"></div>';

  async function load() {
    const [a, p, pr] = await Promise.all([MPP.q(sb.from('idees').select('*').order('created_at', { ascending: false })), MPP.q(sb.from('idees_public').select('*')), MPP.q(sb.from('projets').select('id,titre').order('ordre'))]);
    ideas = a; projets = pr; pub = Object.fromEntries(p.map((x) => [x.id, x])); draw();
  }
  function card(i) {
    const c = pub[i.id];
    return '<article class="panel" style="' + (i.masquee ? 'border-color:#ecd27a;background:var(--gold-l)' : '') + '"><div class="row between"><div class="row" style="gap:6px"><span class="chip">' + esc(i.categorie) + '</span>' + (i.masquee ? '<span class="chip gold">Masquée</span>' : '') + (i.retablie ? '<span class="chip green">Rétablie</span>' : '') + (i.nb_signalements ? '<span class="chip red">' + icon('flag') + ' ' + i.nb_signalements + '</span>' : '') + '</div><span class="muted small">' + A.when(i.created_at) + ' · ' + esc(i.auteur || 'Anonyme') + '</span></div>' +
      '<h2 style="margin:8px 0 4px">' + esc(i.titre) + '</h2><p style="margin:0 0 8px">' + esc(i.description) + '</p>' + (i.photo_url ? '<img class="idea-photo" style="max-height:180px;width:auto" src="' + esc(i.photo_url) + '" alt="Photo jointe">' : '') +
      '<div class="muted small">' + (c ? c.likes + ' j\'aime · ' + c.dislikes + ' je n\'aime pas' : 'Votes masqués tant que l\'idée est masquée') + '</div>' +
      (isAdmin ? '<div class="cols2" style="margin-top:10px"><label class="field" style="margin:0"><span class="small">Statut</span><select data-st="' + i.id + '">' + STATUTS.map(([v, l]) => '<option value="' + v + '"' + (v === i.statut ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
        '<label class="field" style="margin:0"><span class="small">Projet rattaché</span><select data-pr="' + i.id + '"><option value="">—</option>' + projets.map((p) => '<option value="' + p.id + '"' + (String(p.id) === String(i.projet_id) ? ' selected' : '') + '>' + esc(p.titre) + '</option>').join('') + '</select></label></div>' +
        (i.statut === 'non_retenue' ? '<label class="field" style="margin:10px 0 0"><span class="small">Motif court (affiché publiquement)</span><input data-mo="' + i.id + '" maxlength="140" value="' + esc(i.motif || '') + '"></label>' : '') : '') +
      '<div class="row" style="margin-top:10px">' + (i.masquee ? A.btn('Rétablir (ne sera plus masquée)', 'data-restore="' + i.id + '"', 'btn-primary', 'check') : A.btn('Masquer', 'data-hide="' + i.id + '"', 'btn-ghost', 'eye')) + (isAdmin ? A.btn('Supprimer', 'data-del="' + i.id + '"', 'btn-ghost', 'trash') : '') + '</div></article>';
  }
  function draw() {
    let l = ideas.filter((i) => (!fst || i.statut === fst) && (!flag || i.masquee || i.nb_signalements > 0));
    l = l.sort((a, b) => (b.masquee - a.masquee) || (a.created_at < b.created_at ? 1 : -1));
    $('#list').innerHTML = l.length ? l.map(card).join('') : '<div class="empty">Aucune idée.</div>';
  }
  async function patch(id, v, msg) { const r = await sb.from('idees').update(v).eq('id', id); if (r.error) throw new Error(r.error.message); MPP.toast(msg || 'Enregistré', 'ok'); await load(); }
  $('#fst').addEventListener('change', (e) => { fst = e.target.value; draw(); });
  $('#flag').addEventListener('change', (e) => { flag = e.target.checked; draw(); });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.dataset.hide) await patch(b.dataset.hide, { masquee: true }, 'Idée masquée');
      else if (b.dataset.restore) await patch(b.dataset.restore, { masquee: false, retablie: true }, 'Idée rétablie');
      else if (b.dataset.del && await MPP.confirm('Supprimer définitivement cette idée et ses votes ?', { ok: 'Supprimer', danger: true })) { const r = await sb.from('idees').delete().eq('id', b.dataset.del); if (r.error) throw new Error(r.error.message); MPP.toast('Idée supprimée'); await load(); }
    } catch (err) { A.err(err); }
  });
  el.addEventListener('change', async (e) => {
    const t = e.target;
    try {
      if (t.dataset.st) await patch(t.dataset.st, { statut: t.value });
      else if (t.dataset.pr) await patch(t.dataset.pr, { projet_id: t.value ? Number(t.value) : null });
      else if (t.dataset.mo) await patch(t.dataset.mo, { motif: t.value.trim() || null });
    } catch (err) { A.err(err); }
  });
  await load();
});
