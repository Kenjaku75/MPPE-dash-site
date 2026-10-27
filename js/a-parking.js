/* Dashboard : opération parking gratuit */
MPP.admin.page({ nav: 'parking', need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const jours = (S.parking_jours || []).slice();
  el.innerHTML = A.head('Parking gratuit', 'Informations affichées sur la page « Parking gratuit » du site. La liste d\'arrivée est tenue sur place, avec contrôle de la carte d\'étudiant.') +
    '<div class="cols-auto"><form class="panel" id="f" novalidate><h2>Informations</h2>' +
    '<div class="cols2"><label class="field"><span>Premier jour</span><input type="date" name="j1" value="' + esc(jours[0] || '') + '"></label><label class="field"><span>Deuxième jour</span><input type="date" name="j2" value="' + esc(jours[1] || '') + '"></label></div>' +
    '<label class="field"><span>Lieu</span><input name="lieu" value="' + esc(S.parking_lieu || '') + '" maxlength="120" placeholder="Ex. : parking principal de l\'université"></label>' +
    '<div class="cols2"><label class="field"><span>Heure d\'ouverture</span><input type="time" name="heure" value="' + esc(S.parking_heure || '07:00') + '"></label><label class="field"><span>Places par jour</span><input type="number" name="places" min="1" value="' + esc(S.parking_places || 100) + '"></label></div>' +
    '<label class="check"><input type="checkbox" name="compteur"' + (S.parking_compteur ? ' checked' : '') + '><span>Afficher le compteur de places restantes sur le site</span></label><button class="btn" type="submit">Enregistrer</button></form>' +
    '<div class="panel"><h2>Compteur de places restantes</h2><p class="sub">Mettez-le à jour pendant l\'opération. Il n\'est visible du public que si l\'option est cochée, et le jour même.</p><div class="row" style="justify-content:center;gap:16px"><button class="btn btn-ghost" data-d="-10">−10</button><button class="btn btn-ghost" data-d="-1">−1</button><div class="parking-n" id="n">' + esc(S.parking_restantes != null ? S.parking_restantes : '—') + '</div><button class="btn btn-ghost" data-d="1">+1</button></div><div class="row" style="justify-content:center;margin-top:14px">' + A.btn('Remettre à ' + (S.parking_places || 100), 'id="reset"', 'btn-ghost') + '</div></div></div>';
  let n = S.parking_restantes != null ? Number(S.parking_restantes) : null;
  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.target;
    try { await A.saveParams({ parking_jours: [f.j1.value, f.j2.value].filter(Boolean), parking_lieu: f.lieu.value.trim(), parking_heure: f.heure.value || '07:00', parking_places: Number(f.places.value) || 100, parking_compteur: f.compteur.checked }); MPP.toast('Enregistré', 'ok'); } catch (err) { A.err(err); }
  });
  const set = async (v) => { n = Math.max(0, v); $('#n').textContent = n; try { await A.saveParams({ parking_restantes: n }); } catch (err) { A.err(err); } };
  el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.d) set((n == null ? Number(S.parking_places) || 100 : n) + Number(b.dataset.d)); else if (b.id === 'reset') set(Number($('#f').places.value) || 100); });
});
