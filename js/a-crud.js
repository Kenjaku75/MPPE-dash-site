/* Dashboard : pages à tableau simple — agenda, bénévoles, demandes d'aide (choisies selon data-nav) */
MPP.admin.page({ nav: document.body.dataset.nav, need: 'admin' }, async ({ sb, S, me, el }) => {
  const A = MPP.admin; const { esc, icon, $ } = MPP;
  const page = document.body.dataset.nav;
  const slot = (title, sub, actions) => { el.innerHTML = A.head(title, sub, actions || '') + '<div id="c"></div>'; return $('#c'); };

  const P = {
    async agenda() {
      const CAT = [['rencontre', 'Rencontre'], ['tirage', 'Tirage'], ['parking', 'Parking'], ['point_inscription', "Point d'inscription"], ['autre', 'Autre']];
      const host = slot('Agenda', 'Les événements publics. Les dates du tirage et du parking s\'affichent automatiquement à partir des paramètres de campagne : inutile de les ajouter ici.');
      await A.crud(host, { table: 'evenements', label: 'Événement', order: [['debut', true]], empty: 'Aucun événement.',
        cols: [{ l: 'Événement', fn: (r) => '<b>' + esc(r.titre) + '</b><div class="small muted">' + esc(r.lieu || '') + '</div>', cls: 'wide' }, { l: 'Quand', fn: (r) => A.when(r.debut), cls: 'nowrap' }, { l: 'Catégorie', fn: (r) => '<span class="chip">' + esc((CAT.find((c) => c[0] === r.categorie) || [])[1] || r.categorie) + '</span>' }, { l: 'Visible', fn: (r) => (r.visible ? 'Oui' : '<span class="muted">Non</span>') }],
        fields: [{ k: 'titre', l: 'Titre', t: 'text', req: true }, { k: 'debut', l: 'Début', t: 'datetime', req: true }, { k: 'fin', l: 'Fin (facultatif)', t: 'datetime' }, { k: 'lieu', l: 'Lieu', t: 'text' }, { k: 'description', l: 'Description', t: 'textarea', rows: 3 }, { k: 'categorie', l: 'Catégorie', t: 'select', req: true, opts: CAT }, { k: 'visible', l: 'Visible sur le site', t: 'check', def: true }], defaults: { categorie: 'rencontre', visible: true } });
    },

    async benevoles() {
      const STB = { nouveau: ['Nouveau', 'gold'], contacte: ['Contacté', ''], accepte: ['Accepté', 'green'], refuse: ['Refusé', 'red'] };
      const host = slot('Bénévoles', 'Demandes pour rejoindre l\'équipe de campagne. Un bénévole accepté n\'obtient <b>aucun</b> compte d\'administration. Les numéros WhatsApp sont supprimés à la clôture.', A.btn('Exporter', 'id="csv"', 'btn-ghost', 'download'));
      const h = await A.crud(host, { table: 'benevoles', label: 'Bénévole', canAdd: false, canEdit: false, order: [['created_at', false]], empty: 'Aucune demande pour le moment.',
        cols: [{ l: 'Nom', fn: (r) => '<b>' + esc(r.nom) + '</b> ' + esc(r.prenom) + '<div class="small muted">' + esc((r.filiere || '') + ' · ' + (r.annee || '')) + '</div>' },
          { l: 'WhatsApp', fn: (r) => (r.whatsapp ? '<a target="_blank" rel="noopener noreferrer" href="https://wa.me/' + esc(String(r.whatsapp).replace(/\D/g, '')) + '">' + esc(r.whatsapp) + '</a>' : '<span class="muted">supprimé</span>') },
          { l: 'Aide pour', fn: (r) => (r.domaines || []).map((d) => '<span class="chip">' + esc(d) + '</span>').join(' ') + (r.disponibilites ? '<div class="small muted">' + esc(r.disponibilites) + '</div>' : '') + (r.message ? '<div class="small">' + esc(r.message) + '</div>' : ''), cls: 'wide' },
          { l: 'Statut', fn: (r) => '<select data-st="' + r.id + '" style="min-height:36px;width:auto">' + Object.entries(STB).map(([k, v]) => '<option value="' + k + '"' + (k === r.statut ? ' selected' : '') + '>' + v[0] + '</option>').join('') + '</select>' },
          { l: 'Notes internes', fn: (r) => '<input data-nt="' + r.id + '" value="' + esc(r.notes || '') + '" placeholder="Note…" style="min-height:36px">' }] });
      el.addEventListener('change', async (e) => {
        const t = e.target; const v = t.dataset.st ? { statut: t.value } : t.dataset.nt ? { notes: t.value.trim() || null } : null; if (!v) return;
        const r = await sb.from('benevoles').update(v).eq('id', t.dataset.st || t.dataset.nt); if (r.error) A.err(r.error); else MPP.toast('Enregistré', 'ok');
      });
      $('#csv').addEventListener('click', () => A.csv('benevoles', ['Nom', 'Prénom', 'Filière', 'Année', 'WhatsApp', 'Domaines', 'Disponibilités', 'Statut', 'Notes'], h.rows().map((r) => [r.nom, r.prenom, r.filiere, r.annee, r.whatsapp, (r.domaines || []).join(', '), r.disponibilites, r.statut, r.notes])));
    },

    async aide() {
      const TY = { doublon: 'Inscription bloquée / doublon', message_supprime: 'Message supprimé', tirage: 'Tirage', suppression_donnees: 'Mes données', autre: 'Autre' };
      const STA = { nouveau: ['Nouvelle', 'gold'], en_cours: ['En cours', ''], traite: ['Traitée', 'green'] };
      const host = slot("Demandes d'aide", 'Faux doublon, message supprimé, réclamation sur le tirage, demande de suppression de données. Délai de réponse cible : 24 heures. Un administrateur vérifie et débloque (voir Participants).');
      await A.crud(host, { table: 'demandes_aide', label: 'Demande', canAdd: false, canEdit: false, order: [['created_at', false]], empty: "Aucune demande d'aide.",
        cols: [{ l: 'Reçue', fn: (r) => A.when(r.created_at), cls: 'nowrap' }, { l: 'Type', fn: (r) => '<span class="chip">' + esc(TY[r.type] || r.type) + '</span>' }, { l: 'Demande', fn: (r) => esc(r.message) + (r.contact ? '<div class="small">' + icon('phone') + ' ' + esc(r.contact) + '</div>' : '<div class="small muted">Pas de contact laissé</div>'), cls: 'wide' },
          { l: 'Statut', fn: (r) => '<select data-st="' + r.id + '" style="min-height:36px;width:auto">' + Object.entries(STA).map(([k, v]) => '<option value="' + k + '"' + (k === r.statut ? ' selected' : '') + '>' + v[0] + '</option>').join('') + '</select>' },
          { l: 'Note', fn: (r) => '<input data-nt="' + r.id + '" value="' + esc(r.note || '') + '" placeholder="Réponse / note…" style="min-height:36px">' }] });
      el.addEventListener('change', async (e) => {
        const t = e.target; const v = t.dataset.st ? { statut: t.value, traite_par: t.value === 'traite' ? me.user_id : null } : t.dataset.nt ? { note: t.value.trim() || null } : null; if (!v) return;
        const r = await sb.from('demandes_aide').update(v).eq('id', t.dataset.st || t.dataset.nt); if (r.error) A.err(r.error); else MPP.toast('Enregistré', 'ok');
      });
    }
  };
  await P[page]();
});
