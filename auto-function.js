(function acAutocorrect_v7(){

/* storage */
function loadJSON(k,f){try{return JSON.parse(localStorage.getItem(k)||f);}catch(e){return JSON.parse(f);}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

const LOG_KEY="omari_spelling_log",DICT_KEY="omari_spelling_dict";
window._acLog=loadJSON(LOG_KEY,"[]");
window._acSeen=new Set(window._acLog.map(e=>e.word));
window._acDictList=loadJSON(DICT_KEY,"[]");
window._acDict=new Set(window._acDictList);
function cleanLog(){window._acLog=window._acLog.filter(e=>e&&e.word&&typeof e.word==="string"&&e.word.trim().length>=2);}
function saveLog(){cleanLog();saveJSON(LOG_KEY,window._acLog);}
function saveDict(){window._acDictList=[...window._acDict];saveJSON(DICT_KEY,window._acDictList);}

/* dictionary */
const DICT={
"Abarth":["abart","abarht","abarth?"],
"Alfa Romeo":["alfaromeo","alpha romeo","alfa romo","alfa romieo","alf aromeo","alpharomeo","alfa romio","alfa romero","alfa romeao","alfaromeoo","alfa romeeo","alfa rome0","alfa r omeo"],
"Citroën":["citroen","citreon","citroean","citroan","citroin","citoren","citroem"],
"DS":["ds","d.s."],
"DS Automobiles":["ds automoblies","ds automobils","ds autom"],
"Fiat":["fiatt","fiadt"],
"Jeep":["jepp","jeap","jepe","jep"],
"Leapmotor":["leap motor","leapmotors"],
"Peugeot":["peugot","peugeut","peuguot","pegeot","pugeot","peugoet","peugeoet","pegueot"],
"Vauxhall":["vauxel","vauxall","vaxhall","vauxhal","vaulxhall","vauxheel"],
"Stellantis":["stellantus","stellentis"],
"Stellantis &You":["stellantis and you","stellantis & you","stellantis &you","stellantis andyou"],
"Birmingham Central":["birmingam central","birmingham cental","birmingham centreal","brum central"],
"Birmingham":["brum"],
"Birmingham North":["birmingam north","birmingham nrth","birmingham northh","brum north"],
"Birmingham South":["birmingam south","birmingham soouth","birmingham southh","brum south"],
"Bristol Cribbs":["bristol cribs","bristolcribbs","bristol cribbb"],
"Chelmsford":["chelsford","chelmsord","chelmsfrod"],
"Chingford":["chingferd","chingfor","chingfrod"],
"Coventry":["coverty","coventary","covenrty"],
"Crawley":["crawely","crawly","crawlley"],
"Croydon":["croyden","croydun","croyodon"],
"Edgware":["edgeware","edgwer","edgwarre"],
"Guildford":["guilford","guild ford","guildfrod"],
"Hatfield":["hatfeild","hatfiled","hattfield"],
"Leicester":["lester","leister","liestter"],
"Liverpool":["liverpol","liverpoool","liverpoll"],
"Maidstone":["maidston","maidstoen","maidstoon"],
"Manchester":["manchestor","manchster","mannchester","manny"],
"Newport":["new port","newpport","newprot"],
"Nottingham":["nottingam","nottinghum","nothtingham"],
"Preston":["prestan","prestron","prestonn"],
"Redditch":["reditch","reddich","reddittch"],
"Romford":["romferd","romfor","romfford"],
"Sale":["sael","sal","salle"],
"Sheffield":["shefffield","sheffied","sheffild"],
"Stockport":["stcokport","stockprt","stookport"],
"Walton":["waltom","waltn","waulton"],
"West London":["westlondon","west londn","west londom"],
"Wimbledon":["wimbeldon","wimbeldun","wimbeldoon"],
"London":["londen","londan","lindon","londdon","lndon","londn","ldn"],
"Motability":["motab","motabilty","motivability"],
"UK":["u k"],
"Monday":["mondey","monady"],
"Tuesday":["tueday","tuesay","tueseday"],
"Wednesday":["wensday","wednsday","wedensday"],
"Thursday":["thurday","thursay"],
"Friday":["firday"],
"Saturday":["satarday"],
"Sunday":["sundey"],
"January":["januray","janary","januarry"],
"February":["febuary","feburary","februuary"],
"March":["marhc","mrach","marchh"],
"April":["aprill"],
"May":["mayy","maay"],
"June":["junee","juen"],
"July":["julyy","jly"],
"August":["augustt","agust","auguest"],
"September":["septemberr","septembar","setpember"],
"October":["octobr","octuber","otcober"],
"November":["novemberr","noovember","novembar"],
"December":["decemberr","decembar","decmeber"],
"able":["abl","ab le"],
"add":["ad","a dd"],
"address":["adress","adresss","adrs"],
"advise":["advice","advise"],
"agent":["agnt","agant"],
"agents":["agnts","agantS","agantes"],
"all":["al","a ll"],
"along":["alng","alogn"],
"am":["ma","a m"],
"an":["na","a n"],
"and":["adn","an d","snd","se nd"],
"any":["an y","anyy","ani"],
"appointments":["appontments","apointments","appoinments"],
"arrange":["arange","arrnge"],
"are":["ar","aer","arre"],
"as":["sa","a s"],
"at":["ta","a t"],
"available":["availble","avialable","avalable"],
"aware":["awre","awar"],
"be":["eb","b e"],
"because":["becuase","beacuse"],
"before":["befor","bfore","befroe"],
"believe":["belive","beleive"],
"book":["bok","bokk"],
"both":["bth","booth"],
"branches":["braches","branchs"],
"but":["bt","b ut"],
"calendar":["calender"],
"call":["cal","cal l"],
"calls":["cals","calss"],
"can":["csn"],
"can't":["cant","can t","cnt"],
"central":["centrall","centrl"],
"closer":["closr","closeer","clsoer"],
"come":["cmoe","coem"],
"confirm":["confrm","cnfirm","confrim"],
"contact":["contat","contac"],
"costs":["csts"],
"couldn't":["couldnt","coudnt","could'nt"],
"currently":["curently","currenty","currenlty"],
"dealership":["delership","dealrship"],
"definitely":["definately","definatly","defently"],
"department":["departmnt","departent"],
"dates":["daets","datse"],
"detail":["detial"],
"details":["detials","detals"],
"directly":["directy","dirctly"],
"do":["d0","od"],
"don't":["dont","don t"],
"discuss":["dicuss","discus"],
"email":["emial","emiall"],
"enough":["enuf","enogh"],
"everything":["everyting","evrything"],
"expected":["expcted","expeced","expectd"],
"find":["fnd","fi nd"],
"fine":["fien","fin"],
"for":["fro","fo","fr"],
"fuel":["fuell","fu el"],
"further":["furhter"],
"get":["gt","git"],
"give":["giv","giev"],
"go":["og","g o"],
"have":["hvae","hae","hve","havet"],
"hello":["helo","helllo"],
"help":["hlp","hepl","hekp"],
"here":["hre","he re"],
"how":["hw","hwo"],
"if":["fi","i f"],
"I'm":["im"],
"in":["ni","i n"],
"information":["informtion","infromation","informaiton"],
"interested":["intrested","intersted","intereste"],
"instead":["instaed","insted"],
"into":["in to"],
"issue":["issuse","isssue","isue"],
"is":["si","i s"],
"it":["ut"],
"i've":["ive"],
"just":["jst","ju st"],
"local":["locl","loca"],
"looking":["loking","lookng","lookin"],
"looked":["loked","lookked"],
"limited":["limted","limiited"],
"like":["lik","liek"],
"make":["mkae","mak"],
"me":["m","mee"],
"miles":["miiles"],
"morning":["morng","morni ng"],
"move":["mvoe","moev"],
"my":["ny","ym"],
"need":["ne ed"],
"needed":["neded","needd"],
"never":["nevr","neveer"],
"next":["nxt","nextt"],
"not":["nto","noot"],
"number":["nubmer","numbr"],
"of":["fo","o f"],
"on":["o n"],
"onto":["on to","ont o"],
"or":["ro","o r"],
"orders":["ordres","oders"],
"please":["plese","pleas"],
"postcode":["postocde"],
"price":["prcie","prce"],
"problem":["probelm","proble"],
"previously":["prevously","previoiusly"],
"purchase":["purches","purchace","pursch"],
"receive":["recieve","recive"],
"recommend":["recomend","reccommend","recommnd"],
"require":["requre","requier"],
"sales":["saels","sles"],
"schedule":["shedule","schedul"],
"scheduling":["schedualling"],
"seems":["sems"],
"sent":["snt","se nt"],
"service":["sevice","srvice"],
"site":["sitr","si te"],
"so":["os","s o"],
"something":["smt"],
"specific":["spefic","specfic"],
"sure":["sur","shure"],
"test":["tset","te st"],
"team":["tem","te am"],
"that":["thst"],
"thank you":["thankyou","ty","thak you","thank yu"],
"the":["th","thee"],
"their":["thier"],
"these":["tehse","thes"],
"there":["ther","thre","thare"],
"this":["tis","thsi","thes"],
"though":["tho","thogh","thugh","thouhg","thoough"],
"thought":["thot","thougth"],
"through":["throguh","thruogh","throuogh"],
"time":["tme","tiem"],
"today":["tody","todday","tdy"],
"tomorrow":["tommorow","tomorow","tmr"],
"transmission":["transmision","trasmission"],
"type":["tpe","ty pe"],
"unavailable":["unavaible","unavalible"],
"unfortunately":["unfortunetly","unfortunatly"],
"valuation":["valutaion","valution","valuaton"],
"vehicle":["vehical","vechicle","vehicule","vehicel","vehicl","vehcilea","vehcile"],
"vehicles":["vehciles","vehicels","vehicles","vehicals","vechicles","vehicules","vehicels","vehicls","vehcileas"],
"viewings":["viewngs","vieewings"],
"website":["wesbite","webiste","websit"],
"we":["ew","w e"],
"which":["whcih","whihc"],
"will":["wil","wll"],
"with":["wiht","w tih"],
"work":["wrok"],
"working":["workng","wroking","workiing"],
"would":["woudl","wold"],
"wrong":["wron","wrnog"],
"yes":["ye","y es"],
"yet":["yte","yt"],
"you":["yo","yuo","u"],
"your":["uour","ur"],
"yourself":["yourslef","yourse lf"]
};

/* flatten */
const FLAT={},MULTI=[];
for(const c in DICT){
FLAT[c.toLowerCase()]=c;
DICT[c].forEach(m=>FLAT[m.toLowerCase()]=c);
if(c.includes(" ")){
MULTI.push({key:c.toLowerCase(),correct:c});
DICT[c].forEach(m=>{if(m.includes(" "))MULTI.push({key:m.toLowerCase(),correct:c});});
}
}

/* capture */
function captureSentence(){
const sel=window.getSelection();if(!sel.rangeCount)return"";
const r=sel.getRangeAt(0);
const pre=r.cloneRange();pre.collapse(true);
while(pre.startOffset>0){pre.setStart(pre.startContainer,pre.startOffset-1);if(/[.!?]/.test(pre.toString().charAt(0)))break;}
const post=r.cloneRange();post.collapse(false);
while(post.endOffset<post.endContainer.length){post.setEnd(post.endContainer,post.endOffset+1);if(/[.!?]/.test(post.toString().slice(-1)))break;}
return(pre.toString()+r.toString()+post.toString()).replace(/\s+/g," ").trim();
}

/* log */
function record(wd){
const w=wd.toLowerCase();
if(w.length<2||FLAT[w]||w==="i"||window._acDict.has(w))return;
const d=new Date().toISOString().slice(0,10);
if(window._acLog.some(e=>e.word===w&&e.when.slice(0,10)===d))return;
window._acLog.push({word:w,when:new Date().toISOString(),sentence:captureSentence()});
window._acSeen.add(w);saveLog();
}

/* caret */
function setCaret(div,i){
const w=document.createTreeWalker(div,NodeFilter.SHOW_TEXT,null);
let n=w.nextNode(),c=0;
while(n){
const nxt=c+n.nodeValue.length;
if(nxt>=i){
const r=document.createRange(),s=window.getSelection();
r.setStart(n,i-c);r.collapse(true);
s.removeAllRanges();s.addRange(r);return;
}
c=nxt;n=w.nextNode();
}
}

/* grouping */
function groupByWord(log){
const g={};log.forEach(e=>{if(!g[e.word])g[e.word]=[];g[e.word].push(e);});return g;
}

/* txt */
function formatTxt(log){
if(!log.length)return"No entries.";
const g=groupByWord(log),keys=Object.keys(g).sort();
let out="";keys.forEach(w=>{out+=`\n${w.toUpperCase()} (x${g[w].length})\n`;g[w].forEach(e=>{out+=` • ${e.when}${e.sentence?" — “"+e.sentence+"”":""}\n`;});out+="\n";});
return out.trim();
}

/* stats */
function makeStats(){
const log=window._acLog,total=log.length,g=groupByWord(log),unique=Object.keys(g).length;
const d=new Date().toISOString().slice(0,10);
const td=log.filter(e=>e.when.slice(0,10)===d);
const freq=Object.keys(g).map(w=>({w,count:g[w].length})).sort((a,b)=>b.count-a.count).slice(0,10);
let t=`Total entries: ${total}\nUnique words: ${unique}\n\nToday: ${td.length} entries, ${new Set(td.map(e=>e.word)).size} unique\n\nTop words:\n`;
freq.forEach(o=>t+=` - ${o.w} (x${o.count})\n`);
return t;
}

/* exports */
window.exportSpellLogTXT=function(){
const url=URL.createObjectURL(new Blob([formatTxt(window._acLog)],{type:"text/plain"}));
window.open(url,"_blank");
};
window.exportSpellLogCSV=function(){
const g=groupByWord(window._acLog),k=Object.keys(g);
if(!k.length){window.open(URL.createObjectURL(new Blob(["word,count,first_seen,last_seen,sample\n"],{type:"text/csv"})),"_blank");return;}
let r=["word,count,first_seen,last_seen,sample"];
k.forEach(w=>{
const a=g[w].sort((x,y)=>x.when.localeCompare(y.when));
const s=(a[0].sentence||"").replace(/"/g,"''");
r.push(`"${w}",${a.length},"${a[0].when}","${a[a.length-1].when}","${s}"`);
});
window.open(URL.createObjectURL(new Blob([r.join("\n")],{type:"text/csv"})),"_blank");
};

/* undo */
window._acLastCorrection=null;
window.undoLastCorrection=function(){
const c=window._acLastCorrection;if(!c||!c.div)return;
c.div.innerText=c.before;setCaret(c.div,Math.min(c.caretBefore,c.before.length));
window._acLastCorrection=null;
};

/* sidebar */
function buildSidebar(){
let sb=document.getElementById("acSidebar");
if(sb)return sb;
sb=document.createElement("div");
Object.assign(sb.style,{position:"fixed",left:"0",top:"0",width:"280px",height:"100%",background:"#111",color:"#fff",padding:"8px",fontSize:"12px",overflowY:"auto",zIndex:999998,borderRight:"2px solid #444",fontFamily:"Arial"});
sb.id="acSidebar";document.body.appendChild(sb);return sb;
}
function renderSidebar(){
const sb=document.getElementById("acSidebar");if(!sb)return;
const tab=window._acTab||"log";sb.innerHTML="";
const tabs=document.createElement("div"),names=[{id:"log",label:"Log"},{id:"stats",label:"Stats"},{id:"export",label:"Export"},{id:"settings",label:"Settings"}];
names.forEach(t=>{const b=document.createElement("button");b.textContent=t.label;
Object.assign(b.style,{marginRight:"4px",padding:"2px 6px",fontSize:"11px",cursor:"pointer",background:t.id===tab?"#f9772e":"#333",color:"#fff",border:"1px solid #555"});
b.onclick=()=>{window._acTab=t.id;renderSidebar();};tabs.appendChild(b);});
sb.appendChild(tabs);
const c=document.createElement("div");c.style.whiteSpace="pre-wrap";sb.appendChild(c);
if(tab==="log"){
const g=groupByWord(window._acLog),k=Object.keys(g).sort();
if(!k.length){c.textContent="No entries.";return;}
const info=document.createElement("div");info.textContent="Click a word to add to dictionary.";info.style.marginBottom="6px";c.appendChild(info);
k.forEach(w=>{
const row=document.createElement("div");row.textContent=`${w} (x${g[w].length})`;
Object.assign(row.style,{cursor:"pointer",padding:"2px 0",borderBottom:"1px solid #222"});
row.onclick=()=>{if(window._acDict.has(w)){alert(`"${w}" already in dictionary.`);return;}
if(confirm(`Add "${w}" to dictionary?`)){window._acDict.add(w);saveDict();window._acLog=window._acLog.filter(e=>e.word!==w);saveLog();renderSidebar();}};
c.appendChild(row);
});
const u=document.createElement("button");u.textContent="Undo last correction";
Object.assign(u.style,{marginTop:"8px",padding:"2px 6px",fontSize:"11px",cursor:"pointer",background:"#444",color:"#fff",border:"1px solid #666"});
u.onclick=window.undoLastCorrection;c.appendChild(u);
}
else if(tab==="stats")c.textContent=makeStats();
else if(tab==="export"){
["TXT","CSV"].forEach(type=>{
const b=document.createElement("button");
b.textContent="Download "+type;
Object.assign(b.style,{marginRight:"6px",padding:"3px 8px",fontSize:"11px",cursor:"pointer",background:"#444",color:"#fff",border:"1px solid #666"});
b.onclick=type==="TXT"?window.exportSpellLogTXT:window.exportSpellLogCSV;
c.appendChild(b);
});
}
else{
const t=document.createElement("div");t.textContent="Custom dictionary:";t.style.marginBottom="4px";c.appendChild(t);
const dl=document.createElement("div");dl.textContent=window._acDictList.length?window._acDictList.join(", "):"(none)";dl.style.marginBottom="8px";c.appendChild(dl);
const cl=document.createElement("button");cl.textContent="Clear log";
Object.assign(cl.style,{marginRight:"6px",padding:"3px 8px",fontSize:"11px",cursor:"pointer",background:"#700",color:"#fff",border:"1px solid #a00"});
cl.onclick=()=>{if(confirm("Clear log?")){window._acLog=[];window._acSeen=new Set();saveLog();renderSidebar();}};
const cd=document.createElement("button");cd.textContent="Clear dictionary";
Object.assign(cd.style,{padding:"3px 8px",fontSize:"11px",cursor:"pointer",background:"#704000",color:"#fff",border:"1px solid #a06000"});
cd.onclick=()=>{if(confirm("Clear dictionary?")){window._acDict.clear();saveDict();renderSidebar();}};
c.appendChild(cl);c.appendChild(cd);
}
}

/* toggle */
window.toggleSpellSidebar=function(){
const e=document.getElementById("acSidebar");
if(e){e.remove();return;}
window._acTab=window._acTab||"log";
buildSidebar();renderSidebar();
};

/* button */
function ensureToggleButton(){
if(window._acButtonInit)return;
window._acButtonInit=true;
if(document.getElementById("acToggleBtn"))return;
const b=document.createElement("div");
Object.assign(b.style,{position:"fixed",left:"12px",bottom:"12px",width:"18px",height:"18px",background:"#f9772e",border:"2px solid #000",borderRadius:"50%",boxShadow:"0 0 4px rgba(0,0,0,0.4)",zIndex:999999,cursor:"pointer"});
b.id="acToggleBtn";b.title="Spelling log – click or Alt+T";b.onclick=window.toggleSpellSidebar;document.body.appendChild(b);
}

/* hotkey */
if(!window._acHotkey){
window._acHotkey=true;
window.addEventListener("keydown",e=>{if(e.altKey&&e.code==="KeyT"){e.preventDefault();e.stopPropagation();window.toggleSpellSidebar();}});
}
ensureToggleButton();

/* setup editors */
function setup(div){
if(div._acAuto)return;
div._acAuto=true;
div.addEventListener("keyup",e=>{
if(![" ","Enter",".",",","!","?","›","›",">"].includes(e.key))return;
const typed=e.key==="Enter"?"\n":e.key;
const sel=window.getSelection();if(!sel.rangeCount)return;
const rng=sel.getRangeAt(0);if(!rng.collapsed)return;
const pre=rng.cloneRange();pre.selectNodeContents(div);pre.setEnd(rng.endContainer,rng.endOffset);
const full=pre.toString();if(!full.endsWith(typed))return;
const t=full.slice(0,-1),rest=div.innerText.slice(full.length),low=t.toLowerCase();
const before=t+typed+rest,caretBefore=full.length;

/* multi */
for(const{key,correct}of MULTI){
const m=low.match(new RegExp(`(${key})([.,!?])?$`));
if(m){
const punct=m[2]||"",len=key.length+(punct?1:0);
let p=t.length-len-1;while(p>=0&&/\s/.test(t.charAt(p)))p--;
const start=(p<0)||/[.!?]/.test(t.charAt(p));
const rep=start?correct.charAt(0).toUpperCase()+correct.slice(1):correct;
const newT=t.slice(0,-len)+rep+punct,after=newT+typed+rest;
div.innerText=after;setCaret(div,newT.length+1);
window._acLastCorrection={div,before,after,caretBefore,caretAfter:newT.length+1};return;
}
}

/* single */
const parts=t.split(/(\s+)/);let idx=-1;
for(let i=parts.length-1;i>=0;i--){if(parts[i].trim()!==""){idx=i;break;}}
if(idx<0)return;
const raw=parts[idx].match(/^(.+?)([.,!?])?$/),core=raw?raw[1]:parts[idx],punct=raw&&raw[2]?raw[2]:"",lc=core.toLowerCase();
record(core);
let rep=FLAT[lc]||null;if(!rep&&lc==="i")rep="I";

let count=0;for(let j=0;j<idx;j++)count+=parts[j].length;
let p=count-1;while(p>=0&&/\s/.test(t.charAt(p)))p--;const start=(p<0)||/[.!?]/.test(t.charAt(p));
if(rep&&start)rep=rep.charAt(0).toUpperCase()+rep.slice(1);else if(!rep&&start)rep=core.charAt(0).toUpperCase()+core.slice(1);

if(rep&&rep!==core){
parts[idx]=rep+punct;const newT=parts.join(""),after=newT+typed+rest;
div.innerText=after;setCaret(div,newT.length+1);
window._acLastCorrection={div,before,after,caretBefore,caretAfter:newT.length+1};
}
});
}

/* init */
document.querySelectorAll('div[contenteditable="true"]').forEach(setup);
new MutationObserver(m=>{m.forEach(x=>{x.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches&&n.matches('div[contenteditable="true"]'))setup(n);else if(n.querySelectorAll)n.querySelectorAll('div[contenteditable="true"]').forEach(setup);});});}).observe(document.body,{childList:true,subtree:true});

})();
