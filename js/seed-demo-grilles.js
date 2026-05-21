/**
 * Grilles démo pour tests classement / organisateur (Supabase uniquement).
 */
(function () {
  function m(n, h, a) {
    return { scoreHome: String(h), scoreAway: String(a) };
  }

  const DEMOS = [
    {
      identite: { prenom: 'Sophie', nom: 'Martin', email: 'sophie.demo@demo.local', equipe: 'Les Bleus du dimanche' },
      matchs: {
        'Match 1': m(1, 2, 0), 'Match 2': m(1, 0), 'Match 17': m(2, 1), 'Match 18': m(1, 1),
        'Match 25': m(0, 2), 'Match 28': m(2, 0), 'Match 53': m(0, 1), 'Match 54': m(0, 2),
        'Match 6': m(2, 1), 'Match 7': m(0, 2), 'Match 30': m(1, 1), 'Match 31': m(3, 0),
      },
      bonus: { meilleureAttaque: 'France', matchs00: '4', nationsA9pts: '5', nbCSC: '2', meilleurButeur: 'K. Mbappé', meilleurJoueur: 'Pedri', meilleurGardien: 'M. Maignan', nbButs: '155', nbCartonsRouges: '6', nbProlongations: '3' },
    },
    {
      identite: { prenom: 'Lucas', nom: 'Bernard', email: 'lucas.demo@demo.local', equipe: 'Pains sucés B' },
      matchs: {
        'Match 3': m(0, 0), 'Match 5': m(1, 1), 'Match 26': m(2, 0), 'Match 27': m(1, 0),
        'Match 49': m(2, 0), 'Match 50': m(1, 0), 'Match 10': m(2, 0), 'Match 12': m(1, 0),
        'Match 36': m(0, 1), 'Match 33': m(1, 1), 'Match 57': m(1, 2), 'Match 58': m(2, 1),
      },
      bonus: { meilleureAttaque: 'Espagne', matchs00: '6', nationsA9pts: '4', nbCSC: '4', meilleurButeur: 'L. Messi', meilleurJoueur: 'J. Bellingham', meilleurGardien: 'A. Becker', nbButs: '148', nbCartonsRouges: '8', nbProlongations: '5' },
    },
    {
      identite: { prenom: 'Emma', nom: 'Dupont', email: 'emma.demo@demo.local', equipe: 'Tactiques FC' },
      matchs: {
        'Match 17': m(2, 1), 'Match 18': m(0, 0), 'Match 43': m(1, 0), 'Match 42': m(2, 0),
        'Match 61': m(1, 2), 'Match 62': m(2, 1), 'Match 19': m(3, 1), 'Match 20': m(1, 0),
        'Match 44': m(0, 2), 'Match 41': m(2, 1), 'Match 71': m(1, 1), 'Match 72': m(0, 1),
      },
      bonus: { meilleureAttaque: 'Allemagne', matchs00: '3', nationsA9pts: '7', nbCSC: '1', meilleurButeur: 'H. Kane', meilleurJoueur: 'V. Van Dijk', meilleurGardien: 'T. Courtois', nbButs: '162', nbCartonsRouges: '5', nbProlongations: '6' },
    },
  ];

  async function seedDemoGrilles() {
    if (!window.CDM_SUPABASE?.isConfigured()) {
      throw new Error('Supabase non configuré (js/config.js).');
    }
    const results = [];
    for (const data of DEMOS) {
      await CDM_SUPABASE.upsertGrille(data);
      results.push(data.identite.email);
    }
    return results;
  }

  window.CDM_SEED_DEMOS = { DEMOS, seedDemoGrilles };
})();
