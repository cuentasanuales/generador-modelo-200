/* casillas.js — catálogo de casillas (modelo Abreviado/PYMES), mapeo PGC→casilla,
   estructura de totales y comprobaciones de cuadre. UMD. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Casillas = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── Catálogo visible en el formulario (orden de presentación) ──
  // t: 'T' total calculado, 'S' subtotal calculado, 'H' hoja editable
  var BALANCE = [
    { c: '00101', l: 'ACTIVO NO CORRIENTE', t: 'T' },
    { c: '00102', l: 'Inmovilizado intangible', t: 'S' },
    { c: '00110', l: '· Intangible: resto', t: 'H' },
    { c: '00111', l: 'Inmovilizado material', t: 'H' },
    { c: '00115', l: 'Inversiones inmobiliarias', t: 'H' },
    { c: '00118', l: 'Inversiones grupo y asociadas l/p', t: 'S' },
    { c: '00119', l: '· Grupo l/p: instrumentos de patrimonio', t: 'H' },
    { c: '00125', l: '· Grupo l/p: resto', t: 'H' },
    { c: '00126', l: 'Inversiones financieras a largo plazo', t: 'S' },
    { c: '00127', l: '· IF l/p: instrumentos de patrimonio', t: 'H' },
    { c: '00133', l: '· IF l/p: resto', t: 'H' },
    { c: '00134', l: 'Activos por impuesto diferido', t: 'H' },
    { c: '00136', l: 'ACTIVO CORRIENTE', t: 'T' },
    { c: '00138', l: 'Existencias', t: 'H' },
    { c: '00149', l: 'Deudores comerciales y otras cuentas a cobrar', t: 'S' },
    { c: '00150', l: '· Clientes por ventas y prestaciones', t: 'H', eq: '00152' },
    { c: '00152', l: '· Clientes a corto plazo (= anterior)', t: 'H' },
    { c: '00153', l: '· Clientes grupo y asociadas', t: 'H' },
    { c: '00159', l: '· Otros deudores', t: 'H' },
    { c: '00160', l: 'Inversiones grupo y asociadas c/p', t: 'S' },
    { c: '00161', l: '· Grupo c/p: instrumentos de patrimonio', t: 'H' },
    { c: '00167', l: '· Grupo c/p: resto', t: 'H' },
    { c: '00168', l: 'Inversiones financieras a corto plazo', t: 'S' },
    { c: '00169', l: '· IF c/p: instrumentos de patrimonio', t: 'H' },
    { c: '00175', l: '· IF c/p: resto', t: 'H' },
    { c: '00176', l: 'Periodificaciones a corto plazo', t: 'H' },
    { c: '00177', l: 'Efectivo y otros activos líquidos', t: 'H' },
    { c: '00180', l: 'TOTAL ACTIVO', t: 'T' },
    { c: '00185', l: 'PATRIMONIO NETO', t: 'T' },
    { c: '00186', l: 'Fondos propios', t: 'S' },
    { c: '00187', l: 'Capital', t: 'S', eqc: '00188' },
    { c: '00188', l: '· Capital escriturado', t: 'H' },
    { c: '00190', l: 'Prima de emisión', t: 'H' },
    { c: '00191', l: 'Reservas', t: 'S' },
    { c: '00193', l: '· Otras reservas', t: 'H' },
    { c: '01001', l: '· Reserva de capitalización', t: 'H' },
    { c: '01002', l: '· Reserva de nivelación', t: 'H' },
    { c: '00195', l: 'Resultados de ejercicios anteriores (neto)', t: 'H' },
    { c: '00198', l: 'Otras aportaciones de socios', t: 'H' },
    { c: '00199', l: 'Resultado del ejercicio', t: 'H' },
    { c: '00209', l: 'Subvenciones, donaciones y legados', t: 'H' },
    { c: '00210', l: 'PASIVO NO CORRIENTE', t: 'T' },
    { c: '00211', l: 'Provisiones a largo plazo', t: 'H' },
    { c: '00216', l: 'Deudas a largo plazo', t: 'S' },
    { c: '00218', l: '· Deudas l/p con entidades de crédito', t: 'H' },
    { c: '00222', l: '· Otras deudas a largo plazo', t: 'H' },
    { c: '00223', l: 'Deudas grupo y asociadas l/p', t: 'H' },
    { c: '00224', l: 'Pasivos por impuesto diferido', t: 'H' },
    { c: '00225', l: 'Periodificaciones a largo plazo', t: 'H' },
    { c: '00228', l: 'PASIVO CORRIENTE', t: 'T' },
    { c: '00230', l: 'Provisiones a corto plazo', t: 'H' },
    { c: '00231', l: 'Deudas a corto plazo', t: 'S' },
    { c: '00233', l: '· Deudas c/p con entidades de crédito', t: 'H' },
    { c: '00237', l: '· Otras deudas a corto plazo', t: 'H' },
    { c: '00238', l: 'Deudas grupo y asociadas c/p', t: 'H' },
    { c: '00239', l: 'Acreedores comerciales y otras ctas. a pagar', t: 'S' },
    { c: '00240', l: '· Proveedores', t: 'H', eq: '00242' },
    { c: '00242', l: '· Proveedores a corto plazo (= anterior)', t: 'H' },
    { c: '00249', l: '· Otros acreedores', t: 'H' },
    { c: '00250', l: 'Periodificaciones a corto plazo (pasivo)', t: 'H' },
    { c: '00252', l: 'TOTAL PATRIMONIO NETO Y PASIVO', t: 'T' },
  ];

  var PYG = [
    { c: '00255', l: 'Importe neto de la cifra de negocios', t: 'H' },
    { c: '00258', l: 'Variación de existencias de productos', t: 'H' },
    { c: '00259', l: 'Trabajos realizados por la empresa para su activo', t: 'H' },
    { c: '00260', l: 'Aprovisionamientos', t: 'S' },
    { c: '00261', l: '· Consumo de mercaderías', t: 'H', eq: '00760' },
    { c: '00760', l: '· Compras de mercaderías (= anterior)', t: 'H' },
    { c: '00262', l: '· Consumo mat. primas y otras', t: 'H', eq: '00762' },
    { c: '00762', l: '· Compras mat. primas (= anterior)', t: 'H' },
    { c: '00263', l: '· Trabajos realizados por otras empresas', t: 'H' },
    { c: '00265', l: 'Otros ingresos de explotación', t: 'S' },
    { c: '00266', l: '· Ingresos accesorios', t: 'H', eq: '00268' },
    { c: '00268', l: '· Ingresos accesorios: resto (= anterior)', t: 'H' },
    { c: '00267', l: '· Subvenciones de explotación', t: 'H' },
    { c: '00270', l: 'Gastos de personal', t: 'S' },
    { c: '00271', l: '· Sueldos, salarios y asimilados', t: 'H' },
    { c: '00273', l: '· Indemnizaciones', t: 'H' },
    { c: '00274', l: '· Seguridad Social a cargo de la empresa', t: 'H' },
    { c: '00277', l: '· Otros gastos sociales', t: 'H' },
    { c: '00279', l: 'Otros gastos de explotación', t: 'S' },
    { c: '00280', l: '· Servicios exteriores', t: 'S' },
    { c: '00253', l: '·· Servicios profesionales independientes', t: 'H' },
    { c: '00254', l: '·· Servicios exteriores: resto', t: 'H' },
    { c: '00281', l: '· Tributos', t: 'H' },
    { c: '00282', l: '· Pérdidas y deterioro operaciones comerciales', t: 'H' },
    { c: '00283', l: '· Otros gastos de gestión corriente', t: 'H' },
    { c: '00284', l: 'Amortización del inmovilizado', t: 'H' },
    { c: '00286', l: 'Excesos de provisiones', t: 'H' },
    { c: '00295', l: 'Otros resultados', t: 'H' },
    { c: '00296', l: 'RESULTADO DE EXPLOTACIÓN', t: 'T' },
    { c: '00297', l: 'Ingresos financieros', t: 'H' },
    { c: '00305', l: 'Gastos financieros', t: 'H' },
    { c: '00309', l: 'Variación valor razonable instr. financieros (663/763)', t: 'H' },
    { c: '00312', l: 'Diferencias de cambio', t: 'H' },
    { c: '00324', l: 'RESULTADO FINANCIERO', t: 'T' },
    { c: '00325', l: 'RESULTADO ANTES DE IMPUESTOS', t: 'T' },
    { c: '00326', l: 'Impuestos sobre beneficios', t: 'H' },
    { c: '00327', l: 'RESULTADO OPERACIONES CONTINUADAS', t: 'T' },
    { c: '00500', l: 'RESULTADO DE LA CUENTA DE PYG', t: 'T' },
  ];

  // ── Totales: cómo se recalculan (de abajo arriba, en este orden) ──
  var SUMAS = [
    ['00102', ['00110']],
    ['00118', ['00119', '00125']],
    ['00126', ['00127', '00133']],
    ['00101', ['00102', '00111', '00115', '00118', '00126', '00134']],
    ['00149', ['00150', '00153', '00159']],
    ['00160', ['00161', '00167']],
    ['00168', ['00169', '00175']],
    ['00136', ['00138', '00149', '00160', '00168', '00176', '00177']],
    ['00180', ['00101', '00136']],
    ['00187', ['00188']],
    ['00191', ['00193', '01001', '01002']],
    ['00186', ['00187', '00190', '00191', '00195', '00198', '00199']],
    ['00185', ['00186', '00209']],
    ['00216', ['00218', '00222']],
    ['00210', ['00211', '00216', '00223', '00224', '00225']],
    ['00231', ['00233', '00237']],
    ['00239', ['00240', '00249']],
    ['00228', ['00230', '00231', '00238', '00239', '00250']],
    ['00252', ['00185', '00210', '00228']],
    // PyG
    ['00260', ['00261', '00262', '00263']],
    ['00265', ['00266', '00267']],
    ['00270', ['00271', '00273', '00274', '00277']],
    ['00280', ['00253', '00254']],
    ['00279', ['00280', '00281', '00282', '00283']],
    ['00296', ['00255', '00258', '00259', '00260', '00265', '00270', '00279', '00284', '00286', '00295']],
    ['00324', ['00297', '00305', '00309', '00312']],
    ['00325', ['00296', '00324']],
    ['00327', ['00325', '00326']],
    ['00500', ['00327']],
  ];

  // casillas espejo: al recalcular se igualan (hijo técnico = padre)
  var ESPEJOS = [['00152', '00150'], ['00242', '00240'], ['00760', '00261'],
                 ['00762', '00262'], ['00268', '00266']];

  // hijos técnicos de página 8 que Sociedades WEB espera junto al padre
  var FIN_AUTO = { '00297': ['00301', '00303'], '00305': ['00307'] };

  // ── Mapeo PGC → casillas (prefijo más largo gana). Valores con su signo natural. ──
  var MAP_BALANCE = {
    '200': ['00110'], '201': ['00110'], '202': ['00110'], '203': ['00110'], '204': ['00110'],
    '205': ['00110'], '206': ['00110'], '209': ['00110'], '280': ['00110'], '290': ['00110'],
    '21': ['00111'], '23': ['00111'], '281': ['00111'], '291': ['00111'],
    '22': ['00115'], '282': ['00115'], '292': ['00115'],
    '2403': ['00119'], '2404': ['00119'], '240': ['00119'], '241': ['00119', '00125'],
    '2423': ['00125'], '2424': ['00125'],
    '2425': ['00133'], '242': ['00125'], '249': ['00125'], '293': ['00125'],
    '250': ['00127'], '251': ['00133'], '252': ['00133'], '253': ['00133'], '254': ['00133'],
    '257': ['00133'], '258': ['00133'], '259': ['00127'], '26': ['00133'],
    '2963': ['00125'], '297': ['00133'], '298': ['00133'],
    '474': ['00134'],
    '30': ['00138'], '31': ['00138'], '32': ['00138'], '33': ['00138'], '34': ['00138'],
    '35': ['00138'], '36': ['00138'], '39': ['00138'], '407': ['00138'],
    '430': ['00150'], '431': ['00150'], '435': ['00150'], '436': ['00150'], '490': ['00150'],
    '432': ['00153'], '433': ['00153'], '434': ['00153'],
    '44': ['00159'], '460': ['00159'], '470': ['00159'], '471': ['00159'], '472': ['00159'],
    '473': ['00159'], '5580': ['00159'],
    '530': ['00161'], '531': ['00161'], '532': ['00167'], '533': ['00167'], '534': ['00167'],
    '535': ['00167'], '536': ['00167'], '537': ['00167'], '538': ['00167'], '539': ['00167'],
    '5303': ['00161'], '5304': ['00161'],
    '540': ['00169'], '541': ['00175'], '542': ['00175'], '543': ['00175'], '544': ['00175'],
    '545': ['00175'], '546': ['00175'], '547': ['00175'], '548': ['00175'], '549': ['00169'],
    '565': ['00175'], '566': ['00175'], '59': ['00175'],
    '480': ['00176'], '567': ['00176'],
    '57': ['00177'],
    '100': ['00188'], '101': ['00188'], '102': ['00188'],
    '110': ['00190'],
    '112': ['00193'], '113': ['00193'], '114': ['00193'], '115': ['00193'], '119': ['00193'],
    '1140': ['01002'], '1145': ['01001'],
    '118': ['00198'],
    '120': ['00195'], '121': ['00195'],
    '129': ['00199'],
    '130': ['00209'], '131': ['00209'], '132': ['00209'],
    '14': ['00211'],
    '160': ['00223'], '161': ['00223'], '162': ['00223'], '163': ['00223'], '164': ['00223'], '165': ['00223'],
    '170': ['00218'], '171': ['00222'], '172': ['00222'], '173': ['00222'], '174': ['00222'],
    '175': ['00222'], '176': ['00222'], '177': ['00222'], '179': ['00222'], '18': ['00222'],
    '479': ['00224'],
    '181': ['00225'], '485': ['00225'], '568': ['00225'],
    '499': ['00230'], '529': ['00230'],
    '520': ['00233'], '5200': ['00233'], '5201': ['00233'], '527': ['00233'],
    '500': ['00237'], '505': ['00237'], '506': ['00237'], '509': ['00237'],
    '521': ['00237'], '522': ['00237'], '523': ['00237'], '525': ['00237'], '526': ['00237'],
    '528': ['00237'], '551': ['00237'], '5525': ['00237'], '5530': ['00237'], '555': ['00237'],
    '560': ['00237'], '561': ['00237'], '569': ['00237'],
    '51': ['00238'], '5103': ['00238'], '5133': ['00238'], '5143': ['00238'], '524': ['00238'],
    '400': ['00240'], '401': ['00240'], '403': ['00240'], '404': ['00240'], '405': ['00240'], '406': ['00240'],
    '41': ['00249'], '438': ['00249'], '465': ['00249'], '466': ['00249'],
    '475': ['00249'], '476': ['00249'], '477': ['00249'],
    '4750': ['00249'], '4751': ['00249'], '4752': ['00249'], '4758': ['00249'],
    '585': ['00250'], '485p': ['00250'],
  };

  var MAP_PYG = {
    '700': ['00255'], '701': ['00255'], '702': ['00255'], '703': ['00255'], '704': ['00255'],
    '705': ['00255'], '706': ['00255'], '708': ['00255'], '709': ['00255'],
    '71': ['00258'],
    '73': ['00259'],
    '600': ['00261'], '6060': ['00261'], '6080': ['00261'], '6090': ['00261'], '610': ['00261'],
    '601': ['00262'], '602': ['00262'], '611': ['00262'], '612': ['00262'],
    '6061': ['00262'], '6062': ['00262'], '6081': ['00262'], '6082': ['00262'],
    '6091': ['00262'], '6092': ['00262'],
    '607': ['00263'],
    '740': ['00267'], '747': ['00267'],
    '75': ['00266'],
    '640': ['00271'], '641': ['00271'], '6450': ['00271'],
    '6410': ['00273'],
    '642': ['00274'], '649': ['00277'], '643': ['00277'], '644': ['00277'], '645': ['00277'],
    '623': ['00253'],
    '620': ['00254'], '621': ['00254'], '622': ['00254'], '624': ['00254'], '625': ['00254'],
    '626': ['00254'], '627': ['00254'], '628': ['00254'], '629': ['00254'],
    '631': ['00281'], '634': ['00281'], '636': ['00281'], '639': ['00281'],
    '650': ['00283'], '651': ['00283'], '659': ['00283'],
    '694': ['00282'], '695': ['00282'], '794': ['00282'], '7954': ['00282'],
    '68': ['00284'],
    '7951': ['00286'], '7952': ['00286'], '7955': ['00286'], '7956': ['00286'],
    '678': ['00295'], '778': ['00295'],
    '76': ['00297'],
    '66': ['00305'],
    '663': ['00309'], '763': ['00309'],
    '668': ['00312'], '768': ['00312'],
    '630': ['00326'], '633': ['00326'], '638': ['00326'],
    '129': [],
  };


  // ── Mapeo por epígrafes (informes sin números de cuenta) ──
  // [regex sobre etiqueta normalizada (minúsculas sin acentos), destino, sección opcional]
  // destino: casilla '000xx' o bucket '@XXX' (subtotal que solo se usa si no hay hijos)
  var EPIG_SKIP = [
    /^[a-d]\)?\s*\)?\s*(activo no corriente|activo corriente|pasivo no corriente|pasivo corriente|patrimonio neto)/,
    /^(activo no corriente|activo corriente|pasivo no corriente|pasivo corriente|patrimonio neto)/,
    /total/, /fondos propios/, /^activo\b/, /^pasivo\b/,
    /resultado de explotacion/, /resultado financiero/, /resultado antes de impuestos/,
    /cuenta de perdidas/, /imputacion de subvenciones/, /deterioro y resultado por enajenaciones/,
    /^resultado del ejercicio/,
  ];
  var EPIG_BALANCE = [
    [/inmovilizado intangible|fondo de comercio/, '00110'],
    [/inmovilizado material|inversiones? en curso/, '00111'],
    [/inversiones inmobiliarias/, '00115'],
    [/(inversiones|creditos).*grupo.*largo|grupo y asociadas a largo/, '00125', 'activo'],
    [/inversiones financieras a largo/, '00133'],
    [/activos por impuesto diferido/, '00134'],
    [/existencias/, '00138'],
    [/clientes/, '00150'],
    [/otros deudores/, '00159'],
    [/administraciones publicas/, '00159', 'activo'],
    [/administraciones publicas/, '00249', 'pasivo'],
    [/deudores comerciales/, '@DEU'],
    [/(inversiones|creditos).*grupo.*corto/, '00167', 'activo'],
    [/inversiones financieras a corto/, '00175'],
    [/periodificaciones/, '00176', 'activo'],
    [/periodificaciones/, '00250', 'pasivo'],
    [/efectivo|tesoreria/, '00177'],
    [/prima de emision/, '00190'],
    [/reserva de capitalizacion/, '01001'],
    [/reserva de nivelacion/, '01002'],
    [/reserva/, '00193'],
    [/resultados? (de ejercicios anteriores|negativos)|remanente/, '00195'],
    [/aportaciones de socios/, '00198'],
    [/resultado del ejercicio/, '00199'],
    [/subvenciones/, '00209'],
    [/capital/, '00188'],
    [/provisiones a corto/, '00230'],
    [/provisiones/, '00211', 'pasivo'],
    [/deudas.*grupo.*largo/, '00223'],
    [/deudas a largo.*entidades de credito|entidades de credito.*largo/, '00218'],
    [/deudas a largo/, '00222'],
    [/pasivos por impuesto diferido/, '00224'],
    [/deudas.*grupo.*corto/, '00238'],
    [/deudas a corto.*entidades de credito|entidades de credito.*corto/, '00233'],
    [/deudas a corto/, '00237'],
    [/proveedores/, '00240'],
    [/acreedores varios|otros acreedores/, '00249'],
    [/acreedores comerciales/, '@ACR'],
  ];
  var EPIG_PYG = [
    [/cifra de negocios/, '00255'],
    [/variacion de existencias/, '00258'],
    [/trabajos realizados por la empresa/, '00259'],
    [/consumo de mercaderias/, '00261'],
    [/consumo de materias/, '00262'],
    [/trabajos realizados por otras/, '00263'],
    [/aprovisionamientos/, '@APR'],
    [/subvenciones de explotacion/, '00267'],
    [/otros ingresos de explotacion|ingresos accesorios/, '00266'],
    [/sueldos|salarios/, '00271'],
    [/indemnizaciones/, '00273'],
    [/seguridad social|cargas sociales/, '00274'],
    [/servicios profesionales/, '00253'],
    [/servicios exteriores/, '00254'],
    [/tributos/, '00281'],
    [/perdidas.*deterioro.*comerciales/, '00282'],
    [/otros gastos de gestion/, '00283'],
    [/otros gastos de explotacion/, '@OGE'],
    [/amortizacion/, '00284'],
    [/excesos de provisiones/, '00286'],
    [/otros resultados/, '00295'],
    [/ingresos financieros/, '00297'],
    [/variacion de valor razonable|cartera de negociacion/, '00309'],
    [/gastos financieros/, '00305'],
    [/diferencias de cambio/, '00312'],
    [/impuestos sobre beneficios/, '00326'],
  ];
  var BUCKETS = { '@DEU': ['00150', '00153', '00159', '00159'],
                  '@ACR': ['00240', '00249', '00249'],
                  '@APR': ['00261', '00262', '00263', '00262'],
                  '@GP':  ['00271', '00273', '00274', '00277', '00271'],
                  '@OGE': ['00253', '00254', '00281', '00282', '00283', '00254'] };

  function normLbl(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function mapearEpigrafes(epigrafes, tipo) {
    var reglas = tipo === 'balance' ? EPIG_BALANCE : EPIG_PYG;
    var casillas = {}, sinAsignar = [], buckets = {};
    epigrafes.forEach(function (e) {
      if (!e.importe) return;
      var lbl = normLbl(e.label).replace(/^[ivxabcd0-9]+[.)\-]\s*/g, '').trim();
      var dest = null;
      for (var i = 0; i < reglas.length && !dest; i++) {
        var r = reglas[i];
        if (r[2] && r[2] !== e.seccion) continue;
        if (r[0].test(lbl)) dest = r[1];
      }
      if (!dest) {
        var skip = EPIG_SKIP.some(function (rx) { return rx.test(lbl); });
        if (!skip) sinAsignar.push({ num: '', nombre: e.label, importe: e.importe });
        return;
      }
      if (dest[0] === '@') { buckets[dest] = Math.round(((buckets[dest] || 0) + e.importe) * 100) / 100; return; }
      casillas[dest] = Math.round(((casillas[dest] || 0) + e.importe) * 100) / 100;
    });
    Object.keys(buckets).forEach(function (b) {
      var def = BUCKETS[b], hijos = def.slice(0, -1), fallback = def[def.length - 1];
      var hayHijos = hijos.some(function (c) { return casillas[c]; });
      if (!hayHijos) casillas[fallback] = Math.round(((casillas[fallback] || 0) + buckets[b]) * 100) / 100;
    });
    return { casillas: casillas, sinAsignar: sinAsignar };
  }

  function mapearDocumento(doc, tipo) {
    if (doc.modo === 'cuentas') return mapear(doc.cuentas, tipo === 'balance' ? MAP_BALANCE : MAP_PYG);
    return mapearEpigrafes(doc.epigrafes || [], tipo);
  }

  function mapear(cuentas, mapa) {
    var casillas = {}, sinAsignar = [];
    cuentas.forEach(function (cta) {
      var num = cta.num, dest = null;
      for (var len = Math.min(4, num.length); len >= 2 && !dest; len--) {
        var pref = num.slice(0, len);
        if (pref in mapa) dest = mapa[pref];
      }
      if (dest === null) { sinAsignar.push(cta); return; }
      dest.forEach(function (c) { casillas[c] = Math.round(((casillas[c] || 0) + cta.importe) * 100) / 100; });
    });
    return { casillas: casillas, sinAsignar: sinAsignar };
  }

  function recalcular(v) { // v: dict casilla->importe (se modifica)
    ESPEJOS.forEach(function (par) { v[par[0]] = v[par[1]] || 0; });
    SUMAS.forEach(function (s) {
      var tot = 0;
      s[1].forEach(function (c) { tot += v[c] || 0; });
      v[s[0]] = Math.round(tot * 100) / 100;
    });
    Object.keys(FIN_AUTO).forEach(function (padre) {
      FIN_AUTO[padre].forEach(function (h) { v[h] = v[padre] || 0; });
    });
    return v;
  }

  function comprobar(v) {
    var errs = [];
    function g(c) { return Math.round((v[c] || 0) * 100); }
    if (g('00180') !== g('00101') + g('00136')) errs.push('Total activo [00180] ≠ ANC + AC');
    if (g('00252') !== g('00185') + g('00210') + g('00228')) errs.push('Total PN y pasivo [00252] ≠ PN + PNC + PC');
    if (g('00180') !== g('00252')) errs.push('Activo [00180] ≠ PN y pasivo [00252]: descuadre de ' + ((g('00180') - g('00252')) / 100).toFixed(2) + ' €');
    if (g('00199') !== g('00500')) errs.push('Resultado en balance [00199] ≠ resultado PyG [00500]');
    return errs;
  }

  return { BALANCE: BALANCE, PYG: PYG, SUMAS: SUMAS, MAP_BALANCE: MAP_BALANCE, MAP_PYG: MAP_PYG,
           mapear: mapear, mapearEpigrafes: mapearEpigrafes, mapearDocumento: mapearDocumento,
           recalcular: recalcular, comprobar: comprobar, FIN_AUTO: FIN_AUTO };
}));
