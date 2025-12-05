// AutoCorrect Bookmarklet Engine - rebuilt
const AC = window.AC = window.AC || {};
AC.__bootstrapped = AC.__bootstrapped || false;

/***************************************************
 * BLOCK 1: storage layer, state, caps rules,
 * dictionary load + healing + rebuild, time utils,
 * logging engine
 ***************************************************/

// storage keys
AC.keys = {
  LOG: 'ac_spell_log_v5',
  DICT: 'ac_custom_dict_v5',
  MAP: 'ac_custom_map_v5',
  CAPS: 'ac_caps_rules_v5',
  MULTI: 'ac_custom_multi_v5'
};

// helper to safely parse JSON
AC.readJSON = function(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return JSON.parse(JSON.stringify(fallback));
    const parsed = JSON.parse(raw);
    return parsed === undefined || parsed === null ? JSON.parse(JSON.stringify(fallback)) : parsed;
  } catch (err) {
    return JSON.parse(JSON.stringify(fallback));
  }
};

AC.writeJSON = function(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // ignore storage errors silently for bookmarklet compatibility
  }
};

// global state
AC.state = {
  log: AC.readJSON(AC.keys.LOG, []),
  customList: AC.readJSON(AC.keys.DICT, []),
  customMap: AC.readJSON(AC.keys.MAP, {}),
  customMulti: AC.readJSON(AC.keys.MULTI, []),
  caps: AC.readJSON(AC.keys.CAPS, {}),
  customSet: new Set(),
  flatMap: {},
  multi: [],
  canonicals: [],
  recent: [],
  listeners: new WeakMap(),
  observer: null,
  open: false,
  lastCorrections: []
};

// base canonical dictionary and misspellings
AC.baseDictionary = {
  'Abarth': ['abart', 'abarht', 'abarth?'],
  'Alfa Romeo': ['alfaromeo', 'alpha romeo', 'alfa romo'],
  'Citroën': ['citroen', 'citreon', 'citron'],
  'DS': ['d.s', 'ds.'],
  'DS Automobiles': ['ds automoblies', 'ds automobiles'],
  'Fiat': ['fiatt', 'fiadt'],
  'Jeep': ['jepp', 'jeap'],
  'Leapmotor': ['leap motor', 'leapmotors'],
  'Peugeot': ['peugot', 'peugeut', 'peugoe'],
  'Vauxhall': ['vauxel', 'vauxall', 'vaxhall'],
  'Stellantis': ['stellantus', 'stellentis'],
  'Stellantis &You UK': ['stellantis & you uk', 'stellantis and you uk', 'stellantis and you'],
  'Stellantis &You': ['stellantis & you', 'stellantis &you'],
  'Motability': ['motablity', 'motability'],
  'LivePerson': ['live person', 'livepersom', 'lp chat'],
  'Stellantis &You Sales': ['stellantis sales', 'stellantis & you sales']
};

// base multi word entries
AC.baseMulti = [
  { src: 'test drive', tgt: 'test drive' },
  { src: 'thank you', tgt: 'Thank you' },
  { src: 'good morning', tgt: 'Good morning' },
  { src: 'good afternoon', tgt: 'Good afternoon' },
  { src: 'good evening', tgt: 'Good evening' },
  { src: 'live person', tgt: 'LivePerson' },
  { src: 'stellantis & you', tgt: 'Stellantis &You' },
  { src: 'stellantis & you uk', tgt: 'Stellantis &You UK' }
];

// ensure default caps rules including always-caps brands
AC.ensureCapsRules = function() {
  const defaults = [
    'Abarth','Alfa Romeo','Citroën','DS','DS Automobiles','Fiat','Jeep','Leapmotor',
    'Peugeot','Vauxhall','Stellantis','Stellantis &You','Stellantis &You UK',
    'London','UK','Motability',
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
    'January','February','March','April','May','June','July','August','September',
    'October','November','December'
  ];
  defaults.forEach(word => {
    if (AC.state.caps[word] === undefined) AC.state.caps[word] = true;
  });
  AC.writeJSON(AC.keys.CAPS, AC.state.caps);
};
AC.ensureCapsRules();

// helper: check if text end indicates sentence boundary
AC.isSentenceBoundary = function(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  return /[.!?]\s*$/.test(trimmed);
};

// helper: adjust canonical word case based on context and caps rules
AC.applyCase = function(canonical, sample, startOfSentence) {
  if (AC.state.caps[canonical]) return canonical;
  if (!sample) return startOfSentence ? canonical.charAt(0).toUpperCase() + canonical.slice(1) : canonical;
  const letters = sample.match(/[A-Za-z]/g) || [];
  const upperCount = (sample.match(/[A-Z]/g) || []).length;
  const ratio = letters.length === 0 ? 0 : upperCount / letters.length;
  if (ratio > 0.5) return canonical.toUpperCase();
  if (sample[0] === sample[0].toUpperCase()) return canonical.charAt(0).toUpperCase() + canonical.slice(1);
  if (startOfSentence) return canonical.charAt(0).toUpperCase() + canonical.slice(1);
  return canonical;
};

