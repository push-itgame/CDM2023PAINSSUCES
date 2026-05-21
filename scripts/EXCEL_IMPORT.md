# Import Excel → JSON (CDM 2026)

Convertit une grille remplie `CDM2026_Inscription.xlsx` au format JSON utilisé par le site.

## Prérequis

```bash
pip install openpyxl
```

## Usage

```bash
# Depuis la racine du dépôt
python scripts/excel_to_grille.py CDM2026_Inscription.xlsx

# Fichier de sortie explicite
python scripts/excel_to_grille.py grille_joueur.xlsx --out data/grilles/CDM2026_Jean_Dupont.json

# Résumé sans écrire
python scripts/excel_to_grille.py grille_joueur.xlsx --dry-run
```

Puis fusion dans `participants.json` :

```bash
python scripts/merge_grilles.py
```

## Feuilles lues

| Feuille | Contenu |
|---------|---------|
| **Poules** | Identité (J2–J4), scores matchs 1–72 (cols J/K) |
| **Phase Finale** | Tableau éliminatoire (cols C, F, I, L, O, R), bonus (T57–T68) |
| **Grille** | Repli bonus via colonne I (si T vide) |

## Règles

- Scores poules **vides** → match absent du JSON (pas de 0-0 par défaut).
- Noms d'équipes normalisés vers l'orthographe du site (`Etats Unis` → `États-Unis`, etc.).
- **Scores KO** (matchs 73–104) : non présents dans l'Excel actuel → `scoresElimination` vide.
- E-mail **obligatoire** pour un envoi Supabase ultérieur.

## Fichiers de mapping

- `scripts/excel_cell_map.json` — 72 matchs de poules (généré par `_map_excel.py`)
- `scripts/excel_bracket_map.json` — tableau final + bonus

## Regénérer la cartographie poules

Si le template Excel change :

```bash
python scripts/_map_excel.py
```

## Validation

Quand vous avez un Excel rempli, relancez le convertisseur et comparez avec une grille saisie sur le site (export JSON). Signalez tout écart d'ordre des matchs du tableau (mapping `r32_match_order`).
