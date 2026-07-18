/* montador.js — ensambla las páginas del Modelo 200 (ejercicio 2025, PYME abreviado)
   a partir de un modelo de datos, replicando el flujo del skill generar-200.
   Compatible navegador + Node (UMD). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./gen200.js'));
  else root.Montador = factory(root.Gen200);
}(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';

  // hojas donde vive cada casilla de balance/PyG
  var SHEET_ORDER = ['DP200003', 'DP200004', 'DP200005', 'DP200006', 'DP200007', 'DP200008'];

  function indexCasillas(dr) {
    var idx = {};
    SHEET_ORDER.forEach(function (sh) {
      dr.fields(sh).forEach(function (f) {
        var m = /\[(\d{5})\]/.exec(f.desc);
        if (m && !(m[1] in idx)) idx[m[1]] = sh;
      });
    });
    return idx;
  }

  function r2(x) { return Math.round(x * 100) / 100; }

  /* d: modelo de datos (ver app.js). Devuelve {content, nombre, paginas:[...]} */
  function generar(d) {
    var dr = d.dr; // instancia Gen200.DR
    var idx = indexCasillas(dr);
    var pages = [];
    var EJ = d.ejercicio || '2025';
    var p, i;

    // ── Página 1 ──
    p = new G.PageBuilder(dr, 'DP200001');
    var resultado = d.liq.resultado;
    p.set(6.0, resultado > 0 ? 'I' : (resultado < 0 ? 'D' : 'N'));
    p.set(7.0, d.ident.nif).set(8.0, d.ident.rs);
    p.set(9.0, EJ);
    p.set(11.0, EJ).set(12.0, '01').set(13.0, '01');
    p.set(14.0, EJ).set(15.0, '12').set(16.0, '31');
    p.set(17.0, '1');
    if (d.ident.cnae) p.set(18.0, String(d.ident.cnae));
    p.set(19.0, '0');
    if (d.ident.telefono) p.set(20.0, String(d.ident.telefono).slice(0, 9));
    if (d.caracteres.erd) p.set('[00006]', '1');
    if (d.caracteres.micro) p.set('[00088]', '1');
    if (d.caracteres.biNegativa) p.set('[00027]', '1');
    p.set(102.0, '1'); // INCN < 20M
    if (d.ident.contactoNombre) p.set(107.0, d.ident.contactoNombre);
    if (d.ident.contactoEmail) p.set(110.0, d.ident.contactoEmail);
    pages.push(p);

    // ── Página 1 bis ──
    p = new G.PageBuilder(dr, 'DP200001B');
    p.set(14.0, d.estados.balance).set(15.0, '0').set(16.0, d.estados.pyg);
    p.set(17.0, '0').set(18.0, '0').set(19.0, '0');
    if (d.personalFijo) p.set(20.0, Number(d.personalFijo));
    if (d.personalNoFijo) p.set(21.0, Number(d.personalNoFijo));
    pages.push(p);

    // ── Página 2: administradores (máx 5) y socios (máx 3) ──
    p = new G.PageBuilder(dr, 'DP200002');
    var admBase = [6.0, 12.0, 18.0, 24.0, 30.0];
    d.admins.slice(0, 5).forEach(function (a, k) {
      var b = admBase[k];
      p.set(b, a.nif).set(b + 1, a.fj || 'F').set(b + 2, '0').set(b + 3, a.nombre);
    });
    var socBase = [100.0, 107.0, 114.0, 121.0, 128.0, 135.0];
    d.socios.slice(0, 6).forEach(function (s, k) {
      var b = socBase[k];
      p.set(b, s.nif).set(b + 1, '0').set(b + 2, s.fj || 'F');
      p.set(b + 3, s.nombre);
      if (s.codProv) p.set(b + 4, String(s.codProv));
      p.set(b + 5, Number(s.nominal) || 0).set(b + 6, Number(s.pct) || 0);
    });
    pages.push(p);

    // ── Página 2 bis (principal + complementarias por titular real) ──
    d.titulares.forEach(function (t, k) {
      var q = new G.PageBuilder(dr, 'DP200002B');
      if (k > 0) q.set(5.0, 'C');
      q.set(144.0, '0').set(145.0, '1');
      q.set(146.0, t.nif).set(147.0, t.nombre);
      if (t.fnac) q.set(149.0, t.fnac);
      q.set(150.0, 'ES').set(151.0, 'ES');
      if (k === 0) {
        if (d.secretario && d.secretario.nombre) {
          q.set(152.0, d.secretario.nombre.slice(0, 21)).set(153.0, d.secretario.nif || '');
        }
        var repBase = [154.0, 158.0, 162.0];
        (d.representantes || []).slice(0, 3).forEach(function (r, j) {
          var b = repBase[j];
          q.set(b, r.nombre.slice(0, 36)).set(b + 1, r.nif);
          if (r.fecha) q.set(b + 2, r.fecha);
          if (r.notaria) q.set(b + 3, r.notaria.slice(0, 12));
        });
      }
      pages.push(q);
    });

    // ── Páginas 3-8: balance y PyG por casilla ──
    var bySheet = {};
    SHEET_ORDER.forEach(function (sh) { bySheet[sh] = {}; });
    var all = {};
    Object.keys(d.balance).forEach(function (c) { all[c] = d.balance[c]; });
    Object.keys(d.pyg).forEach(function (c) { all[c] = d.pyg[c]; });
    Object.keys(all).forEach(function (c) {
      var v = r2(Number(all[c]) || 0);
      if (!v) return;
      var sh = idx[c];
      if (!sh) throw new Error('Casilla sin hoja: ' + c);
      bySheet[sh]['[' + c + ']'] = v;
    });
    SHEET_ORDER.forEach(function (sh) {
      var q = new G.PageBuilder(dr, sh);
      Object.keys(bySheet[sh]).forEach(function (key) { q.set(key, bySheet[sh][key]); });
      pages.push(q);
    });

    // ── Página 12 ──
    var rtdoPyG = r2(Number(d.pyg['00500']) || 0);
    p = new G.PageBuilder(dr, 'DP200012');
    p.set('[00500]', rtdoPyG);
    var aum = r2(Number(d.liq.correccISAumentos) || 0), dis = r2(Number(d.liq.correccISDisminuciones) || 0);
    if (aum) p.set(7.0, aum);
    if (dis) p.set(8.0, dis);
    p.set('[00501]', r2(rtdoPyG + aum - dis));
    pages.push(p);

    // ── Página 13 (obligatoria, a ceros) ──
    pages.push(new G.PageBuilder(dr, 'DP200013'));

    // ── Página 14 ──
    p = new G.PageBuilder(dr, 'DP200014');
    p.set('[00550]', d.liq.biPrevia);
    if (d.liq.bins) p.set('[00547]', d.liq.bins);
    p.set('[00552]', d.liq.bi);
    p.set('[01330]', d.liq.bi);
    p.set('[00558]', d.liq.tipoStr);
    p.set('[00562]', d.liq.cuota);
    p.set('[00582]', d.liq.cuota);
    pages.push(p);

    // ── Página 14 bis ──
    p = new G.PageBuilder(dr, 'DP200014B');
    p.set('[00592]', d.liq.cuota);
    var ret = r2(Number(d.liq.retenciones) || 0);
    if (ret) { p.set(22.0, ret); p.set(38.0, ret); }
    var cuotaEj = r2(d.liq.cuota - ret);
    p.set('[00599]', cuotaEj);
    p.set('[00601]', d.liq.pagos[0]).set('[00603]', d.liq.pagos[1]).set('[00605]', d.liq.pagos[2]);
    p.set('[00611]', resultado);
    p.set('[01586]', resultado);
    p.set('[00621]', resultado);
    pages.push(p);

    // ── Página 20: límite deducibilidad gastos financieros (art. 16 LIS) ──
    // [01249] = 30% x (i1 - i2 - i3 - i4 + i5 - i6), signos de PyG:
    // i1=rtdo. explotación [01250], i2=amortización [01251]; i3/i4/i5/i6 no
    // se rastrean aquí (ajustar en Sociedades WEB si aplican).
    var rex = r2(Number(d.pyg['00296']) || 0);
    var amort = r2(Number(d.pyg['00284']) || 0);
    var bo = r2(rex - amort); // restar amortización negativa = sumarla al BO
    p = new G.PageBuilder(dr, 'DP200020');
    p.set('[01249]', r2(bo * 0.3));
    p.set('[01250]', rex);
    if (amort) p.set('[01251]', amort);
    p.set('[02369]', 1000000.00);
    pages.push(p);

    // ── Página 20 bis (a ceros) ──
    pages.push(new G.PageBuilder(dr, 'DP200020B'));

    // ── Página 20 quater: aplicación de resultados ──
    p = new G.PageBuilder(dr, 'DP200020D');
    if (rtdoPyG > 0) {
      p.set('[00650]', rtdoPyG).set('[00653]', rtdoPyG);
      if (d.aplicacion === 'reservas') { p.set('[00654]', rtdoPyG).set('[01522]', rtdoPyG); }
      else { p.set('[00664]', rtdoPyG); }
      p.set('[00666]', rtdoPyG);
    }
    pages.push(p);

    // ── Documento de ingreso/devolución ──
    p = new G.PageBuilder(dr, 'DP200DID');
    p.set(6.0, '0');
    p.set(7.0, EJ).set(8.0, '1').set(9.0, '0A');
    p.set(10.0, '01').set(11.0, '01').set(12.0, EJ.slice(2));
    p.set(13.0, '31').set(14.0, '12').set(15.0, EJ.slice(2));
    p.set(16.0, d.ident.nif).set(17.0, d.ident.rs);
    p.set(18.0, d.liq.bi).set(19.0, d.liq.cuota).set(20.0, resultado).set(21.0, resultado);
    if (resultado > 0) { p.set(33.0, 'I'); p.set(34.0, resultado); }
    else if (resultado < 0) { p.set(23.0, 'T'); p.set(24.0, Math.abs(resultado)); }
    else { p.set(41.0, '1'); }
    pages.push(p);

    var content = G.buildFile(dr, pages, EJ);
    return {
      content: content,
      nombre: d.ident.nif + '_' + EJ + '_0A.200',
      paginas: pages.map(function (pg) { return { id: pg.render().slice(0, 12), len: pg.render().length }; })
    };
  }

  return { generar: generar, indexCasillas: indexCasillas };
}));
