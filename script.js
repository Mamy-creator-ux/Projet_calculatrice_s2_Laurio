/* =========================================================
   Calculatrice Scientifique — logique
   - Construit une expression sous forme de chaîne
   - Analyse (tokenizer + parseur récursif descendant)
   - Évalue sans passer par eval()
   ========================================================= */

(() => {
  'use strict';

  const displayEl   = document.getElementById('display');
  const historyEl   = document.getElementById('history-line');
  const modeEl      = document.getElementById('mode-indicator');
  const modeBtn     = document.querySelector('[data-action="mode"]');

  const FUNCS = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt'];

  const state = {
    expr: '0',        // expression interne (source de vérité)
    justEvaluated: false,
    angleMode: 'RAD',  // 'RAD' ou 'DEG'
    memory: 0
  };

  // ---------------------------------------------------------
  // Rendu de l'écran
  // ---------------------------------------------------------

  function render() {
    let shown = state.expr
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/pi/g, 'π')
      .replace(/\./g, ',');
    displayEl.textContent = shown || '0';
    modeEl.textContent = state.angleMode;
  }

  function setHistory(text) {
    historyEl.textContent = text;
  }

  // ---------------------------------------------------------
  // Aides sur la chaîne d'expression
  // ---------------------------------------------------------

  function lastChar() {
    return state.expr.slice(-1);
  }

  // Est-ce que l'expression se termine par une "valeur" (nombre,
  // parenthèse fermante, constante, factorielle, pourcentage) ?
  // Utile pour décider d'insérer une multiplication implicite.
  function endsWithValue() {
    if (/[0-9)!%]$/.test(state.expr)) return true;
    if (/pi$/.test(state.expr)) return true;
    if (/(?:^|[^a-z])e$/.test(state.expr)) return true;
    return false;
  }

  function appendImplicitMultIfNeeded() {
    if (endsWithValue()) state.expr += '*';
  }

  // ---------------------------------------------------------
  // Actions des touches
  // ---------------------------------------------------------

  function resetIfJustEvaluated(overwrite) {
    if (state.justEvaluated) {
      state.justEvaluated = false;
      if (overwrite) state.expr = '';
    }
  }

  function inputDigit(d) {
    resetIfJustEvaluated(true);
    if (state.expr === '0') state.expr = d;
    else state.expr += d;
  }

  function inputDecimal() {
    resetIfJustEvaluated(true);
    // Empêche deux points dans le même segment numérique
    const segment = state.expr.split(/[^0-9.]/).pop();
    if (segment.includes('.')) return;
    if (state.expr === '' || !/[0-9]$/.test(state.expr)) state.expr += '0.';
    else state.expr += '.';
  }

  function inputOperator(op) {
    resetIfJustEvaluated(false);
    if (state.expr === '' ) {
      if (op === '-') { state.expr = '-'; render(); return; }
      return;
    }
    if (/[+\-*/^%]$/.test(state.expr)) {
      // remplace le dernier opérateur par le nouveau
      state.expr = state.expr.slice(0, -1) + op;
    } else {
      state.expr += op;
    }
  }

  function inputFunction(fn) {
    resetIfJustEvaluated(true);
    appendImplicitMultIfNeeded();
    state.expr += fn + '(';
  }

  function inputConst(c) {
    resetIfJustEvaluated(true);
    appendImplicitMultIfNeeded();
    state.expr += c;
  }

  function inputParen(p) {
    resetIfJustEvaluated(true);
    if (p === '(') {
      appendImplicitMultIfNeeded();
      state.expr += '(';
    } else {
      const opens  = (state.expr.match(/\(/g) || []).length;
      const closes = (state.expr.match(/\)/g) || []).length;
      if (opens > closes && endsWithValue()) state.expr += ')';
    }
  }

  function inputFactorial() {
    if (endsWithValue() && !/[!%]$/.test(state.expr)) state.expr += '!';
  }

  function backspace() {
    if (state.justEvaluated) { clearAll(); return; }
    // retire un token complet (nom de fonction ou 'pi') si possible
    const funcMatch = FUNCS.find(f => state.expr.endsWith(f + '('));
    if (funcMatch) {
      state.expr = state.expr.slice(0, -(funcMatch.length + 1));
    } else if (state.expr.endsWith('pi')) {
      state.expr = state.expr.slice(0, -2);
    } else {
      state.expr = state.expr.slice(0, -1);
    }
    if (state.expr === '') state.expr = '0';
  }

  function clearEntry() {
    // supprime le dernier nombre saisi, sinon tout
    const m = state.expr.match(/(\d+\.?\d*)$/);
    if (m && m[0].length > 0) {
      state.expr = state.expr.slice(0, -m[0].length) || '0';
    } else {
      clearAll();
    }
  }

  function clearAll() {
    state.expr = '0';
    state.justEvaluated = false;
    setHistory('');
  }

  function toggleMode() {
    state.angleMode = state.angleMode === 'RAD' ? 'DEG' : 'RAD';
    modeBtn.textContent = state.angleMode;
  }

  function memAdd() {
    const val = safeEvaluate(state.expr);
    if (val !== null) state.memory += val;
  }

  function memRecall() {
    resetIfJustEvaluated(true);
    appendImplicitMultIfNeeded();
    state.expr += formatNumber(state.memory);
  }

  function memClear() {
    state.memory = 0;
  }

  function equals() {
    const raw = state.expr;
    const result = safeEvaluate(raw);
    if (result === null) {
      setHistory('Erreur');
      return;
    }
    setHistory(prettify(raw) + ' =');
    state.expr = formatNumber(result);
    state.justEvaluated = true;
    render();
  }

  function prettify(str) {
    return str
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/pi/g, 'π');
  }

  // ---------------------------------------------------------
  // Formatage des nombres
  // ---------------------------------------------------------

  function formatNumber(n) {
    if (!isFinite(n)) return 'Erreur';
    if (Math.abs(n) < 1e-12) n = 0;
    let s = parseFloat(n.toPrecision(12)).toString();
    if (s.length > 16) s = n.toExponential(6);
    return s;
  }

  // ---------------------------------------------------------
  // Tokenizer + Parseur récursif descendant
  //   expression := terme (('+'|'-') terme)*
  //   terme      := puissance (('*'|'/') puissance)*
  //   puissance  := unaire ('^' puissance)?
  //   unaire     := '-' unaire | postfixe
  //   postfixe   := primaire ('!' | '%')*
  //   primaire   := NOMBRE | CONST | FONCTION '(' expression ')'
  //                 | '(' expression ')'
  // ---------------------------------------------------------

  function tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      const c = str[i];
      if (c === ' ') { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let num = c; i++;
        while (i < str.length && /[0-9.]/.test(str[i])) { num += str[i]; i++; }
        tokens.push({ t: 'NUM', v: parseFloat(num) });
        continue;
      }
      if (/[a-z]/.test(c)) {
        let word = c; i++;
        while (i < str.length && /[a-z]/.test(str[i])) { word += str[i]; i++; }
        tokens.push({ t: 'WORD', v: word });
        continue;
      }
      if ('+-*/^%!()'.includes(c)) {
        tokens.push({ t: 'SYM', v: c });
        i++;
        continue;
      }
      // caractère non reconnu : on l'ignore
      i++;
    }
    return tokens;
  }

  function parse(tokens) {
    let pos = 0;

    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }

    function parseExpression() {
      let value = parseTerm();
      while (peek() && peek().t === 'SYM' && (peek().v === '+' || peek().v === '-')) {
        const op = next().v;
        const rhs = parseTerm();
        value = op === '+' ? value + rhs : value - rhs;
      }
      return value;
    }

    function parseTerm() {
      let value = parsePower();
      while (peek() && peek().t === 'SYM' && (peek().v === '*' || peek().v === '/')) {
        const op = next().v;
        const rhs = parsePower();
        if (op === '/' ) {
          if (rhs === 0) throw new Error('division par zéro');
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      }
      return value;
    }

    function parsePower() {
      const base = parseUnary();
      if (peek() && peek().t === 'SYM' && peek().v === '^') {
        next();
        const exp = parsePower(); // associatif à droite
        return Math.pow(base, exp);
      }
      return base;
    }

    function parseUnary() {
      if (peek() && peek().t === 'SYM' && peek().v === '-') {
        next();
        return -parseUnary();
      }
      return parsePostfix();
    }

    function parsePostfix() {
      let value = parsePrimary();
      while (peek() && peek().t === 'SYM' && (peek().v === '!' || peek().v === '%')) {
        const op = next().v;
        if (op === '!') value = factorial(value);
        else value = value / 100;
      }
      return value;
    }

    function parsePrimary() {
      const tok = peek();
      if (!tok) throw new Error('expression incomplète');

      if (tok.t === 'NUM') { next(); return tok.v; }

      if (tok.t === 'SYM' && tok.v === '(') {
        next();
        const val = parseExpression();
        if (!(peek() && peek().t === 'SYM' && peek().v === ')')) {
          throw new Error('parenthèse manquante');
        }
        next();
        return val;
      }

      if (tok.t === 'WORD') {
        next();
        if (tok.v === 'pi') return Math.PI;
        if (tok.v === 'e')  return Math.E;
        if (FUNCS.includes(tok.v)) {
          if (!(peek() && peek().t === 'SYM' && peek().v === '(')) {
            throw new Error('parenthèse attendue après ' + tok.v);
          }
          next();
          const arg = parseExpression();
          if (!(peek() && peek().t === 'SYM' && peek().v === ')')) {
            throw new Error('parenthèse manquante');
          }
          next();
          return applyFunction(tok.v, arg);
        }
        throw new Error('symbole inconnu: ' + tok.v);
      }

      throw new Error('jeton inattendu');
    }

    const result = parseExpression();
    if (pos !== tokens.length) throw new Error('expression malformée');
    return result;
  }

  function applyFunction(name, arg) {
    const toRad = a => state.angleMode === 'DEG' ? a * Math.PI / 180 : a;
    switch (name) {
      case 'sin':  return Math.sin(toRad(arg));
      case 'cos':  return Math.cos(toRad(arg));
      case 'tan':  return Math.tan(toRad(arg));
      case 'log':  return Math.log10(arg);
      case 'ln':   return Math.log(arg);
      case 'sqrt': return Math.sqrt(arg);
      default: throw new Error('fonction inconnue: ' + name);
    }
  }

  function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) throw new Error('factorielle invalide');
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function safeEvaluate(str) {
    try {
      // équilibre les parenthèses ouvertes non fermées avant d'évaluer
      const opens  = (str.match(/\(/g) || []).length;
      const closes = (str.match(/\)/g) || []).length;
      const padded = str + ')'.repeat(Math.max(0, opens - closes));
      const tokens = tokenize(padded);
      if (tokens.length === 0) return null;
      const result = parse(tokens);
      return isFinite(result) ? result : null;
    } catch (err) {
      return null;
    }
  }

  // ---------------------------------------------------------
  // Écouteurs d'événements — clavier tactile
  // ---------------------------------------------------------

  document.querySelectorAll('.key').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      switch (action) {
        case 'digit':        inputDigit(btn.dataset.digit); break;
        case 'decimal':      inputDecimal(); break;
        case 'op':           inputOperator(btn.dataset.op); break;
        case 'fn':           inputFunction(btn.dataset.fn); break;
        case 'const':        inputConst(btn.dataset.const); break;
        case 'paren':        inputParen(btn.dataset.paren); break;
        case 'backspace':    backspace(); break;
        case 'clear-entry':  clearEntry(); break;
        case 'clear-all':    clearAll(); break;
        case 'equals':       equals(); return; // render() déjà appelé
        case 'mode':         toggleMode(); break;
        case 'mem-add':      memAdd(); break;
        case 'mem-recall':   memRecall(); break;
        case 'clear-mem':    memClear(); break;
        default: break;
      }
      render();
    });
  });

  // ---------------------------------------------------------
  // Écouteurs d'événements — clavier physique
  // ---------------------------------------------------------

  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (/^[0-9]$/.test(k)) { inputDigit(k); render(); return; }
    if (k === '.' || k === ',') { inputDecimal(); render(); return; }
    if (['+', '-', '*', '/', '^', '%'].includes(k)) { inputOperator(k); render(); return; }
    if (k === '(' || k === ')') { inputParen(k); render(); return; }
    if (k === '!') { inputFactorial(); render(); return; }
    if (k === 'Enter' || k === '=') { e.preventDefault(); equals(); return; }
    if (k === 'Backspace') { backspace(); render(); return; }
    if (k === 'Escape') { clearAll(); render(); return; }
    if (k === 'Delete') { clearEntry(); render(); return; }
  });

  // ---------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------

  render();
})();
