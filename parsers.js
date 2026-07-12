/* parsers.js — extracción de datos de los 3 PDF (Modelo 200 previo AEAT y
   Balance/PyG de contabilidad estilo Holded). UMD; en navegador requiere pdf.js. */
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

  /* Reconstruye líneas de texto a partir de items de pdf.js agrupando por Y. */
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
  var RE_NIF_FIS = /\b(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/;
  var RE_NIF_ANY = /\b([A-Z]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/;
  var RE_IMP = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/;

  /* ── Modelo 200 del ejercicio anterior (PDF AEAT) ── */
  function parseM200Previo(pagesLines) {
    var out = { admins: [], socios: [], titulares: [], representantes: [], secretario: null,
                nif: '', rs: '', cnae: '', cuotaLiquidaPrev: null, erd: false };
    var all = [];
    pagesLines.forEach(function (ls) { all = all.concat(ls); });

    // NIF + razón social: línea "NIF  RAZON SOCIAL" tras cabecera de identificación
    for (var i = 0; i < all.length; i++) {
      var m = RE_NIF_ENT.exec(all[i]);
      if (m && !out.nif) {
        var resto = all[i].slice(all[i].indexOf(m[1]) + m[1].length).trim();
        resto = resto.replace(/\b(Página.*|Impuesto.*|\d{4})$/i, '').trim();
        if (/^[A-ZÁÉÍÓÚÑÜ0-9 .,\-]{3,60}$/.test(resto) && !/NIF|MODELO/i.test(resto)) {
          out.nif = m[1]; out.rs = resto;
        }
      }
      var mc = /CNAE.*?actividad principal\D*(\d{4})/.exec(all[i]) || /CNAE[^)]*\)\D*(\d{4})/.exec(all[i]);
      if (mc && !out.cnae) out.cnae = mc[1];
      var mq = /Cuota líquida[ .]*0{0,2}592?\D*(\d{1,3}(?:\.\d{3})*,\d{2})/.exec(all[i]) ||
               (/Cuota líquida/.test(all[i]) && /00592\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/.exec(all[i]));
      if (mq && out.cuotaLiquidaPrev === null) out.cuotaLiquidaPrev = parseImporte(mq[1]);
      if (/X\s*0?0006\b/.test(all[i]) || /reducida dimensión/i.test(all[i]) && /\bX\b/.test(all[i])) out.erd = true;
    }

    pagesLines.forEach(function (lines) {
      var texto = lines.join('\n');
      // Administradores (página 2)
      if (/Relación de administradores/i.test(texto)) {
        var zona = true;
        lines.forEach(function (ln) {
          if (/B\.\s*Participaciones/i.test(ln)) zona = false;
          if (!zona) return;
          var m = new RegExp('^' + RE_NIF_ANY.source.slice(2, -2) + '\\s+([FJ])\\s+(.{3,60})$').exec(ln);
          if (m) out.admins.push({ nif: m[1], fj: m[2], nombre: m[3].trim() });
        });
        // Socios B.2: NIF [F/J] NOMBRE COD NOMINAL PCT
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
      // Titular real (puede haber varios bloques por página)
      if (/titular real/i.test(texto)) {
        for (var j = 0; j < lines.length; j++) {
          var m = /^1\s+([A-Z0-9]{9})\s+(.{3,60})$/.exec(lines[j]);
          if (!m) continue;
          var ctx = lines.slice(Math.max(0, j - 12), j).join(' ');
          if (!/titular real/i.test(ctx)) continue;
          var nifT = m[1], nomT = m[2].trim(), fnac = null;
          for (var k = j + 1; k < Math.min(j + 6, lines.length); k++) {
            var mf = /(\d{2})\/(\d{2})\/(\d{4})/.exec(lines[k]);
            if (mf) { fnac = mf[3] + mf[2] + mf[1]; break; }
          }
          if (!out.titulares.some(function (t) { return t.nif === nifT; })) {
            out.titulares.push({ nif: nifT, nombre: nomT, fnac: fnac || '' });
          }
        }
        // Secretario y representantes (misma página F/G)
        var enSec = false, enRep = false;
        lines.forEach(function (ln) {
          if (/Secretario del Consejo/i.test(ln)) { enSec = true; enRep = false; return; }
          if (/Representantes legales/i.test(ln)) { enRep = true; enSec = false; return; }
          if (enSec && !out.secretario) {
            var m = new RegExp('^(.{3,40}?)\\s+([A-Z0-9]\\d{7}[A-Z0-9])\\s*$').exec(ln);
            if (m && !/Apellidos/i.test(ln)) out.secretario = { nombre: m[1].trim(), nif: m[2] };
          }
          if (enRep) {
            var m2 = new RegExp('^(.{3,40}?)\\s+([A-Z0-9]\\d{7}[A-Z0-9])\\s+(\\d{2})\\/(\\d{2})\\/(\\d{4})\\s*(.*)$').exec(ln);
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

  /* ── Informe contable estilo Holded: extrae cuentas con importe ── */
  function parseContable(pagesLines) {
    var all = [];
    pagesLines.forEach(function (ls) { all = all.concat(ls); });
    var sub = [], grp = [], out = { nif: '', rs: '', totales: {} };
    all.forEach(function (ln) {
      var mNif = RE_NIF_ENT.exec(ln);
      if (mNif && !out.nif && !/NIF/.test(ln)) out.nif = mNif[1];
      var m8 = /^(\d{7,9})\s*-\s*(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/.exec(ln);
      if (m8) { sub.push({ num: m8[1], nombre: m8[2].trim(), importe: parseImporte(m8[3]) }); return; }
      var m4 = /^(\d{3,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/.exec(ln);
      if (m4) { grp.push({ num: m4[1], nombre: m4[2].trim(), importe: parseImporte(m4[3]) }); return; }
      var mt = /^(Total Activo.*?|Total Patrimonio.*?|Resultado del ejercicio|Resultado de explotación|Resultado antes de impuestos|Resultado financiero)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/i.exec(ln);
      if (mt) out.totales[mt[1].toLowerCase()] = parseImporte(mt[2]);
    });
    // preferir subcuentas si cubren los grupos; si no hay, usar grupos (3-4 dígitos)
    out.cuentas = sub.length ? sub : grp;
    out.origen = sub.length ? 'subcuentas' : 'grupos';
    return out;
  }

  return { itemsALineas: itemsALineas, parseImporte: parseImporte,
           parseM200Previo: parseM200Previo, parseContable: parseContable };
}));
