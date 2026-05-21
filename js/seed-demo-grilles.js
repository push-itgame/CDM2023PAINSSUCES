/**
 * Grilles démo complètes pour Supabase (72 poules + tableau + scores KO + bonus).
 * Fichiers : data/seeds/*.json — regénérer avec scripts/build_seed_demos.py
 */
(function () {
  const SEED_FILES = [
    { file: 'data/seeds/cursor-agent.json', label: 'Cursor Agent (Argentine)' },
    { file: 'data/seeds/sophie-iberia.json', label: 'Sophie (Espagne)' },
    { file: 'data/seeds/lucas-selecao.json', label: 'Lucas (Brésil)' },
  ];

  async function loadSeedFile(path) {
    const res = await fetch(path + '?' + Date.now());
    if (!res.ok) throw new Error('Fichier seed introuvable : ' + path);
    return res.json();
  }

  async function seedDemoGrilles() {
    if (!window.CDM_SUPABASE?.isConfigured()) {
      throw new Error('Supabase non configuré (js/config.js).');
    }
    const results = [];
    for (const { file, label } of SEED_FILES) {
      const data = await loadSeedFile(file);
      await CDM_SUPABASE.upsertGrille(data);
      results.push({ label, email: data.identite?.email || '?' });
    }
    return results;
  }

  window.CDM_SEED_DEMOS = { SEED_FILES, seedDemoGrilles };
})();
