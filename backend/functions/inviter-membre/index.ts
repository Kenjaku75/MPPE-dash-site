// =====================================================================
//  Fonction Edge « inviter-membre » — le PRÉSIDENT invite un membre du bureau par e-mail depuis le dashboard.
//
//  Pourquoi une fonction serveur : envoyer une invitation exige la clé secrète (service_role) de Supabase, qui ne doit
//  JAMAIS se trouver dans le site. Elle reste ici, côté serveur (Supabase la fournit automatiquement à la fonction).
//
//  Ce que fait la fonction :
//   1. vérifie que l'appelant est connecté ET est le président (et a validé la double authentification si elle est exigée) ;
//   2. envoie l'e-mail d'invitation (la personne choisit son propre mot de passe, puis active la double authentification) ;
//   3. attribue le rôle « admin » ou « moderateur » et inscrit l'action au journal d'audit.
//  Le compte du président ne peut jamais être modifié par cette fonction.
//
//  Installation : voir LISEZMOI.md, « Installer la fonction d'invitation ».
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
// Adresse du dashboard : destination des liens reçus par e-mail (à garder dans la liste des « Redirect URLs » de Supabase)
const DASH_URL = (Deno.env.get("DASH_URL") || "https://mppe-dash.vercel.app").replace(/\/+$/, "");

const cors = {
  "Access-Control-Allow-Origin": DASH_URL,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Lit le contenu d'un jeton déjà vérifié par le serveur d'authentification (pour savoir si la double authentification est validée)
function claims(token) {
  try {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(p + "=".repeat((4 - (p.length % 4)) % 4)));
  } catch (_e) {
    return {};
  }
}

async function journal(admin, who, me, action, cible, detail) {
  try {
    await admin.from("audit_logs").insert({
      acteur: who ? who.id : null,
      acteur_email: me ? me.email : who ? who.email : null,
      role: me ? me.role : null,
      action,
      cible,
      detail: detail || {},
    });
  } catch (_e) { /* le journal ne doit jamais bloquer l'action */ }
}

async function trouverCompte(admin, email) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const liste = (data && data.users) || [];
  return liste.find((u) => String(u.email || "").toLowerCase() === email) || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, message: "Méthode non autorisée." }, 405);

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

    // 1. L'appelant doit être le président, connecté (avec double authentification si elle est exigée)
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const reponse = token ? await admin.auth.getUser(token) : { data: null, error: true };
    const who = reponse.data && reponse.data.user;
    if (reponse.error || !who) return json({ ok: false, message: "Connexion requise." }, 401);

    const { data: me } = await admin.from("admins").select("role,email").eq("user_id", who.id).maybeSingle();
    if (!me || me.role !== "president") {
      await journal(admin, who, me, "tentative_refusee", "inviter-membre", { motif: "invitation par un compte qui n'est pas le président" });
      return json({ ok: false, message: "Seul le président peut inviter des membres." }, 403);
    }
    const { data: reglage } = await admin.from("parametres").select("valeur").eq("cle", "require_2fa").maybeSingle();
    const deuxFacteurs = !(reglage && reglage.valeur === false);
    if (deuxFacteurs && claims(token).aal !== "aal2") {
      return json({ ok: false, message: "Validez d'abord la double authentification (reconnectez-vous avec votre code à 6 chiffres)." }, 403);
    }

    // 2. Données saisies
    let body;
    try { body = await req.json(); } catch (_e) { body = {}; }
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "");
    const nom = String(body.nom || "").trim().slice(0, 80) || null;
    const poste = String(body.poste || "").trim().slice(0, 80) || null;
    if (!EMAIL.test(email) || email.length > 200) return json({ ok: false, message: "Adresse e-mail invalide." }, 400);
    if (!["admin", "moderateur"].includes(role)) return json({ ok: false, message: "Rôle invalide (administrateur ou modérateur)." }, 400);

    // 3. Le compte du président est intouchable
    const { data: tous } = await admin.from("admins").select("user_id,email,role,nom_affiche,poste");
    const connu = (tous || []).find((a) => String(a.email || "").toLowerCase() === email) || null;
    if (connu && connu.role === "president") {
      await journal(admin, who, me, "tentative_refusee", email, { motif: "modification du compte du président par invitation" });
      return json({ ok: false, message: "Le compte du président ne peut pas être modifié." }, 403);
    }

    // 4. Envoi : invitation (nouveau compte) ; si le compte existe déjà, lien de réinitialisation du mot de passe
    const redirectTo = DASH_URL + "/connexion.html";
    let userId = null;
    let mode = "invitation";
    let envoye = true;
    const inv = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!inv.error && inv.data && inv.data.user) {
      userId = inv.data.user.id;
    } else {
      const existant = await trouverCompte(admin, email);
      if (!existant) return json({ ok: false, message: "Invitation impossible : " + ((inv.error && inv.error.message) || "erreur inconnue") }, 400);
      userId = existant.id;
      mode = "recuperation";
      const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const r = await anon.auth.resetPasswordForEmail(email, { redirectTo });
      envoye = !r.error;
    }

    // 5. Rôle (le président n'est jamais concerné : voir plus haut)
    const { error: erreurRole } = await admin.from("admins").upsert(
      { user_id: userId, email, nom_affiche: nom || (connu && connu.nom_affiche) || null, poste: poste || (connu && connu.poste) || null, role },
      { onConflict: "user_id" },
    );
    if (erreurRole) return json({ ok: false, message: "Invitation envoyée, mais le rôle n'a pas pu être attribué : " + erreurRole.message }, 500);

    await journal(admin, who, me, "admins.invitation", email, { role, mode, envoye });

    const message = mode === "invitation"
      ? "Invitation envoyée à " + email + ". La personne choisit son mot de passe, puis active la double authentification."
      : envoye
        ? "Ce compte existait déjà : rôle mis à jour et lien de réinitialisation du mot de passe envoyé à " + email + "."
        : "Rôle attribué, mais l'e-mail n'a pas pu être envoyé (limite d'envoi atteinte ?). Réessayez dans une heure.";
    return json({ ok: true, mode, envoye, message });
  } catch (e) {
    return json({ ok: false, message: "Erreur du serveur : " + (e && e.message ? e.message : String(e)) }, 500);
  }
});
