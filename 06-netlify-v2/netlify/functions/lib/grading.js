/*
  * Hash-based answer checking and indicator-of-compromise validation.
  * Hash-based answer checking and indicator-of-compromise validation.
  * Hash-based answer checking and indicator-of-compromise validation.
 */
(function (root) {
  'use strict';

  var isNode = typeof module === 'object' && module.exports;
  var sha = isNode ? require('./sha256.js') : root.IR.sha256;
  var norm = isNode ? require('./normalize.js') : root.IR.normalize;

  function answerHash(salt, canonical) {
    return sha.sha256Hex(salt + canonical);
  }

  function hasHash(list, h) {
    return (list || []).indexOf(h) !== -1;
  }

  /*
    * Hash-based answer checking and indicator-of-compromise validation.
   * spec: { type, opts, salt, hashes: [..], mustDefang }
    * Hash-based answer checking and indicator-of-compromise validation.
    * Hash-based answer checking and indicator-of-compromise validation.
   */
  function checkTyped(input, spec) {
    var opts = spec.opts || {};
    var read = norm.normalize(input, spec.type, opts);
    if (!read) return { ok: false, reason: 'empty', read: '' };
    if (spec.mustDefang && !norm.isDefanged(input, spec.type, opts)) {
      return { ok: false, reason: 'not_defanged', read: read };
    }
    var ok = hasHash(spec.hashes, answerHash(spec.salt, read));
    return { ok: ok, reason: ok ? null : 'no_match', read: read };
  }

  // Hash-based answer checking and indicator-of-compromise validation.

  var IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

  // Hash-based answer checking and indicator-of-compromise validation.
  function iocKind(item) {
    var r = norm.normalize(item, 'url');
    if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(r) || r.indexOf('/') !== -1) return 'url';
    if (r.indexOf('@') !== -1) return 'email';
    if (IPV4.test(r)) return 'ip';
    return 'domain';
  }

  // Hash-based answer checking and indicator-of-compromise validation.
  function iocCanonical(item, kind) {
    if (kind === 'url') {
      return norm.normalize(item, 'url')
        .replace(/^[a-z][a-z0-9+.\-]*:\/\//i, '')
        .replace(/[?#][\s\S]*$/, '')
        .replace(/\/+$/, '');
    }
    return norm.normalize(item, kind);
  }

  function iocHost(canonical, kind) {
    if (kind === 'url') return canonical.split('/')[0];
    if (kind === 'email') return canonical.split('@').pop();
    if (kind === 'domain') return canonical;
    return '';
  }

  // Hash-based answer checking and indicator-of-compromise validation.
  function suffixes(host) {
    var parts = host.split('.');
    var out = [];
    for (var i = 0; i < parts.length; i++) out.push(parts.slice(i).join('.'));
    return out;
  }

  /*
   * spec: {
   *   salt,
   *   groups: [{ kind: 'domain'|'ip'|'email'|'url', min: n, hashes: [..] }],
    * Hash-based answer checking and indicator-of-compromise validation.
    * Hash-based answer checking and indicator-of-compromise validation.
   * }
    * Hash-based answer checking and indicator-of-compromise validation.
   */
  function gradeIocList(input, spec) {
    var raws = Array.isArray(input) ? input : norm.splitList(input);
    var optional = spec.defangOptional || [];
    var seen = {};
    var matched = {};
    var items = [];
    var falsePositives = 0;
    var notDefanged = 0;

    raws.forEach(function (raw) {
      if (!raw || !String(raw).trim()) return;
      var kind = iocKind(raw);
      var read = iocCanonical(raw, kind);
      if (!read) return;
      var key = kind + ':' + read;
      var defanged = norm.isDefanged(raw, kind === 'url' ? 'url' : kind);
      items.push({ raw: raw, kind: kind, read: read, defanged: defanged });
      if (seen[key]) return;
      seen[key] = true;

      var host = iocHost(read, kind);
      var isDenied = host && suffixes(host).some(function (sfx) {
        return hasHash(spec.deny, answerHash(spec.salt, 'deny:' + sfx));
      });
      if (isDenied) { falsePositives++; return; }

      var needsDefang = optional.indexOf(kind) === -1;
      if (needsDefang && !defanged) { notDefanged++; return; }

      if (hasHash(allGroupHashes(spec, kind), answerHash(spec.salt, key))) {
        matched[kind] = (matched[kind] || 0) + 1;
      }
    });

    var missing = spec.groups.some(function (g) { return (matched[g.kind] || 0) < g.min; });
    return {
      ok: !missing && falsePositives === 0 && notDefanged === 0,
      items: items,
      falsePositives: falsePositives,
      notDefanged: notDefanged,
      missing: missing
    };
  }

  function allGroupHashes(spec, kind) {
    var out = [];
    spec.groups.forEach(function (g) { if (g.kind === kind) out = out.concat(g.hashes); });
    return out;
  }

  var api = {
    answerHash: answerHash,
    checkTyped: checkTyped,
    gradeIocList: gradeIocList,
    iocKind: iocKind,
    iocCanonical: iocCanonical,
    suffixes: suffixes
  };
  if (isNode) module.exports = api;
  else { root.IR = root.IR || {}; root.IR.grading = api; }
})(typeof self !== 'undefined' ? self : this);
