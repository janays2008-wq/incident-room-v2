/*
  * Answer grading, canonical representations, evidence references, and partial credit.
 *
 * grade(answer, value) ← { ok, reason, ... }
  * Answer grading, canonical representations, evidence references, and partial credit.
  * Answer grading, canonical representations, evidence references, and partial credit.
 *
 * reason:
  * Answer grading, canonical representations, evidence references, and partial credit.
  * Answer grading, canonical representations, evidence references, and partial credit.
  * Answer grading, canonical representations, evidence references, and partial credit.
  * Answer grading, canonical representations, evidence references, and partial credit.
 *
  * Answer grading, canonical representations, evidence references, and partial credit.
  * Answer grading, canonical representations, evidence references, and partial credit.
 */
(function (root) {
  'use strict';

  var isNode = typeof module === 'object' && module.exports;
  var sha = isNode ? require('./sha256.js') : root.IR.sha256;
  var norm = isNode ? require('./normalize.js') : root.IR.normalize;
  var G = isNode ? require('./grading.js') : root.IR.grading;

  function h(salt, text) {
    return sha.sha256Hex(salt + text);
  }

  function has(list, x) {
    return (list || []).indexOf(x) !== -1;
  }

  function uniq(list) {
    var seen = {};
    var out = [];
    list.forEach(function (x) {
      if (!Object.prototype.hasOwnProperty.call(seen, x)) { seen[x] = true; out.push(x); }
    });
    return out;
  }

  function ids(value) {
    if (Array.isArray(value)) return uniq(value.filter(function (x) { return typeof x === 'string' && x; }));
    return typeof value === 'string' && value ? [value] : [];
  }

  function fail(reason, extra) {
    var r = { ok: false, reason: reason };
    if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
    return r;
  }

  // Answer grading, canonical representations, evidence references, and partial credit.

  // Answer grading, canonical representations, evidence references, and partial credit.
  function normRef(ref) {
    var m = /^\s*(\d{2})\s*:\s*(\d{1,5})\s*$/.exec(String(ref == null ? '' : ref));
    return m ? m[1] + ':' + Number(m[2]) : '';
  }

  var CIA_LETTERS = ['C', 'I', 'A'];
  function ciaCanon(letters) {
    return uniq((letters || []).map(function (x) { return String(x).toUpperCase(); }))
      .filter(function (x) { return CIA_LETTERS.indexOf(x) !== -1; })
      .sort().join(',');
  }

  // Answer grading, canonical representations, evidence references, and partial credit.

  function gradeTyped(a, value) {
    var r = G.checkTyped(typeof value === 'string' ? value : '', a);
    if (r.reason === 'no_match' || r.reason === 'not_defanged') return fail(r.reason, { read: r.read });
    return r.ok ? { ok: true, read: r.read } : fail(r.reason, { read: r.read });
  }

  // Answer grading, canonical representations, evidence references, and partial credit.
  function gradeSet(a, value) {
    var items = Array.isArray(value) ? value : norm.splitList(value);
    var opts = Object.assign({}, a.opts || {});
    var canon = uniq(items.map(function (x) { return norm.normalize(x, a.type, opts); }).filter(Boolean)).sort();
    if (!canon.length) return fail('empty', { read: '' });
    var ok = has(a.hashes, h(a.salt, 'set:' + canon.join(',')));
    return ok ? { ok: true, read: canon.join(', ') } : fail('no_match', { read: canon.join(', ') });
  }

  function gradeIoc(a, value) {
    var text = value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      text = Object.keys(value).map(function (k) { return value[k] || ''; }).join('\n');
    }
    if (!norm.splitList(text).length) return fail('empty');
    var r = G.gradeIocList(text, a);
    if (r.ok) return { ok: true, items: r.items };
    // Answer grading, canonical representations, evidence references, and partial credit.
    // Answer grading, canonical representations, evidence references, and partial credit.
    return fail(r.notDefanged > 0 ? 'not_defanged' : 'no_match', {
      items: r.items, falsePositives: r.falsePositives, missing: r.missing, notDefanged: r.notDefanged
    });
  }

  function gradeChoice(a, value) {
    var id = ids(value)[0];
    if (!id) return fail('empty');
    return has(a.hashes, h(a.salt, 'choice:' + id)) ? { ok: true } : fail('no_match');
  }

  function gradeMulti(a, value) {
    var picked = ids(value);
    if (!picked.length) return fail('empty');
    // Answer grading, canonical representations, evidence references, and partial credit.
    var scored = picked.filter(function (id) { return !has(a.neutral, h(a.salt, 'neu:' + id)); });
    var right = scored.filter(function (id) { return has(a.correct, h(a.salt, 'opt:' + id)); }).length;
    var wrong = scored.length - right;
    var ok = wrong === 0 && right >= a.min;
    return ok ? { ok: true, correct: right, wrong: 0 } : fail('no_match', { correct: right, wrong: wrong });
  }

  function gradeEvidence(a, value) {
    var slotIds = Object.keys(a.slots);
    var refs = [];
    var good = 0;
    var missing = false;
    slotIds.forEach(function (id) {
      var ref = normRef(value && value[id]);
      if (!ref) { missing = true; return; }
      refs.push(ref);
      if (has(a.slots[id], h(a.salt, 'ev:' + ref))) good++;
    });
    if (!refs.length) return fail('empty');
    if (missing) return fail('incomplete');
    if (a.distinct && uniq(refs).length !== refs.length) return fail('no_match', { correct: good });
    var ok = good === slotIds.length;
    return ok ? { ok: true, correct: good } : fail('no_match', { correct: good });
  }

  function gradeOrder(a, value) {
    var seq = Array.isArray(value) ? value.filter(Boolean) : [];
    if (!seq.length) return fail('empty');
    if (seq.length !== a.size) return fail('incomplete');
    return has(a.sequences, h(a.salt, 'seq:' + seq.join('>'))) ? { ok: true } : fail('no_match');
  }

  var PICK_CATS = ['good', 'conditional', 'partial', 'harmful'];

  function pickCategory(a, id) {
    for (var i = 0; i < PICK_CATS.length; i++) {
      if (has(a.cats, h(a.salt, 'cat:' + id + ':' + PICK_CATS[i]))) return PICK_CATS[i];
    }
    return null;
  }

  /*
    * Answer grading, canonical representations, evidence references, and partial credit.
    * Answer grading, canonical representations, evidence references, and partial credit.
    * Answer grading, canonical representations, evidence references, and partial credit.
    * Answer grading, canonical representations, evidence references, and partial credit.
    * Answer grading, canonical representations, evidence references, and partial credit.
   */
  function gradePick(a, value) {
    var seq = ids(value);
    if (!seq.length) return fail('empty');
    if (seq.length !== a.size) return fail('incomplete');
    var outcome = 'full';
    seq.forEach(function (id, i) {
      var cat = pickCategory(a, id);
      if (cat === 'harmful' || cat === null) { outcome = 'zero'; return; }
      if (cat === 'conditional') {
        var met = seq.slice(0, i).some(function (prev) { return has(a.after, h(a.salt, 'after:' + id + '<' + prev)); });
        if (!met) outcome = 'zero';
      } else if (cat === 'partial' && outcome === 'full') {
        outcome = 'partial';
      }
    });
    var res = { ok: outcome === 'full', outcome: outcome };
    if (!res.ok) res.reason = 'no_match';
    return res;
  }

  function timelineRank(a, id) {
    for (var r = 1; r <= a.maxRank; r++) {
      if (has(a.ranks, h(a.salt, 'tl:' + id + '@' + r))) return r;
    }
    return null;
  }

  function gradeTimeline(a, value) {
    var picked = ids(value);
    if (!picked.length) return fail('empty');
    var ranks = picked.map(function (id) { return timelineRank(a, id); });
    var distractors = ranks.filter(function (r) { return r === null; }).length;
    var real = ranks.filter(function (r) { return r !== null; });
    var inOrder = real.every(function (r, i) { return i === 0 || r >= real[i - 1]; });
    var ok = distractors === 0 && inOrder && real.length >= a.min;
    return ok ? { ok: true, correct: real.length } :
      fail('no_match', { correct: real.length, distractors: distractors, inOrder: inOrder });
  }

  function gradeCia(a, value) {
    var rowIds = Object.keys(a.rows);
    var any = false;
    var good = 0;
    rowIds.forEach(function (id) {
      var letters = value && value[id];
      if (letters && letters.length) any = true;
      var canon = ciaCanon(letters);
      if (canon && has(a.rows[id], h(a.salt, 'cia:' + id + ':' + canon))) good++;
    });
    if (!any) return fail('empty');
    var need = a.minRows || rowIds.length;
    var ok = good >= need;
    return ok ? { ok: true, correct: good, total: rowIds.length } : fail('no_match', { correct: good, total: rowIds.length });
  }

  function gradeMatch(a, value) {
    var keys = Object.keys(a.cells);
    var filled = 0;
    var good = 0;
    var cellsOk = {};
    keys.forEach(function (key) {
      var parts = key.split('.');
      var v = value && value[parts[0]] && value[parts[0]][parts[1]];
      cellsOk[key] = false;
      if (v) {
        filled++;
        if (has(a.cells[key], h(a.salt, 'cell:' + key + '=' + v))) { good++; cellsOk[key] = true; }
      }
    });
    if (!filled) return fail('empty');
    if (filled < keys.length) return fail('incomplete');
    var ok = good === keys.length;
    // Answer grading, canonical representations, evidence references, and partial credit.
    return ok ? { ok: true, correct: good, total: keys.length, cellsOk: cellsOk } :
      fail('no_match', { correct: good, total: keys.length, cellsOk: cellsOk });
  }

  var GRADERS = {
    typed: gradeTyped,
    set: gradeSet,
    ioc: gradeIoc,
    choice: gradeChoice,
    multi: gradeMulti,
    evidence: gradeEvidence,
    order: gradeOrder,
    pick: gradePick,
    timeline: gradeTimeline,
    cia: gradeCia,
    match: gradeMatch
  };

  function grade(answer, value) {
    var fn = answer && GRADERS[answer.kind];
    if (!fn) throw new Error('Unknown answer type: ' + (answer && answer.kind));
    return fn(answer, value);
  }

  // Answer grading, canonical representations, evidence references, and partial credit.
  function isAttempt(result) {
    return !!result && result.reason !== 'empty' && result.reason !== 'incomplete';
  }

  var api = {
    grade: grade,
    isAttempt: isAttempt,
    normRef: normRef,
    ciaCanon: ciaCanon,
    PICK_CATS: PICK_CATS,
    KINDS: Object.keys(GRADERS)
  };
  if (isNode) module.exports = api;
  else { root.IR = root.IR || {}; root.IR.parts = api; }
})(typeof self !== 'undefined' ? self : this);
