/* gen200.js — puerto JS de generar_200.py (motor del fichero .200 formato BOE AEAT)
   Compatible navegador + Node (UMD). Genera salida byte-idéntica al motor Python. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Gen200 = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function rmacc(s) {
    return String(s).normalize('NFD').replace(/\p{M}/gu, '');
  }

  function money(x) {
    var cents = Math.round(Math.abs(x) * 100);
    if (x < 0) return 'N' + String(cents).padStart(16, '0');
    return String(cents).padStart(17, '0');
  }

  function num2(x, lon) { // numérico sin signo con 2 decimales implícitos
    var v = Math.round(x * 100);
    var s = String(v).padStart(lon, '0');
    if (s.length !== lon) throw new Error('num overflow: ' + x + ' en ' + lon);
    return s;
  }

  function DR(json) { this.sheets = json; }
  DR.prototype.fields = function (sheet) {
    if (!this.sheets[sheet]) throw new Error('Hoja desconocida: ' + sheet);
    return this.sheets[sheet];
  };
  DR.prototype.find = function (sheet, key) {
    var fs = this.fields(sheet), hits;
    if (typeof key === 'number') hits = fs.filter(function (f) { return f.n === key; });
    else hits = fs.filter(function (f) { return f.desc.indexOf(key) !== -1; });
    if (hits.length !== 1) {
      throw new Error(sheet + ': clave ' + key + ' -> ' + hits.length + ' coincidencias: ' +
        hits.slice(0, 5).map(function (h) { return h.desc.slice(0, 80); }).join(' /// '));
    }
    return hits[0];
  };

  function PageBuilder(dr, sheet) {
    this.dr = dr;
    this.sheet = sheet;
    var fs = dr.fields(sheet);
    this.total = Math.max.apply(null, fs.map(function (f) { return f.pos + f.lon - 1; }));
    this.buf = new Array(this.total).fill(' ');
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], cont = f.cont || '', desc = f.desc || '', tipo = f.tipo;
      var m = /[Cc]onstante\s*"?([^"\n]+)"?/.exec(cont) || /^(<\/T200\w+>)\s*$/.exec(cont);
      if (m && (cont.indexOf('Constante') !== -1 || cont.slice(0, 3) === '</T')) {
        var val = m[1].trim().replace(/^"+|"+$/g, '');
        if (val[0] === '<') this.put(f, val);
        else if (cont.indexOf('Constante') !== -1 && val.length === f.lon) this.put(f, val);
      }
      if ((tipo === 'N' || tipo === 'Num') && desc.toUpperCase().indexOf('RESERVADO') === -1) {
        this.put(f, '0'.repeat(f.lon));
      }
    }
    var page = this.dr.find(sheet, 'Página.').cont || '';
    var pm = /"(\w{5})"/.exec(page);
    this.put(this.dr.find(sheet, 1.0), '<T');
    this.put(this.dr.find(sheet, 2.0), '200');
    if (pm) this.put(this.dr.find(sheet, 3.0), pm[1]);
    this.put(this.dr.find(sheet, 4.0), '>');
  }

  PageBuilder.prototype.put = function (f, s) {
    s = String(s);
    if (s.length > f.lon) throw new Error(this.sheet + ' ' + f.desc.slice(0, 50) + ': "' + s + '" > ' + f.lon);
    while (s.length < f.lon) s += ' ';
    for (var i = 0; i < f.lon; i++) this.buf[f.pos - 1 + i] = s[i];
    return this;
  };

  PageBuilder.prototype.set = function (key, value) {
    var f = this.dr.find(this.sheet, key);
    if (f.tipo === 'N') {
      this.put(f, money(Number(value)));
    } else if (f.tipo === 'Num') {
      if (typeof value === 'string') this.put(f, value.padStart(f.lon, '0'));
      else this.put(f, num2(Number(value), f.lon));
    } else {
      this.put(f, rmacc(String(value)).toUpperCase());
    }
    return this;
  };

  PageBuilder.prototype.render = function () { return this.buf.join(''); };

  function buildFile(dr, pages, ejercicio, discriminante, periodo) {
    discriminante = discriminante || '0';
    periodo = periodo || '0A';
    var head = new Array(328).fill(' ');
    var opening = '<T200' + discriminante + ejercicio + periodo + '0000>';
    var i;
    for (i = 0; i < opening.length; i++) head[i] = opening[i];
    for (i = 0; i < 5; i++) head[17 + i] = '<AUX>'[i];
    for (i = 0; i < 6; i++) head[322 + i] = '</AUX>'[i];
    var closing = '</T200' + discriminante + ejercicio + periodo + '0000>';
    return head.join('') + pages.map(function (p) { return p.render(); }).join('') + closing;
  }

  return { DR: DR, PageBuilder: PageBuilder, buildFile: buildFile, money: money, rmacc: rmacc };
}));
