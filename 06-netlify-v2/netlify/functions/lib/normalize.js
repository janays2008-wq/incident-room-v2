/*
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
 *
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  * Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
 */
(function (root) {
  'use strict';

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.

  function mapDigits(s) {
    return s
      .replace(/[٠-٩]/g, function (ch) { return String(ch.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (ch) { return String(ch.charCodeAt(0) - 0x06F0); });
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function mapPunct(s) {
    return s
      .replace(/،/g, ',')
      .replace(/؛/g, ';')
      .replace(/؟/g, '?')
      .replace(/٪/g, '%')
      .replace(/٫/g, '.');
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function stripDiacritics(s) {
    return s.replace(/[ـً-ٰٟ]/g, '');
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function unifyLetters(s) {
    return s
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه');
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  var INVISIBLE = /[​-‏‪-‮⁦-⁩﻿؜­]/g;
  function stripInvisible(s) {
    return s.replace(INVISIBLE, '');
  }

  var QUOTES = '"\'`“”„‘’«»‹›';
  var BRACKETS = { '(': ')', '[': ']', '{': '}', '<': '>' };

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function wrapsWhole(inner, open, close) {
    var depth = 0;
    for (var i = 0; i < inner.length; i++) {
      var c = inner.charAt(i);
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth < 0) return false;
      }
    }
    return depth === 0;
  }

  function stripWrappers(s) {
    var changed = true;
    while (changed && s.length) {
      changed = false;
      var first = s.charAt(0);
      var last = s.charAt(s.length - 1);
      if (QUOTES.indexOf(first) !== -1) { s = s.slice(1).trim(); changed = true; continue; }
      if (QUOTES.indexOf(last) !== -1) { s = s.slice(0, -1).trim(); changed = true; continue; }
      if (s.length >= 2 && BRACKETS[first] === last && wrapsWhole(s.slice(1, -1), first, last)) {
        s = s.slice(1, -1).trim();
        changed = true;
      }
    }
    return s;
  }

  function baseClean(raw, arabicText) {
    var s = mapDigits(raw);
    s = mapPunct(s);
    s = stripDiacritics(s);
    if (arabicText) s = unifyLetters(s);
    s = stripInvisible(s);
    s = s.replace(/\s+/g, ' ').trim();
    return stripWrappers(s);
  }

  // ---- refang / defang ----------------------------------------------------

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function refang(s) {
    return String(s)
      .replace(/hxxp/gi, 'http')
      .replace(/\[:\/\/\]/g, '://')
      .replace(/\[:\]/g, ':')
      .replace(/\[(?:\.|dot)\]|\((?:\.|dot)\)|\{(?:\.|dot)\}/gi, '.')
      .replace(/\[(?:@|at)\]|\((?:@|at)\)|\{(?:@|at)\}/gi, '@')
      .replace(/\\\./g, '.');
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function defang(s) {
    return String(s)
      .replace(/^http/i, 'hxxp')
      .replace(/:\/\//, '[://]')
      .replace(/\./g, '[.]');
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.

  var SCHEME = /^([a-z][a-z0-9+.\-]*:\/\/)/i;

  function normDomain(s, opts) {
    s = s.replace(/\s+/g, '');
    if (opts.refang !== false) s = refang(s);
    s = s.replace(SCHEME, '');
    s = s.replace(/\/+$/, '').replace(/\.$/, '');
    return s.toLowerCase();
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function normUrl(s, opts) {
    s = s.replace(/\s+/g, '');
    if (opts.refang !== false) s = refang(s);
    var m = /^([a-z][a-z0-9+.\-]*:\/\/)?([^\/?#]*)([\s\S]*)$/i.exec(s);
    var scheme = (m[1] || '').toLowerCase();
    var host = m[2].toLowerCase();
    var rest = m[3].replace(/\/+$/, '');
    return scheme + host + rest;
  }

  function normEmail(s, opts) {
    s = s.replace(/\s+/g, '');
    if (opts.refang !== false) s = refang(s);
    return s.replace(/^mailto:/i, '').toLowerCase();
  }

  function normIp(s, opts) {
    s = s.replace(/\s+/g, '');
    if (opts.refang !== false) s = refang(s);
    return s;
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function normHex(s) {
    return s.toLowerCase().replace(/0x|\\x/g, '').replace(/[\s,;:]/g, '');
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function normTime(s) {
    var m = /^(?:\d{4}-\d{2}-\d{2}[ T])?(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (!m) return s;
    var h = +m[1];
    var mi = +m[2];
    var se = m[3] == null ? null : +m[3];
    if (h > 23 || mi > 59 || (se !== null && se > 59)) return s;
    return pad2(h) + ':' + pad2(mi) + (se === null ? '' : ':' + pad2(se));
  }

  var NUM_PREFIX = /^(?:نحو|حوالي|حوالى|تقريبا|قرابة)\s*/;
  var MIN_WORD = '(?:دقائق|دقايق|دقيقة|دقيقه|دقيقتان|د|min|mins|minute|minutes|m)';
  var SEC_WORD = '(?:ثانية|ثانيه|ثواني|ثوان|ث|s|sec|secs|seconds)';
  var NUM_UNIT = new RegExp('\\s*' + MIN_WORD + '\\.?$', 'i');
  var MIN_SEC = new RegExp('^(\\d+)\\s*' + MIN_WORD + '\\s*(?:و|and)?\\s*(\\d{1,2})\\s*' + SEC_WORD + '$', 'i');

  function formatNumber(v, decimals) {
    return String(Number(v.toFixed(decimals)));
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function normNumber(s, opts) {
    var decimals = opts.decimals == null ? 1 : opts.decimals;
    var t = s.replace(NUM_PREFIX, '').trim();
    var v = null;
    var m = MIN_SEC.exec(t);
    if (m) {
      if (+m[2] < 60) v = +m[1] + (+m[2]) / 60;
    } else {
      t = t.replace(NUM_UNIT, '').trim();
      if ((m = /^(\d+):(\d{1,2})$/.exec(t))) {
        if (+m[2] < 60) v = +m[1] + (+m[2]) / 60;
      } else if (/^\d+(?:\.\d+)?$/.test(t)) {
        v = parseFloat(t);
      }
    }
    if (v === null) return t;
    return formatNumber(v, decimals);
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function nameKey(s) {
    s = s.toLowerCase().replace(/[.,;!?]+$/, '').trim();
    var at = /^([^@\s]+)@[^@\s]+$/.exec(s);
    if (at) s = at[1];
    return s;
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function buildSynonymIndex(groups) {
    var index = {};
    Object.keys(groups || {}).forEach(function (group) {
      if (group.charAt(0) === '_') return;
      var entries = groups[group];
      Object.keys(entries).forEach(function (canonical) {
        var variants = [canonical].concat(entries[canonical]);
        variants.forEach(function (v) {
          var key = nameKey(baseClean(String(v).normalize ? String(v).normalize('NFC') : String(v), true));
          if (Object.prototype.hasOwnProperty.call(index, key) && index[key] !== canonical) {
            throw new Error('Conflicting synonym: "' + v + '" maps to both "' + index[key] + '" و"' + canonical + '"');
          }
          index[key] = canonical;
        });
      });
    });
    return index;
  }

  var defaultIndex = null;
  function setSynonyms(groups) {
    defaultIndex = buildSynonymIndex(groups);
  }

  function lookup(index, key) {
    return Object.prototype.hasOwnProperty.call(index, key) ? index[key] : null;
  }

  function normName(s, opts) {
    var index = opts.synonyms || defaultIndex;
    var key = nameKey(s);
    if (!index) return key;
    var hit = lookup(index, key);
    if (hit !== null) return hit;
    // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
    if (key.charAt(0) === 'و' && (hit = lookup(index, key.slice(1).trim())) !== null) return hit;
    if (key.indexOf('ال') === 0 && (hit = lookup(index, key.slice(2))) !== null) return hit;
    return key;
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.

  var TYPES = ['domain', 'url', 'email', 'ip', 'hex', 'time', 'number', 'name', 'choice', 'token', 'text'];

  function normalize(input, type, opts) {
    opts = opts || {};
    var raw = input == null ? '' : String(input);
    if (raw.normalize) raw = raw.normalize('NFC');

    // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
    if (type === 'text') return stripInvisible(raw).trim();

    var s = baseClean(raw, type === 'name');
    switch (type) {
      case 'domain': return normDomain(s, opts);
      case 'url': return normUrl(s, opts);
      case 'email': return normEmail(s, opts);
      case 'ip': return normIp(s, opts);
      case 'hex': return normHex(s);
      case 'time': return normTime(s);
      case 'number': return normNumber(s, opts);
      case 'name': return normName(s, opts);
      case 'choice': return s.toLowerCase();
      // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
      case 'token': return opts.caseSensitive ? s : s.toLowerCase();
      default: throw new Error('normalize: unknown type: ' + type);
    }
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function isDefanged(input, type, opts) {
    var o = {};
    Object.keys(opts || {}).forEach(function (k) { o[k] = opts[k]; });
    o.refang = false;
    return normalize(input, type, o) !== normalize(input, type, opts);
  }

  // Input normalization, Arabic character support, URL defanging, numbers, and synonyms.
  function splitList(input) {
    var s = mapPunct(stripInvisible(String(input == null ? '' : input)));
    return s.split(/[\s,;]+/).filter(function (t) {
      return t && t !== 'و' && t.toLowerCase() !== 'and' && t !== '&';
    });
  }

  var api = {
    normalize: normalize,
    isDefanged: isDefanged,
    refang: refang,
    defang: defang,
    splitList: splitList,
    buildSynonymIndex: buildSynonymIndex,
    setSynonyms: setSynonyms,
    formatNumber: formatNumber,
    TYPES: TYPES
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.IR = root.IR || {}; root.IR.normalize = api; }
})(typeof self !== 'undefined' ? self : this);
