/* Sondages : réponse unique ou multiple, échelle de 1 à 5, résultats en pourcentage */
MPP.page(async ({ sb, S, el }) => {
  const { esc, icon, $ } = MPP;
  const dev = MPP.device();
  const answered = MPP.store.get('polls_done', {});
  const polls = await MPP.q(sb.from('sondages').select('*').order('ouvre_at', { ascending: false }));
  const nowI = new Date().toISOString();
  const isOpen = (p) => (!p.ferme_at || p.ferme_at >= nowI) && p.ouvre_at <= nowI;
  const open = polls.filter(isOpen), closed = polls.filter((p) => !isOpen(p));
  const LABELS = ['Pas du tout', 'Plutôt non', 'Moyen', 'Plutôt oui', 'Tout à fait'];

  el.innerHTML = '<div class="page-head"><div class="wrap"><h1 class="title">Sondages</h1><p class="lead">Quelques questions, des réponses anonymes : le bureau s\'en sert pour décider. Une réponse par appareil.</p></div></div>' +
    '<section class="section" style="padding-top:12px"><div class="wrap" style="max-width:720px">' +
    '<h2 class="sec-title">En cours</h2><div id="open" class="stack">' + (open.length ? '' : '<div class="empty">Aucun sondage ouvert pour le moment.</div>') + '</div>' +
    (closed.length ? '<h2 class="sec-title mt2">Terminés</h2><div id="closed" class="stack"></div>' : '') + '</div></section>';

  const shell = (p) => '<article class="card" data-poll="' + p.id + '"><div class="row between"><span class="chip ' + (isOpen(p) ? 'green' : '') + '">' + (isOpen(p) ? 'Ouvert' + (p.ferme_at ? ' jusqu\'au ' + esc(MPP.fmtDate(p.ferme_at, { day: 'numeric', month: 'long' })) : '') : 'Terminé') + '</span></div><h3 style="margin:10px 0">' + esc(p.question) + '</h3><div class="body"></div></article>';
  async function results(p, box) {
    const r = await MPP.rpc('poll_results', { p_id: p.id });
    if (!r.ok) { box.innerHTML = '<p class="muted">Merci pour votre réponse. Les résultats ne sont pas publiés.</p>'; return; }
    const total = r.counts.reduce((a, b) => a + b, 0) || 1;
    const labels = p.type === 'echelle' ? LABELS.map((l, i) => (i + 1) + ' · ' + l) : p.options;
    box.innerHTML = r.counts.map((c, i) => { const pc = Math.round((c / total) * 100); return '<div class="res-row"><i style="width:' + pc + '%"></i><span><span>' + esc(labels[i]) + '</span><b>' + pc + ' %</b></span></div>'; }).join('') +
      '<p class="small muted" style="margin:8px 0 0">' + r.total + ' réponse' + (r.total > 1 ? 's' : '') + (p.type === 'echelle' && r.moyenne ? ' · moyenne ' + String(r.moyenne).replace('.', ',') + ' / 5' : '') + '</p>';
  }
  function form(p, box) {
    let h = '<form novalidate>';
    if (p.type === 'echelle') h += '<div class="stars" role="radiogroup" style="flex-wrap:wrap">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" class="star" data-n="' + n + '" aria-label="' + n + ' sur 5 : ' + LABELS[n - 1] + '" style="width:56px;font-weight:800">' + n + '</button>').join('') + '</div><div class="row between small muted" style="margin-top:6px"><span>1 · ' + LABELS[0] + '</span><span>5 · ' + LABELS[4] + '</span></div>';
    else h += p.options.map((o, i) => '<label class="opt"><input type="' + (p.type === 'multiple' ? 'checkbox' : 'radio') + '" name="o" value="' + i + '"><span>' + esc(o) + '</span></label>').join('') + (p.type === 'multiple' ? '<p class="small muted">Plusieurs réponses possibles.</p>' : '');
    h += '<div id="m' + p.id + '"></div><button class="btn mt" type="submit">' + icon('check') + ' Valider ma réponse</button></form>';
    box.innerHTML = h;
    let scale = null;
    box.querySelectorAll('.star').forEach((b) => b.addEventListener('click', () => { scale = Number(b.dataset.n); box.querySelectorAll('.star').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= scale)); }));
    box.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const sel = p.type === 'echelle' ? (scale ? [scale] : []) : Array.from(box.querySelectorAll('input:checked')).map((i) => Number(i.value));
      const m = box.querySelector('#m' + p.id);
      if (!sel.length) { m.innerHTML = MPP.alert('warn', 'Choisissez une réponse.'); return; }
      const btn = box.querySelector('button[type=submit]'); MPP.busy(btn, true);
      try {
        const r = await MPP.rpc('answer_poll', { p_id: p.id, p_device: dev, p_reponse: sel });
        if (r.ok || r.code === 'deja') { answered[p.id] = 1; MPP.store.set('polls_done', answered); MPP.toast(r.ok ? 'Merci pour votre réponse !' : 'Vous avez déjà répondu.', 'ok'); await show(p, box); }
        else m.innerHTML = MPP.alert('error', esc(r.message));
      } catch (err) { m.innerHTML = MPP.alert('error', esc(err.message)); } finally { MPP.busy(btn, false); }
    });
  }
  async function show(p, box) {
    if (!isOpen(p) || answered[p.id]) {
      if (p.afficher_resultats) await results(p, box); else box.innerHTML = '<p class="muted" style="margin:0">' + (answered[p.id] ? 'Merci pour votre réponse !' : 'Sondage terminé.') + '</p>';
    } else form(p, box);
  }
  for (const [id, arr] of [['open', open], ['closed', closed]]) {
    const host = $('#' + id); if (!host) continue;
    for (const p of arr) { host.insertAdjacentHTML('beforeend', shell(p)); await show(p, host.querySelector('[data-poll="' + p.id + '"] .body')); }
  }
});
