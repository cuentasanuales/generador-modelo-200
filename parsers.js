/* parsers.js — extracción de datos de los PDF (Modelo 200 previo AEAT y
   balance/PyG contables: formato con cuentas PGC o por epígrafes). UMD. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Parsers = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parseImporte(s) {
    s = String(s).trim().replace(/\./g, '').replace(',', '.');
    var v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }

  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  }

  function itemsALineas(items) {
    var rows = {};
    items.forEach(function (it) {
      if (!it.str || !it.str.trim()) return;
      var y = Math.round(it.transform[5] / 2) * 2;
      (rows[y] = rows[y] || []).push({ x: it.transform[4], s: it.str });
    });
    return Object.keys(rows).map(Number).sort(function (a, b) { return b - a; })
      .map(function (y) {
        return rows[y].sort(function (a, b) { return a.x - b.x; })
          .map(function (r) { return r.s; }).join(' ').replace(/\s+/g, ' ').trim();
      });
  }

  var RE_NIF_ENT = /\b([ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b/;
  var RE_NIF_ANY = /\b([A-Z]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/;
  var RE_IMP = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/;

  function parseM200Previo(pagesLines) {
    var out = { admins: [], socios: [], titulares: [], representantes: [], secretario: null,
                nif: '', rs: '', cnae: '', cuotaLiquidaPrev: null, erd: false, casillasRaw: {} };
    var all = [];
    pagesLines.forEach(function (ls) { all = all.concat(ls); });

    for (var i = 0; i < all.length; i++) {
      var ln = all[i];
      var m = RE_NIF_ENT.exec(ln);
      if (m && !out.nif) {
        var resto = ln.slice(ln.indexOf(m[1]) + m[1].length).trim();
        resto = resto.replace(/\b(Página.*|Impuesto.*|\d{4})$/i, '').trim();
        if (/^[A-ZÁÉÍÓÚÑÜ0-9 .,\-]{3,60}$/.test(resto) && !/NIF|MODELO/i.test(resto)) {
          out.nif = m[1]; out.rs = resto;
        }
      }
      if (!out.cnae && /CNAE/i.test(ln)) {
        for (var k = i; k < Math.min(i + 4, all.length); k++) {
          var cand = all[k].replace(/CNAE[^)]*\)/i, '').match(/\b(\d{4})\b/g) || [];
          for (var c = 0; c < cand.length; c++) {
            var n4 = Number(cand[c]);
            if (n4 < 1990 || n4 > 2035) { out.cnae = cand[c]; break; }
          }
          if (out.cnae) break;
        }
      }
      if (/X\s*0?0006\b/.test(ln) || (/reducida dimensi/.test(norm(ln)) && /\bX\b/.test(ln))) out.erd = true;
      var rx = /\b(\d{5})\b[ .]*(-?\d{1,3}(?:\.\d{3})*,\d{2})/g, mc;
      while ((mc = rx.exec(ln)) !== null) {
        if (!(mc[1] in out.casillasRaw)) out.casillasRaw[mc[1]] = parseImporte(mc[2]);
      }
    }
    if (out.casillasRaw['00592'] != null) out.cuotaLiquidaPrev = out.casillasRaw['00592'];

    pagesLines.forEach(function (lines) {
      var texto = lines.join('\n');
      if (/Relación de administradores/i.test(texto)) {
        var zona = true;
        lines.forEach(function (ln) {
          if (/B\.\s*Participaciones/i.test(ln)) zona = false;
          if (!zona) return;
          var m = new RegExp('^' + RE_NIF_ANY.source.slice(2, -2) + '\\s+([FJ])\\s+(.{3,60})$').exec(ln);
          if (m) out.admins.push({ nif: m[1], fj: m[2], nombre: m[3].trim() });
        });
        var b2 = false;
        lines.forEach(function (ln) {
          if (/B\.2\./.test(ln)) b2 = true;
          if (/Suma de porcentajes/i.test(ln)) b2 = false;
          if (!b2) return;
          var m = new RegExp('^([A-Z0-9]\\d{7}[A-Z0-9])\\s+(?:([FJ])\\s+)?(.{3,50}?)\\s+(\\d{1,2})\\s+' +
            RE_IMP.source + '\\s+(\\d{1,3},\\d{2})\\s*$').exec(ln);
          if (m) out.socios.push({ nif: m[1], fj: m[2] || (/^\d/.test(m[1]) ? 'F' : 'J'),
            nombre: m[3].trim(), codProv: m[4].padStart(2, '0'),
            nominal: parseImporte(m[5]), pct: parseImporte(m[6]) });
        });
      }
      if (/titular real/i.test(texto)) {
        for (var j = 0; j < lines.length; j++) {
          var m = /^1\s+([A-Z0-9]{9})\s+(.{3,60})$/.exec(lines[j]);
          if (!m) continue;
          var ctx = lines.slice(Math.max(0, j - 12), j).join(' ');
          if (!/titular real/i.test(ctx)) continue;
          var nifT = m[1], nomT = m[2].trim(), fnac = null;
          for (var k2 = j + 1; k2 < Math.min(j + 6, lines.length); k2++) {
            var mf = /(\d{2})\/(\d{2})\/(\d{4})/.exec(lines[k2]);
            if (mf) { fnac = mf[3] + mf[2] + mf[1]; break; }
          }
          if (!out.titulares.some(function (t) { return t.nif === nifT; })) {
            out.titulares.push({ nif: nifT, nombre: nomT, fnac: fnac || '' });
          }
        }
        var enSec = false, enRep = false;
        lines.forEach(function (ln) {
          if (/Secretario del Consejo/i.test(ln)) { enSec = true; enRep = false; return; }
          if (/Representantes legales/i.test(ln)) { enRep = true; enSec = false; return; }
          if (enSec && !out.secretario) {
            var m = /^(.{3,40}?)\s+([A-Z0-9]\d{7}[A-Z0-9])\s*$/.exec(ln);
            if (m && !/Apellidos/i.test(ln)) out.secretario = { nombre: m[1].trim(), nif: m[2] };
          }
          if (enRep) {
            var m2 = /^(.{3,40}?)\s+([A-Z0-9]\d{7}[A-Z0-9])\s+(\d{2})\/(\d{2})\/(\d{4})\s*(.*)$/.exec(ln);
            if (m2 && !out.representantes.some(function (r) { return r.nif === m2[2]; })) {
              out.representantes.push({ nombre: m2[1].trim(), nif: m2[2],
                fecha: m2[5] + m2[4] + m2[3], notaria: (m2[6] || '').trim().slice(0, 12) });
            }
          }
        });
      }
    });
    return out;
  }

  function parseContable(pagesLines) {
    var all = [];
    pagesLines.forEach(function (ls) { all = all.concat(ls); });
    var sub = [], grp = [], epig = [], out = { nif: '', rs: '', totales: {} };
    var seccion = 'activo';
    all.forEach(function (ln) {
      var nln = norm(ln);
      if (/patrimonio neto y pasivo|^pasivo\b/.test(nln)) seccion = 'pasivo';
      var mNif = RE_NIF_ENT.exec(ln);
      if (mNif && !out.nif) {
        out.nif = mNif[1];
        var mrs = /^(.{3,60}?)\s*[·\-|]?\s*NIF/i.exec(ln);
        if (mrs) out.rs = mrs[1].replace(/[·\-|]\s*$/, '').trim();
      }
      var m8 = /^(\d{7,9})\s*-\s*(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/.exec(ln);
      if (m8) { sub.push({ num: m8[1], nombre: m8[2].trim(), importe: parseImporte(m8[3]) }); return; }
      var m4 = /^(\d{3,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/.exec(ln);
      if (m4) { grp.push({ num: m4[1], nombre: m4[2].trim(), importe: parseImporte(m4[3]) }); return; }
      var imps = ln.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/g);
      if (imps && imps.length >= 1) {
        var lbl = ln.slice(0, ln.indexOf(imps[0])).trim();
        if (/[a-záéíóúñ]{3,}/i.test(lbl) && !/^nota|^\(i+\)/.test(norm(lbl))) {
          epig.push({ label: lbl, importe: parseImporte(imps[0]), seccion: seccion });
        }
      }
      var mt = /^(Total Activo.*?|Total Patrimonio.*?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/i.exec(ln);
      if (mt) out.totales[norm(mt[1])] = parseImporte(mt[2]);
    });
    out.cuentas = sub.length ? sub : grp;
    out.epigrafes = epig;
    out.modo = out.cuentas.length ? 'cuentas' : 'epigrafes';
    return out;
  }

  return { itemsALineas: itemsALineas, parseImporte: parseImporte, norm: norm,
           parseM200Previo: parseM200Previo, parseContable: parseContable };
}));
