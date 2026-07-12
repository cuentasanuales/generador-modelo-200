/* app.js — orquestación de la interfaz */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var dr = null, model = null, sinAsignarBal = [], sinAsignarPyg = [];

  var fmt = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function eur(v) { return fmt.format(v || 0); }
  function r2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
  function parseNum(s) {
    if (typeof s === 'number') return s;
    s = String(s).trim(); if (!s) return 0;
    if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(s); return isNaN(v) ? 0 : v;
  }

  // ── carga del diseño de registro ──
  fetch('dr200e25.json').then(function (r) { return r.json(); }).then(function (j) {
    dr = new Gen200.DR(j);
    $('estado-dr').textContent = 'Diseño de registro 2025 cargado ✓';
  }).catch(function (e) { $('estado-dr').textContent = 'ERROR cargando diseño: ' + e; });

  // ── lectura de PDFs ──
  function pdfALineas(file) {
    return file.arrayBuffer().then(function (buf) {
      return pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var ps = [];
      for (var i = 1; i <= doc.numPages; i++) ps.push(doc.getPage(i).then(function (pg) {
        return pg.getTextContent().then(function (tc) { return Parsers.itemsALineas(tc.items); });
      }));
      return Promise.all(ps);
    });
  }

  ['f200', 'fbal', 'fpyg'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      $(id + '-ok').textContent = this.files[0] ? '✓ ' + this.files[0].name : '';
    });
  });

  $('btn-analizar').addEventListener('click', function () {
    var f200 = $('f200').files[0], fbal = $('fbal').files[0], fpyg = $('fpyg').files[0];
    if (!fbal || !fpyg) { alert('Sube al menos el Balance y la PyG de 2025.'); return; }
    $('btn-analizar').disabled = true;
    $('estado-parse').textContent = 'Analizando PDFs…';
    var jobs = [pdfALineas(fbal), pdfALineas(fpyg), f200 ? pdfALineas(f200) : Promise.resolve(null)];
    Promise.all(jobs).then(function (res) {
      var bal = Parsers.parseContable(res[0]);
      var pyg = Parsers.parseContable(res[1]);
      var prev = res[2] ? Parsers.parseM200Previo(res[2]) : null;
      construirModelo(prev, bal, pyg);
      renderTodo();
      $('estado-parse').textContent = 'Análisis completado. Revisa y corrige el formulario.';
      $('paso2').style.display = 'block';
      $('paso2').scrollIntoView({ behavior: 'smooth' });
    }).catch(function (e) {
      console.error(e);
      $('estado-parse').textContent = 'Error analizando PDFs: ' + e.message;
    }).finally(function () { $('btn-analizar').disabled = false; });
  });

  function construirModelo(prev, bal, pyg) {
    var mb = Casillas.mapear(bal.cuentas, Casillas.MAP_BALANCE);
    var mp = Casillas.mapear(pyg.cuentas, Casillas.MAP_PYG);
    sinAsignarBal = mb.sinAsignar; sinAsignarPyg = mp.sinAsignar;
    var vBal = mb.casillas, vPyg = mp.casillas;
    var v = {}; Object.keys(vBal).forEach(function (c) { v[c] = vBal[c]; });
    Object.keys(vPyg).forEach(function (c) { v[c] = vPyg[c]; });
    Casillas.recalcular(v);
    model = {
      ejercicio: '2025',
      ident: { nif: (prev && prev.nif) || bal.nif || '', rs: (prev && prev.rs) || '',
               cnae: (prev && prev.cnae) || '', contactoNombre: '', contactoEmail: '', telefono: '' },
      caracteres: { erd: true, micro: true },
      estados: { balance: '2', pyg: '2' },
      admins: (prev && prev.admins) || [], socios: (prev && prev.socios) || [],
      titulares: (prev && prev.titulares) || [],
      secretario: (prev && prev.secretario) || { nombre: '', nif: '' },
      representantes: (prev && prev.representantes) || [],
      v: v,
      liq: { bins: 0, tipo: 'micro', tipoCustom: 21, retenciones: 0,
             pagos: [0, 0, 0], cuotaPrev: prev ? prev.cuotaLiquidaPrev : null },
      aplicacion: 'remanente',
    };
    if (model.liq.cuotaPrev) {
      var pf = r2(model.liq.cuotaPrev * 0.18);
      model.liq.pagos = [0, pf, pf];
    }
  }

  // ── render del formulario ──
  function inputHTML(id, val, cls) {
    return '<input id="' + id + '" class="' + (cls || '') + '" value="' + String(val == null ? '' : val).replace(/"/g, '&quot;') + '">';
  }

  function renderTodo() {
    var h = '';
    h += '<h3>Identificación</h3><div class="grid">';
    h += campo('i-nif', 'NIF', model.ident.nif) + campo('i-rs', 'Razón social', model.ident.rs);
    h += campo('i-cnae', 'CNAE-2025 (4 dígitos)', model.ident.cnae) + campo('i-tel', 'Teléfono', model.ident.telefono);
    h += campo('i-cnom', 'Persona de contacto', model.ident.contactoNombre) + campo('i-cmail', 'Email de contacto', model.ident.contactoEmail);
    h += '</div>';
    h += '<div class="grid"><label><input type="checkbox" id="c-erd" ' + (model.caracteres.erd ? 'checked' : '') + '> ERD [00006]</label>' +
         '<label><input type="checkbox" id="c-micro" ' + (model.caracteres.micro ? 'checked' : '') + '> Tipo reducido INCN&lt;1M [00088]</label>' +
         '<label>Estados: <select id="c-estados"><option value="2" selected>Abreviado</option><option value="3">PYMES</option><option value="1">Normal</option></select></label></div>';
    $('sec-ident').innerHTML = h;

    renderTabla('sec-admins', 'Administradores', model.admins,
      [['nif', 'NIF'], ['fj', 'F/J'], ['nombre', 'Apellidos y nombre / razón social']]);
    renderTabla('sec-socios', 'Socios (B.2)', model.socios,
      [['nif', 'NIF'], ['fj', 'F/J'], ['nombre', 'Nombre'], ['codProv', 'Cód. prov.'], ['nominal', 'Nominal €'], ['pct', '% partic.']]);
    renderTabla('sec-titulares', 'Titulares reales', model.titulares,
      [['nif', 'NIF'], ['nombre', 'Apellidos y nombre'], ['fnac', 'F. nacimiento (AAAAMMDD)']]);
    var hs = '<h3>Secretario y representantes legales</h3><div class="grid">' +
      campo('s-nom', 'Secretario (máx. 21 car.)', model.secretario.nombre) + campo('s-nif', 'NIF secretario', model.secretario.nif) + '</div>';
    $('sec-secretario').innerHTML = hs;
    renderTabla('sec-reps', 'Representantes (máx. 3)', model.representantes,
      [['nombre', 'Nombre'], ['nif', 'NIF'], ['fecha', 'F. poder (AAAAMMDD)'], ['notaria', 'Notaría (12 car.)']]);

    renderCasillas('sec-balance', 'Balance', Casillas.BALANCE);
    renderCasillas('sec-pyg', 'Cuenta de pérdidas y ganancias', Casillas.PYG);
    renderSinAsignar();
    renderLiq();
    comprobarYMostrar();
  }

  function campo(id, label, val) {
    return '<label>' + label + '<br>' + inputHTML(id, val) + '</label>';
  }

  function renderTabla(sec, titulo, rows, cols) {
    var h = '<h3>' + titulo + ' <button class="mini" data-add="' + sec + '">+ añadir</button></h3><table><tr>';
    cols.forEach(function (c) { h += '<th>' + c[1] + '</th>'; });
    h += '<th></th></tr>';
    rows.forEach(function (r, i) {
      h += '<tr>';
      cols.forEach(function (c) { h += '<td>' + inputHTML(sec + '-' + i + '-' + c[0], r[c[0]]) + '</td>'; });
      h += '<td><button class="mini" data-del="' + sec + ':' + i + '">×</button></td></tr>';
    });
    h += '</table>';
    $(sec).innerHTML = h;
    $(sec).dataset.cols = JSON.stringify(cols.map(function (c) { return c[0]; }));
  }

  function renderCasillas(sec, titulo, defs) {
    var h = '<h3>' + titulo + '</h3><table class="cas">';
    defs.forEach(function (d) {
      var v = model.v[d.c] || 0;
      var cls = d.t === 'H' ? 'hoja' : 'total';
      h += '<tr class="' + cls + '"><td class="cod">[' + d.c + ']</td><td>' + d.l + '</td><td class="imp">' +
        '<input data-cas="' + d.c + '" ' + (d.t !== 'H' ? 'readonly' : '') + ' value="' + (v ? eur(v) : '') + '"></td></tr>';
    });
    h += '</table>';
    $(sec).innerHTML = h;
  }

  function opcionesCasilla(defs) {
    return defs.filter(function (d) { return d.t === 'H'; })
      .map(function (d) { return '<option value="' + d.c + '">[' + d.c + '] ' + d.l + '</option>'; }).join('');
  }

  function renderSinAsignar() {
    var h = '';
    [['Balance', sinAsignarBal, Casillas.BALANCE], ['PyG', sinAsignarPyg, Casillas.PYG]].forEach(function (par) {
      if (!par[1].length) return;
      h += '<h3 class="warn">Cuentas de ' + par[0] + ' sin casilla asignada (' + par[1].length + ')</h3><table>';
      par[1].forEach(function (cta, i) {
        h += '<tr><td>' + cta.num + '</td><td>' + cta.nombre + '</td><td class="imp">' + eur(cta.importe) + '</td>' +
          '<td><select id="sa-' + par[0] + '-' + i + '"><option value="">— asignar a… —</option>' + opcionesCasilla(par[2]) + '</select></td></tr>';
      });
      h += '</table>';
    });
    h += h ? '<button id="btn-asignar">Aplicar asignaciones</button>' : '<p class="ok">Todas las cuentas quedaron asignadas a casillas.</p>';
    $('sec-sinasignar').innerHTML = h;
    var b = $('btn-asignar');
    if (b) b.addEventListener('click', function () {
      [['Balance', sinAsignarBal], ['PyG', sinAsignarPyg]].forEach(function (par) {
        for (var i = par[1].length - 1; i >= 0; i--) {
          var sel = $('sa-' + par[0] + '-' + i);
          if (sel && sel.value) {
            model.v[sel.value] = r2((model.v[sel.value] || 0) + par[1][i].importe);
            par[1].splice(i, 1);
          }
        }
      });
      recalc(); renderCasillas('sec-balance', 'Balance', Casillas.BALANCE);
      renderCasillas('sec-pyg', 'Cuenta de pérdidas y ganancias', Casillas.PYG);
      renderSinAsignar(); renderLiq(); comprobarYMostrar();
    });
  }

  function calcCuota(bi, liq) {
    if (bi <= 0) return { cuota: 0, tipoStr: liq.tipo === 'micro' ? '2100' : tipoStr4(liq) };
    if (liq.tipo === 'micro') {
      var c = r2(Math.min(bi, 50000) * 0.21 + Math.max(bi - 50000, 0) * 0.22);
      return { cuota: c, tipoStr: '2100' };
    }
    var pct = liq.tipo === 'custom' ? Number(liq.tipoCustom) : Number(liq.tipo);
    return { cuota: r2(bi * pct / 100), tipoStr: tipoStr4(liq) };
  }
  function tipoStr4(liq) {
    var pct = liq.tipo === 'custom' ? Number(liq.tipoCustom) : (liq.tipo === 'micro' ? 21 : Number(liq.tipo));
    return String(Math.round(pct * 100)).padStart(4, '0');
  }

  function renderLiq() {
    var rtdo = model.v['00500'] || 0;
    var biPrevia = rtdo; // + ajustes (no soportados aquí; hacerlos en Sociedades WEB)
    var bins = Math.min(Number(model.liq.bins) || 0, Math.max(biPrevia, 0));
    var bi = r2(biPrevia - bins);
    var cq = calcCuota(bi, model.liq);
    var ret = r2(model.liq.retenciones);
    var pagos = model.liq.pagos.map(r2);
    var resultado = r2(cq.cuota - ret - pagos[0] - pagos[1] - pagos[2]);
    model.liqCalc = { biPrevia: r2(biPrevia), bins: bins, bi: bi, cuota: cq.cuota, tipoStr: cq.tipoStr,
                      retenciones: ret, pagos: pagos, resultado: resultado };
    var h = '<h3>Liquidación</h3><table class="cas">';
    h += fila('Resultado contable [00500]', eur(rtdo));
    h += fila('BI previa [00550]', eur(biPrevia));
    h += '<tr><td colspan="2">Compensación BINs [00547]</td><td class="imp"><input id="l-bins" value="' + eur(bins) + '"></td></tr>';
    h += fila('Base imponible [00552]', eur(bi));
    h += '<tr><td colspan="2">Tipo de gravamen</td><td><select id="l-tipo">' +
      '<option value="micro"' + sel('micro') + '>Micro &lt;1M: 21%/22% (2025)</option>' +
      '<option value="24"' + sel('24') + '>ERD 24% (2025)</option>' +
      '<option value="25"' + sel('25') + '>General 25%</option>' +
      '<option value="15"' + sel('15') + '>Nueva creación 15%</option>' +
      '<option value="custom"' + sel('custom') + '>Otro…</option></select>' +
      (model.liq.tipo === 'custom' ? ' <input id="l-tipoc" style="width:4em" value="' + model.liq.tipoCustom + '">%' : '') + '</td></tr>';
    h += fila('Cuota íntegra [00562]', eur(cq.cuota));
    h += '<tr><td colspan="2">Retenciones e ingresos a cuenta</td><td class="imp"><input id="l-ret" value="' + eur(ret) + '"></td></tr>';
    ['1er', '2º', '3er'].forEach(function (t, i) {
      h += '<tr><td colspan="2">' + t + ' pago fraccionado</td><td class="imp"><input id="l-p' + i + '" value="' + eur(pagos[i]) + '"></td></tr>';
    });
    if (model.liq.cuotaPrev != null) {
      h += '<tr><td colspan="3" class="nota">Sugerencia 2P/3P = 18% de la cuota líquida ' + (Number(model.ejercicio) - 1) + ' (' + eur(model.liq.cuotaPrev) + ') = ' + eur(r2(model.liq.cuotaPrev * 0.18)) + '. Confírmalo con los 202 presentados.</td></tr>';
    }
    h += fila('<b>Resultado [00621]</b>', '<b>' + eur(resultado) + (resultado > 0 ? ' a ingresar' : (resultado < 0 ? ' a devolver' : '')) + '</b>');
    h += '<tr><td colspan="2">Aplicación del resultado</td><td><select id="l-apl">' +
      '<option value="remanente"' + (model.aplicacion === 'remanente' ? ' selected' : '') + '>A remanente</option>' +
      '<option value="reservas"' + (model.aplicacion === 'reservas' ? ' selected' : '') + '>A reservas voluntarias</option></select></td></tr>';
    h += '</table>';
    $('sec-liq').innerHTML = h;
    function fila(a, b) { return '<tr><td colspan="2">' + a + '</td><td class="imp">' + b + '</td></tr>'; }
    function sel(vv) { return model.liq.tipo === vv ? ' selected' : ''; }
    ['l-bins', 'l-ret', 'l-p0', 'l-p1', 'l-p2'].forEach(function (id) {
      $(id).addEventListener('change', leerLiq);
    });
    $('l-tipo').addEventListener('change', leerLiq);
    var tc = $('l-tipoc'); if (tc) tc.addEventListener('change', leerLiq);
    $('l-apl').addEventListener('change', function () { model.aplicacion = this.value; });
  }

  function leerLiq() {
    model.liq.bins = parseNum($('l-bins').value);
    model.liq.retenciones = parseNum($('l-ret').value);
    model.liq.pagos = [parseNum($('l-p0').value), parseNum($('l-p1').value), parseNum($('l-p2').value)];
    model.liq.tipo = $('l-tipo').value;
    var tc = $('l-tipoc'); if (tc) model.liq.tipoCustom = parseNum(tc.value);
    renderLiq(); comprobarYMostrar();
  }

  function recalc() { Casillas.recalcular(model.v); }

  function comprobarYMostrar() {
    var errs = Casillas.comprobar(model.v);
    if (!model.ident.nif) errs.push('Falta el NIF de la entidad');
    if (!model.ident.rs) errs.push('Falta la razón social');
    if (!model.admins.length) errs.push('Añade al menos un administrador');
    if (!model.socios.length) errs.push('Añade al menos un socio (B.2 — obligatorio en SL)');
    if (!model.titulares.length) errs.push('Añade al menos un titular real');
    if (sinAsignarBal.length + sinAsignarPyg.length) errs.push('Quedan cuentas sin asignar a casilla');
    var bi = model.liqCalc ? model.liqCalc.bi : 0;
    if (model.liq.tipo === 'micro' && bi > 50000) errs.push('BI > 50.000 con escala micro: la casilla [00558] llevará 21,00; revisa la cuota en Sociedades WEB (tramo 22%)');
    var h = errs.length ? '<ul class="err"><li>' + errs.map(esc).join('</li><li>') + '</li></ul>'
                        : '<p class="ok">Sin errores de cuadre ✓</p>';
    $('sec-checks').innerHTML = h;
    $('btn-generar').disabled = errs.filter(function (e) { return !/00558/.test(e); }).length > 0;
    function esc(s) { return s; }
  }

  // ── edición en vivo ──
  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.dataset && t.dataset.cas) {
      model.v[t.dataset.cas] = parseNum(t.value);
      recalc();
      renderCasillas('sec-balance', 'Balance', Casillas.BALANCE);
      renderCasillas('sec-pyg', 'Cuenta de pérdidas y ganancias', Casillas.PYG);
      renderLiq(); comprobarYMostrar();
    }
    if (/^i-|^s-/.test(t.id)) {
      model.ident.nif = $('i-nif').value.trim().toUpperCase();
      model.ident.rs = $('i-rs').value.trim();
      model.ident.cnae = $('i-cnae').value.trim();
      model.ident.telefono = $('i-tel').value.trim();
      model.ident.contactoNombre = $('i-cnom').value.trim();
      model.ident.contactoEmail = $('i-cmail').value.trim();
      model.secretario = { nombre: $('s-nom').value.trim(), nif: $('s-nif').value.trim() };
      comprobarYMostrar();
    }
    if (t.id === 'c-erd') model.caracteres.erd = t.checked;
    if (t.id === 'c-micro') model.caracteres.micro = t.checked;
    if (t.id === 'c-estados') model.estados = { balance: t.value, pyg: t.value };
    var m = /^(sec-\w+)-(\d+)-(\w+)$/.exec(t.id);
    if (m) {
      var arr = { 'sec-admins': model.admins, 'sec-socios': model.socios,
                  'sec-titulares': model.titulares, 'sec-reps': model.representantes }[m[1]];
      if (arr && arr[m[2]]) {
        arr[m[2]][m[3]] = /nominal|pct/.test(m[3]) ? parseNum(t.value) : t.value.trim();
        comprobarYMostrar();
      }
    }
  });

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.dataset && t.dataset.add) {
      var sec = t.dataset.add;
      var arr = { 'sec-admins': model.admins, 'sec-socios': model.socios,
                  'sec-titulares': model.titulares, 'sec-reps': model.representantes }[sec];
      var cols = JSON.parse($(sec).dataset.cols);
      var nuevo = {}; cols.forEach(function (c) { nuevo[c] = ''; });
      arr.push(nuevo);
      renderTabla(sec, t.parentNode.firstChild.textContent || sec, arr, cols.map(function (c) { return [c, c]; }));
      renderTodo();
    }
    if (t.dataset && t.dataset.del) {
      var p = t.dataset.del.split(':');
      var arr2 = { 'sec-admins': model.admins, 'sec-socios': model.socios,
                   'sec-titulares': model.titulares, 'sec-reps': model.representantes }[p[0]];
      arr2.splice(Number(p[1]), 1);
      renderTodo();
    }
  });

  // ── generación ──
  $('btn-generar').addEventListener('click', function () {
    try {
      recalc();
      var lc = model.liqCalc;
      var d = {
        dr: dr, ejercicio: model.ejercicio,
        ident: model.ident, caracteres: {
          erd: model.caracteres.erd, micro: model.caracteres.micro,
          biNegativa: lc.bi <= 0,
        },
        estados: model.estados, personalFijo: 0, personalNoFijo: 0,
        admins: model.admins, socios: model.socios, titulares: model.titulares,
        secretario: model.secretario, representantes: model.representantes,
        balance: {}, pyg: {},
        liq: { biPrevia: lc.biPrevia, bins: lc.bins, bi: lc.bi, tipoStr: lc.tipoStr,
               cuota: lc.cuota, retenciones: lc.retenciones, pagos: lc.pagos,
               resultado: lc.resultado, correccISAumentos: 0, correccISDisminuciones: 0 },
        aplicacion: model.aplicacion,
      };
      var PYG_SET = {};
      Casillas.PYG.forEach(function (x) { PYG_SET[x.c] = 1; });
      Object.keys(Casillas.FIN_AUTO).forEach(function (p) {
        Casillas.FIN_AUTO[p].forEach(function (hh) { PYG_SET[hh] = 1; });
      });
      Object.keys(model.v).forEach(function (c) {
        if (!model.v[c]) return;
        if (PYG_SET[c]) d.pyg[c] = model.v[c]; else d.balance[c] = model.v[c];
      });
      var out = Montador.generar(d);
      var bytes = new Uint8Array(out.content.length);
      for (var i = 0; i < out.content.length; i++) {
        var code = out.content.charCodeAt(i);
        bytes[i] = code < 256 ? code : 63;
      }
      var blob = new Blob([bytes], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = out.nombre;
      a.click();
      $('sec-resultado').innerHTML = '<p class="ok">Generado <b>' + out.nombre + '</b> (' + out.content.length +
        ' bytes, ' + out.paginas.length + ' registros). Impórtalo primero en <b>Sociedades WEB Open</b> (simulador); ' +
        'como colaborador social, el botón Importar está en la primera ventana de datos identificativos.</p>';
    } catch (e) {
      console.error(e);
      $('sec-resultado').innerHTML = '<p class="err">Error generando: ' + e.message + '</p>';
    }
  });
})();
