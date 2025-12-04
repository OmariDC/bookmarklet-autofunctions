(function(){
'use strict';
const AC = window.AC = window.AC || {};
function loadJSON(key, fallback) {
try {
const raw = localStorage.getItem(key);
return raw ? JSON.parse(raw) : JSON.parse(fallback);
} catch (e) {
return JSON.parse(fallback);
}
}
function saveJSON(key, value) {
try {
localStorage.setItem(key, JSON.stringify(value));
} catch (e) {}
}
const STORAGE = {
LOG: 'ac_spell_log_v2',
DICT: 'ac_custom_dict_v2',
MAP: 'ac_custom_map_v2',
CAPS: 'ac_caps_rules_v2'
};
AC.state = AC.state || {};
AC.state.log = loadJSON(STORAGE.LOG, '[]');
AC.state.customList = loadJSON(STORAGE.DICT, '[]')
.filter(w => typeof w === 'string' && w.trim().length > 1);
AC.state.customList = Array.from(new Set(AC.state.customList)).sort();
AC.state.customSet = new Set(AC.state.customList);
AC.state.customMap = loadJSON(STORAGE.MAP, '{}');
AC.state.caps = loadJSON(STORAGE.CAPS, '{}');
AC.state.flatMap = {};
AC.state.multi = [];
AC.state.canonicals = [];
function todayStr() {
return new Date().toISOString().slice(0, 10);
}
AC.saveLog = function saveLog() {
AC.state.log = (AC.state.log || []).filter(e =>
e && e.word && typeof e.word === 'string' && e.word.trim().length >= 2
);
saveJSON(STORAGE.LOG, AC.state.log);
};
AC.saveCustomDict = function saveCustomDict() {
AC.state.customList = Array.from(new Set(AC.state.customSet)).sort();
saveJSON(STORAGE.DICT, AC.state.customList);
};
AC.saveCustomMap = function saveCustomMap() {
saveJSON(STORAGE.MAP, AC.state.customMap || {});
};
AC.saveCaps = function saveCaps() {
saveJSON(STORAGE.CAPS, AC.state.caps || {});
};
AC.ensureDefaultCaps = function ensureDefaultCaps() {
const caps = AC.state.caps;
const defaults = [
'Abarth','Alfa Romeo','Citroën','DS','DS Automobiles','Fiat','Jeep','Leapmotor','Peugeot','Vauxhall',
'Stellantis','Stellantis &You','Birmingham Central','Birmingham','Birmingham North','Birmingham South',
'Bristol Cribbs','Chelmsford','Chingford','Coventry','Crawley','Croydon','Edgware','Guildford','Hatfield',
'Leicester','Liverpool','Maidstone','Manchester','Newport','Nottingham','Preston','Redditch','Romford',
'Sale','Sheffield','Stockport','Walton','West London','Wimbledon','London','Motability','UK',
'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
'January','February','March','April','May','June','July','August','September','October','November','December'
];
defaults.forEach(w => {
if (!Object.prototype.hasOwnProperty.call(caps, w)) caps[w] = true;
});
AC.saveCaps();
};
AC.ensureDefaultCaps();
AC.rebuildMaps = function rebuildMaps() {
const base = AC.baseDict || {};
const customMap = AC.state.customMap || {};
const customSet = AC.state.customSet;
const flat = {};
const multi = [];
const canonSet = new Set();
function applyDict(dictObj) {
for (const canonical in dictObj) {
if (!Object.prototype.hasOwnProperty.call(dictObj, canonical)) continue;
const missList = dictObj[canonical] || [];
const cLower = canonical.toLowerCase();
if (!flat[cLower]) flat[cLower] = canonical;
canonSet.add(canonical);
missList.forEach(m => {
if (!m) return;
const ml = m.toLowerCase();
if (!flat[ml]) flat[ml] = canonical;
});
if (canonical.indexOf(' ') !== -1) {
multi.push({ key: cLower, canonical });
}
missList.forEach(m => {
if (m && m.indexOf(' ') !== -1) {
multi.push({ key: m.toLowerCase(), canonical });
}
});
}
}
applyDict(base);
applyDict(customMap);
AC.state.customList.forEach(w => {
if (!w) return;
const lw = w.toLowerCase();
canonSet.add(w);
if (!flat[lw]) flat[lw] = w;
});
AC.state.flatMap = flat;
AC.state.multi = multi;
AC.state.canonicals = Array.from(canonSet).sort((a, b) => a.localeCompare(b));
};
AC.healDictionaries = function healDictionaries() {
let changed = false;
if (AC.state.customList) {
const cleaned = Array.from(
new Set(
AC.state.customList.filter(w => w && w.trim().length > 1)
)
).sort();
if (JSON.stringify(cleaned) !== JSON.stringify(AC.state.customList)) {
AC.state.customList = cleaned;
AC.state.customSet = new Set(cleaned);
changed = true;
}
}
if (AC.state.customSet) {
const setFromList = new Set(AC.state.customList);
if ([...AC.state.customSet].some(w => !setFromList.has(w))) {
AC.state.customSet = setFromList;
changed = true;
}
}
const base = AC.baseDict || {};
const customMap = AC.state.customMap || {};
const caps = AC.state.caps || {};
let cleanedMap = false;
for (const cor in customMap) {
if (!Object.prototype.hasOwnProperty.call(customMap, cor)) continue;
if (!cor || !cor.trim()) {
delete customMap[cor];
cleanedMap = true;
continue;
}
const isKnownCanonical =
Object.prototype.hasOwnProperty.call(base, cor) ||
AC.state.customSet.has(cor) ||
Object.prototype.hasOwnProperty.call(caps, cor);
if (!isKnownCanonical) {
delete customMap[cor];
cleanedMap = true;
continue;
}
customMap[cor] = customMap[cor].filter(m => m && m.trim().length > 1);
}
if (cleanedMap) changed = true;
if (changed) {
AC.saveCustomDict();
AC.saveCustomMap();
AC.rebuildMaps();
} else {
AC.rebuildMaps();
}
};
AC.captureSentence = function captureSentence() {
const sel = window.getSelection();
if (!sel || !sel.rangeCount) return '';
const r = sel.getRangeAt(0);
const pre = r.cloneRange();
pre.collapse(true);
while (pre.startOffset > 0) {
pre.setStart(pre.startContainer, pre.startOffset - 1);
const ch = pre.toString().charAt(0);
if (/[.!?]/.test(ch)) break;
}
const post = r.cloneRange();
post.collapse(false);
while (post.endOffset < (post.endContainer.length || 0)) {
post.setEnd(post.endContainer, post.endOffset + 1);
const tail = post.toString();
if (/[.!?]/.test(tail.charAt(tail.length - 1))) break;
}
const s = (pre.toString() + r.toString() + post.toString())
.replace(/\s+/g, ' ')
.trim();
return s;
};
AC.recordUnknown = function recordUnknown(word) {
const w = (word || '').toLowerCase().trim();
if (w.length < 2) return;
if (AC.state.flatMap[w] || AC.state.customSet.has(w)) return;
const today = todayStr();
const existingToday = (AC.state.log || []).some(
e => e.word === w && e.when.slice(0, 10) === today
);
if (existingToday) return;
const entry = {
word: w,
when: new Date().toISOString(),
sentence: AC.captureSentence()
};
AC.state.log.push(entry);
AC.saveLog();
};
AC.setCaret = function setCaret(div, index) {
const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
let node = walker.nextNode();
let count = 0;
while (node) {
const next = count + node.nodeValue.length;
if (next >= index) {
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
function isSentenceStart(text, index) {
if (index <= 0) return true;
for (let i = index - 1; i >= 0; i--) {
const ch = text.charAt(i);
if (/\s/.test(ch)) continue;
return /[.!?]/.test(ch);
}
return true;
}
function applyCapsRule(canonical, startOfSentence) {
const caps = AC.state.caps || {};
const always = !!caps[canonical];
if (always) return canonical;
if (startOfSentence) {
if (!canonical) return canonical;
return canonical.charAt(0).toUpperCase() + canonical.slice(1);
}
return canonical;
}
AC.lastCorrection = null;
AC.undoLastCorrection = function undoLastCorrection() {
const c = AC.lastCorrection;
if (!c || !c.div) return;
c.div.innerText = c.before;
AC.setCaret(c.div, Math.min(c.caretBefore, c.before.length));
AC.lastCorrection = null;
};
AC.correctInDiv = function correctInDiv(div, triggerKey) {
const validTriggers = [' ', 'Enter', '.', ',', '!', '?'];
if (!validTriggers.includes(triggerKey)) return;
const sel = window.getSelection();
if (!sel || !sel.rangeCount) return;
const rng = sel.getRangeAt(0);
if (!rng.collapsed) return;
const flat = AC.state.flatMap;
const multi = AC.state.multi;
const fullText = div.innerText;
const caretNodeRange = rng.cloneRange();
const pre = caretNodeRange;
pre.selectNodeContents(div);
pre.setEnd(rng.endContainer, rng.endOffset);
let typedChunk = pre.toString();
const delimChar = triggerKey === 'Enter' ? '\n' : triggerKey;
if (!typedChunk.endsWith(delimChar)) return;
const beforeDelim = typedChunk.slice(0, -1);
const afterDelimRest = fullText.slice(typedChunk.length);
const originalFull = beforeDelim + delimChar + afterDelimRest;
const caretBefore = typedChunk.length;
const lowerBefore = beforeDelim.toLowerCase();
for (let i = 0; i < multi.length; i++) {
const m = multi[i];
const phrase = m.key;
const canonical = m.canonical;
const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp('(' + esc + ')(['\']s|s['\'])?([.,!?])?$');
const match = lowerBefore.match(re);
if (!match) continue;
const poss = match[2] || '';
const punct = match[3] || '';
const totalLen = match[0].length;
const newBefore = beforeDelim.slice(0, beforeDelim.length - totalLen);
const startIndex = newBefore.length;
const startSentence = isSentenceStart(beforeDelim, startIndex);
const correctedCore = applyCapsRule(canonical, startSentence);
const newBeforeFull = newBefore + correctedCore + poss + punct;
const newFull = newBeforeFull + delimChar + afterDelimRest;
div.innerText = newFull;
const caretAfter = newBeforeFull.length + 1;
AC.setCaret(div, caretAfter);
AC.lastCorrection = {
div: div,
before: originalFull,
after: newFull,
caretBefore: caretBefore,
caretAfter: caretAfter
};
return;
}
const parts = beforeDelim.split(/(\s+)/);
let idx = -1;
for (let i = parts.length - 1; i >= 0; i--) {
if (parts[i].trim() !== '') {
idx = i;
break;
}
}
if (idx < 0) return;
const rawToken = parts[idx];
const tokenMatch = rawToken.match(/^(.+?)(['\']s|s['\'])?([.,!?])?$/);
const core = tokenMatch ? tokenMatch[1] : rawToken;
const poss = tokenMatch && tokenMatch[2] ? tokenMatch[2] : '';
const punct = tokenMatch && tokenMatch[3] ? tokenMatch[3] : '';
const lowerCore = core.toLowerCase();
AC.recordUnknown(core);
let canonical = flat[lowerCore] || null;
if (!canonical && lowerCore === 'i') canonical = 'I';
let charsBeforeWord = 0;
for (let j = 0; j < idx; j++) charsBeforeWord += parts[j].length;
const startIndex = charsBeforeWord;
const startSentence = isSentenceStart(beforeDelim, startIndex);
let replacement = core;
if (canonical) {
replacement = applyCapsRule(canonical, startSentence);
} else {
if (startSentence) {
replacement = core.charAt(0).toUpperCase() + core.slice(1);
} else {
replacement = core;
}
}
if (replacement !== core) {
parts[idx] = replacement + poss + punct;
const newBeforeFull = parts.join('');
const newFull = newBeforeFull + delimChar + afterDelimRest;
div.innerText = newFull;
const caretAfter = newBeforeFull.length + 1;
AC.setCaret(div, caretAfter);
AC.lastCorrection = {
div: div,
before: originalFull,
after: newFull,
caretBefore: caretBefore,
caretAfter: caretAfter
};
}
};
AC.groupLogByWord = function groupLogByWord(log) {
const g = {};
(log || []).forEach(e => {
if (!e || !e.word) return;
if (!g[e.word]) g[e.word] = [];
g[e.word].push(e);
});
return g;
};
AC.makeStatsText = function makeStatsText() {
const log = AC.state.log || [];
const g = AC.groupLogByWord(log);
const total = log.length;
const unique = Object.keys(g).length;
const today = todayStr();
const todayEntries = log.filter(e => e.when.slice(0, 10) === today);
const todayTotal = todayEntries.length;
const todayUnique = new Set(todayEntries.map(e => e.word)).size;
const top = Object.keys(g)
.map(w => ({ w, count: g[w].length }))
.sort((a, b) => b.count - a.count)
.slice(0, 10);
let txt = '';
txt += 'Total entries: ' + total + '\n';
txt += 'Unique words: ' + unique + '\n\n';
txt += 'Today: ' + todayTotal + ' entries, ' + todayUnique + ' unique\n\n';
txt += 'Top words:\n';
top.forEach(o => {
txt += ' - ' + o.w + ' (x' + o.count + ')\n';
});
return txt;
};
AC.exportTXT = function exportTXT() {
const log = AC.state.log || [];
if (!log.length) {
const blobEmpty = new Blob(['No entries.'], { type: 'text/plain' });
const urlEmpty = URL.createObjectURL(blobEmpty);
window.open(urlEmpty, '_blank');
return;
}
const grouped = AC.groupLogByWord(log);
const keys = Object.keys(grouped).sort();
let out = '';
keys.forEach(w => {
const arr = grouped[w];
out += '\n' + w.toUpperCase() + ' (x' + arr.length + ')\n';
arr.forEach(e => {
out += ' • ' + e.when;
if (e.sentence) out += ' - "' + e.sentence.replace(/\s+/g, ' ') + '"';
out += '\n';
});
out += '\n';
});
const blob = new Blob([out.trim()], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
};
AC.exportCSV = function exportCSV() {
const log = AC.state.log || [];
const grouped = AC.groupLogByWord(log);
const keys = Object.keys(grouped);
if (!keys.length) {
const blobEmpty = new Blob(['word,count,first_seen,last_seen,sample\n'], {
type: 'text/csv'
});
const urlEmpty = URL.createObjectURL(blobEmpty);
window.open(urlEmpty, '_blank');
return;
}
const rows = ['word,count,first_seen,last_seen,sample'];
keys.forEach(w => {
const arr = grouped[w].slice().sort((a, b) => a.when.localeCompare(b.when));
const count = arr.length;
const first = arr[0].when;
const last = arr[arr.length - 1].when;
const sample = (arr[0].sentence || '').replace(/"/g, "''");
rows.push(
'"' + w + '",' + count + ',"' + first + '","' + last + '","' + sample + '"'
);
});
const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
};
AC.ensureRoot = function ensureRoot() {
let root = document.getElementById('ac-root');
if (root) return root;
root = document.createElement('div');
root.id = 'ac-root';
root.style.position = 'fixed';
root.style.left = '0';
root.style.top = '0';
root.style.width = '280px';
root.style.height = '100%';
root.style.zIndex = '999998';
root.style.pointerEvents = 'none';
document.body.appendChild(root);
return root;
};
AC.ensureToggleButton = function ensureToggleButton() {
if (AC._buttonInit) return;
AC._buttonInit = true;
if (document.getElementById('ac-toggle')) return;
const b = document.createElement('div');
b.id = 'ac-toggle';
b.style.position = 'fixed';
b.style.left = '14px';
b.style.bottom = '14px';
b.style.width = '20px';
b.style.height = '20px';
b.style.background = '#f9772e';
b.style.borderRadius = '50%';
b.style.boxShadow = '0 0 8px rgba(249,119,46,0.6)';
b.style.cursor = 'pointer';
b.style.zIndex = '999999';
b.title = 'Spelling assistant - click or press Alt+T';
b.onclick = function() {
AC.toggleSidebar();
};
document.body.appendChild(b);
};
if (!AC._hotkeyInit) {
AC._hotkeyInit = true;
window.addEventListener('keydown', function(e) {
if (e.altKey && e.code === 'KeyT') {
e.preventDefault();
e.stopPropagation();
AC.toggleSidebar();
}
});
}
AC.healDictionaries();
AC.ensureToggleButton();
AC.baseDict = {
'Abarth': ['abart','abarht','abarth?'],
'Alfa Romeo': ['alfaromeo','alpha romeo','alfa romo','alfaromeo','alfa romieo','alf aromeo','alpharomeo','alfa romio','alfa romero','alfa romeao','alfa romeo','alfa romeo','alfar omeo','alfa romeo','alfa romeo','alfaromeoo','alfa romeeo','alfa rome0','alfa r omeo','alfa romeo'],
'Citroën': ['citroen','citreon','citroean','citroan','citroin','citoren','citroem'],
'DS': ['ds','d.s.'],
'DS Automobiles': ['ds automoblies','ds automobils','ds autom'],
'Fiat': ['fiatt','fiadt'],
'Jeep': ['jepp','jeap','jepe','jep'],
'Leapmotor': ['leap motor','leapmotors'],
'Peugeot': ['peugot','peugeut','peuguot','pegeot','pugeot','peugoet','peugeoet','pegueot'],
'Vauxhall': ['vauxel','vauxall','vaxhall','vauxhal','vaulxhall','vauxheel'],
'Stellantis': ['stellantus','stellentis','stellantis'],
'Stellantis &You': ['stellantis and you','stellantis & you','stellantis &you','stellantis andyou'],
'Birmingham Central': ['birmingam central','birmingham cental','birmingham centreal','brum central'],
'Birmingham': ['brum'],
'Birmingham North': ['birmingam north','birmingham nrth','birmingham northh','brum north'],
'Birmingham South': ['birmingam south','birmingham soouth','birmingham southh','brum south'],
'Bristol Cribbs': ['bristol cribs','bristolcribbs','bristol cribbb'],
'Chelmsford': ['chelsford','chelmsord','chelmsfrod'],
'Chingford': ['chingferd','chingfor','chingfrod'],
'Coventry': ['coverty','coventary','covenrty'],
'Crawley': ['crawely','crawly','crawlley'],
'Croydon': ['croyden','croydun','croyodon'],
'Edgware': ['edgeware','edgwer','edgwarre'],
'Guildford': ['guilford','guild ford','guildfrod'],
'Hatfield': ['hatfeild','hatfiled','hattfield'],
'Leicester': ['lester','leister','liestter'],
'Liverpool': ['liverpol','liverpoool','liverpoll'],
'Maidstone': ['maidston','maidstoen','maidstoon'],
'Manchester': ['manchestor','manchster','mannchester','manny'],
'Newport': ['new port','newpport','newprot'],
'Nottingham': ['nottingam','nottinghum','nothtingham'],
'Preston': ['prestan','prestron','prestonn'],
'Redditch': ['reditch','reddich','reddittch'],
'Romford': ['romferd','romfor','romfford'],
'Sale': ['sael','sal','salle'],
'Sheffield': ['shefffield','sheffied','sheffild'],
'Stockport': ['stcokport','stockprt','stookport'],
'Walton': ['waltom','waltn','waulton'],
'West London': ['westlondon','west londn','west londom'],
'Wimbledon': ['wimbeldon','wimbeldun','wimbeldoon'],
'London': ['londen','londan','lindon','londdon','lndon','londn','ldn'],
'Motability': ['motab','motabilty','motivability'],
'UK': ['uk','u k'],
'Monday': ['monday','mondey','monady'],
'Tuesday': ['tuesday','tueday','tuesay','tueseday'],
'Wednesday': ['wednesday','wensday','wednsday','wedensday'],
'Thursday': ['thursday','thurday','thursay'],
'Friday': ['friday','firday'],
'Saturday': ['saturday','satarday'],
'Sunday': ['sunday','sundey'],
'January': ['januray','janary','januarry'],
'February': ['febuary','feburary','februuary'],
'March': ['marhc','mrach','marchh'],
'April': ['aprill'],
'May': ['mayy','maay'],
'June': ['junee','juen'],
'July': ['julyy','jly'],
'August': ['augustt','agust','auguest'],
'September': ['septemberr','septembar','setpember'],
'October': ['octobr','octuber','otcober'],
'November': ['novemberr','noovember','novembar'],
'December': ['decemberr','decembar','decmeber'],
'I': ['i'],
'able': ['abl','ab le'],
'add': ['ad','a dd'],
'address': ['adress','adresss','adrs'],
'advise': ['adice','advice','advise'],
'agent': ['agnt','agant'],
'agents': ['agnts','agantS','agantes'],
'all': ['al','a ll'],
'along': ['alng','alogn'],
'am': ['ma','a m'],
'an': ['na','a n'],
'and': ['adn','an d','snd','se nd'],
'any': ['an y','anyy','ani'],
'appointments': ['appontments','apointments','appoinments'],
'arrange': ['arange','arrnge'],
'are': ['ar','aer','arre'],
'as': ['sa','a s'],
'at': ['ta','a t'],
'available': ['availble','avialable','avalable'],
'aware': ['awre','awar'],
'be': ['eb','b e'],
'because': ['becuase','beacuse'],
'before': ['befor','bfore','befroe'],
'believe': ['belive','beleive'],
'book': ['bok','bokk'],
'both': ['bth','booth'],
'branches': ['braches','branchs'],
'but': ['bt','b ut'],
'calendar': ['calender'],
'call': ['cal','cal l'],
'calls': ['cals','calss'],
'can': ['csn'],
"can't": ['cant','can t','cnt'],
'central': ['centrall','centrl'],
'closer': ['closr','closeer','clsoer'],
'come': ['cmoe','coem'],
'confirm': ['confrm','cnfirm','confrim'],
'contact': ['contat','contac'],
'costs': ['csts'],
"couldn't": ['couldnt','coudnt',"could'nt"],
'currently': ['curently','currenty','currenlty'],
'dealership': ['delership','dealrship'],
'definitely': ['definately','definatly','defently'],
'department': ['departmnt','departent'],
'dates': ['daets','datse'],
'detail': ['detial'],
'details': ['detials','detals'],
'directly': ['directy','dirctly'],
'do': ['d0','od'],
"don't": ['dont','don t'],
'discuss': ['dicuss','discus'],
'editor': ['edtor','editro','edditor'],
'email': ['emial','emiall'],
'enough': ['enuf','enogh'],
'everything': ['everyting','evrything'],
'expected': ['expcted','expeced','expectd'],
'exchanged': ['exhanged','exchnged'],
'find': ['fnd','fi nd'],
'fine': ['fien','fin'],
'for': ['fro','fo','fr'],
'fuel': ['fuell','fu el'],
'further': ['furhter'],
'get': ['gt','git'],
'give': ['giv','giev'],
'go': ['og','g o'],
'have': ['hvae','hae','hve','havet'],
'hate': ['hat','haet'],
'heard': ['herd','haerd'],
'hello': ['helo','helllo'],
'help': ['hlp','hepl','hekp'],
'here': ['hre','he re'],
'how': ['hw','hwo'],
'however': ['hovewer','howeer','howerver'],
'if': ['fi','i f'],
"I'm": ['im'],
'immediate': ['immediat','immediatly'],
'in': ['ni','i n'],
'information': ['informtion','infromation','informaiton'],
'interested': ['intrested','intersted','intereste'],
'instead': ['instaed','insted'],
'into': ['in to'],
'issue': ['issuse','isssue','isue'],
'is': ['si','i s'],
'it': ['ut'],
"i've": ['ive'],
'just': ['jst','ju st'],
'local': ['locl','loca'],
'looking': ['loking','lookng','lookin'],
'looked': ['loked','lookked'],
'limited': ['limted','limiited'],
'like': ['lik','liek'],
'make': ['mkae','mak'],
'may': ['mya'],
'me': ['m','mee'],
'miles': ['miiles'],
'morning': ['morng','morni ng'],
'move': ['mvoe','moev'],
'my': ['ny','ym'],
'need': ['need'],
'needed': ['neded','needd'],
'never': ['nevr','neveer'],
'next': ['nxt','nextt'],
'no problem': ['np'],
'not': ['nto','noot'],
'number': ['nubmer','numbr'],
'of': ['fo','o f'],
'on': ['o n'],
'onto': ['on to','ont o'],
'or': ['ro','o r'],
'orders': ['ordres','oders'],
'our': ['our'],
'part-exchange': ['px'],
'part-exchanging': ['pxing'],
'please': ['plese','pleas'],
'postcode': ['postocde'],
'price': ['prcie','prce'],
'problem': ['probelm','proble'],
'previously': ['prevously','previoiusly'],
'purchase': ['purches','purchace','pursch'],
'potential': ['potental','potentail'],
'quarter': ['quater','quartre','qarter'],
'receive': ['recieve','recive'],
'referring': ['refering'],
'recommend': ['recomend','reccommend','recommnd'],
'recommended': ['recomended','reommend','recommened'],
'require': ['requre','requier'],
'sales': ['saels','sles'],
'schedule': ['shedule','schedul'],
'scheduling': ['schedualling'],
'seems': ['sems'],
'sent': ['snt','se nt'],
'service': ['sevice','srvice'],
"shouldn't": ['shouldnt','shoudnt',"should'nt"],
'site': ['sitr','si te'],
'so': ['os','s o'],
'so I': ['so i'],
'so much': ['sm'],
'something': ['smt'],
'specific': ['spefic','specfic'],
'sure': ['sur','shure'],
'test': ['tset','te st'],
'team': ['tem','te am'],
'that': ['thst'],
'thank you': ['thankyou','ty','thak you','thank yu'],
'the': ['th','thee'],
'their': ['thier'],
'these': ['tehse','thes'],
'there': ['ther','thre','thare'],
'this': ['tis','thsi','thes'],
'though': ['tho','thogh','thugh','thouhg','thoough'],
'thought': ['thot','thougth'],
'through': ['throguh','thruogh','throuogh'],
'time': ['tme','tiem'],
'today': ['tody','todday','tdy'],
'tomorrow': ['tommorow','tomorow','tmr'],
'transmission': ['transmision','trasmission'],
'type': ['tpe','ty pe'],
'unavailable': ['unavaible','unavalible'],
'unfortunately': ['unfortunetly','unfortunatly'],
'valuation': ['valutaion','valution','valuaton'],
'vehicle': ['vehical','vechicle','vehicule','vehicel','vehicl','vehcilea','vehcile'],
'vehicles': ['vehciles','vehicels','vehicles','vehicals','vechicles','vehicules','vehicels','vehicls','vehcileas'],
'viewings': ['viewngs','vieewings'],
'website': ['wesbite','webiste','websit'],
'we': ['ew','w e'],
'West': ['wset','we st'],
'which': ['whcih','whihc'],
'will': ['wil','wll'],
'with': ['wiht','w tih'],
'work': ['wrok'],
'working': ['workng','wroking','workiing'],
'would': ['woudl','wold'],
"wouldn't": ['woudlnt','wouldnt'],
'wrong': ['wron','wrnog'],
'yes': ['ye','y es'],
'yet': ['yte','yt'],
'you': ['yo','yuo','u'],
'your': ['uour','ur'],
'yourself': ['yourslef','yourse lf']
};
AC.healDictionaries();
(function initUI(){
const state = AC.state;
let sidebarOpen = false;
let currentTab = 'log';
function injectStyles() {
if (document.getElementById('ac-style')) return;
const st = document.createElement('style');
st.id = 'ac-style';
st.textContent =
'#ac-root *{box-sizing:border-box;font-family:Arial, sans-serif;}' +
'#ac-sidebar::-webkit-scrollbar,#ac-map-panel::-webkit-scrollbar{width:6px;}' +
'#ac-sidebar::-webkit-scrollbar-thumb,#ac-map-panel::-webkit-scrollbar-thumb{background:#34416a;border-radius:3px;}' +
'#ac-sidebar::-webkit-scrollbar-track,#ac-map-panel::-webkit-scrollbar-track{background:#1e1d49;}';
document.head.appendChild(st);
}
function buildShell() {
const root = AC.ensureRoot();
root.style.pointerEvents = 'none';
let sidebar = document.getElementById('ac-sidebar');
if (!sidebar) {
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
sidebar.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
sidebar.style.transform = 'translateX(-100%)';
sidebar.style.opacity = '0';
sidebar.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out';
root.appendChild(sidebar);
}
let panel = document.getElementById('ac-map-panel');
if (!panel) {
panel = document.createElement('div');
panel.id = 'ac-map-panel';
panel.style.position = 'fixed';
panel.style.top = '0';
panel.style.right = '0';
panel.style.width = '320px';
panel.style.height = '100%';
panel.style.background = '#34416a';
panel.style.color = '#e5e9ff';
panel.style.padding = '10px';
panel.style.overflowY = 'auto';
panel.style.borderLeft = '2px solid #483a73';
panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
panel.style.transform = 'translateX(100%)';
panel.style.opacity = '0';
panel.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
panel.style.zIndex = '999999';
panel.style.pointerEvents = 'none';
document.body.appendChild(panel);
}
return { root, sidebar, panel };
}
function openSidebar() {
const shell = buildShell();
shell.root.style.pointerEvents = 'auto';
const sidebar = shell.sidebar;
sidebar.style.transform = 'translateX(0)';
sidebar.style.opacity = '1';
sidebarOpen = true;
renderSidebar();
}
function closeSidebar() {
const root = document.getElementById('ac-root');
const sidebar = document.getElementById('ac-sidebar');
if (root) root.style.pointerEvents = 'none';
if (sidebar) {
sidebar.style.transform = 'translateX(-100%)';
sidebar.style.opacity = '0';
}
sidebarOpen = false;
closeMapPanel();
}
AC.toggleSidebar = function toggleSidebar() {
injectStyles();
if (sidebarOpen) closeSidebar();
else openSidebar();
};
function openMapPanel(targetMiss) {
const shell = buildShell();
const panel = shell.panel;
panel.innerHTML = '';
const title = document.createElement('div');
title.textContent = 'Assign "' + targetMiss + '" to:';
title.style.fontWeight = '600';
title.style.marginBottom = '6px';
panel.appendChild(title);
const hint = document.createElement('div');
hint.textContent = 'Search existing words or type a new canonical.';
hint.style.marginBottom = '6px';
hint.style.opacity = '0.85';
panel.appendChild(hint);
const input = document.createElement('input');
input.style.width = '100%';
input.style.padding = '6px 8px';
input.style.marginBottom = '6px';
input.style.border = '1px solid #483a73';
input.style.borderRadius = '4px';
input.style.background = '#1e1d49';
input.style.color = '#e5e9ff';
input.placeholder = 'Canonical word or phrase';
panel.appendChild(input);
const list = document.createElement('div');
list.style.maxHeight = '60vh';
list.style.overflowY = 'auto';
list.style.border = '1px solid #483a73';
list.style.borderRadius = '4px';
list.style.padding = '4px 0';
list.style.marginBottom = '8px';
panel.appendChild(list);
function renderList(filter) {
list.innerHTML = '';
const canon = state.canonicals || [];
const f = (filter || '').toLowerCase();
let shown = 0;
canon.forEach(w => {
if (f && w.toLowerCase().indexOf(f) === -1) return;
const row = document.createElement('div');
row.textContent = w;
row.style.padding = '4px 6px';
row.style.cursor = 'pointer';
row.style.fontSize = '13px';
row.onmouseenter = function(){ row.style.background = '#483a73'; };
row.onmouseleave = function(){ row.style.background = 'transparent'; };
row.onclick = function(){
input.value = w;
};
list.appendChild(row);
shown++;
});
if (!shown) {
const empty = document.createElement('div');
empty.textContent = 'No matches.';
empty.style.padding = '4px 6px';
empty.style.fontSize = '12px';
empty.style.opacity = '0.85';
list.appendChild(empty);
}
}
renderList('');
input.addEventListener('input', function(){
renderList(input.value);
});
const btnRow = document.createElement('div');
btnRow.style.marginTop = '4px';
panel.appendChild(btnRow);
const ok = document.createElement('button');
ok.textContent = 'Assign';
ok.style.padding = '4px 8px';
ok.style.fontSize = '12px';
ok.style.cursor = 'pointer';
ok.style.background = '#f9772e';
ok.style.border = 'none';
ok.style.color = '#fff';
ok.style.borderRadius = '4px';
ok.style.marginRight = '6px';
ok.onclick = function(){
const canonical = (input.value || '').trim();
if (!canonical) {
alert('Enter a canonical word first.');
return;
}
assignMisspelling(targetMiss, canonical);
closeMapPanel();
renderSidebar();
};
btnRow.appendChild(ok);
const cancel = document.createElement('button');
cancel.textContent = 'Cancel';
cancel.style.padding = '4px 8px';
cancel.style.fontSize = '12px';
cancel.style.cursor = 'pointer';
cancel.style.background = '#1e1d49';
cancel.style.border = '1px solid #777';
cancel.style.color = '#fff';
cancel.style.borderRadius = '4px';
cancel.onclick = closeMapPanel;
btnRow.appendChild(cancel);
panel.style.pointerEvents = 'auto';
panel.style.transform = 'translateX(0)';
panel.style.opacity = '1';
}
function closeMapPanel() {
const panel = document.getElementById('ac-map-panel');
if (!panel) return;
panel.style.pointerEvents = 'none';
panel.style.transform = 'translateX(100%)';
panel.style.opacity = '0';
}
function assignMisspelling(miss, canonical) {
const mLower = (miss || '').toLowerCase();
const c = canonical.trim();
if (!mLower || !c) return;
const map = state.customMap || {};
if (!map[c]) map[c] = [];
if (!map[c].some(x => x.toLowerCase() === mLower)) {
map[c].push(miss);
}
state.customMap = map;
AC.saveCustomMap();
AC.healDictionaries();
state.log = (state.log || []).filter(e => e.word !== mLower);
AC.saveLog();
}
function renderSidebar() {
const sidebar = document.getElementById('ac-sidebar');
if (!sidebar) return;
sidebar.innerHTML = '';
const tabsWrap = document.createElement('div');
tabsWrap.style.marginBottom = '6px';
const tabs = [
{ id: 'log', label: 'Log' },
{ id: 'recent', label: 'Recent' },
{ id: 'stats', label: 'Stats' },
{ id: 'export', label: 'Export' },
{ id: 'dict', label: 'Dictionary' },
{ id: 'settings', label: 'Settings' }
];
tabs.forEach(t => {
const b = document.createElement('button');
b.textContent = t.label;
b.style.marginRight = '4px';
b.style.padding = '3px 6px';
b.style.fontSize = '11px';
b.style.cursor = 'pointer';
b.style.borderRadius = '3px';
if (currentTab === t.id) {
b.style.background = '#f9772e';
b.style.color = '#fff';
b.style.border = 'none';
} else {
b.style.background = '#34416a';
b.style.color = '#fff';
b.style.border = '1px solid #483a73';
}
b.onclick = function(){
currentTab = t.id;
renderSidebar();
};
tabsWrap.appendChild(b);
});
sidebar.appendChild(tabsWrap);
const content = document.createElement('div');
content.style.whiteSpace = 'pre-wrap';
sidebar.appendChild(content);
if (currentTab === 'log') {
renderLogTab(content);
} else if (currentTab === 'recent') {
renderRecentTab(content);
} else if (currentTab === 'stats') {
content.textContent = AC.makeStatsText();
} else if (currentTab === 'export') {
renderExportTab(content);
} else if (currentTab === 'dict') {
renderDictTab(content);
} else if (currentTab === 'settings') {
renderSettingsTab(content);
}
const undo = document.createElement('button');
undo.textContent = 'Undo last correction';
undo.style.marginTop = '8px';
undo.style.padding = '3px 6px';
undo.style.fontSize = '11px';
undo.style.cursor = 'pointer';
undo.style.background = '#34416a';
undo.style.color = '#fff';
undo.style.border = '1px solid #483a73';
undo.style.borderRadius = '3px';
undo.onclick = AC.undoLastCorrection;
sidebar.appendChild(undo);
}
function renderLogTab(content) {
const log = state.log || [];
const grouped = AC.groupLogByWord(log);
const keys = Object.keys(grouped).sort();
if (!keys.length) {
content.textContent = 'No entries yet.';
return;
}
const info = document.createElement('div');
info.textContent = 'Add as correct word or Assign to a canonical.';
info.style.marginBottom = '6px';
info.style.opacity = '0.85';
content.appendChild(info);
keys.forEach(word => {
const row = document.createElement('div');
row.style.padding = '4px 0';
row.style.borderBottom = '1px solid #10122f';
const header = document.createElement('div');
header.textContent = word + ' (x' + grouped[word].length + ')';
header.style.marginBottom = '2px';
header.style.fontWeight = '600';
row.appendChild(header);
const btnWrap = document.createElement('div');
const addBtn = document.createElement('button');
addBtn.textContent = 'Add as correct';
addBtn.style.padding = '2px 6px';
addBtn.style.fontSize = '11px';
addBtn.style.cursor = 'pointer';
addBtn.style.background = '#34416a';
addBtn.style.color = '#fff';
addBtn.style.border = '1px solid #483a73';
addBtn.style.borderRadius = '3px';
addBtn.style.marginRight = '4px';
addBtn.onclick = function(){
if (!state.customSet.has(word)) {
state.customSet.add(word);
AC.saveCustomDict();
AC.healDictionaries();
}
state.log = state.log.filter(e => e.word !== word);
AC.saveLog();
renderSidebar();
};
btnWrap.appendChild(addBtn);
const assignBtn = document.createElement('button');
assignBtn.textContent = 'Assign';
assignBtn.style.padding = '2px 6px';
assignBtn.style.fontSize = '11px';
assignBtn.style.cursor = 'pointer';
assignBtn.style.background = '#f9772e';
assignBtn.style.color = '#fff';
assignBtn.style.border = 'none';
assignBtn.style.borderRadius = '3px';
assignBtn.style.boxShadow = '0 0 6px rgba(249,119,46,0.7)';
assignBtn.onclick = function(){
openMapPanel(word);
};
btnWrap.appendChild(assignBtn);
row.appendChild(btnWrap);
content.appendChild(row);
});
}
function renderRecentTab(content) {
const log = (state.log || [])
.slice()
.sort((a, b) => b.when.localeCompare(a.when));
const info = document.createElement('div');
info.textContent = 'Most recent logged spellings:';
info.style.marginBottom = '6px';
info.style.opacity = '0.85';
content.appendChild(info);
if (!log.length) {
const n = document.createElement('div');
n.textContent = 'No entries yet.';
content.appendChild(n);
return;
}
log.slice(0, 50).forEach(e => {
const row = document.createElement('div');
row.style.padding = '4px 0';
row.style.borderBottom = '1px solid #10122f';
const when = document.createElement('div');
when.textContent = e.when;
when.style.fontSize = '11px';
when.style.opacity = '0.8';
row.appendChild(when);
const w = document.createElement('div');
w.textContent = e.word;
w.style.fontWeight = '600';
row.appendChild(w);
if (e.sentence) {
const s = document.createElement('div');
s.textContent = '"' + e.sentence + '"';
s.style.fontSize = '11px';
s.style.opacity = '0.9';
row.appendChild(s);
}
content.appendChild(row);
});
}
function renderExportTab(content) {
const txtBtn = document.createElement('button');
txtBtn.textContent = 'Download TXT';
txtBtn.style.padding = '3px 8px';
txtBtn.style.fontSize = '11px';
txtBtn.style.cursor = 'pointer';
txtBtn.style.background = '#34416a';
txtBtn.style.color = '#fff';
txtBtn.style.border = '1px solid #483a73';
txtBtn.style.borderRadius = '3px';
txtBtn.style.marginRight = '6px';
txtBtn.onclick = AC.exportTXT;
const csvBtn = document.createElement('button');
csvBtn.textContent = 'Download CSV';
csvBtn.style.padding = '3px 8px';
csvBtn.style.fontSize = '11px';
csvBtn.style.cursor = 'pointer';
csvBtn.style.background = '#34416a';
csvBtn.style.color = '#fff';
csvBtn.style.border = '1px solid #483a73';
csvBtn.style.borderRadius = '3px';
csvBtn.onclick = AC.exportCSV;
content.appendChild(txtBtn);
content.appendChild(csvBtn);
}
function renderDictTab(content) {
const info = document.createElement('div');
info.textContent = 'Filter, remove and manage custom dictionary words.';
info.style.marginBottom = '6px';
info.style.opacity = '0.85';
content.appendChild(info);
const filterInput = document.createElement('input');
filterInput.placeholder = 'Filter custom words...';
filterInput.style.width = '100%';
filterInput.style.padding = '6px 8px';
filterInput.style.marginBottom = '6px';
filterInput.style.border = '1px solid #483a73';
filterInput.style.borderRadius = '4px';
filterInput.style.background = '#1e1d49';
filterInput.style.color = '#e5e9ff';
filterInput.style.fontSize = '13px';
content.appendChild(filterInput);
const listBox = document.createElement('div');
listBox.style.maxHeight = '40vh';
listBox.style.overflowY = 'auto';
listBox.style.border = '1px solid #483a73';
listBox.style.borderRadius = '4px';
listBox.style.padding = '4px 0';
content.appendChild(listBox);
function renderList() {
const term = (filterInput.value || '').toLowerCase();
listBox.innerHTML = '';
const arr = (state.customList || []).slice().sort((a, b) => a.localeCompare(b));
let shown = 0;
arr.forEach(w => {
if (term && w.toLowerCase().indexOf(term) === -1) return;
shown++;
const row = document.createElement('div');
row.style.display = 'flex';
row.style.alignItems = 'center';
row.style.justifyContent = 'space-between';
row.style.padding = '4px 6px';
row.style.fontSize = '13px';
const label = document.createElement('span');
label.textContent = w;
row.appendChild(label);
const right = document.createElement('span');
const caps = state.caps || {};
const star = document.createElement('span');
star.textContent = caps[w] ? '⭐' : '☆';
star.style.cursor = 'pointer';
star.style.marginRight = '4px';
star.title = 'Toggle always capitalise';
star.onclick = function(e){
e.stopPropagation();
if (caps[w]) delete caps[w];
else caps[w] = true;
AC.saveCaps();
renderSidebar();
};
right.appendChild(star);
const ext = state.customMap || {};
const mapped = !!(ext[w] && ext[w].length);
const icon = document.createElement('span');
icon.textContent = mapped ? '⚙️' : '⬜';
icon.style.marginRight = '6px';
icon.title = mapped ? 'Has custom mapped misspellings' : 'Custom word, no mappings';
right.appendChild(icon);
const rm = document.createElement('button');
rm.textContent = 'Remove';
rm.style.padding = '2px 6px';
rm.style.fontSize = '11px';
rm.style.cursor = 'pointer';
rm.style.background = '#702020';
rm.style.color = '#fff';
rm.style.border = '1px solid #a03333';
rm.style.borderRadius = '3px';
rm.onclick = function(e){
e.stopPropagation();
if (state.customSet.has(w)) {
state.customSet.delete(w);
AC.saveCustomDict();
AC.healDictionaries();
}
if (state.caps && state.caps[w]) {
delete state.caps[w];
AC.saveCaps();
}
renderSidebar();
};
right.appendChild(rm);
row.appendChild(right);
row.onmouseenter = function(){ row.style.background = '#483a73'; };
row.onmouseleave = function(){ row.style.background = 'transparent'; };
listBox.appendChild(row);
});
if (!shown) {
const empty = document.createElement('div');
empty.textContent = 'No matches.';
empty.style.fontSize = '12px';
empty.style.opacity = '0.85';
empty.style.padding = '4px 6px';
listBox.appendChild(empty);
}
}
filterInput.addEventListener('input', renderList);
renderList();
const mapTitle = document.createElement('div');
mapTitle.textContent = 'Add custom mapping:';
mapTitle.style.marginTop = '10px';
mapTitle.style.marginBottom = '4px';
content.appendChild(mapTitle);
const missInput = document.createElement('input');
missInput.placeholder = 'Incorrect word or phrase';
missInput.style.width = '100%';
missInput.style.padding = '6px 8px';
missInput.style.marginBottom = '4px';
missInput.style.border = '1px solid #483a73';
missInput.style.borderRadius = '4px';
missInput.style.background = '#1e1d49';
missInput.style.color = '#e5e9ff';
content.appendChild(missInput);
const correctInput = document.createElement('input');
correctInput.placeholder = 'Canonical (correct form)';
correctInput.style.width = '100%';
correctInput.style.padding = '6px 8px';
correctInput.style.marginBottom = '6px';
correctInput.style.border = '1px solid #483a73';
correctInput.style.borderRadius = '4px';
correctInput.style.background = '#1e1d49';
correctInput.style.color = '#e5e9ff';
content.appendChild(correctInput);
const mapBtn = document.createElement('button');
mapBtn.textContent = 'Save mapping';
mapBtn.style.padding = '4px 8px';
mapBtn.style.fontSize = '12px';
mapBtn.style.cursor = 'pointer';
mapBtn.style.background = '#f9772e';
mapBtn.style.color = '#fff';
mapBtn.style.border = 'none';
mapBtn.style.borderRadius = '4px';
mapBtn.style.boxShadow = '0 0 6px rgba(249,119,46,0.7)';
mapBtn.onclick = function(){
const miss = (missInput.value || '').trim();
const canonical = (correctInput.value || '').trim();
if (!miss || !canonical) {
alert('Enter both incorrect and canonical values.');
return;
}
assignMisspelling(miss, canonical);
missInput.value = '';
correctInput.value = '';
renderSidebar();
};
content.appendChild(mapBtn);
}
function renderSettingsTab(content) {
const dTitle = document.createElement('div');
dTitle.textContent = 'Custom dictionary (raw):';
dTitle.style.marginBottom = '4px';
content.appendChild(dTitle);
const dList = document.createElement('div');
dList.textContent = state.customList.length ? state.customList.join(', ') : '(none)';
dList.style.marginBottom = '8px';
dList.style.fontSize = '11px';
dList.style.opacity = '0.9';
content.appendChild(dList);
const clearLog = document.createElement('button');
clearLog.textContent = 'Clear log';
clearLog.style.padding = '3px 8px';
clearLog.style.fontSize = '11px';
clearLog.style.cursor = 'pointer';
clearLog.style.background = '#702020';
clearLog.style.color = '#fff';
clearLog.style.border = '1px solid #a03333';
clearLog.style.borderRadius = '3px';
clearLog.style.marginRight = '6px';
clearLog.onclick = function(){
if (confirm('Clear spelling log?')) {
state.log = [];
AC.saveLog();
renderSidebar();
}
};
const clearDict = document.createElement('button');
clearDict.textContent = 'Clear custom dictionary';
clearDict.style.padding = '3px 8px';
clearDict.style.fontSize = '11px';
clearDict.style.cursor = 'pointer';
clearDict.style.background = '#704d20';
clearDict.style.color = '#fff';
clearDict.style.border = '1px solid #a06d33';
clearDict.style.borderRadius = '3px';
clearDict.onclick = function(){
if (confirm('Clear custom dictionary?')) {
state.customSet = new Set();
state.customList = [];
AC.saveCustomDict();
AC.healDictionaries();
renderSidebar();
}
};
content.appendChild(clearLog);
content.appendChild(clearDict);
}
injectStyles();
})();
function attachToEditable(div) {
if (div._acAttached) return;
div._acAttached = true;
div.addEventListener('keydown', function(e) {
const key = e.key;
if ([' ', 'Enter', '.', ',', '!', '?'].includes(key)) {
setTimeout(() => {
AC.correctInDiv(div, key);
}, 0);
}
});
}
function scanForEditables() {
const all = document.querySelectorAll('[contenteditable="true"],[contenteditable="plaintext-only"]');
all.forEach(div => attachToEditable(div));
}
const mo = new MutationObserver(() => {
scanForEditables();
});
mo.observe(document.body, { childList: true, subtree: true });
scanForEditables();
})();
