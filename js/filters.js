/* Filtres de texte du chat, des idées et des avis.
   Côté navigateur : simple aide à la saisie (contacts seulement).
   Côté serveur : la même logique est rejouée dans backend/schema.sql (fonction private.check_text). */
(function (root) {
  const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const collapse = (s) => s.replace(/(.)\1+/g, '$1');
  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

  const MESSAGES = {
    numero: "Les numéros de téléphone ne sont pas autorisés ici.",
    email: "Les adresses e-mail ne sont pas autorisées ici.",
    lien: "Les liens ne sont pas autorisés ici.",
    pseudo: "Les @pseudos ne sont pas autorisés ici.",
    messagerie: "Les mentions de WhatsApp ou Telegram ne sont pas autorisées ici.",
    insulte: "Ce texte contient des termes interdits par la charte."
  };

  /** Renvoie le motif ('numero', 'email', 'lien', 'pseudo', 'messagerie') ou null. */
  function contacts(text) {
    const t = String(text || '');
    const n = strip(t.toLowerCase());
    if (/(\+?[0-9][ .()\/-]*){7,}/.test(t)) return 'numero';
    if (/(\b(zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf)\b[ ,.\-]*){5,}/.test(n)) return 'numero';
    if (/(^|\s)@[a-z0-9_.]{2,}/.test(n)) return 'pseudo';
    if (/[a-z0-9._%+-]+ ?(@|\(at\)|\[at\]|arobase) ?[a-z0-9.-]+/.test(n)) return 'email';
    if (/(https?:\/\/|www\.|wa\.me|t\.me)/.test(n) || /\b[a-z0-9-]+\.(com|net|org|bf|fr|io|me|co|app|xyz|info)\b/.test(n)) return 'lien';
    if (/whats? ?app|watsap|telegram/.test(n)) return 'messagerie';
    return null;
  }

  function norm(text) {
    return strip(String(text || '').toLowerCase()).replace(/[013457@$!]/g, (c) => LEET[c]);
  }

  /** Vrai si le texte contient un mot de la liste (variantes d'écriture comprises). */
  function insulte(text, words) {
    const n = norm(text);
    const tokens = n.replace(/[^a-z]+/g, ' ').trim().split(/ +/).filter(Boolean);
    const squashed = collapse(n.replace(/[^a-z]/g, ''));
    for (const w of words || []) {
      const m = collapse(norm(w).replace(/[^a-z]/g, ''));
      if (!m) continue;
      if (tokens.some((t) => collapse(t) === m || collapse(t.replace(/s$/, '')) === m)) return true;
      if (m.length >= 6 && squashed.includes(m)) return true;
    }
    return false;
  }

  /** Motif de refus complet (contacts puis insultes) ou null. */
  function check(text, words) {
    return contacts(text) || (insulte(text, words) ? 'insulte' : null);
  }

  const api = { contacts, insulte, check, norm, collapse, messages: MESSAGES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MPP_FILTERS = api;
})(typeof window !== 'undefined' ? window : this);