// time parsing and normalisation
AC.timePatterns = [
  /^([0-1]?\d|2[0-3]):([0-5]\d)$/,                        // HH:MM
  /^([0-1]?\d|2[0-3])\.([0-5]\d)$/,                      // HH.MM
  /^([0-1]?\d|2[0-3]):([0-5]\d)\s?(am|pm)$/i,            // HH:MMam
  /^([0-1]?\d|2[0-3])\.([0-5]\d)\s?(am|pm)$/i,          // HH.MMam
  /^(\d{1,2})\s?(am|pm)$/i                                // HHam
];

AC.normalizeTimeToken = function(token) {
  const cleaned = token.trim();
  let match;
  // HH:MM 24h
  match = cleaned.match(AC.timePatterns[0]);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h <= 23 && m <= 59) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    return null;
  }
  // HH.MM 24h
  match = cleaned.match(AC.timePatterns[1]);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h <= 23 && m <= 59) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    return null;
  }
  // HH:MMam
  match = cleaned.match(AC.timePatterns[2]);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m > 59 || h > 23) return null;
    const suf = match[3].toLowerCase();
    if (suf === 'am') h = h === 12 ? 0 : h;
    if (suf === 'pm') h = h === 12 ? 12 : h + 12;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  // HH.MMam
  match = cleaned.match(AC.timePatterns[3]);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (m > 59 || h > 23) return null;
    const suf = match[3].toLowerCase();
    if (suf === 'am') h = h === 12 ? 0 : h;
    if (suf === 'pm') h = h === 12 ? 12 : h + 12;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }
  // HHam
  match = cleaned.match(AC.timePatterns[4]);
  if (match) {
    let h = parseInt(match[1], 10);
    const suf = match[2].toLowerCase();
    if (h > 12) return null;
    if (suf === 'am') h = h === 12 ? 0 : h;
    if (suf === 'pm') h = h === 12 ? 12 : h + 12;
    return `${String(h).padStart(2,'0')}:00`;
  }
  return null;
};

// dictionary healer cleans invalid entries
AC.healDictionary = function() {
  const cleanedList = (AC.state.customList || []).filter(w => typeof w === 'string' && w.trim().length > 1);
  AC.state.customList = Array.from(new Set(cleanedList.map(w => w.trim()))).sort();
  const healedMap = {};
  Object.entries(AC.state.customMap || {}).forEach(([miss, canon]) => {
    if (!miss || !canon) return;
    const missKey = miss.trim();
    const canonKey = canon.trim();
    if (missKey && canonKey) healedMap[missKey] = canonKey;
  });
  AC.state.customMap = healedMap;

  const healedMulti = [];
  [...AC.baseMulti, ...(AC.state.customMulti || [])].forEach(pair => {
    if (!pair || !pair.src || !pair.tgt) return;
    healedMulti.push({ src: String(pair.src).trim(), tgt: String(pair.tgt).trim() });
  });
  AC.state.customMulti = healedMulti.filter((v, idx, arr) => idx === arr.findIndex(x => x.src.toLowerCase() === v.src.toLowerCase() && x.tgt === v.tgt));

  AC.writeJSON(AC.keys.DICT, AC.state.customList);
  AC.writeJSON(AC.keys.MAP, AC.state.customMap);
  AC.writeJSON(AC.keys.MULTI, AC.state.customMulti.filter(p => !AC.baseMulti.find(b => b.src === p.src && b.tgt === p.tgt)));
};

// rebuild lookup tables
AC.rebuildLookups = function() {
  AC.state.customSet = new Set(AC.state.customList);
  const flat = {};
  const canonicalSet = new Set();

  Object.entries(AC.baseDictionary).forEach(([canonical, missings]) => {
    canonicalSet.add(canonical);
    flat[canonical.toLowerCase()] = canonical;
    (missings || []).forEach(m => { flat[m.toLowerCase()] = canonical; });
  });

  AC.state.customList.forEach(canonical => {
    canonicalSet.add(canonical);
    flat[canonical.toLowerCase()] = canonical;
  });

  Object.entries(AC.state.customMap).forEach(([miss, canonical]) => {
    if (!canonical) return;
    canonicalSet.add(canonical);
    flat[miss.toLowerCase()] = canonical;
  });

  const multiEntries = [];
  AC.baseMulti.forEach(pair => multiEntries.push({ src: pair.src.toLowerCase(), tgt: pair.tgt }));
  (AC.state.customMulti || []).forEach(pair => multiEntries.push({ src: pair.src.toLowerCase(), tgt: pair.tgt }));

  AC.state.flatMap = flat;
  AC.state.multi = multiEntries;
  AC.state.canonicals = Array.from(canonicalSet).sort();

  AC.writeJSON(AC.keys.DICT, AC.state.customList);
  AC.writeJSON(AC.keys.MAP, AC.state.customMap);
};

