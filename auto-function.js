(function(){

'use strict';
/* ============================
   LEVEL 1 - GLOBAL + STORAGE
   ============================ */

const AC = window.AC = window.AC || {};

function loadJSON(key, fallback){
    try{
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : JSON.parse(fallback);
    } catch(e){
        return JSON.parse(fallback);
    }
}

function saveJSON(key, value){
    try{
        localStorage.setItem(key, JSON.stringify(value));
    } catch(e){}
}

const STORAGE = {
    LOG:  'ac_spell_log_v3',
    DICT: 'ac_custom_dict_v3',
    MAP:  'ac_custom_map_v3',
    CAPS: 'ac_caps_rules_v3'
};

AC.state = AC.state || {};
AC.state.log        = loadJSON(STORAGE.LOG,  '[]');
AC.state.customList = loadJSON(STORAGE.DICT, '[]');
AC.state.customMap  = loadJSON(STORAGE.MAP,  '{}');
AC.state.caps       = loadJSON(STORAGE.CAPS, '{}');

AC.state.customList = AC.state.customList
    .filter(w => typeof w === 'string' && w.trim().length > 1)
    .sort();

AC.state.customSet  = new Set(AC.state.customList);
AC.state.flatMap    = {};
AC.state.multi      = [];
AC.state.canonicals = [];


/* ============================
   LEVEL 2 - SAVE HELPERS
   ============================ */

AC.saveLog = function(){
    AC.state.log = (AC.state.log || []).filter(e =>
        e && e.word && typeof e.word === 'string' && e.word.trim().length >= 2
    );
    saveJSON(STORAGE.LOG, AC.state.log);
};

AC.saveCustomDict = function(){
    AC.state.customList = Array.from(new Set(AC.state.customSet)).sort();
    saveJSON(STORAGE.DICT, AC.state.customList);
};

AC.saveCustomMap = function(){
    saveJSON(STORAGE.MAP, AC.state.customMap || {});
};

AC.saveCaps = function(){
    saveJSON(STORAGE.CAPS, AC.state.caps || {});
};


/* ============================
   LEVEL 3 - CAPS RULES
   ============================ */

AC.ensureDefaultCaps = function(){
    const caps = AC.state.caps;

    const defaults = [
        'Abarth','Alfa Romeo','Citroën','DS','DS Automobiles','Fiat','Jeep','Leapmotor',
        'Peugeot','Vauxhall','Stellantis','Stellantis &You',
        'London','UK','Motability',
        'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
        'January','February','March','April','May','June','July','August','September',
        'October','November','December'
    ];

    defaults.forEach(w=>{
        if (!Object.prototype.hasOwnProperty.call(caps, w))
            caps[w] = true;
    });

    AC.saveCaps();
};

AC.ensureDefaultCaps();


/* ============================
   SENTENCE RULES
   ============================ */

function isSentenceStart(text){
    if (!text.trim()) return true;
    return /[.!?]\s*$/.test(text);
}

function applyCaps(canonical, start){
    const caps = AC.state.caps || {};
    if (caps[canonical]) return canonical;
    if (start){
        return canonical.charAt(0).toUpperCase() + canonical.slice(1);
    }
    return canonical;
}
/* ============================
   LEVEL 4 - DICTIONARY ENGINE
   ============================ */

/* ---------- BUILT-IN BASE DICTIONARY ---------- */

AC.baseDict = {
    'Abarth': ['abart','abarht','abarth?'],
    'Alfa Romeo': ['alfaromeo','alpha romeo','alfa romo'],
    'Citroën': ['citroen','citreon'],
    'DS': ['ds','d.s.'],
    'DS Automobiles': ['ds automoblies','ds automobils'],
    'Fiat': ['fiatt','fiadt'],
    'Jeep': ['jepp','jeap'],
    'Leapmotor': ['leap motor','leapmotors'],
    'Peugeot': ['peugot','peugeut','peugeoet'],
    'Vauxhall': ['vauxel','vauxall','vaxhall'],
    'Stellantis': ['stellantus','stellentis'],
    'Stellantis &You':['stellantis and you','stellantis & you']
};


/* ---------- HEAL DICTIONARIES ---------- */

AC.healDictionaries = function(){

    /* CLEAN CUSTOM DICTIONARY */
    const list = AC.state.customList || [];
    const cleaned = list.filter(w => w && typeof w === 'string' && w.trim().length > 1);
    const set = new Set(cleaned);

    AC.state.customSet = set;
    AC.state.customList = Array.from(set).sort();

    /* CLEAN CUSTOM MAP */
    const map = AC.state.customMap || {};
    for (const c in map){
        if (!c || !c.trim()){
            delete map[c];
            continue;
        }
        map[c] = map[c].filter(m => m && m.trim().length > 1);
    }

    AC.state.customMap = map;

    /* SAVE UPDATED STRUCTURES */
    AC.saveCustomDict();
    AC.saveCustomMap();
};


/* ---------- REBUILD LOOKUP TABLES ---------- */

AC.rebuildMaps = function(){

    const base      = AC.baseDict || {};
    const customMap = AC.state.customMap || {};
    const customSet = AC.state.customSet;

    const flat      = {};
    const multi     = [];
    const canonS    = new Set();

    /* Add canonical word */
    function addCanon(c){
        if (!c) return;
        canonS.add(c);

        const lc = c.toLowerCase();
        if (!flat[lc]) flat[lc] = c;

        if (c.includes(' '))
            multi.push({ key: lc, canonical: c });
    }

    /* Add misspelling */
    function addMiss(m, c){
        if (!m || !c) return;

        const lm = m.toLowerCase();
        if (!flat[lm]) flat[lm] = c;

        if (m.includes(' '))
            multi.push({ key: lm, canonical: c });
    }

    /* --- BASE DICT --- */
    for (const c in base){
        addCanon(c);
        (base[c] || []).forEach(m => addMiss(m, c));
    }

    /* --- CUSTOM MAP --- */
    for (const c in customMap){
        addCanon(c);
        (customMap[c] || []).forEach(m => addMiss(m, c));
    }

    /* --- CUSTOM CORRECT WORDS --- */
    customSet.forEach(c => addCanon(c));

    /* Save final state */
    AC.state.flatMap    = flat;
    AC.state.multi      = multi;
    AC.state.canonicals = Array.from(canonS).sort();
};


/* ---------- ASSIGN MAPPING (MISSPELL → CANONICAL) ---------- */

AC.assignMissFromDict = function(miss, canonical){

    const m = miss.trim();
    const c = canonical.trim();
    if (!m || !c) return;

    const lower = m.toLowerCase();

    /* Ensure canonical entry exists */
    if (!AC.state.customMap[c])
        AC.state.customMap[c] = [];

    /* Avoid duplicates */
    const exists = AC.state.customMap[c]
        .some(x => x.toLowerCase() === lower);

    if (!exists){
        AC.state.customMap[c].push(m);
    }

    /* Save & rebuild */
    AC.saveCustomMap();
    AC.healDictionaries();
    AC.rebuildMaps();

    /* Remove from log once assigned */
    AC.state.log = (AC.state.log || []).filter(e => e.word !== lower);
    AC.saveLog();
};
/* ============================
   LEVEL 5 - TIME ENGINE
   ============================ */

AC.isValidTime = function(str){
    if (!str) return false;
    const s = str.trim().toLowerCase();

    /* 3pm / 10am */
    if (/^\d{1,2}\s*(am|pm)$/.test(s)) return true;

    /* 14:30 */
    if (/^\d{1,2}:\d{2}$/.test(s)){
        const [h,m] = s.split(':').map(Number);
        return h>=0 && h<=23 && m>=0 && m<=59;
    }

    /* 3:15pm */
    if (/^\d{1,2}:\d{2}\s*(am|pm)$/.test(s)){
        const m = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
        if (!m) return false;
        const hh = Number(m[1]);
        const mm = Number(m[2]);
        return hh>=1 && hh<=12 && mm>=0 && mm<=59;
    }

    return false;
};

AC.normaliseTime = function(str){
    if (!str) return str;
    const s = str.trim().toLowerCase();

    /* 3pm */
    if (/^\d{1,2}\s*(am|pm)$/.test(s)){
        const m = s.match(/(\d{1,2})\s*(am|pm)/);
        let h = Number(m[1]);
        const ap = m[2];

        if (ap === 'pm' && h !== 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;

        return (h<10?'0':'')+h + ':00';
    }

    /* 14:30 */
    if (/^\d{1,2}:\d{2}$/.test(s)){
        const [h,m] = s.split(':').map(Number);
        return (h<10?'0':'')+h + ':' + (m<10?'0':'')+m;
    }

    /* 3:15pm */
    if (/^\d{1,2}:\d{2}\s*(am|pm)$/.test(s)){
        const m = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
        let hh = Number(m[1]);
        const mm = Number(m[2]);
        const ap = m[3];

        if (ap === 'pm' && hh !== 12) hh += 12;
        if (ap === 'am' && hh === 12) hh = 0;

        return (hh<10?'0':'')+hh + ':' + (mm<10?'0':'')+mm;
    }

    return str;
};

AC.cleanNumericLogs = function(){
    AC.state.log = (AC.state.log || []).filter(e=>{
        if (!e || !e.word) return false;

        /* only allow digits if part of valid time */
        if (/\d/.test(e.word)){
            return AC.isValidTime(e.word);
        }
        return true;
    });

    AC.saveLog();
};


/* ============================
   LEVEL 6 - LOGGING ENGINE
   ============================ */

function todayStr(){
    return new Date().toISOString().slice(0,10);
}

AC.captureSentence = function(){
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return '';

    const r = sel.getRangeAt(0);
    const container = r.commonAncestorContainer;
    const root = container.nodeType === 3 ? container.parentNode : container;

    const text = root.innerText || root.textContent || '';
    if (!text) return '';

    const caret = r.startOffset;
    const cleaned = text.replace(/\s+/g, ' ');

    let start = caret;
    while (start > 0 && !/[.!?]/.test(cleaned[start-1])) start--;

    let end = caret;
    while (end < cleaned.length && !/[.!?]/.test(cleaned[end])) end++;

    return cleaned.slice(start, end+1).trim();
};

AC.recordUnknown = function(word){
    if (!word) return;

    const w = word.trim().toLowerCase();
    if (w.length < 2) return;

    /* If starts with digit, ignore unless a valid time */
    if (/^\d/.test(w) && !AC.isValidTime(w)) return;
    if (AC.isValidTime(w)) return;

    /* Known word */
    if (AC.state.flatMap[w] || AC.state.customSet.has(w)) return;

    const today = todayStr();
    const exists = (AC.state.log || []).some(e=>e.word === w && e.when.slice(0,10) === today);
    if (exists) return;

    AC.state.log.push({
        word: w,
        when: new Date().toISOString(),
        sentence: AC.captureSentence()
    });

    AC.saveLog();
};


/* ============================
   LEVEL 7 - CARET ENGINE
   ============================ */

AC.setCaret = function(div, index){
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    let count = 0;

    while(node){
        const next = count + node.nodeValue.length;
        if (next >= index){
            const range = document.createRange();
            const sel = window.getSelection();

            range.setStart(node, Math.max(0, index - count));
            range.collapse(true);

            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }
        count = next;
        node = walker.nextNode();
    }
};

/* UNDO SYSTEM */

AC.lastCorrection = null;

AC.undoLastCorrection = function(){
    const c = AC.lastCorrection;
    if (!c || !c.div) return;

    c.div.innerText = c.before;
    AC.setCaret(c.div, Math.min(c.caretBefore, c.before.length));

    AC.lastCorrection = null;
};


/* ============================
   LEVEL 8 - AUTOCORRECT ENGINE
   ============================ */

AC.correctInDiv = function(div, triggerKey){

    const valid = [' ', 'Enter', '.', ',', '!', '?'];
    if (!valid.includes(triggerKey)) return;

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const rng = sel.getRangeAt(0);
    if (!rng.collapsed) return;

    const fullText = div.innerText;
    const flat = AC.state.flatMap;
    const multi = AC.state.multi;

    /* extract what's before caret */
    const r = rng.cloneRange();
    r.selectNodeContents(div);
    r.setEnd(rng.endContainer, rng.endOffset);

    let typed = r.toString();
    const delim = triggerKey === 'Enter' ? '\n' : triggerKey;
    if (!typed.endsWith(delim)) return;

    const before = typed.slice(0, -1);
    const after = fullText.slice(typed.length);
    const original = before + delim + after;

    const lowerBefore = before.toLowerCase();


    /* ---------- MULTI-WORD MATCHING ---------- */

    for (let i = 0; i < multi.length; i++){
        const { key, canonical } = multi[i];
        const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const re = new RegExp(`(?:^|\\s)(${esc})(?=$|\\s|[.,!?])`, 'i');
        const match = lowerBefore.match(re);

        if (match){
            const startIndex = match.index;
            const endIndex = startIndex + match[1].length;

            const isStart = isSentenceStart(before.slice(0, startIndex));
            const corrected = applyCaps(canonical, isStart);

            const newBefore =
                before.slice(0, startIndex) +
                corrected +
                before.slice(endIndex);

            const newFull = newBefore + delim + after;

            div.innerText = newFull;
            AC.setCaret(div, newBefore.length + 1);

            AC.lastCorrection = {
                div, before: original, after: newFull,
                caretBefore: typed.length,
                caretAfter: newBefore.length + 1
            };

            return;
        }
    }


    /* ---------- SINGLE TOKEN ---------- */

    const parts = before.split(/(\s+)/);
    let idx = -1;

    for (let i = parts.length - 1; i >= 0; i--){
        if (parts[i].trim() !== ''){
            idx = i;
            break;
        }
    }
    if (idx < 0) return;

    const token = parts[idx].match(/^(.+?)(['’]s|s['’])?([.,!?])?$/);

    const core  = token ? token[1] : parts[idx];
    const poss  = token && token[2] ? token[2] : '';
    const punct = token && token[3] ? token[3] : '';


    /* ---------- TIME NORMALISATION ---------- */

    if (AC.isValidTime(core)){
        const norm = AC.normaliseTime(core);

        parts[idx] = norm + poss + punct;

        const newBefore = parts.join('');
        const newFull = newBefore + delim + after;

        div.innerText = newFull;
        AC.setCaret(div, newBefore.length + 1);

        AC.lastCorrection = {
            div, before: original, after: newFull,
            caretBefore: typed.length,
            caretAfter: newBefore.length + 1
        };

        return;
    }


    /* ---------- UNKNOWN WORD LOGGING ---------- */

    AC.recordUnknown(core);

    const lowerCore = core.toLowerCase();
    let canonical = flat[lowerCore] || null;

    /* Special case: i → I */
    if (!canonical && lowerCore === 'i'){
        canonical = 'I';
    }

    const isStart = isSentenceStart(before);


    /* ---------- FINAL REPLACEMENT ---------- */

    const replacement = canonical
        ? applyCaps(canonical, isStart)
        : (isStart
            ? core.charAt(0).toUpperCase() + core.slice(1)
            : core);

    if (replacement !== core){
        parts[idx] = replacement + poss + punct;

        const newBefore = parts.join('');
        const newFull = newBefore + delim + after;

        div.innerText = newFull;
        AC.setCaret(div, newBefore.length + 1);

        AC.lastCorrection = {
            div, before: original, after: newFull,
            caretBefore: typed.length,
            caretAfter: newBefore.length + 1
        };
    }
};
/* ---------- ATTACH TO EDITABLE (REQUIRED FOR AUTOCORRECT TO RUN) ---------- */

AC.attachToEditable = function(div){
    if (div._acAttached) return;
    div._acAttached = true;

    div.addEventListener('keydown', function(e){
        AC.correctInDiv(div, e.key);
    });
};
/* ============================
   LEVEL 9 - MUTATION OBSERVER
   ============================ */

AC.scanEditables = function(){
    const items = document.querySelectorAll(
        '[contenteditable="true"], [contenteditable="plaintext-only"]'
    );
    items.forEach(div => AC.attachToEditable(div));
};

AC.mo = new MutationObserver(()=>AC.scanEditables());
AC.mo.observe(document.body, { childList: true, subtree: true });


/* ============================
   LEVEL 10 - UI CORE
   ============================ */

AC.ensureRoot = function(){
    let root = document.getElementById('ac-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'ac-root';
    root.style.position = 'fixed';
    root.style.left = '0';
    root.style.top = '0';
    root.style.width = '280px';
    root.style.height = '100%';
    root.style.pointerEvents = 'none';
    root.style.zIndex = '2147483646';

    document.body.appendChild(root);
    return root;
};

AC.ensureToggleButton = function(){
    if (AC._toggleInit) return;
    AC._toggleInit = true;

    if (document.getElementById('ac-toggle')) return;

    const b = document.createElement('div');
    b.id = 'ac-toggle';
    b.style.position = 'fixed';
    b.style.left = '14px';
    b.style.bottom = '14px';
    b.style.width = '26px';
    b.style.height = '26px';
    b.style.borderRadius = '50%';
    b.style.background = '#f9772e';
    b.style.boxShadow = '0 0 8px rgba(249,119,46,0.6)';
    b.style.cursor = 'pointer';
    b.style.zIndex = '2147483647';

    b.title = 'Autocorrect — click or press Alt+T';
    b.onclick = ()=>AC.toggleSidebar();

    document.body.appendChild(b);
};

AC.buildShell = function(){

    const root = AC.ensureRoot();
    root.style.pointerEvents = 'none';

    let sidebar = document.getElementById('ac-sidebar');
    if (!sidebar){
        sidebar = document.createElement('div');
        sidebar.id = 'ac-sidebar';
        sidebar.style.position = 'absolute';
        sidebar.style.left = '0';
        sidebar.style.top = '0';
        sidebar.style.width = '280px';
        sidebar.style.height = '100%';
        sidebar.style.background = '#1e1d49';
        sidebar.style.color = '#e5e9ff';
        sidebar.style.padding = '8px';
        sidebar.style.fontSize = '12px';
        sidebar.style.overflowY = 'auto';
        sidebar.style.borderRight = '2px solid #483a73';
        sidebar.style.boxShadow = '0 0 10px rgba(0,0,0,0.4)';
        sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.opacity = '0';
        sidebar.style.transition = 'transform .16s ease-out, opacity .16s ease-out';
        root.appendChild(sidebar);
    }

    let map = document.getElementById('ac-map-panel');
    if (!map){
        map = document.createElement('div');
        map.id = 'ac-map-panel';
        map.style.position = 'fixed';
        map.style.right = '0';
        map.style.top = '0';
        map.style.width = '320px';
        map.style.height = '100%';
        map.style.background = '#34416a';
        map.style.color = '#e5e9ff';
        map.style.padding = '10px';
        map.style.overflowY = 'auto';
        map.style.borderLeft = '2px solid #483a73';
        map.style.boxShadow = '0 0 10px rgba(0,0,0,0.4)';
        map.style.transform = 'translateX(100%)';
        map.style.opacity = '0';
        map.style.transition = 'transform .18s ease-out, opacity .18s ease-out';
        map.style.pointerEvents = 'none';
        map.style.zIndex = '2147483647';
        document.body.appendChild(map);
    }

    return { root, sidebar, map };
};


/* ============================
   OPEN / CLOSE SIDEBAR
   ============================ */

let _sidebarOpen = false;

AC.openSidebar = function(){
    const { root, sidebar } = AC.buildShell();
    root.style.pointerEvents = 'auto';
    sidebar.style.transform = 'translateX(0)';
    sidebar.style.opacity = '1';
    _sidebarOpen = true;
    AC.renderSidebar();
};

AC.closeSidebar = function(){
    const sidebar = document.getElementById('ac-sidebar');
    const root = document.getElementById('ac-root');

    if (root) root.style.pointerEvents = 'none';
    if (sidebar){
        sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.opacity = '0';
    }

    AC.closeMapPanel();
    _sidebarOpen = false;
};

AC.toggleSidebar = function(){
    if (_sidebarOpen) AC.closeSidebar();
    else AC.openSidebar();
};


/* ============================
   HOTKEY: Alt + T
   ============================ */

if (!AC._hotkeyBound){
    AC._hotkeyBound = true;

    window.addEventListener('keydown', (e)=>{
        if (e.altKey && e.code === 'KeyT'){
            e.preventDefault();
            e.stopPropagation();
            AC.toggleSidebar();
        }
    });
}


/* ============================
   LEVEL 11 - SIDEBAR RENDER SYSTEM
   ============================ */

AC._currentTab = 'log';

AC.renderSidebar = function(){
    AC.healDictionaries();
    AC.rebuildMaps();

    const sidebar = document.getElementById('ac-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = '';

    /* TABS */
    const tabsWrap = document.createElement('div');
    tabsWrap.style.marginBottom = '6px';

    const tabs = [
        { id:'log', label:'Log' },
        { id:'recent', label:'Recent' },
        { id:'stats', label:'Stats' },
        { id:'export', label:'Export' },
        { id:'dict', label:'Dictionary' },
        { id:'settings', label:'Settings' }
    ];

    tabs.forEach(t=>{
        const b = document.createElement('button');
        b.textContent = t.label;
        b.style.marginRight = '4px';
        b.style.padding = '3px 6px';
        b.style.fontSize = '11px';
        b.style.cursor = 'pointer';
        b.style.borderRadius = '3px';

        if (AC._currentTab === t.id){
            b.style.background = '#f9772e';
            b.style.color = '#fff';
            b.style.border = 'none';
        } else {
            b.style.background = '#34416a';
            b.style.color = '#fff';
            b.style.border = '1px solid #483a73';
        }

        b.onclick = ()=>{
            AC._currentTab = t.id;
            AC.renderSidebar();
        };

        tabsWrap.appendChild(b);
    });

    sidebar.appendChild(tabsWrap);

    /* CONTENT AREA */
    const box = document.createElement('div');
    box.style.whiteSpace = 'pre-wrap';
    sidebar.appendChild(box);

    const tab = AC._currentTab;

    if (tab === 'log')       return AC.renderLogTab(box);
    if (tab === 'recent')    return AC.renderRecentTab(box);
    if (tab === 'stats')     return AC.renderStatsTab(box);
    if (tab === 'export')    return AC.renderExportTab(box);
    if (tab === 'dict')      return AC.renderDictTab(box);
    if (tab === 'settings')  return AC.renderSettingsTab(box);
};


/* ============================
   LOG TAB
   ============================ */

AC.groupLogByWord = function(log){
    const out = {};
    log.forEach(e=>{
        if (!out[e.word]) out[e.word] = [];
        out[e.word].push(e);
    });
    return out;
};

AC.renderLogTab = function(box){
    const log = AC.state.log || [];
    const grouped = AC.groupLogByWord(log);
    const keys = Object.keys(grouped).sort();

    if (!keys.length){
        box.textContent = 'No entries yet.';
        return;
    }

    const info = document.createElement('div');
    info.textContent = 'Add as correct or Assign to canonical';
    info.style.marginBottom = '6px';
    info.style.opacity = '0.85';
    box.appendChild(info);

    keys.forEach(word=>{
        const row = document.createElement('div');
        row.style.padding = '4px 0';
        row.style.borderBottom = '1px solid #10122f';

        const header = document.createElement('div');
        header.textContent = word + ' (x' + grouped[word].length + ')';
        header.style.fontWeight = '600';
        header.style.marginBottom = '2px';
        row.appendChild(header);

        const wrap = document.createElement('div');

        const add = document.createElement('button');
        add.textContent = 'Add as correct';
        add.style.padding = '2px 6px';
        add.style.fontSize = '11px';
        add.style.marginRight = '4px';
        add.style.cursor = 'pointer';
        add.style.background = '#34416a';
        add.style.color = '#fff';
        add.style.border = '1px solid #483a73';
        add.style.borderRadius = '3px';
        add.onclick = ()=>{
            AC.state.customSet.add(word);
            AC.saveCustomDict();
            AC.healDictionaries();
            AC.state.log = AC.state.log.filter(e=>e.word !== word);
            AC.saveLog();
            AC.renderSidebar();
        };
        wrap.appendChild(add);

        const assign = document.createElement('button');
        assign.textContent = 'Assign';
        assign.style.padding = '2px 6px';
        assign.style.fontSize = '11px';
        assign.style.cursor = 'pointer';
        assign.style.background = '#f9772e';
        assign.style.color = '#fff';
        assign.style.border = 'none';
        assign.style.borderRadius = '3px';
        assign.style.boxShadow = '0 0 6px rgba(249,119,46,0.6)';
        assign.onclick = ()=>AC.openMapPanel(word);
        wrap.appendChild(assign);

        row.appendChild(wrap);
        box.appendChild(row);
    });
};


/* ============================
   RECENT TAB
   ============================ */

AC.renderRecentTab = function(box){
    const log = (AC.state.log || [])
        .slice()
        .sort((a,b)=>b.when.localeCompare(a.when));

    const info = document.createElement('div');
    info.textContent = 'Most recent entries:';
    info.style.marginBottom = '6px';
    info.style.opacity = '0.85';
    box.appendChild(info);

    if (!log.length){
        const t = document.createElement('div');
        t.textContent = 'No entries yet.';
        box.appendChild(t);
        return;
    }

    log.slice(0,50).forEach(e=>{
        const row = document.createElement('div');
        row.style.padding = '4px 0';
        row.style.borderBottom = '1px solid #10122f';

        const t1 = document.createElement('div');
        t1.textContent = e.when;
        t1.style.fontSize = '11px';
        t1.style.opacity = '0.8';
        row.appendChild(t1);

        const t2 = document.createElement('div');
        t2.textContent = e.word;
        t2.style.fontWeight = '600';
        row.appendChild(t2);

        if (e.sentence){
            const t3 = document.createElement('div');
            t3.textContent = '"' + e.sentence + '"';
            t3.style.fontSize = '11px';
            t3.style.opacity = '0.9';
            row.appendChild(t3);
        }

        box.appendChild(row);
    });
};


/* ============================
   STATS TAB
   ============================ */

AC.makeStatsText = function(){
    const log = AC.state.log || [];
    return 'Total log entries: ' + log.length + '\n'
         + 'Unique words: ' + new Set(log.map(e=>e.word)).size;
};

AC.renderStatsTab = function(box){
    box.textContent = AC.makeStatsText();
};


/* ============================
   EXPORT TAB
   ============================ */

AC.exportTXT = function(){
    const data = (AC.state.log || [])
        .map(e=>`${e.when} - ${e.word} - ${e.sentence || ''}`)
        .join('\n');

    const blob = new Blob([data], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ac_log.txt';
    a.click();
};

AC.exportCSV = function(){
    const rows = (AC.state.log || [])
        .map(e=>`"${e.when}","${e.word}","${(e.sentence||'').replace(/"/g,'""')}"`)
        .join('\n');

    const blob = new Blob([rows], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ac_log.csv';
    a.click();
};

AC.renderExportTab = function(box){
    const txt = document.createElement('button');
    txt.textContent = 'Download TXT';
    txt.style.padding = '3px 8px';
    txt.style.marginRight = '6px';
    txt.style.cursor = 'pointer';
    txt.style.background = '#34416a';
    txt.style.color = '#fff';
    txt.style.border = '1px solid #483a73';
    txt.style.borderRadius = '3px';
    txt.onclick = AC.exportTXT;

    const csv = document.createElement('button');
    csv.textContent = 'Download CSV';
    csv.style.padding = '3px 8px';
    csv.style.cursor = 'pointer';
    csv.style.background = '#34416a';
    csv.style.color = '#fff';
    csv.style.border = '1px solid #483a73';
    csv.style.borderRadius = '3px';
    csv.onclick = AC.exportCSV;

    box.appendChild(txt);
    box.appendChild(csv);
};


/* ============================
   DICTIONARY TAB
   ============================ */

AC.renderDictTab = function(box){

    const state = AC.state;

    const info = document.createElement('div');
    info.textContent = 'Filter & manage custom words:';
    info.style.marginBottom = '6px';
    info.style.opacity = '0.85';
    box.appendChild(info);

    const filter = document.createElement('input');
    filter.placeholder = 'Filter...';
    filter.style.width = '100%';
    filter.style.padding = '6px 8px';
    filter.style.marginBottom = '6px';
    filter.style.border = '1px solid #483a73';
    filter.style.background = '#1e1d49';
    filter.style.color = '#e5e9ff';
    filter.style.borderRadius = '4px';
    box.appendChild(filter);

    const listBox = document.createElement('div');
    listBox.style.maxHeight = '40vh';
    listBox.style.overflowY = 'auto';
    listBox.style.border = '1px solid #483a73';
    listBox.style.borderRadius = '4px';
    listBox.style.padding = '4px 0';
    box.appendChild(listBox);

    function draw(){
        const term = filter.value.toLowerCase();
        listBox.innerHTML = '';

        const arr = Array.from(state.customSet).sort();
        let shown = 0;

        arr.forEach(w=>{
            if (term && !w.toLowerCase().includes(term)) return;
            shown++;

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '4px 6px';

            const label = document.createElement('span');
            label.textContent = w;
            row.appendChild(label);

            const right = document.createElement('span');

            const caps = state.caps;
            const star = document.createElement('span');
            star.textContent = caps[w] ? '⭐' : '☆';
            star.style.cursor = 'pointer';
            star.style.marginRight = '6px';
            star.onclick = e=>{
                e.stopPropagation();
                if (caps[w]) delete caps[w];
                else caps[w] = true;
                AC.saveCaps();
                AC.renderSidebar();
            };
            right.appendChild(star);

            const mapped = state.customMap[w] && state.customMap[w].length;
            const icon = document.createElement('span');
            icon.textContent = mapped ? '⚙️' : '⬜';
            icon.style.marginRight = '8px';
            right.appendChild(icon);

            const rm = document.createElement('button');
            rm.textContent = 'Remove';
            rm.style.padding = '2px 6px';
            rm.style.fontSize = '11px';
            rm.style.cursor = 'pointer';
            rm.style.background = '#702020';
            rm.style.border = '1px solid #a03333';
            rm.style.color = '#fff';
            rm.style.borderRadius = '3px';
            rm.onclick = e=>{
                e.stopPropagation();
                state.customSet.delete(w);
                delete state.caps[w];
                AC.saveCustomDict();
                AC.saveCaps();
                AC.healDictionaries();
                AC.renderSidebar();
            };
            right.appendChild(rm);

            row.appendChild(right);

            row.onmouseenter = ()=>row.style.background = '#483a73';
            row.onmouseleave = ()=>row.style.background = 'transparent';

            listBox.appendChild(row);
        });

        if (!shown){
            const empty = document.createElement('div');
            empty.textContent = 'No matches.';
            empty.style.opacity = '0.85';
            empty.style.padding = '4px 6px';
            listBox.appendChild(empty);
        }
    }

    filter.addEventListener('input', draw);
    draw();


    /* ADD CUSTOM MAPPING */

    const title = document.createElement('div');
    title.textContent = 'Add custom mapping:';
    title.style.marginTop = '8px';
    title.style.marginBottom = '4px';
    box.appendChild(title);

    const miss = document.createElement('input');
    miss.placeholder = 'Incorrect word or phrase';
    miss.style.width = '100%';
    miss.style.padding = '6px 8px';
    miss.style.marginBottom = '4px';
    miss.style.border = '1px solid #483a73';
    miss.style.background = '#1e1d49';
    miss.style.color = '#e5e9ff';
    miss.style.borderRadius = '4px';
    box.appendChild(miss);

    const corr = document.createElement('input');
    corr.placeholder = 'Canonical form';
    corr.style.width = '100%';
    corr.style.padding = '6px 8px';
    corr.style.marginBottom = '6px';
    corr.style.border = '1px solid #483a73';
    corr.style.background = '#1e1d49';
    corr.style.color = '#e5e9ff';
    corr.style.borderRadius = '4px';
    box.appendChild(corr);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save mapping';
    saveBtn.style.padding = '4px 8px';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.background = '#f9772e';
    saveBtn.style.border = 'none';
    saveBtn.style.color = '#fff';
    saveBtn.style.borderRadius = '4px';
    saveBtn.onclick = ()=>{
        const m = miss.value.trim();
        const c = corr.value.trim();
        if (!m || !c) return;

        AC.assignMissFromDict(m, c);
        miss.value = '';
        corr.value = '';
        AC.renderSidebar();
    };

    box.appendChild(saveBtn);
};


/* ============================
   SETTINGS TAB
   ============================ */

AC.renderSettingsTab = function(box){

    const state = AC.state;

    const title = document.createElement('div');
    title.textContent = 'Custom dictionary (raw):';
    title.style.marginBottom = '4px';
    box.appendChild(title);

    const raw = document.createElement('div');
    raw.textContent = state.customList.length
        ? state.customList.join(', ')
        : '(none)';
    raw.style.fontSize = '11px';
    raw.style.opacity = '0.9';
    raw.style.marginBottom = '10px';
    box.appendChild(raw);

    const clrLog = document.createElement('button');
    clrLog.textContent = 'Clear log';
    clrLog.style.padding = '3px 8px';
    clrLog.style.marginRight = '6px';
    clrLog.style.cursor = 'pointer';
    clrLog.style.background = '#702020';
    clrLog.style.color = '#fff';
    clrLog.style.border = '1px solid #a03333';
    clrLog.style.borderRadius = '3px';
    clrLog.onclick = ()=>{
        if (confirm('Clear spelling log?')){
            state.log = [];
            AC.saveLog();
            AC.renderSidebar();
        }
    };
    box.appendChild(clrLog);

    const clrDict = document.createElement('button');
    clrDict.textContent = 'Clear dictionary';
    clrDict.style.padding = '3px 8px';
    clrDict.style.cursor = 'pointer';
    clrDict.style.background = '#704d20';
    clrDict.style.color = '#fff';
    clrDict.style.border = '1px solid #a06d33';
    clrDict.style.borderRadius = '3px';
    clrDict.onclick = ()=>{
        if (confirm('Clear custom dictionary?')){
            state.customSet = new Set();
            state.customList = [];
            AC.saveCustomDict();
            AC.healDictionaries();
            AC.renderSidebar();
        }
    };
    box.appendChild(clrDict);
};


/* ============================
   MAPPING PANEL
   ============================ */

AC.openMapPanel = function(targetMiss){

    const { map } = AC.buildShell();
    map.innerHTML = '';
    map.style.pointerEvents = 'auto';
    map.style.transform = 'translateX(0)';
    map.style.opacity = '1';

    const title = document.createElement('div');
    title.textContent = 'Assign "' + targetMiss + '" to:';
    title.style.fontWeight = '600';
    title.style.marginBottom = '6px';
    map.appendChild(title);

    const hint = document.createElement('div');
    hint.textContent = 'Search or type a new canonical word/phrase:';
    hint.style.opacity = '0.85';
    hint.style.marginBottom = '6px';
    map.appendChild(hint);

    const inp = document.createElement('input');
    inp.placeholder = 'Canonical form';
    inp.style.width = '100%';
    inp.style.padding = '6px 8px';
    inp.style.marginBottom = '6px';
    inp.style.border = '1px solid #483a73';
    inp.style.borderRadius = '4px';
    inp.style.background = '#1e1d49';
    inp.style.color = '#e5e9ff';
    map.appendChild(inp);

    const list = document.createElement('div');
    list.style.maxHeight = '60vh';
    list.style.overflowY = 'auto';
    list.style.border = '1px solid #483a73';
    list.style.borderRadius = '4px';
    list.style.padding = '4px 0';
    list.style.marginBottom = '8px';
    map.appendChild(list);

    function draw(filter){
        list.innerHTML = '';
        const canon = AC.state.canonicals || [];
        const f = (filter || '').toLowerCase();
        let count = 0;

        canon.forEach(w=>{
            if (f && !w.toLowerCase().includes(f)) return;

            const row = document.createElement('div');
            row.textContent = w;
            row.style.padding = '4px 6px';
            row.style.cursor = 'pointer';
            row.onmouseenter = ()=>row.style.background = '#483a73';
            row.onmouseleave = ()=>row.style.background = 'transparent';
            row.onclick = ()=>inp.value = w;
            list.appendChild(row);
            count++;
        });

        if (!count){
            const empty = document.createElement('div');
            empty.textContent = 'No matches.';
            empty.style.padding = '4px 6px';
            empty.style.opacity = '0.85';
            list.appendChild(empty);
        }
    }

    draw('');
    inp.addEventListener('input', ()=>draw(inp.value));

    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '4px';
    map.appendChild(btnRow);

    const assign = document.createElement('button');
    assign.textContent = 'Assign';
    assign.style.padding = '4px 8px';
    assign.style.cursor = 'pointer';
    assign.style.background = '#f9772e';
    assign.style.color = '#fff';
    assign.style.border = 'none';
    assign.style.borderRadius = '4px';
    assign.style.marginRight = '6px';
    assign.onclick = ()=>{
        const canonical = inp.value.trim();
        if (!canonical) return;
        AC.assignMissFromDict(targetMiss, canonical);
        AC.closeMapPanel();
        AC.renderSidebar();
    };
    btnRow.appendChild(assign);

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.padding = '4px 8px';
    cancel.style.cursor = 'pointer';
    cancel.style.background = '#1e1d49';
    cancel.style.color = '#fff';
    cancel.style.border = '1px solid #777';
    cancel.style.borderRadius = '4px';
    cancel.onclick = ()=>AC.closeMapPanel();
    btnRow.appendChild(cancel);
};


AC.closeMapPanel = function(){
    const map = document.getElementById('ac-map-panel');
    if (!map) return;
    map.style.pointerEvents = 'none';
    map.style.transform = 'translateX(100%)';
    map.style.opacity = '0';
};


/* ============================
   LEVEL 12 - STYLES
   ============================ */

AC.injectStyles = function(){
    if (document.getElementById('ac-style')) return;

    const st = document.createElement('style');
    st.id = 'ac-style';

    st.textContent = `
        #ac-root * {
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }
        #ac-sidebar::-webkit-scrollbar,
        #ac-map-panel::-webkit-scrollbar {
            width: 6px;
        }
        #ac-sidebar::-webkit-scrollbar-thumb,
        #ac-map-panel::-webkit-scrollbar-thumb {
            background: #34416a;
            border-radius: 3px;
        }
        #ac-sidebar::-webkit-scrollbar-track,
        #ac-map-panel::-webkit-scrollbar-track {
            background: #1e1d49;
        }
    `;

    document.head.appendChild(st);
};


/* ============================
   LEVEL 13 - BOOTSTRAP
   ============================ */

AC.bootstrap = function(){
    AC.injectStyles();
    AC.healDictionaries();
    AC.rebuildMaps();
    AC.cleanNumericLogs();
    AC.ensureToggleButton();
    AC.scanEditables();
    AC.buildShell();
};

/* RUN IMMEDIATELY */
AC.bootstrap();
