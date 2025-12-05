(function(){
  if (window.__acLoaded) return;
  window.__acLoaded = true;
  'use strict';

  /* =============================
     STORAGE + STATE
     ============================= */
  const STORAGE = {
    LOG: 'ac_spell_log_v4',
    DICT: 'ac_custom_dict_v4',
    MAP: 'ac_custom_map_v4',
    CAPS: 'ac_caps_rules_v4'
  };

  const loadJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback));
    } catch (e) {
      return JSON.parse(JSON.stringify(fallback));
    }
  };
  const saveJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  };

  const state = {
    log: loadJSON(STORAGE.LOG, []),
    customList: loadJSON(STORAGE.DICT, []),
    customMap: loadJSON(STORAGE.MAP, {}),
    caps: loadJSON(STORAGE.CAPS, {}),
    customSet: new Set(),
    flatMap: {},
    multi: [],
    canonicals: [],
    recent: [],
    listeners: new WeakMap(),
    observer: null,
    open: false
  };

  /* =============================
     BASE DICTIONARIES
     ============================= */
  const baseDict = {
    'Abarth': ['abart', 'abarht', 'abarth?'],
    'Alfa Romeo': ['alfaromeo', 'alpha romeo', 'alfa romo'],
    'Citroën': ['citroen', 'citreon'],
    'DS': ['ds', 'd.s.'],
    'DS Automobiles': ['ds automoblies', 'ds automobils'],
    'Fiat': ['fiatt', 'fiadt'],
    'Jeep': ['jepp', 'jeap'],
    'Leapmotor': ['leap motor', 'leapmotors'],
    'Peugeot': ['peugot', 'peugeut', 'peugeoet'],
    'Vauxhall': ['vauxel', 'vauxall', 'vaxhall'],
    'Stellantis': ['stellantus', 'stellentis'],
    'Stellantis &You': ['stellantis and you', 'stellantis & you'],
    'Motability': ['motablity', 'motability'],
    'LivePerson': ['live person', 'livepersom', 'lp chat']
  };

  const baseMulti = [
    { src: 'test drive', tgt: 'test drive' },
    { src: 'thank you', tgt: 'Thank you' },
    { src: 'good morning', tgt: 'Good morning' },
    { src: 'good afternoon', tgt: 'Good afternoon' },
    { src: 'good evening', tgt: 'Good evening' },
    { src: 'live person', tgt: 'LivePerson' }
  ];

  /* =============================
     CAPS RULES
     ============================= */
  const ensureDefaultCaps = () => {
    const defaults = [
      'Abarth','Alfa Romeo','Citroën','DS','DS Automobiles','Fiat','Jeep','Leapmotor',
      'Peugeot','Vauxhall','Stellantis','Stellantis &You',
      'London','UK','Motability',
      'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
      'January','February','March','April','May','June','July','August','September',
      'October','November','December'
    ];
    defaults.forEach(w=>{ if(!(w in state.caps)) state.caps[w] = true; });
    saveJSON(STORAGE.CAPS, state.caps);
  };
  ensureDefaultCaps();

  /* =============================
     UTILITIES
     ============================= */
  const isSentenceStart = (text) => {
    if (!text.trim()) return true;
    return /[.!?]\s*$/.test(text);
  };

  const adjustCase = (canonical, sample, start) => {
    if (state.caps[canonical]) return canonical;
    if (sample === sample.toUpperCase()) return canonical.toUpperCase();
    if (sample[0] === sample[0].toUpperCase()) return canonical.charAt(0).toUpperCase() + canonical.slice(1);
    if (start) return canonical.charAt(0).toUpperCase() + canonical.slice(1);
    return canonical;
  };

  const normalizeTime = (word) => {
    const clean = word.replace(/[^0-9apm:]/gi, '').toLowerCase();
    const m = clean.match(/^([0-2]?\d)(?::([0-5]\d))?(am|pm)?$/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    let min = m[2] ? parseInt(m[2], 10) : 0;
    if (h > 24 || min > 59) return null;
    if (m[3]) {
      const suffix = m[3];
      if (suffix === 'am') {
        if (h === 12) h = 0;
      } else if (suffix === 'pm') {
        if (h !== 12) h += 12;
      }
    }
    if (h === 24) h = 0;
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  };

  const cleanLog = () => {
    state.log = (state.log || []).filter(e=>e && e.word && typeof e.word === 'string');
    saveJSON(STORAGE.LOG, state.log);
  };

  /* =============================
     MAP REBUILD
     ============================= */
  const rebuildMaps = () => {
    state.customList = Array.from(new Set((state.customList || []).filter(w => typeof w === 'string' && w.trim().length > 1))).sort();
    state.customSet = new Set(state.customList);

    const flat = {};
    const canonicalSet = new Set();

    Object.entries(baseDict).forEach(([canon, arr]) => {
      canonicalSet.add(canon);
      flat[canon.toLowerCase()] = canon;
      (arr||[]).forEach(a => { if (a) flat[a.toLowerCase()] = canon; });
    });

    state.customSet.forEach(canon => { canonicalSet.add(canon); flat[canon.toLowerCase()] = canon; });

    Object.entries(state.customMap || {}).forEach(([miss, canon]) => {
      if (!canon) return;
      canonicalSet.add(canon);
      flat[miss.toLowerCase()] = canon;
    });

    state.flatMap = flat;
    state.multi = baseMulti.map(m => ({...m, src: m.src.toLowerCase()}));
    state.canonicals = Array.from(canonicalSet).sort();
    saveJSON(STORAGE.DICT, state.customList);
    saveJSON(STORAGE.MAP, state.customMap);
  };
  rebuildMaps();
  cleanLog();

  /* =============================
     LOGGING
     ============================= */
  const logUnknown = (word, sentence) => {
    if (!word || word.length < 2) return;
    const lower = word.toLowerCase();
    if (state.flatMap[lower] || state.customSet.has(word) || state.canonicals.includes(word)) return;
    const t = normalizeTime(word);
    if (t) return;
    state.log.push({ word: word, when: Date.now(), sentence: sentence || '' });
    saveJSON(STORAGE.LOG, state.log);
    renderLog();
    renderStats();
  };

  /* =============================
     TEXT + CARET HELPERS
     ============================= */
  const caretIndex = (root) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return -1;
    const range = sel.getRangeAt(0).cloneRange();
    let index = -1;
    try {
      const pre = range.cloneRange();
      pre.selectNodeContents(root);
      pre.setEnd(sel.focusNode, sel.focusOffset);
      index = pre.toString().length;
    } catch (e) { index = -1; }
    return index;
  };

  const findTextPosition = (root, offset) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node = walker.nextNode();
    let pos = offset;
    while (node) {
      const len = node.nodeValue.length;
      if (pos <= len) return { node, offset: pos };
      pos -= len;
      node = walker.nextNode();
    }
    return null;
  };

  const replaceSlice = (root, start, end, text) => {
    const startPos = findTextPosition(root, start);
    const endPos = findTextPosition(root, end);
    if (!startPos || !endPos) return;
    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    const caret = document.createRange();
    caret.setStart(node, text.length);
    caret.collapse(true);
    sel.addRange(caret);
  };

  /* =============================
     AUTOCORRECT ENGINE
     ============================= */
  const triggers = new Set([' ', 'Enter', '.', ',', '!', '?']);

  const processText = (root) => {
    const sel = window.getSelection();
    if (!sel.rangeCount || !root.contains(sel.focusNode)) return;
    const text = root.innerText || root.textContent || '';
    const caret = caretIndex(root);
    if (caret < 0) return;
    const before = text.slice(0, caret);
    const after = text.slice(caret);

    const lastChunkMatch = before.match(/([^\s]+)[\s]*$/);
    if (!lastChunkMatch) return;
    const lastChunk = lastChunkMatch[1];
    let trailing = '';
    const punctMatch = lastChunk.match(/([A-Za-z'’:0-9]+)([.,!?]*)$/);
    if (punctMatch) trailing = punctMatch[2] || '';
    const rawWord = punctMatch ? punctMatch[1] : lastChunk;
    const lowerWord = rawWord.toLowerCase();

    // Multi-word
    const words = before.trim().split(/\s+/).map(w=>w.replace(/[.,!?]+$/,''));
    for (let len = Math.min(4, words.length); len >= 2; len--) {
      const slice = words.slice(-len);
      const phrase = slice.join(' ').toLowerCase();
      const rule = state.multi.find(m => m.src === phrase);
      if (rule) {
        const startIdx = before.toLowerCase().lastIndexOf(phrase);
        const newBefore = before.slice(0, startIdx) + rule.tgt;
        const newCaret = newBefore.length + (caret - before.length);
        const updated = newBefore + after;
        root.innerText = updated;
        const pos = findTextPosition(root, newCaret);
        if (pos) {
          const sel2 = window.getSelection();
          sel2.removeAllRanges();
          const r = document.createRange();
          r.setStart(pos.node, pos.offset);
          r.collapse(true);
          sel2.addRange(r);
        }
        state.recent.unshift({ from: phrase, to: rule.tgt, at: Date.now() });
        state.recent = state.recent.slice(0, 25);
        renderRecent();
        renderStats();
        return;
      }
    }

    // Time normalization
    const normalizedTime = normalizeTime(lowerWord);
    if (normalizedTime) {
      if (normalizedTime !== rawWord) {
        const startIndex = before.length - rawWord.length - trailing.length;
        replaceSlice(root, startIndex, startIndex + rawWord.length, normalizedTime);
        state.recent.unshift({ from: rawWord, to: normalizedTime, at: Date.now() });
        state.recent = state.recent.slice(0, 25);
        renderRecent();
        renderStats();
      }
      return;
    }

    const canonical = state.flatMap[lowerWord];
    const startSentence = isSentenceStart(before.slice(0, before.length - rawWord.length - trailing.length));
    let replacement = null;
    if (lowerWord === 'i') {
      replacement = 'I';
    } else if (canonical) {
      replacement = adjustCase(canonical, rawWord, startSentence);
    }

    if (replacement && replacement !== rawWord) {
      const startIndex = before.length - rawWord.length - trailing.length;
      replaceSlice(root, startIndex, startIndex + rawWord.length, replacement);
      state.recent.unshift({ from: rawWord, to: replacement, at: Date.now() });
      state.recent = state.recent.slice(0, 25);
      renderRecent();
      renderStats();
      return;
    }

    if (!canonical && lowerWord.length > 2) {
      const sentence = before.split(/[.!?]/).pop()?.trim() || rawWord;
      logUnknown(rawWord, sentence);
    }
  };

  const unifiedHandler = (e) => {
    if (!triggers.has(e.key)) return;
    const el = e.currentTarget;
    setTimeout(() => processText(el), 0);
  };

  const attachEditor = (el) => {
    if (state.listeners.has(el)) return;
    el.addEventListener('keydown', unifiedHandler, true);
    state.listeners.set(el, true);
  };

  const scanEditors = () => {
    const nodes = document.querySelectorAll('.ql-editor, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], div[role="textbox"]');
    nodes.forEach(attachEditor);
  };

  /* =============================
     UI COMPONENTS
     ============================= */
  const styleTag = document.createElement('style');
  styleTag.textContent = `
  #ac-toggle{position:fixed;left:12px;bottom:12px;width:38px;height:38px;border-radius:50%;background:#f9772e;color:#1e1d49;border:none;box-shadow:0 3px 10px rgba(0,0,0,.3);cursor:pointer;z-index:2147483646;font-weight:700;font-size:16px;}
  #ac-panel{position:fixed;left:12px;bottom:60px;width:320px;max-height:80vh;background:#1e1d49;color:#e5e9ff;border:1px solid #483a73;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.35);font-family:Inter,system-ui,sans-serif;font-size:13px;overflow:hidden;z-index:2147483646;display:none;}
  #ac-panel.ac-open{display:flex;flex-direction:column;}
  #ac-panel header{padding:10px 12px;background:#483a73;color:#e5e9ff;font-weight:700;display:flex;align-items:center;justify-content:space-between;}
  #ac-tabs{display:flex;border-bottom:1px solid #483a73;}
  #ac-tabs button{flex:1;padding:8px 6px;background:none;border:none;color:#e5e9ff;cursor:pointer;font-weight:600;}
  #ac-tabs button.active{background:#483a73;}
  #ac-content{padding:10px;overflow:auto;flex:1;}
  #ac-content .row{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:6px;}
  #ac-content .pill{padding:3px 6px;background:#483a73;border-radius:6px;font-weight:600;}
  #ac-content .btn{background:#f9772e;border:none;color:#1e1d49;padding:4px 8px;border-radius:6px;cursor:pointer;font-weight:700;}
  #ac-content input, #ac-content textarea{width:100%;background:#101029;border:1px solid #483a73;color:#e5e9ff;border-radius:6px;padding:6px;font-size:13px;}
  #ac-map-panel{position:fixed;right:-360px;top:50%;transform:translateY(-50%);width:320px;max-height:80vh;background:#1e1d49;color:#e5e9ff;border:1px solid #483a73;border-radius:10px 0 0 10px;box-shadow:-6px 0 18px rgba(0,0,0,.35);transition:right .2s ease;z-index:2147483646;display:flex;flex-direction:column;}
  #ac-map-panel.open{right:0;}
  #ac-map-panel header{padding:10px 12px;background:#483a73;font-weight:700;display:flex;align-items:center;justify-content:space-between;}
  #ac-map-list{flex:1;overflow:auto;padding:8px 10px;}
  #ac-map-list button{width:100%;text-align:left;background:#101029;border:1px solid #483a73;color:#e5e9ff;padding:6px 8px;border-radius:6px;margin-bottom:6px;cursor:pointer;}
  #ac-map-actions{padding:8px 10px;border-top:1px solid #483a73;display:flex;gap:6px;}
  #ac-map-actions .btn{flex:1;}
  #ac-panel small{color:#9da4d4;}
  `;
  document.head.appendChild(styleTag);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'ac-toggle';
  toggleBtn.textContent = 'AC';
  document.body.appendChild(toggleBtn);

  const panel = document.createElement('div');
  panel.id = 'ac-panel';
  panel.innerHTML = `
    <header><span>Autocorrect</span><span style="font-size:12px">Alt+T</span></header>
    <div id="ac-tabs"></div>
    <div id="ac-content"></div>
  `;
  document.body.appendChild(panel);

  const tabs = [
    { id:'log', label:'Log' },
    { id:'recent', label:'Recent' },
    { id:'stats', label:'Stats' },
    { id:'export', label:'Export' },
    { id:'dict', label:'Dictionary' },
    { id:'settings', label:'Settings' }
  ];

  const tabBar = panel.querySelector('#ac-tabs');
  const content = panel.querySelector('#ac-content');
  let activeTab = 'log';

  tabs.forEach(t=>{
    const b = document.createElement('button');
    b.textContent = t.label;
    b.dataset.id = t.id;
    b.className = t.id === activeTab ? 'active' : '';
    b.onclick = () => { activeTab = t.id; updateTabs(); };
    tabBar.appendChild(b);
  });

  const updateTabs = () => {
    tabBar.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.id === activeTab));
    if (activeTab === 'log') renderLog();
    else if (activeTab === 'recent') renderRecent();
    else if (activeTab === 'stats') renderStats();
    else if (activeTab === 'export') renderExport();
    else if (activeTab === 'dict') renderDict();
    else renderSettings();
  };

  const openPanel = () => { state.open = true; panel.classList.add('ac-open'); updateTabs(); };
  const closePanel = () => { state.open = false; panel.classList.remove('ac-open'); };
  const togglePanel = () => { state.open ? closePanel() : openPanel(); };

  toggleBtn.addEventListener('click', togglePanel);
  window.addEventListener('keydown', e => { if (e.altKey && (e.key==='t' || e.key==='T')) { e.preventDefault(); togglePanel(); } });

  /* =============================
     LOG TAB
     ============================= */
  const renderLog = () => {
    if (activeTab !== 'log') return;
    const grouped = {};
    state.log.forEach(item => { const k = item.word; grouped[k] = grouped[k] || []; grouped[k].push(item); });
    const entries = Object.entries(grouped).sort((a,b)=>b[1].length - a[1].length);
    content.innerHTML = '';
    if (!entries.length) { content.innerHTML = '<small>No unknown words logged.</small>'; return; }
    entries.forEach(([word,list])=>{
      const row = document.createElement('div'); row.className='row';
      const left = document.createElement('div');
      left.innerHTML = `<div><span class="pill">${list.length}</span> ${word}</div><small>${list[0].sentence||''}</small>`;
      const btns = document.createElement('div'); btns.style.display='flex'; btns.style.gap='4px';
      const addBtn = document.createElement('button'); addBtn.className='btn'; addBtn.textContent='Add';
      addBtn.onclick=()=>{ state.customSet.add(word); state.customList = Array.from(state.customSet).sort(); rebuildMaps(); renderDict(); renderStats(); };
      const mapBtn = document.createElement('button'); mapBtn.className='btn'; mapBtn.textContent='Map';
      mapBtn.onclick=()=>openMapping(word);
      btns.append(addBtn,mapBtn);
      row.append(left,btns);
      content.appendChild(row);
    });
  };

  /* =============================
     RECENT TAB
     ============================= */
  const renderRecent = () => {
    if (activeTab !== 'recent') return;
    content.innerHTML = '';
    if (!state.recent.length) { content.innerHTML='<small>No recent corrections.</small>'; return; }
    state.recent.slice(0,30).forEach(r=>{
      const row=document.createElement('div');row.className='row';
      const when = new Date(r.at).toLocaleTimeString();
      row.innerHTML = `<div><strong>${r.from}</strong> → ${r.to}<br><small>${when}</small></div>`;
      content.appendChild(row);
    });
  };

  /* =============================
     STATS TAB
     ============================= */
  const renderStats = () => {
    if (activeTab !== 'stats') return;
    const unknown = state.log.length;
    const mapped = Object.keys(state.customMap).length;
    const customWords = state.customSet.size;
    content.innerHTML = `
      <div class="row"><div>Unknown logged</div><div class="pill">${unknown}</div></div>
      <div class="row"><div>Custom words</div><div class="pill">${customWords}</div></div>
      <div class="row"><div>Custom mappings</div><div class="pill">${mapped}</div></div>
    `;
  };

  /* =============================
     EXPORT TAB
     ============================= */
  const renderExport = () => {
    if (activeTab !== 'export') return;
    const payload = { log: state.log, custom: Array.from(state.customSet), map: state.customMap, caps: state.caps };
    content.innerHTML = '';
    const ta = document.createElement('textarea');
    ta.rows = 10; ta.value = JSON.stringify(payload, null, 2);
    content.appendChild(ta);
  };

  /* =============================
     DICTIONARY TAB
     ============================= */
  const renderDict = () => {
    if (activeTab !== 'dict') return;
    content.innerHTML = '';
    const addRow = document.createElement('div'); addRow.className='row';
    const input = document.createElement('input'); input.placeholder='Add word';
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='Add';
    btn.onclick=()=>{ const w=input.value.trim(); if (w.length>1){ state.customSet.add(w); state.customList = Array.from(state.customSet).sort(); rebuildMaps(); input.value=''; renderDict(); } };
    addRow.append(input,btn); content.appendChild(addRow);

    const list = document.createElement('div');
    const allWords = [...new Set([...state.canonicals])].sort();
    allWords.forEach(word=>{
      const row=document.createElement('div'); row.className='row';
      const mapped = Object.values(state.flatMap).includes(word);
      const star = document.createElement('button'); star.className='btn'; star.textContent = state.caps[word] ? '⭐' : '☆';
      star.style.width='34px';
      star.onclick=()=>{ state.caps[word] = !state.caps[word]; saveJSON(STORAGE.CAPS, state.caps); renderDict(); };
      const label=document.createElement('div'); label.innerHTML=`${mapped?'⚙️':'⬜'} ${word}`;
      const remove=document.createElement('button'); remove.className='btn'; remove.textContent='✖';
      remove.style.width='34px';
      remove.onclick=()=>{ if (state.customSet.has(word)){ state.customSet.delete(word); state.customList=Array.from(state.customSet).sort(); rebuildMaps(); renderDict(); } };
      row.append(label,star,remove);
      list.appendChild(row);
    });
    content.appendChild(list);
  };

  /* =============================
     SETTINGS TAB
     ============================= */
  const renderSettings = () => {
    content.innerHTML = `
      <div class="row"><div>Version</div><div class="pill">4</div></div>
      <small>Unified autocorrect engine with logging and mapping tools.</small>
    `;
  };

  /* =============================
     MAPPING PANEL
     ============================= */
  const mapPanel = document.createElement('div');
  mapPanel.id = 'ac-map-panel';
  mapPanel.innerHTML = `
    <header><span>Assign Mapping</span><button class="btn" style="width:auto;padding:4px 8px;">Close</button></header>
    <div style="padding:8px 10px;display:flex;gap:6px;align-items:center;">
      <input id="ac-map-from" placeholder="Misspelling" />
    </div>
    <div style="padding:0 10px 6px 10px;"><input id="ac-map-filter" placeholder="Filter canonicals" /></div>
    <div id="ac-map-list"></div>
    <div id="ac-map-actions"><button class="btn" id="ac-map-save">Save</button><button class="btn" id="ac-map-cancel">Cancel</button></div>
  `;
  document.body.appendChild(mapPanel);

  const mapCloseBtn = mapPanel.querySelector('header button');
  const mapFrom = mapPanel.querySelector('#ac-map-from');
  const mapFilter = mapPanel.querySelector('#ac-map-filter');
  const mapList = mapPanel.querySelector('#ac-map-list');
  const mapSave = mapPanel.querySelector('#ac-map-save');
  const mapCancel = mapPanel.querySelector('#ac-map-cancel');
  let mapSelection = null;

  const renderMapList = () => {
    const q = mapFilter.value.trim().toLowerCase();
    mapList.innerHTML = '';
    state.canonicals.filter(c => !q || c.toLowerCase().includes(q)).forEach(c => {
      const b = document.createElement('button');
      b.textContent = c;
      b.classList.toggle('active', mapSelection === c);
      b.onclick = () => { mapSelection = c; renderMapList(); };
      mapList.appendChild(b);
    });
  };

  const openMapping = (word) => {
    mapFrom.value = word || '';
    mapFilter.value = '';
    mapSelection = state.canonicals[0] || '';
    renderMapList();
    mapPanel.classList.add('open');
  };

  const closeMapping = () => { mapPanel.classList.remove('open'); };

  mapFilter.addEventListener('input', renderMapList);
  mapCloseBtn.onclick = closeMapping;
  mapCancel.onclick = closeMapping;
  mapSave.onclick = () => {
    const miss = mapFrom.value.trim();
    if (!miss || !mapSelection) return;
    state.customMap[miss] = mapSelection;
    rebuildMaps();
    renderDict();
    renderLog();
    closeMapping();
  };

  /* =============================
     MUTATION OBSERVER
     ============================= */
  const observer = new MutationObserver(()=>scanEditors());
  observer.observe(document.body, { childList:true, subtree:true });
  state.observer = observer;
  scanEditors();

  // Initial render
  renderLog();

})();