AC.healDictionary();
AC.rebuildLookups();

// logging engine
AC.pruneLog = function() {
  AC.state.log = (AC.state.log || []).filter(entry => entry && entry.word && typeof entry.word === 'string');
  AC.writeJSON(AC.keys.LOG, AC.state.log);
};

AC.recordUnknown = function(word, sentenceContext) {
  if (!word || word.length < 2) return;
  const normalizedTime = AC.normalizeTimeToken(word);
  if (normalizedTime) return; // skip valid times
  const lower = word.toLowerCase();
  if (AC.state.flatMap[lower] || AC.state.customSet.has(word) || AC.state.canonicals.includes(word)) return;

  const today = new Date();
  const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).getTime();
  const duplicate = (AC.state.log || []).some(entry => {
    const when = new Date(entry.when).getTime();
    return entry.word.toLowerCase() === lower && when >= startOfDay;
  });
  if (duplicate) return;

  const payload = {
    word: word,
    when: new Date().toISOString(),
    sentence: sentenceContext || ''
  };
  AC.state.log.push(payload);
  AC.writeJSON(AC.keys.LOG, AC.state.log);
  if (typeof AC.renderLog === 'function') AC.renderLog();
  if (typeof AC.renderStats === 'function') AC.renderStats();
};

AC.pruneLog();

/***************************************************
 * BLOCK 2: autocorrect engine, caret system,
 * tokenisation, multi-word matching, mapping,
 * undo correction
 ***************************************************/

// capture caret position
AC.nodeInCursor = function(node) {
  if (!node) return false;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  return !!(node && node.closest && node.closest('.ql-cursor'));
};

