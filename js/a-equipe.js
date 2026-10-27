/* Dashboard : gestion de l'équipe (ajout, modification, photo, ordre par glisser-déposer). La fiche du président est protégée côté serveur. */
MPP.admin.page({ nav: 'equipe', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const isPres = A.allowed(me.role, 'president');
  let rows = [];

  el.innerHTML = A.head("Équipe", 'Les membres du bureau peuvent changer à tout moment : modifiez la page « L\'équipe » et l\'accueil sans toucher au code. Glissez-déposez (ou utilisez les flèches) pour changer l\'ordre.', A.btn('Ajouter un membre', 'id="add"', 'btn-primary', 'plus')) +
    '<div class="alert info">' + icon('shield') + ' Les informations du président (nom, poste, photo, présentation) ne peuvent être modifiées que par lui. Toute tentative d\'un autre compte est refusée par le serveur et inscrite au journal d\'audit.</div><div id="list"></div>';

  async function load() { rows = await MPP.q(sb.from('membres_bureau').select('*').order('ordre')); draw(); }
  function draw() {
    const hasPres = rows.some((r) => r.est_president);
    const old = $('#addpres'); if (old) old.remove();
    if (!hasPres && isPres) $('#add').insertAdjacentHTML('afterend', A.btn('Créer ma fiche de président', 'id="addpres"', 'btn-gold'));
    $('#list').innerHTML = rows.length ? '<div class="stack" id="dnd">' + rows.map((r, i) => {
      const locked = r.est_president && !isPres;
      return '<div class="panel drag row between" draggable="true" data-id="' + r.id + '" style="margin:0;' + (r.visible ? '' : 'opacity:.6') + '"><div class="row" style="flex:1;min-width:240px">' + (r.photo_url ? '<img class="thumb" src="' + esc(r.photo_url) + '" alt="">' : '<div class="thumb">' + esc(MPP.initials(r.prenom, r.nom)) + '</div>') +
        '<div><b>' + esc(r.prenom + ' ' + r.nom) + '</b> ' + (r.est_president ? '<span class="chip gold">' + icon('shield') + ' Protégé · président</span>' : '') + (r.visible ? '' : '<span class="chip">Masqué</span>') + '<div class="small muted">' + esc(r.poste) + '</div></div></div>' +
        '<div class="row">' + A.btn('↑', 'data-up="' + r.id + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Monter"') + A.btn('↓', 'data-down="' + r.id + '"' + (i === rows.length - 1 ? ' disabled' : '') + ' aria-label="Descendre"') +
        A.btn(r.visible ? 'Masquer' : 'Afficher', 'data-vis="' + r.id + '"' + (locked ? ' disabled title="Réservé au président"' : '')) + A.btn('Modifier', 'data-edit="' + r.id + '"' + (locked ? ' disabled title="Réservé au président"' : ''), 'btn-ghost', 'edit') + A.btn('', 'data-del="' + r.id + '" aria-label="Supprimer"' + (r.est_president ? ' disabled title="Le président ne peut pas être supprimé"' : ''), 'btn-ghost', 'trash') + '</div></div>';
    }).join('') + '</div>' : '<div class="empty">Aucun membre pour le moment.</div>';
  }
  const call = async (name, args) => { const r = await MPP.rpc(name, args); if (!r.ok) throw new Error(r.message || 'Refusé'); return r; };

  function edit(row, forcePres) {
    const f = [{ k: 'prenom', l: 'Prénom', t: 'text', req: true }, { k: 'nom', l: 'Nom', t: 'text', req: true }, { k: 'poste', l: 'Poste (texte libre)', t: 'text', req: true, hint: 'Ex. : « Président », « Secrétaire générale ». Modifiable à tout moment.' }, { k: 'presentation', l: 'Courte présentation (facultatif)', t: 'textarea', rows: 3, max: 300 }, { k: 'visible', l: 'Visible sur le site', t: 'check', def: true }];
    let blob = null, removePhoto = false;
    const m = A.modal(row ? 'Modifier ' + row.prenom : forcePres ? 'Ma fiche de président' : 'Nouveau membre', '<form novalidate>' + A.formHtml(f, row || { visible: true }) +
      '<div class="field"><span>Photo (JPG ou PNG, 5 Mo max)</span><div class="row">' + (row && row.photo_url ? '<img id="cur" class="thumb" src="' + esc(row.photo_url) + '" alt="">' : '<div class="thumb" id="cur">' + esc(row ? MPP.initials(row.prenom, row.nom) : '?') + '</div>') + '<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" style="flex:1;min-width:0">' + (row && row.photo_url ? A.btn('Retirer', 'id="rmph"') : '') + '</div><div class="hint">Recadrage carré et compression automatiques. Sans photo, un avatar avec les initiales s\'affiche.</div></div>' +
      '<label class="check" id="okbox" hidden><input type="checkbox" name="accord"><span>J\'ai l\'accord de cette personne pour publier sa photo.</span></label><div class="row end"><button type="button" class="btn btn-ghost" data-x>Annuler</button><button class="btn" type="submit">Enregistrer</button></div></form>', { wide: true });
    m.$('[name=photo]').addEventListener('change', async (e) => {
      const file = e.target.files[0]; blob = null; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { e.target.value = ''; return MPP.toast('Photo trop lourde (5 Mo max).', 'error'); }
      try { blob = await MPP.compressImage(file, { max: 600, quality: 0.82, square: true }); const url = URL.createObjectURL(blob); m.$('#cur').outerHTML = '<img id="cur" class="thumb" src="' + url + '" alt="">'; m.$('#okbox').hidden = false; removePhoto = false; } catch (err) { e.target.value = ''; MPP.toast(err.message, 'error'); }
    });
    const rm = m.$('#rmph'); if (rm) rm.addEventListener('click', () => { removePhoto = true; blob = null; m.$('#cur').outerHTML = '<div class="thumb" id="cur">' + esc(MPP.initials(row.prenom, row.nom)) + '</div>'; });
    m.$('form').addEventListener('submit', async (e) => {
      e.preventDefault(); const fm = e.target; if (!fm.checkValidity()) return fm.reportValidity();
      if (blob && !fm.elements.accord.checked) return MPP.toast("Confirmez l'accord de la personne pour publier sa photo.", 'error');
      const d = A.readForm(fm, f); const btn = $('button[type=submit]', fm); MPP.busy(btn, true, 'Enregistrement…');
      try {
        const p = Object.assign({}, d); if (row) p.id = row.id; else { p.ordre = rows.length + 1; if (forcePres) p.est_president = true; }
        if (blob) p.photo_url = await MPP.uploadImage('equipe', blob); else if (removePhoto) p.photo_url = null;
        await call('team_save', { p }); m.close(); MPP.toast('Enregistré', 'ok'); await load();
      } catch (err) { A.err(err); MPP.busy(btn, false); }
    });
  }

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    try {
      if (b.id === 'add') edit(null); else if (b.id === 'addpres') edit(null, true);
      else if (b.dataset.edit) edit(rows.find((r) => String(r.id) === b.dataset.edit));
      else if (b.dataset.vis) { const r = rows.find((x) => String(x.id) === b.dataset.vis); await call('team_save', { p: { id: r.id, visible: !r.visible } }); await load(); }
      else if (b.dataset.del && await MPP.confirm('Supprimer ce membre de l\'équipe ?', { ok: 'Supprimer', danger: true })) { await call('team_delete', { p_id: Number(b.dataset.del) }); MPP.toast('Membre supprimé'); await load(); }
      else if (b.dataset.up || b.dataset.down) {
        const id = Number(b.dataset.up || b.dataset.down); const ids = rows.map((r) => r.id); const i = ids.indexOf(id); const j = b.dataset.up ? i - 1 : i + 1;
        [ids[i], ids[j]] = [ids[j], ids[i]]; await call('team_reorder', { p_ids: ids }); await load();
      }
    } catch (err) { A.err(err); }
  });
  let dragId = null;
  el.addEventListener('dragstart', (e) => { const d = e.target.closest('.drag'); if (d) { dragId = Number(d.dataset.id); e.dataTransfer.effectAllowed = 'move'; } });
  el.addEventListener('dragover', (e) => { const d = e.target.closest('.drag'); if (d && dragId) { e.preventDefault(); document.querySelectorAll('.drag.over').forEach((x) => x.classList.remove('over')); d.classList.add('over'); } });
  el.addEventListener('drop', async (e) => {
    const d = e.target.closest('.drag'); if (!d || !dragId) return; e.preventDefault();
    const ids = rows.map((r) => r.id).filter((x) => x !== dragId); ids.splice(ids.indexOf(Number(d.dataset.id)), 0, dragId); dragId = null;
    try { await call('team_reorder', { p_ids: ids }); await load(); } catch (err) { A.err(err); }
  });
  el.addEventListener('dragend', () => { dragId = null; document.querySelectorAll('.drag.over').forEach((x) => x.classList.remove('over')); });
  await load();
});
