"""Fusionne les grilles exportees (JSON) dans data/participants.json."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRILLES_DIR = ROOT / "data" / "grilles"
OUT = ROOT / "data" / "participants.json"


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    participants: list = []
    seen_emails: set[str] = set()

    if OUT.exists():
        try:
            data = load_json(OUT)
            participants = list(data.get("participants") or [])
            for p in participants:
                email = ((p.get("identite") or {}).get("email") or "").strip().lower()
                if email:
                    seen_emails.add(email)
        except (json.JSONDecodeError, OSError) as e:
            print(f"Avertissement: participants.json illisible ({e}), reinitialisation.")

    if not GRILLES_DIR.is_dir():
        print(f"Dossier absent: {GRILLES_DIR}")
        return 1

    files = sorted(GRILLES_DIR.glob("*.json"))
    added = 0
    updated = 0

    for path in files:
        try:
            grille = load_json(path)
        except (json.JSONDecodeError, OSError) as e:
            print(f"Ignorer {path.name}: {e}")
            continue

        identite = grille.get("identite") or {}
        email = (identite.get("email") or "").strip().lower()
        key = email or f"{identite.get('prenom','')}_{identite.get('nom','')}".strip().lower()

        idx = None
        for i, p in enumerate(participants):
            pid = (p.get("identite") or {})
            pe = (pid.get("email") or "").strip().lower()
            pk = pe or f"{pid.get('prenom','')}_{pid.get('nom','')}".strip().lower()
            if pk and pk == key:
                idx = i
                break

        entry = {
            "identite": identite,
            "matchs": grille.get("matchs") or {},
            "equipesQualifiees32Liste": grille.get("equipesQualifiees32Liste") or [],
            "vainqueursTableauEliminationChoisis": grille.get("vainqueursTableauEliminationChoisis") or {},
            "phaseFinalePourBareme": grille.get("phaseFinalePourBareme") or {},
            "bonus": grille.get("bonus") or {},
            "sourceFichier": path.name,
        }

        if idx is not None:
            participants[idx] = entry
            updated += 1
        else:
            participants.append(entry)
            if email:
                seen_emails.add(email)
            added += 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump({"participants": participants}, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Termine: {len(participants)} participant(s), +{added} ajoute(s), {updated} mis a jour.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
