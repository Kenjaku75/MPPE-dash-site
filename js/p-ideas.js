/* Boîte à idées : dépôt (photo facultative), likes / dislikes, tri, signalement */
MPP.page(async ({ sb, S, el }) => {
  const { esc, icon, $ } = MPP;
  const dev = MPP.device();
  const myVotes = MPP.store.get('idea_votes', {});
  const reported = new Set(MPP.store.get('reported_ideas', []));
  let ideas = [], projets = [], sort = 'pop', cat = '', photoBlob = null;

  el.innerHTML = '<div class="page-head"><div class="wrap"><h1 class="title">Boîte à idées</h1><p class="lead">Proposez une idée pour l\'UTM, <b>likez</b> celles que vous aimez, <b>dislikez</b> les autres. Les idées retenues deviennent des projets.</p></div></div>' +
    '<section class="section" style="padding-top:12px"><div class="wrap" style="max-width:760px">' +
    '<details class="faq" id="add" style="border-color:var(--green)"><summary>' + icon('plus') + ' Proposer une idée</summary><form id="f" class="a" novalidate>' +
    '<label class="field"><span>Titre</span><input name="titre" required minlength="4" maxlength="120" placeholder="Ex. : Plus de prises électriques dans les salles"></label>' +
    '<label class="field"><span>Description</span><textarea name="description" required minlength="10" maxlength="1000" placeholder="Expliquez votre idée : le problème, la solution."></textarea></label>' +
    '<div class="cols2"><label class="field"><span>Catégorie</span><select name="categorie" required>' + MPP.CATEGORIES.map((c) => '<option>' + c + '</option>').join('') + '</select></label>' +
    '<label class="field"><span>Votre nom (facultatif)</span><input name="auteur" maxlength="60" placeholder="Anonyme par défaut"></label></div>' +
    '<label class="field"><span>Une photo (facultatif)</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"><div class="hint">Elle sera réduite automatiquement pour rester légère.</div><img id="prev" class="photo-prev" alt="" hidden></label>' +
    '<div id="msg"></div><button class="btn btn-block" type="submit">' + icon('send') + ' Publier mon idée</button>' +
    '<p class="small muted mt" style="margin-bottom:0">Les idées sont publiées tout de suite puis modérées après coup. Pas de numéros de téléphone, de liens ni d\'insultes. <a href="charte.html">Charte</a>.</p></form></details>' +
    '<div class="row between mt"><div class="tabs" role="tablist" style="margin:0"><button class="tab" role="tab" data-sort="pop" aria-selected="true">Populaires</button><button class="tab" role="tab" data-sort="new" aria-selected="false">Récentes</button></div>' +
    '<select id="cat" aria-label="Catégorie" style="width:auto;min-height:40px"><option value="">Toutes les catégories</option>' + MPP.CATEGORIES.map((c) => '<option>' + c + '</option>').join('') + '</select></div>' +
    '<div id="list" class="mt"><div class="loading">Chargement…</div></div></div></section>';

  async function load() {
    [ideas, projets] = await Promise.all([MPP.q(sb.from('idees_public').select('*')), MPP.q(sb.from('projets').select('id,titre'))]);
    draw();
  }
  function draw() {
    let l = ideas.filter((i) => !cat || i.categorie === cat);
    l = l.sort(sort === 'pop' ? (a, b) => b.score - a.score || (a.created_at < b.created_at ? 1 : -1) : (a, b) => (a.created_at < b.created_at ? 1 : -1));
    $('#list').innerHTML = l.length ? l.map(card).join('') : '<div class="empty">Aucune idée pour le moment. Soyez le premier à en proposer une !</div>';
    if (location.hash) { const t = $(location.hash); if (t) { t.scrollIntoView({ block: 'center' }); t.style.outline = '3px solid var(--gold)'; } }
  }
  function card(i) {
    const v = myVotes[i.id] || 0; const st = MPP.STATUT_IDEE[i.statut] || ['', '']; const pr = projets.find((p) => String(p.id) === String(i.projet_id));
    return '<article class="idea" id="idee-' + i.id + '"><div class="vote"><button class="vbtn up ' + (v === 1 ? 'on' : '') + '" type="button" data-v="' + i.id + ':1" aria-pressed="' + (v === 1) + '" aria-label="J\'aime">' + icon('up') + '</button><span class="score" aria-label="Score">' + (i.likes - i.dislikes) + '</span><button class="vbtn down ' + (v === -1 ? 'on' : '') + '" type="button" data-v="' + i.id + ':-1" aria-pressed="' + (v === -1) + '" aria-label="Je n\'aime pas">' + icon('down') + '</button></div>' +
      '<div><div class="row" style="gap:6px"><span class="chip">' + esc(i.categorie) + '</span>' + (i.statut !== 'recue' ? '<span class="chip ' + st[1] + '">' + st[0] + '</span>' : '') + '</div><h3 style="margin-top:8px">' + esc(i.titre) + '</h3><p style="margin:0">' + esc(i.description) + '</p>' +
      (i.photo_url ? '<img class="idea-photo" src="' + esc(i.photo_url) + '" alt="Photo jointe à l\'idée" loading="lazy">' : '') +
      (i.statut === 'non_retenue' && i.motif ? '<p class="small muted" style="margin:6px 0 0">Motif : ' + esc(i.motif) + '</p>' : '') +
      (pr ? '<p class="small" style="margin:6px 0 0">' + icon('flag') + ' Rattachée au projet : <a href="projets.html">' + esc(pr.titre) + '</a></p>' : '') +
      '<div class="idea-meta"><span>' + esc(i.auteur || 'Anonyme') + ' · ' + esc(MPP.ago(i.created_at)) + '</span><span>' + i.likes + ' ' + icon('up') + ' · ' + i.dislikes + ' ' + icon('down') + '</span>' +
      (reported.has(i.id) || i.retablie ? '' : '<button class="link-btn" type="button" data-rep="' + i.id + '">Signaler</button>') + '</div>' + MPP.shareHtml(i.titre, '#idee-' + i.id) + '</div></article>';
  }

  $('#list').addEventListener('click', async (e) => {
    const vb = e.target.closest('[data-v]');
    if (vb) {
      const [id, val] = vb.dataset.v.split(':').map(Number); const cur = myVotes[id] || 0; const next = cur === val ? 0 : val;
      try {
        const r = await MPP.rpc('vote_idea', { p_id: id, p_device: dev, p_valeur: next });
        if (!r.ok) return MPP.toast(r.message, 'error');
        if (next === 0) delete myVotes[id]; else myVotes[id] = next;
        MPP.store.set('idea_votes', myVotes);
        const it = ideas.find((x) => x.id === id); it.likes = r.likes; it.dislikes = r.dislikes; it.score = r.likes - r.dislikes;
        const y = window.scrollY; draw(); window.scrollTo(0, y);
      } catch (err) { MPP.toast(err.message, 'error'); }
      return;
    }
    const rb = e.target.closest('[data-rep]');
    if (rb) {
      const id = Number(rb.dataset.rep);
      if (!(await MPP.confirm('Signaler cette idée à la modération ?', { ok: 'Signaler', danger: true }))) return;
      try {
        const r = await MPP.rpc('report_content', { p_type: 'idee', p_id: id, p_device: dev });
        MPP.toast(r.message || 'Signalement envoyé', r.ok ? 'ok' : 'error');
        if (r.ok) { reported.add(id); MPP.store.set('reported_ideas', Array.from(reported)); await load(); }
      } catch (err) { MPP.toast(err.message, 'error'); }
    }
  });
  document.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => { sort = b.dataset.sort; document.querySelectorAll('[data-sort]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); draw(); }));
  $('#cat').addEventListener('change', (e) => { cat = e.target.value; draw(); });

  $('#f').elements.photo.addEventListener('change', async (e) => {
    const f = e.target.files[0]; photoBlob = null; $('#prev').hidden = true;
    if (!f) return;
    try { photoBlob = await MPP.compressImage(f, { max: 1000, quality: 0.78 }); $('#prev').src = URL.createObjectURL(photoBlob); $('#prev').hidden = false; }
    catch (err) { e.target.value = ''; MPP.toast(err.message, 'error'); }
  });
  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault(); const form = e.target; const btn = $('button[type=submit]', form);
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const d = Object.fromEntries(new FormData(form).entries());
    const pre = MPP_FILTERS.contacts(d.titre + ' ' + d.description + ' ' + (d.auteur || ''));
    const msg = $('#msg');
    if (pre) { msg.innerHTML = MPP.alert('error', esc(MPP_FILTERS.messages[pre])); return; }
    MPP.busy(btn, true, 'Publication…');
    try {
      let url = null;
      if (photoBlob) url = await MPP.uploadImage('idees', photoBlob);
      const r = await MPP.rpc('create_idea', { p_device: dev, p_titre: d.titre, p_description: d.description, p_categorie: d.categorie, p_auteur: d.auteur || '', p_photo: url });
      if (!r.ok) { msg.innerHTML = MPP.alert('error', esc(r.message)); return; }
      msg.innerHTML = ''; form.reset(); photoBlob = null; $('#prev').hidden = true; $('#add').open = false;
      MPP.toast('Idée publiée, merci !', 'ok'); await load(); window.scrollTo({ top: $('#list').offsetTop - 100, behavior: 'smooth' });
    } catch (err) { msg.innerHTML = MPP.alert('error', 'Envoi impossible : ' + esc(err.message)); } finally { MPP.busy(btn, false); }
  });
  await load();
});
