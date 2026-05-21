/**
 * Logique de points partagée (classement, mon-score, feedback grille).
 */
(function (global) {
  const BONUS_NUMERIC_TOLERANCE = 3;
  const KO_MATCH_MIN = 73;
  const KO_MATCH_MAX = 104;

  const BONUS_DEFS = [
    { id: 'b1', key: 'meilleureAttaque', unlock: 'poules', label: 'Meilleure attaque (poules)' },
    { id: 'b2', key: 'matchs00', unlock: 'poules', label: 'Matchs 0-0 (poules)' },
    { id: 'b3', key: 'nationsA9pts', unlock: 'poules', label: 'Nations à 9 pts' },
    { id: 'b4', key: 'nbCSC', unlock: 'poules', label: 'CSC (poules)' },
    { id: 'b5', key: 'meilleurButeur', unlock: 'competition', label: 'Meilleur buteur' },
    { id: 'b6', key: 'meilleurJoueur', unlock: 'competition', label: 'Meilleur joueur' },
    { id: 'b7', key: 'meilleurGardien', unlock: 'competition', label: 'Meilleur gardien' },
    { id: 'b8', key: 'nbButs', unlock: 'competition', label: 'Nombre de buts (±3)' },
    { id: 'b9', key: 'nbCartonsRouges', unlock: 'competition', label: 'Cartons rouges' },
    { id: 'b10', key: 'nbProlongations', unlock: 'competition', label: 'Prolongations' },
  ];

  const TABLEAU_ROUNDS = [
    { key: 'l32', realKey: 'liste32QualifiesIssuesPoules', altReal: 'equipesQualifiees32Liste', predKey: 'liste32QualifiesIssuesPoules', pts: 3, label: '32 seizièmes' },
    { key: 'r16', realKey: 'vainqueursSeiziemePourHuitiemes16', predKey: 'vainqueursSeiziemePourHuitiemes16', pts: 5, label: '16 huitièmes' },
    { key: 'qf', realKey: 'vainqueursHuitiemesPourQuarts8', predKey: 'vainqueursHuitiemesPourQuarts8', pts: 12, label: '8 quarts' },
    { key: 'sf', realKey: 'vainqueursQuartsPourDemis4', predKey: 'vainqueursQuartsPourDemis4', pts: 20, label: '4 demis' },
    { key: 'fin', realKey: 'finalistesChoisis', predKey: 'finalistesChoisis', pts: 35, label: '2 finalistes' },
    { key: 'win', realKey: 'vainqueurFinal', predKey: 'vainqueurFinal', pts: 50, label: 'Vainqueur', single: true },
  ];

  function parseIntSafe(v) {
    const n = parseInt(String(v ?? '').trim(), 10);
    return Number.isFinite(n) ? n : null;
  }

  function normalizeTeam(s) {
    return String(s ?? '').trim().toLowerCase();
  }

  function matchOutcome(h, a) {
    if (h == null || a == null) return null;
    if (h > a) return 'H';
    if (h < a) return 'A';
    return 'D';
  }

  function countOfficialPouleMatchs(resultats) {
    let n = 0;
    for (let i = 1; i <= 72; i++) {
      const r = resultats?.matchs?.['Match ' + i];
      if (r && parseIntSafe(r.scoreHome) != null && parseIntSafe(r.scoreAway) != null) n++;
    }
    return n;
  }

  function poulesOfficialComplete(resultats) {
    return countOfficialPouleMatchs(resultats) >= 72 || (resultats?.etapeDebloquee || 0) >= 2;
  }

  function isBonusKeyUnlocked(key, resultats) {
    const def = BONUS_DEFS.find(d => d.key === key);
    if (!def || !resultats?.bonus) return false;
    if (!(key in resultats.bonus)) return false;
    if (def.unlock === 'poules') return poulesOfficialComplete(resultats);
    return true;
  }

  function scorePouleMatchDetail(pred, real) {
    if (!pred || !real) return { status: 'pending', pts: 0 };
    const rh = parseIntSafe(real.scoreHome ?? real.homeScore);
    const ra = parseIntSafe(real.scoreAway ?? real.awayScore);
    if (rh == null || ra == null) return { status: 'pending', pts: 0 };
    const ph = parseIntSafe(pred.scoreHome);
    const pa = parseIntSafe(pred.scoreAway);
    if (ph == null || pa == null) return { status: 'no-pred', pts: 0 };
    const ro = matchOutcome(rh, ra);
    const po = matchOutcome(ph, pa);
    if (!ro || !po || ro !== po) return { status: 'miss', pts: 0 };
    const exact = rh === ph && ra === pa;
    let base = exact ? 5 : 3;
    const totalReal = rh + ra;
    if (totalReal >= 6) base *= 2;
    else if (totalReal >= 4) base *= 1.5;
    return { status: 'hit', pts: Math.round(base * 10) / 10, exact };
  }

  function buildPredBareme(participant) {
    const p = participant.phaseFinalePourBareme || {};
    const e2 = participant.etape2Tableau || participant.etape2 || {};
    return {
      liste32QualifiesIssuesPoules: (p.liste32QualifiesIssuesPoules?.length ? p.liste32QualifiesIssuesPoules : e2.r32) || participant.equipesQualifiees32Liste || [],
      vainqueursSeiziemePourHuitiemes16: (p.vainqueursSeiziemePourHuitiemes16?.length ? p.vainqueursSeiziemePourHuitiemes16 : e2.r16) || [],
      vainqueursHuitiemesPourQuarts8: (p.vainqueursHuitiemesPourQuarts8?.length ? p.vainqueursHuitiemesPourQuarts8 : e2.qf) || [],
      vainqueursQuartsPourDemis4: (p.vainqueursQuartsPourDemis4?.length ? p.vainqueursQuartsPourDemis4 : e2.sf) || [],
      finalistesChoisis: (p.finalistesChoisis?.length ? p.finalistesChoisis : e2.finalists) || [],
      vainqueurFinal: p.vainqueurFinal || e2.winner || '',
    };
  }

  function setIntersectionScore(predList, realList, ptsPer) {
    const real = new Set((realList || []).map(normalizeTeam).filter(Boolean));
    let pts = 0;
    for (const t of predList || []) {
      if (real.has(normalizeTeam(t))) pts += ptsPer;
    }
    return pts;
  }

  function scoreTableauOnly(participant, resultats) {
    const pred = buildPredBareme(participant);
    const real = resultats.phaseFinalePourBareme || {};
    const list32Real = real.liste32QualifiesIssuesPoules?.length
      ? real.liste32QualifiesIssuesPoules
      : (resultats.equipesQualifiees32Liste || []);
    let pts = 0;
    pts += setIntersectionScore(pred.liste32QualifiesIssuesPoules, list32Real, 3);
    pts += setIntersectionScore(pred.vainqueursSeiziemePourHuitiemes16, real.vainqueursSeiziemePourHuitiemes16, 5);
    pts += setIntersectionScore(pred.vainqueursHuitiemesPourQuarts8, real.vainqueursHuitiemesPourQuarts8, 12);
    pts += setIntersectionScore(pred.vainqueursQuartsPourDemis4, real.vainqueursQuartsPourDemis4, 20);
    pts += setIntersectionScore(pred.finalistesChoisis, real.finalistesChoisis, 35);
    if (normalizeTeam(pred.vainqueurFinal) && normalizeTeam(pred.vainqueurFinal) === normalizeTeam(real.vainqueurFinal)) {
      pts += 50;
    }
    return pts;
  }

  function scoreEliminationKO(participant, resultats) {
    const predWinners = participant.vainqueursTableauEliminationChoisis || participant.kosWinners || {};
    const realWinners = resultats.vainqueursTableauElimination || {};
    const realScores = resultats.scoresElimination || {};
    let pts = 0;
    for (let m = KO_MATCH_MIN; m <= KO_MATCH_MAX; m++) {
      const key = 'Match ' + m;
      const realW = realWinners[key] || realWinners[String(m)] || realWinners['M' + m] || '';
      if (!realW) continue;
      const predW = predWinners[m] || predWinners[key] || predWinners[String(m)] || predWinners['M' + m] || '';
      const scReal = realScores[key] || realScores[String(m)] || realScores['M' + m];
      if (scReal && parseIntSafe(scReal.scoreHome) != null && parseIntSafe(scReal.scoreAway) != null) {
        const predSc = participant.scoresElimination?.[key] || participant.scoresElimination?.[String(m)] || participant.matchs?.[key];
        const ph = parseIntSafe(predSc?.scoreHome);
        const pa = parseIntSafe(predSc?.scoreAway);
        if (ph != null && pa != null && ph === parseIntSafe(scReal.scoreHome) && pa === parseIntSafe(scReal.scoreAway)) {
          pts += 10;
          continue;
        }
      }
      if (normalizeTeam(predW) && normalizeTeam(predW) === normalizeTeam(realW)) pts += 6;
    }
    return pts;
  }

  function evalKoMatchDetail(participant, mid, resultats) {
    const key = 'Match ' + mid;
    const realWinners = resultats.vainqueursTableauElimination || {};
    const realW = realWinners[key] || realWinners[String(mid)] || realWinners['M' + mid] || '';
    if (!realW) return { status: 'pending', pts: 0 };
    const predWinners = participant.vainqueursTableauEliminationChoisis || {};
    const predW = predWinners[mid] || predWinners[key] || predWinners[String(mid)] || '';
    const scReal = (resultats.scoresElimination || {})[key] || resultats.scoresElimination?.[String(mid)];
    const predSc = participant.scoresElimination?.[key] || participant.scoresElimination?.[String(mid)];
    if (scReal && parseIntSafe(scReal.scoreHome) != null && parseIntSafe(scReal.scoreAway) != null) {
      const ph = parseIntSafe(predSc?.scoreHome);
      const pa = parseIntSafe(predSc?.scoreAway);
      if (ph != null && pa != null && ph === parseIntSafe(scReal.scoreHome) && pa === parseIntSafe(scReal.scoreAway)) {
        return { status: 'hit', pts: 10, kind: 'exact' };
      }
    }
    if (normalizeTeam(predW) && normalizeTeam(predW) === normalizeTeam(realW)) {
      return { status: 'hit', pts: 6, kind: 'winner' };
    }
    return { status: 'miss', pts: 0 };
  }

  function evalBonusItem(key, predVal, resultats) {
    if (!isBonusKeyUnlocked(key, resultats)) return { status: 'pending', pts: 0 };
    const r = String(resultats.bonus?.[key] ?? '').trim();
    const p = String(predVal ?? '').trim();
    if (!p || !r) return { status: 'miss', pts: 0 };
    if (key === 'nbButs') {
      const pn = parseIntSafe(p), rn = parseIntSafe(r);
      if (pn != null && rn != null && Math.abs(pn - rn) <= BONUS_NUMERIC_TOLERANCE) {
        return { status: 'hit', pts: 25 };
      }
      return { status: 'miss', pts: 0 };
    }
    return normalizeTeam(p) === normalizeTeam(r) ? { status: 'hit', pts: 25 } : { status: 'miss', pts: 0 };
  }

  function getParticipantBonus(participant) {
    const b = participant.bonus || {};
    return {
      meilleureAttaque: b.meilleureAttaque ?? b.b1 ?? '',
      matchs00: b.matchs00 ?? b.b2 ?? '',
      nationsA9pts: b.nationsA9pts ?? b.b3 ?? '',
      nbCSC: b.nbCSC ?? b.b4 ?? '',
      meilleurButeur: b.meilleurButeur ?? b.b5 ?? '',
      meilleurJoueur: b.meilleurJoueur ?? b.b6 ?? '',
      meilleurGardien: b.meilleurGardien ?? b.b7 ?? '',
      nbButs: b.nbButs ?? b.b8 ?? '',
      nbCartonsRouges: b.nbCartonsRouges ?? b.b9 ?? '',
      nbProlongations: b.nbProlongations ?? b.b10 ?? '',
    };
  }

  function scoreGroupMatches(predMatchs, realMatchs) {
    let pts = 0;
    for (const [key, real] of Object.entries(realMatchs || {})) {
      const d = scorePouleMatchDetail((predMatchs || {})[key], real);
      if (d.status === 'hit') pts += d.pts;
    }
    return Math.round(pts * 10) / 10;
  }

  function scoreBonusAll(predBonus, resultats) {
    if (!predBonus || !resultats?.bonus) return 0;
    let pts = 0;
    for (const def of BONUS_DEFS) {
      const ev = evalBonusItem(def.key, predBonus[def.key], resultats);
      pts += ev.pts;
    }
    return pts;
  }

  function scoreParticipant(participant, resultats) {
    const poules = scoreGroupMatches(participant.matchs, resultats.matchs);
    const tableauE2 = scoreTableauOnly(participant, resultats);
    const finales = scoreEliminationKO(participant, resultats);
    const bonus = scoreBonusAll(getParticipantBonus(participant), resultats);
    const total = Math.round((poules + tableauE2 + finales + bonus) * 10) / 10;
    return { poules, tableauE2, finales, tableau: tableauE2 + finales, bonus, total };
  }

  function tableauRoundDetails(participant, resultats) {
    const pred = buildPredBareme(participant);
    const real = resultats.phaseFinalePourBareme || {};
    const list32Real = real.liste32QualifiesIssuesPoules?.length
      ? real.liste32QualifiesIssuesPoules
      : (resultats.equipesQualifiees32Liste || []);
    const hasOfficial = list32Real.length > 0 || (resultats.etapeDebloquee || 0) >= 3;
    if (!hasOfficial) return [];

    const rounds = [
      { label: '32 seizièmes', ptsEach: 3, pred: pred.liste32QualifiesIssuesPoules, real: list32Real },
      { label: '16 huitièmes', ptsEach: 5, pred: pred.vainqueursSeiziemePourHuitiemes16, real: real.vainqueursSeiziemePourHuitiemes16 || [] },
      { label: '8 quarts', ptsEach: 12, pred: pred.vainqueursHuitiemesPourQuarts8, real: real.vainqueursHuitiemesPourQuarts8 || [] },
      { label: '4 demis', ptsEach: 20, pred: pred.vainqueursQuartsPourDemis4, real: real.vainqueursQuartsPourDemis4 || [] },
      { label: '2 finalistes', ptsEach: 35, pred: pred.finalistesChoisis, real: real.finalistesChoisis || [] },
    ];
    const items = rounds.map(r => {
      const realSet = new Set((r.real || []).map(normalizeTeam));
      const teams = (r.pred || []).map(t => ({
        name: t,
        hit: realSet.has(normalizeTeam(t)),
        pts: realSet.has(normalizeTeam(t)) ? r.ptsEach : 0,
      }));
      return { ...r, teams, pts: teams.reduce((s, x) => s + x.pts, 0) };
    });
    const winHit = normalizeTeam(pred.vainqueurFinal) && normalizeTeam(pred.vainqueurFinal) === normalizeTeam(real.vainqueurFinal);
    items.push({
      label: 'Vainqueur',
      ptsEach: 50,
      pred: pred.vainqueurFinal ? [pred.vainqueurFinal] : [],
      real: real.vainqueurFinal ? [real.vainqueurFinal] : [],
      teams: pred.vainqueurFinal ? [{ name: pred.vainqueurFinal, hit: winHit, pts: winHit ? 50 : 0 }] : [],
      pts: winHit ? 50 : 0,
    });
    return items;
  }

  const TABLEAU_ROUND_UNLOCK = { l32: 2, r16: 3, qf: 4, sf: 5, fin: 6, win: 7 };

  const BRACKET_ROUND_LABEL = {
    r16: '16 huitièmes',
    qf: '8 quarts',
    sf: '4 demis',
    fin: '2 finalistes',
    win: 'Vainqueur',
  };

  function bracketMidToRoundKey(mid) {
    const m = Number(mid);
    if (m >= 73 && m <= 88) return 'r16';
    if (m >= 89 && m <= 96) return 'qf';
    if (m >= 97 && m <= 100) return 'sf';
    if (m >= 101 && m <= 102) return 'fin';
    if (m === 104) return 'win';
    return null;
  }

  function evalBracketPickDetail(participant, mid, team, resultats, etapeEffective) {
    const roundKey = bracketMidToRoundKey(mid);
    if (!roundKey || !participant) return { status: 'pending' };
    const unlock = TABLEAU_ROUND_UNLOCK[roundKey];
    if ((etapeEffective ?? resultats.etapeDebloquee ?? 0) < unlock) return { status: 'pending' };
    const label = BRACKET_ROUND_LABEL[roundKey];
    const rounds = tableauRoundDetails(participant, resultats);
    const rd = rounds.find(r => r.label === label);
    if (!rd) return { status: 'pending' };
    const hit = rd.teams.some(t => normalizeTeam(t.name) === normalizeTeam(team) && t.hit);
    return hit ? { status: 'hit' } : { status: 'miss' };
  }

  function teamInOfficialTableauSet(team, roundKey, resultats) {
    const real = resultats.phaseFinalePourBareme || {};
    const list32 = real.liste32QualifiesIssuesPoules?.length ? real.liste32QualifiesIssuesPoules : (resultats.equipesQualifiees32Liste || []);
    const map = {
      l32: list32,
      r16: real.vainqueursSeiziemePourHuitiemes16,
      qf: real.vainqueursHuitiemesPourQuarts8,
      sf: real.vainqueursQuartsPourDemis4,
      fin: real.finalistesChoisis,
      win: real.vainqueurFinal ? [real.vainqueurFinal] : [],
    };
    const list = map[roundKey] || [];
    return (list || []).some(t => normalizeTeam(t) === normalizeTeam(team));
  }

  global.CDM_SCORING = {
    BONUS_DEFS,
    TABLEAU_ROUNDS,
    TABLEAU_ROUND_UNLOCK,
    KO_MATCH_MIN,
    KO_MATCH_MAX,
    parseIntSafe,
    normalizeTeam,
    matchOutcome,
    countOfficialPouleMatchs,
    poulesOfficialComplete,
    isBonusKeyUnlocked,
    scorePouleMatchDetail,
    buildPredBareme,
    scoreTableauOnly,
    scoreEliminationKO,
    evalKoMatchDetail,
    evalBracketPickDetail,
    bracketMidToRoundKey,
    evalBonusItem,
    getParticipantBonus,
    scoreGroupMatches,
    scoreBonusAll,
    scoreParticipant,
    tableauRoundDetails,
    teamInOfficialTableauSet,
  };
})(window);