AC.getCaretIndex = function(root) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return -1;
  try {
    const range = sel.getRangeAt(0);
    if (AC.nodeInCursor(range.startContainer)) {
      const tmp = document.createRange();
      tmp.selectNodeContents(root);
      const cursorEl = range.startContainer.closest ? range.startContainer.closest('.ql-cursor') : range.startContainer.parentElement.closest('.ql-cursor');
      if (cursorEl) tmp.setEndBefore(cursorEl);
      return tmp.toString().length;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => AC.nodeInCursor(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let idx = 0;
    let current = walker.nextNode();
    while (current) {
      if (current === range.startContainer) {
        return idx + range.startOffset;
      }
      idx += current.textContent.length;
      current = walker.nextNode();
    }
    const preRange = range.cloneRange();
    preRange.selectNodeContents(root);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  } catch (err) {
    return -1;
  }
};

AC.restoreCaretIndex = function(root, index) {
  if (index < 0) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => AC.nodeInCursor(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  let current = walker.nextNode();
  let remaining = index;
  while (current) {
    const len = current.textContent.length;
    if (remaining <= len) break;
    remaining -= len;
    current = walker.nextNode();
  }
  if (!current) return;
  const sel = window.getSelection();
  const range = document.createRange();
  range.setStart(current, remaining);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

// tokenization helpers
AC.splitTextByCaret = function(text, caretIndex) {
  return { before: text.slice(0, caretIndex), after: text.slice(caretIndex) };
};

AC.extractWordBeforeCaret = function(text) {
  const match = text.match(/([\w'&]+)$/);
  return match ? match[1] : '';
};

AC.extractSentenceContext = function(text) {
  const lastStop = text.lastIndexOf('.');
  const lastQ = text.lastIndexOf('?');
  const lastEx = text.lastIndexOf('!');
  const stop = Math.max(lastStop, lastQ, lastEx);
  return stop === -1 ? text : text.slice(stop + 1);
};

AC.applyCanonical = function(token, atSentenceStart) {
  const normalizedTime = AC.normalizeTimeToken(token);
  if (normalizedTime) return { replacement: normalizedTime, canonical: normalizedTime, time: true };

  const lower = token.toLowerCase();
  const canonical = AC.state.flatMap[lower];
  if (!canonical) return null;
  const replacement = AC.applyCase(canonical, token, atSentenceStart);
  return { replacement, canonical, time: false };
};

AC.escapeRegex = function(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
};

AC.matchMultiWord = function(text) {
  const lower = text.toLowerCase();
  for (let i = 0; i < AC.state.multi.length; i++) {
    const pair = AC.state.multi[i];
    const pattern = new RegExp(`\\b${AC.escapeRegex(pair.src)}$`);
    const match = lower.match(pattern);
    if (match) {
      const startIndex = lower.search(pattern);
      return { start: startIndex, src: pair.src, tgt: pair.tgt };
    }
  }
  return null;
};

AC.recordUndoState = function(root, oldText, newText, caret) {
  AC.state.lastCorrections.push({ root, oldText, newText, caret });
  if (AC.state.lastCorrections.length > 2) AC.state.lastCorrections.shift();
};

AC.undoLast = function() {
  const info = AC.state.lastCorrections.pop();
  if (!info || !info.root || !info.root.isConnected) return;
  AC.replaceTextContent(info.root, info.oldText);
  AC.restoreCaretIndex(info.root, info.caret);
};

AC.replaceTextContent = function(root, text) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
};

AC.applyCorrections = function(root, triggerChar) {
  const caretPos = AC.getCaretIndex(root);
  if (caretPos < 0) return;
  const text = root.innerText;
  const { before, after } = AC.splitTextByCaret(text, caretPos);

  const newlineTrailMatch = before.match(/(\n+)$/);
  const newlineTrail = newlineTrailMatch ? newlineTrailMatch[1] : '';
  const withoutNewline = newlineTrail ? before.slice(0, before.length - newlineTrail.length) : before;
  const spaceTrailMatch = withoutNewline.match(/[ \t]+$/);
  const spaceTrail = spaceTrailMatch ? spaceTrailMatch[1] : '';
  const withoutSpaces = spaceTrail ? withoutNewline.slice(0, withoutNewline.length - spaceTrail.length) : withoutNewline;
  const punctTrailMatch = withoutSpaces.match(/([.!?]+)$/);
  const punctTrail = punctTrailMatch ? punctTrailMatch[1] : '';
  const trimmedBefore = punctTrail ? withoutSpaces.slice(0, withoutSpaces.length - punctTrail.length) : withoutSpaces;
  const wordMatch = trimmedBefore.match(/([\w'&]+)$/);
  const word = wordMatch ? wordMatch[1] : '';
  if (!word) return;
  const wordStart = wordMatch ? (trimmedBefore.length - word.length) : trimmedBefore.length;
  const prefixText = trimmedBefore.slice(0, wordStart);

  const sentenceStart = AC.isSentenceBoundary(prefixText);

  const multiMatch = AC.matchMultiWord(trimmedBefore);
  let updatedText = text;
  let newCaret = caretPos;
  let applied = false;

  if (multiMatch) {
    const preSegment = trimmedBefore.slice(0, multiMatch.start);
    const originalSegment = trimmedBefore.slice(multiMatch.start, trimmedBefore.length);
    const corrected = AC.applyCase(multiMatch.tgt, originalSegment, sentenceStart);
    const rebuiltBefore = preSegment + corrected + punctTrail + spaceTrail + newlineTrail;
    updatedText = rebuiltBefore + after;
    newCaret = rebuiltBefore.length;
    applied = true;
  } else {
    const correction = AC.applyCanonical(word, sentenceStart);
    if (correction) {
      const prefix = prefixText;
      const correctedWord = correction.replacement;
      const autoCapI = correctedWord === 'i' ? 'I' : correctedWord;
      const finalWord = sentenceStart ? autoCapI.charAt(0).toUpperCase() + autoCapI.slice(1) : autoCapI;
      const rebuiltBefore = prefix + finalWord + punctTrail + spaceTrail + newlineTrail;
      updatedText = rebuiltBefore + after;
      newCaret = (prefix + finalWord + punctTrail + spaceTrail + newlineTrail).length;
      applied = true;
      if (!AC.state.recent.includes(finalWord)) AC.state.recent.push(finalWord);
    } else {
      const autoI = word === 'i' ? 'I' : null;
      if (autoI) {
        const prefix = prefixText;
        const rebuiltBefore = prefix + 'I' + punctTrail + spaceTrail + newlineTrail;
        updatedText = rebuiltBefore + after;
        newCaret = rebuiltBefore.length;
        applied = true;
        if (!AC.state.recent.includes('I')) AC.state.recent.push('I');
      }
    }
  }

  if (!applied) return;
  AC.recordUndoState(root, text, updatedText, caretPos);
  AC.replaceTextContent(root, updatedText);
  AC.restoreCaretIndex(root, newCaret);
};

AC.handleInput = function(event) {
  const root = event.currentTarget;
  const triggerChars = [' ', '.', '?', '!', '\n', 'Enter'];
  const key = event.key;
  if (key && !triggerChars.includes(key)) return;
  setTimeout(() => {
    AC.applyCorrections(root, key || ' ');
  }, 0);
};

AC.handlePaste = function(event) {
  const root = event.currentTarget;
  setTimeout(() => {
    const caret = AC.getCaretIndex(root);
    const text = root.innerText;
    AC.recordUndoState(root, text, text, caret);
    AC.applyCorrections(root, ' ');
  }, 0);
};

AC.handleBlur = function(event) {
  const root = event.currentTarget;
  const text = root.innerText;
  const sentence = AC.extractSentenceContext(text);
  const words = text.split(/\s+/);
  words.forEach(w => AC.recordUnknown(w, sentence));
};

/***************************************************
 * BLOCK 3: attachToEditable, mutation observer,
 * editor scanning
 ***************************************************/

AC.editorSelector = '.ql-editor, div[role="textbox"], [contenteditable="true"], [contenteditable="plaintext-only"]';

AC.bindEditor = function(el) {
  if (!el || AC.state.listeners.has(el)) return;
  const handler = {
    keyup: AC.handleInput,
    keydown: (evt) => {
      if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'z') {
        AC.undoLast();
      }
    },
    paste: AC.handlePaste,
    blur: AC.handleBlur
  };
  el.addEventListener('keyup', handler.keyup);
  el.addEventListener('keydown', handler.keydown);
  el.addEventListener('paste', handler.paste);
  el.addEventListener('blur', handler.blur);
  AC.state.listeners.set(el, handler);
};

AC.scanEditors = function() {
  const candidates = document.querySelectorAll(AC.editorSelector);
  candidates.forEach(node => AC.bindEditor(node));
};

AC.observeMutations = function() {
  if (AC.state.observer) return;
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'class' && m.target instanceof HTMLElement) {
        if (m.target.matches(AC.editorSelector)) {
          AC.bindEditor(m.target);
        }
      }
      m.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches && node.matches(AC.editorSelector)) {
          AC.bindEditor(node);
        }
        node.querySelectorAll && node.querySelectorAll(AC.editorSelector).forEach(child => AC.bindEditor(child));
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  AC.state.observer = observer;
};

/***************************************************
 * BLOCK 4: UI engine, sidebar, tabs, map panel,
 * dictionary UI, settings, export, toggle, hotkey
 ***************************************************/

AC.ui = {};

AC.buildSidebar = function() {
  if (document.getElementById('ac-sidebar')) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'ac-sidebar';
  wrapper.innerHTML = `
    <div class="ac-header">
      <div class="ac-title">AutoCorrect</div>
      <div class="ac-tabs">
        <button data-tab="log" class="active">Log</button>
        <button data-tab="recent">Recent</button>
        <button data-tab="stats">Stats</button>
        <button data-tab="export">Export</button>
        <button data-tab="dictionary">Dictionary</button>
        <button data-tab="settings">Settings</button>
      </div>
    </div>
    <div class="ac-body">
      <div class="ac-tab" data-view="log">
        <div class="ac-log-list"></div>
      </div>
      <div class="ac-tab" data-view="recent" hidden>
        <div class="ac-recent-list"></div>
      </div>
      <div class="ac-tab" data-view="stats" hidden>
        <div class="ac-stats"></div>
      </div>
      <div class="ac-tab" data-view="export" hidden>
        <div class="ac-export">
          <button class="ac-export-txt">Export TXT</button>
          <button class="ac-export-csv">Export CSV</button>
        </div>
      </div>
      <div class="ac-tab" data-view="dictionary" hidden>
        <div class="ac-dict-controls">
          <input type="text" placeholder="Filter" class="ac-dict-filter" />
          <button class="ac-dict-add">Add Word</button>
          <button class="ac-dict-map">Add Mapping</button>
          <button class="ac-dict-multi">Add Multi</button>
        </div>
        <div class="ac-dict-list"></div>
        <div class="ac-multi-title">Multi-word entries</div>
        <div class="ac-multi-list"></div>
      </div>
      <div class="ac-tab" data-view="settings" hidden>
        <button class="ac-clear-log">Clear Logs</button>
        <button class="ac-clear-dict">Clear Dictionary</button>
      </div>
    </div>
    <div class="ac-map-panel">
      <div class="ac-map-header">
        <span>Map word</span>
        <button class="ac-map-close">×</button>
      </div>
      <div class="ac-map-body">
        <input type="text" class="ac-map-source" placeholder="Misspelling" />
        <input type="text" class="ac-map-target" placeholder="Canonical" />
        <label class="ac-map-star">
          <input type="checkbox" class="ac-map-caps" />
          <span>⭐ Caps rule</span>
        </label>
        <div class="ac-map-actions">
          <button class="ac-map-save">Save</button>
        </div>
      </div>
    </div>
    <button id="ac-toggle">AC</button>
  `;
  document.body.appendChild(wrapper);

  AC.ui.sidebar = wrapper;
  AC.ui.tabs = wrapper.querySelectorAll('.ac-tabs button');
  AC.ui.views = wrapper.querySelectorAll('.ac-tab');
  AC.ui.logList = wrapper.querySelector('.ac-log-list');
  AC.ui.recentList = wrapper.querySelector('.ac-recent-list');
  AC.ui.stats = wrapper.querySelector('.ac-stats');
  AC.ui.exportTxt = wrapper.querySelector('.ac-export-txt');
  AC.ui.exportCsv = wrapper.querySelector('.ac-export-csv');
  AC.ui.dictFilter = wrapper.querySelector('.ac-dict-filter');
  AC.ui.dictAdd = wrapper.querySelector('.ac-dict-add');
  AC.ui.dictMap = wrapper.querySelector('.ac-dict-map');
  AC.ui.dictMulti = wrapper.querySelector('.ac-dict-multi');
  AC.ui.dictList = wrapper.querySelector('.ac-dict-list');
  AC.ui.multiList = wrapper.querySelector('.ac-multi-list');
  AC.ui.clearLog = wrapper.querySelector('.ac-clear-log');
  AC.ui.clearDict = wrapper.querySelector('.ac-clear-dict');
  AC.ui.mapPanel = wrapper.querySelector('.ac-map-panel');
  AC.ui.mapClose = wrapper.querySelector('.ac-map-close');
  AC.ui.mapSave = wrapper.querySelector('.ac-map-save');
  AC.ui.mapSource = wrapper.querySelector('.ac-map-source');
  AC.ui.mapTarget = wrapper.querySelector('.ac-map-target');
  AC.ui.mapCaps = wrapper.querySelector('.ac-map-caps');
  AC.ui.toggle = wrapper.querySelector('#ac-toggle');

  AC.bindUI();
};

AC.switchTab = function(name) {
  AC.ui.tabs.forEach(btn => {
    if (btn.dataset.tab === name) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  AC.ui.views.forEach(view => {
    view.hidden = view.dataset.view !== name;
  });
};

AC.renderLog = function() {
  if (!AC.ui.logList) return;
  AC.ui.logList.innerHTML = '';
  const entries = [...(AC.state.log || [])].sort((a,b) => new Date(b.when) - new Date(a.when));
  entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'ac-log-row';
    row.innerHTML = `
      <div class="ac-log-word">${entry.word}</div>
      <div class="ac-log-meta">${new Date(entry.when).toLocaleString()}</div>
      <div class="ac-log-sentence">${entry.sentence || ''}</div>
      <div class="ac-log-actions">
        <button data-action="add" data-word="${entry.word}">Add</button>
        <button data-action="map" data-word="${entry.word}">Map</button>
      </div>
    `;
    AC.ui.logList.appendChild(row);
  });
};

AC.renderRecent = function() {
  if (!AC.ui.recentList) return;
  const items = AC.state.recent.slice(-20).reverse();
  AC.ui.recentList.innerHTML = items.map(w => `<div class="ac-recent-item">${w}</div>`).join('');
};

AC.renderStats = function() {
  if (!AC.ui.stats) return;
  const total = (AC.state.log || []).length;
  const unique = new Set((AC.state.log || []).map(e => e.word.toLowerCase())).size;
  AC.ui.stats.innerHTML = `
    <div>Total unknowns: ${total}</div>
    <div>Unique unknowns: ${unique}</div>
    <div>Dictionary size: ${AC.state.canonicals.length}</div>
  `;
};

AC.renderDict = function() {
  if (!AC.ui.dictList) return;
  const filter = (AC.ui.dictFilter && AC.ui.dictFilter.value || '').toLowerCase();
  const fragment = document.createDocumentFragment();
  AC.state.canonicals.forEach(word => {
    if (filter && !word.toLowerCase().includes(filter)) return;
    const row = document.createElement('div');
    row.className = 'ac-dict-row';
    const starred = AC.state.caps[word];
    row.innerHTML = `
      <span class="ac-dict-word">${word}</span>
      <button class="ac-dict-star" data-word="${word}">${starred ? '⭐' : '☆'}</button>
      <button class="ac-dict-remove" data-word="${word}">Remove</button>
    `;
    fragment.appendChild(row);
  });
  AC.ui.dictList.innerHTML = '';
  AC.ui.dictList.appendChild(fragment);

  if (AC.ui.multiList) {
    const multiFrag = document.createDocumentFragment();
    AC.state.multi.forEach(pair => {
      const src = pair.src;
      const tgt = pair.tgt;
      if (filter && !src.toLowerCase().includes(filter) && !tgt.toLowerCase().includes(filter)) return;
      const row = document.createElement('div');
      row.className = 'ac-multi-row';
      row.innerHTML = `
        <span class="ac-multi-src">${tgt}</span>
        <small class="ac-multi-src-text">${src}</small>
        <button class="ac-multi-remove" data-src="${src}">Remove</button>
      `;
      multiFrag.appendChild(row);
    });
    AC.ui.multiList.innerHTML = '';
    AC.ui.multiList.appendChild(multiFrag);
  }
};

AC.openMapPanel = function(word) {
  AC.ui.mapPanel.classList.add('active');
  AC.ui.mapSource.value = word || '';
  AC.ui.mapTarget.value = '';
  AC.ui.mapCaps.checked = false;
};

AC.closeMapPanel = function() {
  AC.ui.mapPanel.classList.remove('active');
};

AC.exportData = function(type) {
  const entries = AC.state.log || [];
  if (!entries.length) return;
  let content = '';
  if (type === 'txt') {
    content = entries.map(e => `${e.word}\t${e.when}\t${e.sentence || ''}`).join('\n');
  } else {
    const header = 'word,when,sentence';
    const rows = entries.map(e => `${JSON.stringify(e.word)},${JSON.stringify(e.when)},${JSON.stringify(e.sentence || '')}`);
    content = [header, ...rows].join('\n');
  }
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = type === 'txt' ? 'ac-log.txt' : 'ac-log.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

AC.toggleSidebar = function(force) {
  const shouldOpen = force !== undefined ? force : !AC.state.open;
  AC.state.open = shouldOpen;
  AC.ui.sidebar.classList.toggle('open', shouldOpen);
};

AC.bindUI = function() {
  AC.ui.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      AC.switchTab(btn.dataset.tab);
    });
  });

  AC.ui.toggle.addEventListener('click', () => AC.toggleSidebar());
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      AC.toggleSidebar();
    }
  });

  AC.ui.exportTxt.addEventListener('click', () => AC.exportData('txt'));
  AC.ui.exportCsv.addEventListener('click', () => AC.exportData('csv'));

  AC.ui.dictFilter.addEventListener('input', AC.renderDict);
  AC.ui.dictAdd.addEventListener('click', () => {
    const word = prompt('Add canonical word');
    if (!word) return;
    AC.state.customList.push(word.trim());
    AC.healDictionary();
    AC.rebuildLookups();
    AC.renderDict();
  });
  AC.ui.dictMap.addEventListener('click', () => AC.openMapPanel(''));
  AC.ui.dictMulti.addEventListener('click', () => {
    const src = prompt('Multi-word source');
    const tgt = prompt('Multi-word target');
    if (!src || !tgt) return;
    AC.state.customMulti.push({ src: src.trim(), tgt: tgt.trim() });
    AC.healDictionary();
    AC.rebuildLookups();
  });

  AC.ui.dictList.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('ac-dict-star')) {
      const word = target.dataset.word;
      AC.state.caps[word] = !AC.state.caps[word];
      AC.writeJSON(AC.keys.CAPS, AC.state.caps);
      AC.renderDict();
    }
    if (target.classList.contains('ac-dict-remove')) {
      const word = target.dataset.word;
      AC.state.customList = AC.state.customList.filter(w => w !== word);
      delete AC.state.caps[word];
      AC.healDictionary();
      AC.rebuildLookups();
      AC.renderDict();
    }
  });

  AC.ui.multiList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !btn.classList.contains('ac-multi-remove')) return;
    const src = btn.dataset.src;
    const baseEntry = AC.baseMulti.find(pair => pair.src.toLowerCase() === src.toLowerCase());
    if (baseEntry) return;
    AC.state.customMulti = (AC.state.customMulti || []).filter(pair => pair.src.toLowerCase() !== src.toLowerCase());
    AC.healDictionary();
    AC.rebuildLookups();
    AC.renderDict();
  });

  AC.ui.clearLog.addEventListener('click', () => {
    if (!confirm('Clear logs?')) return;
    AC.state.log = [];
    AC.writeJSON(AC.keys.LOG, AC.state.log);
    AC.renderLog();
    AC.renderStats();
  });

  AC.ui.clearDict.addEventListener('click', () => {
    if (!confirm('Clear dictionary?')) return;
    AC.state.customList = [];
    AC.state.customMap = {};
    AC.state.customMulti = [];
    AC.writeJSON(AC.keys.DICT, AC.state.customList);
    AC.writeJSON(AC.keys.MAP, AC.state.customMap);
    AC.writeJSON(AC.keys.MULTI, AC.state.customMulti);
    AC.healDictionary();
    AC.rebuildLookups();
    AC.renderDict();
  });

  AC.ui.logList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const word = btn.dataset.word;
    if (btn.dataset.action === 'add') {
      AC.state.customList.push(word);
      AC.healDictionary();
      AC.rebuildLookups();
      AC.renderDict();
    }
    if (btn.dataset.action === 'map') {
      AC.openMapPanel(word);
    }
  });

  AC.ui.mapClose.addEventListener('click', AC.closeMapPanel);
  AC.ui.mapSave.addEventListener('click', () => {
    const source = AC.ui.mapSource.value.trim();
    const target = AC.ui.mapTarget.value.trim();
    if (!source || !target) return;
    AC.state.customMap[source] = target;
    if (AC.ui.mapCaps.checked) AC.state.caps[target] = true;
    AC.healDictionary();
    AC.rebuildLookups();
    AC.renderDict();
    AC.closeMapPanel();
  });
};

