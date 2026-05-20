/** Helpers Supabase REST (sans SDK). */
(function () {
  function cfg() {
    return window.CDM_CONFIG || {};
  }

  function isConfigured() {
    const c = cfg();
    return !!(c.supabaseUrl && c.supabaseAnonKey);
  }

  function headers(extra) {
    const c = cfg();
    return Object.assign({
      apikey: c.supabaseAnonKey,
      Authorization: 'Bearer ' + c.supabaseAnonKey,
      'Content-Type': 'application/json',
    }, extra || {});
  }

  function rowToParticipant(row) {
    const p = row.payload || {};
    const identite = {
      prenom: row.prenom || p.identite?.prenom || '',
      nom: row.nom || p.identite?.nom || '',
      email: row.email || p.identite?.email || '',
      equipe: row.equipe || p.identite?.equipe || '',
    };
    return {
      identite,
      matchs: p.matchs || {},
      equipesQualifiees32Liste: p.equipesQualifiees32Liste || [],
      etape2Tableau: p.etape2Tableau || p.etape2 || {},
      vainqueursTableauEliminationChoisis: p.vainqueursTableauEliminationChoisis || {},
      phaseFinalePourBareme: p.phaseFinalePourBareme || {},
      scoresElimination: p.scoresElimination || {},
      bonus: p.bonus || {},
      sourceFichier: 'supabase',
      updatedAt: row.updated_at || null,
    };
  }

  async function fetchAllGrilles() {
    if (!isConfigured()) return [];
    const c = cfg();
    const url = c.supabaseUrl.replace(/\/$/, '') + '/rest/v1/grilles?select=*&order=updated_at.desc';
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || ('Supabase ' + res.status));
    }
    return res.json();
  }

  async function upsertGrille(data) {
    if (!isConfigured()) throw new Error('Supabase non configuré (js/config.js).');
    const email = (data.identite?.email || '').trim().toLowerCase();
    if (!email) throw new Error('E-mail obligatoire.');
    if (!(data.identite?.prenom || '').trim()) throw new Error('Prénom obligatoire.');
    if (!(data.identite?.nom || '').trim()) throw new Error('Nom obligatoire.');

    const row = {
      email,
      prenom: data.identite.prenom.trim(),
      nom: data.identite.nom.trim(),
      equipe: (data.identite.equipe || '').trim(),
      payload: data,
      updated_at: new Date().toISOString(),
    };

    const c = cfg();
    const url = c.supabaseUrl.replace(/\/$/, '') + '/rest/v1/grilles?on_conflict=email';
    const res = await fetch(url, {
      method: 'POST',
      headers: headers({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.hint || ('Supabase ' + res.status));
    }
  }

  async function loadParticipantsMerged(loadJsonFn) {
    const byKey = new Map();

    function addParticipant(p) {
      const id = p.identite || {};
      const email = (id.email || '').trim().toLowerCase();
      const key = email || ((id.prenom || '') + '_' + (id.nom || '')).trim().toLowerCase();
      if (!key) return;
      byKey.set(key, p);
    }

    if (isConfigured()) {
      try {
        const rows = await fetchAllGrilles();
        rows.forEach(r => addParticipant(rowToParticipant(r)));
      } catch (e) {
        console.warn('Supabase:', e);
      }
    }

    try {
      const fileData = await loadJsonFn('data/participants.json');
      (fileData.participants || []).forEach(p => {
        const email = ((p.identite || {}).email || '').trim().toLowerCase();
        const key = email || ((p.identite?.prenom || '') + '_' + (p.identite?.nom || '')).trim().toLowerCase();
        if (key && !byKey.has(key)) addParticipant(p);
      });
    } catch (e) {
      /* fichier local optionnel */
    }

    return [...byKey.values()];
  }

  window.CDM_SUPABASE = {
    isConfigured,
    upsertGrille,
    fetchAllGrilles,
    loadParticipantsMerged,
    rowToParticipant,
  };
})();
