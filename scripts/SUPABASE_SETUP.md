# Supabase — envoi automatique des grilles

## 1. Créer le projet (5 min)

1. [supabase.com](https://supabase.com) → **Start your project** → compte gratuit
2. **New project** → nom `cdm-pains-sucés` → mot de passe BDD → région proche (ex. Frankfurt)
3. Attendre que le projet soit **Active**

## 2. Créer la table

1. Menu **SQL Editor** → **New query**
2. Coller tout le fichier `scripts/supabase_schema.sql`
3. **Run** → Success
4. **New query** → coller `scripts/supabase_player_code.sql` → **Run** (code secret joueur)

> Projet déjà créé ? Exécutez seulement `supabase_player_code.sql` pour ajouter la colonne `code_hash` et les fonctions RPC.

## 3. Récupérer les clés

1. **Project Settings** (engrenage) → **API**
2. Noter :
   - **Project URL** → ex. `https://abcdefgh.supabase.co`
   - **anon public** key → longue clé `eyJ...`

## 4. Configurer le site

Éditer `js/config.js` :

```javascript
window.CDM_CONFIG = {
  supabaseUrl: 'https://VOTRE_PROJECT.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};
```

Puis commit + push GitHub (comme le reste du site).

## 5. Tester

1. Ouvrir `index.html` sur le site
2. Remplir **Inscription / Connexion** (prénom, nom, **e-mail**, **code secret** 4–6 chiffres)
3. Quelques scores poules + bonus
4. **Envoyer ma grille** → toast vert
5. Ouvrir **classement.html** → votre nom apparaît
6. Recharger la page, saisir l’e-mail → grille en lecture seule → entrer le **code** dans la bannière bleue → modifier

## Parcours joueur

- **Première fois** : remplir la grille + choisir un **code secret** → **Envoyer ma grille**
- **Retour** : saisir l’**e-mail** → grille chargée en consultation → **code** dans la bannière bleue pour modifier
- Même e-mail + bon code = mise à jour (pas de doublon)
- Session active ~8 h après déverrouillage (onglet du navigateur)

## Import Excel (organisateur)

- Import script → Supabase **sans code** (`code_hash` vide)
- Le joueur ouvre le site, saisit son e-mail → **Définir mon code** dans la bannière
- Ou vous communiquez un code provisoire qu’il change ensuite sur le site

## Organisateur

- **Résultats officiels** : toujours `organisateur.html` → Publier (`resultats.json`)
- **Grilles joueurs** : Supabase automatique (plus besoin de `merge_grilles.py` sauf archive)
- **Supprimer une grille** : `organisateur.html` → onglet **Profils** (PIN requis)
- Tableau Supabase : **Table Editor** → `grilles` pour voir les JSON

## Suppression de grilles (organisateur)

1. Déployer la Edge Function **admin-grilles** (une fois) :

```bash
npx supabase login
npx supabase link --project-ref qpkiwausbvedzmovfvxe
npx supabase secrets set ORGANIZER_PIN_HASH=b5fba5acc2c2dfaf6003166625a8de638260a920e1143d7eba941aa8ca259b7d
npx supabase functions deploy admin-grilles
```

> `ORGANIZER_PIN_HASH` = SHA-256 du code organisateur (même valeur que dans `organisateur.html`).

2. Sur le site : `organisateur.html` → PIN → onglet **Profils** → **Supprimer** ou **Créer 3 profils démo Supabase**.

Les profils fichier `data/participants.json` ne sont plus utilisés (table vide). Les démos passent uniquement par Supabase.

La suppression passe par la service role (jamais exposée au navigateur). Pas de policy DELETE publique sur la table.

## Dépannage

| Erreur | Cause |
|--------|--------|
| « Supabase non configuré » | `js/config.js` vide ou non poussé sur GitHub |
| `401` / `JWT` | Mauvaise anon key |
| `relation grilles does not exist` | SQL schema non exécuté |
| RLS error | Relancer `supabase_schema.sql` |
| « Migration code joueur requise » | Exécuter `scripts/supabase_player_code.sql` |
| « Code secret incorrect » | Mauvais code ou session expirée — resaisir dans la bannière |