/***************************************************
 * BLOCK 5: styles injection, bootstrap, assembly
 ***************************************************/

AC.injectStyles = function() {
  if (document.getElementById('ac-styles')) return;
  const style = document.createElement('style');
  style.id = 'ac-styles';
  style.textContent = `
    #ac-sidebar { position: fixed; left: -320px; top: 0; bottom: 0; width: 320px; background: #1e1d49; color: #fff; font-family: Arial, sans-serif; z-index: 9999; transition: left 0.3s ease; box-shadow: 2px 0 8px rgba(0,0,0,0.4); }
    #ac-sidebar.open { left: 0; }
    #ac-sidebar .ac-header { padding: 12px; background: #34416a; }
    #ac-sidebar .ac-title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    #ac-sidebar .ac-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
    #ac-sidebar .ac-tabs button { flex: 1 1 30%; padding: 6px; background: #483a73; border: none; color: #fff; border-radius: 4px; cursor: pointer; }
    #ac-sidebar .ac-tabs button.active { background: #f9772e; }
    #ac-sidebar .ac-body { padding: 10px; overflow-y: auto; height: calc(100% - 140px); }
    #ac-sidebar .ac-log-row, #ac-sidebar .ac-dict-row { background: rgba(255,255,255,0.05); padding: 8px; margin-bottom: 8px; border-radius: 4px; }
    #ac-sidebar .ac-log-word { font-weight: bold; }
    #ac-sidebar .ac-log-meta { font-size: 12px; opacity: 0.7; }
    #ac-sidebar .ac-log-actions button { margin-right: 6px; background: #f9772e; color: #fff; border: none; padding: 4px 6px; border-radius: 4px; cursor: pointer; }
    #ac-sidebar .ac-dict-controls { display: flex; gap: 6px; margin-bottom: 8px; }
    #ac-sidebar .ac-dict-controls input { flex: 1; padding: 6px; border-radius: 4px; border: none; }
    #ac-sidebar .ac-dict-controls button, #ac-sidebar .ac-export button, #ac-sidebar .ac-tab button { background: #483a73; color: #fff; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; }
    #ac-sidebar .ac-dict-row { display: flex; align-items: center; justify-content: space-between; }
    #ac-sidebar .ac-dict-row button { background: #483a73; }
    #ac-sidebar .ac-multi-title { margin-top: 10px; font-weight: bold; }
    #ac-sidebar .ac-multi-row { display: flex; flex-direction: column; background: rgba(255,255,255,0.05); padding: 6px; margin-top: 6px; border-radius: 4px; }
    #ac-sidebar .ac-multi-row button { align-self: flex-end; background: #483a73; color: #fff; border: none; padding: 4px 6px; border-radius: 4px; cursor: pointer; }
    #ac-sidebar .ac-multi-src { font-weight: bold; }
    #ac-sidebar .ac-multi-src-text { opacity: 0.7; }
    #ac-toggle { position: fixed; left: 14px; bottom: 18px; background: #f9772e; color: #fff; border: none; border-radius: 50%; width: 54px; height: 54px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.35); z-index: 10000; }
    #ac-sidebar .ac-map-panel { position: fixed; right: -260px; top: 0; width: 260px; bottom: 0; background: #34416a; transition: right 0.3s ease; padding: 12px; box-shadow: -2px 0 8px rgba(0,0,0,0.4); }
    #ac-sidebar .ac-map-panel.active { right: 0; }
    #ac-sidebar .ac-map-header { display: flex; align-items: center; justify-content: space-between; font-weight: bold; margin-bottom: 10px; }
    #ac-sidebar .ac-map-body input { width: 100%; padding: 6px; margin-bottom: 8px; border-radius: 4px; border: none; }
    #ac-sidebar .ac-map-actions button { width: 100%; background: #f9772e; color: #fff; padding: 8px; border: none; border-radius: 4px; cursor: pointer; }
    #ac-sidebar .ac-recent-item { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
    #ac-sidebar .ac-stats div { margin-bottom: 4px; }
  `;
  document.head.appendChild(style);
};

AC.bootstrap = function() {
  if (AC.__bootstrapped) return;
  AC.__bootstrapped = true;
  AC.injectStyles();
  AC.buildSidebar();
  AC.switchTab('log');
  AC.renderLog();
  AC.renderRecent();
  AC.renderStats();
  AC.renderDict();
  AC.scanEditors();
  AC.observeMutations();
};

AC.bootstrap();
