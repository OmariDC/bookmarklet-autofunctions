(function acAutocorrect_v8(){
  function loadJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key)||fallback);}catch(e){return JSON.parse(fallback);}}
  function saveJSON(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}}
  const LOG_KEY="omari_spelling_log";
  const DICT_KEY="omari_spelling_dict";
  const EXT_KEY="omari_spelling_ext";
  const CAPS_KEY="omari_caps_rules";
  window._acLog=loadJSON(LOG_KEY,"[]");
  window._acSeen=new Set(window._acLog.map(e=>e.word));
  window._acDictList=loadJSON(DICT_KEY,"[]");
  window._acDictList=Array.from(new Set(window._acDictList||[]));
  window._acDict=new Set(window._acDictList);
  window._acDictExt=loadJSON(EXT_KEY,"{}");
  window._acCaps=loadJSON(CAPS_KEY,"{}");
  window._acCanonicalList=[];
  function cleanLog(){window._acLog=window._acLog.filter(e=>e&&e.word&&typeof e.word==="string"&&e.word.trim().length>=2);}
  function saveLog(){cleanLog();saveJSON(LOG_KEY,window._acLog);}
  function saveDict(){window._acDictList=Array.from(new Set(window._acDict));saveJSON(DICT_KEY,window._acDictList);}
  function saveExt(){saveJSON(EXT_KEY,window._acDictExt||{});}
  function saveCaps(){saveJSON(CAPS_KEY,window._acCaps||{});}

  const DICT={
    'Abarth':['abart','abarht','abarth?'],
    'Alfa Romeo':['alfaromeo','alpha romeo','alfa romo','alfaromeo','alfa romieo','alf aromeo','alpharomeo','alfa romio','alfa romero','alfa romeao','alfa romeo','alfa romeo','alfar omeo','alfa romeo','alfa romeo','alfaromeoo','alfa romeeo','alfa rome0','alfa r omeo','alfa romeo'],
    'Citroën':['citroen','citreon','citroean','citroan','citroin','citoren','citroem'],
    'DS':['ds','d.s.'],
    'DS Automobiles':['ds automoblies','ds automobils','ds autom'],
    'Fiat':['fiatt','fiadt'],
    'Jeep':['jepp','jeap','jepe','jep'],
    'Leapmotor':['leap motor','leapmotors'],
    'Peugeot':['peugot','peugeut','peuguot','pegeot','pugeot','peugoet','peugeoet','pegueot'],
    'Vauxhall':['vauxel','vauxall','vaxhall','vauxhal','vaulxhall','vauxheel'],
    'Stellantis':['stellantus','stellentis','stellantis'],
    'Stellantis &You':['stellantis and you','stellantis & you','stellantis &you','stellantis andyou'],
    'Birmingham Central':['birmingam central','birmingham cental','birmingham centreal','brum central'],
    'Birmingham':['brum'],
    'Birmingham North':['birmingam north','birmingham nrth','birmingham northh','brum north'],
    'Birmingham South':['birmingam south','birmingham soouth','birmingham southh','brum south'],
    'Bristol Cribbs':['bristol cribs','bristolcribbs','bristol cribbb'],
    'Chelmsford':['chelsford','chelmsord','chelmsfrod'],
    'Chingford':['chingferd','chingfor','chingfrod'],
    'Coventry':['coverty','coventary','covenrty'],
    'Crawley':['crawely','crawly','crawlley'],
    'Croydon':['croyden','croydun','croyodon'],
    'Edgware':['edgeware','edgwer','edgwarre'],
    'Guildford':['guilford','guild ford','guildfrod'],
    'Hatfield':['hatfeild','hatfiled','hattfield'],
    'Leicester':['lester','leister','liestter'],
    'Liverpool':['liverpol','liverpoool','liverpoll'],
    'Maidstone':['maidston','maidstoen','maidstoon'],
    'Manchester':['manchestor','manchster','mannchester','manny'],
    'Newport':['new port','newpport','newprot'],
    'Nottingham':['nottingam','nottinghum','nothtingham'],
    'Preston':['prestan','prestron','prestonn'],
    'Redditch':['reditch','reddich','reddittch'],
    'Romford':['romferd','romfor','romfford'],
    'Sale':['sael','sal','salle'],
    'Sheffield':['shefffield','sheffied','sheffild'],
    'Stockport':['stcokport','stockprt','stookport'],
    'Walton':['waltom','waltn','waulton'],
    'West London':['westlondon','west londn','west londom'],
    'Wimbledon':['wimbeldon','wimbeldun','wimbeldoon'],
    'London':['londen','londan','lindon','londdon','lndon','londn','ldn'],
    'Motability':['motab','motabilty','motivability'],
    'UK':['uk','u k'],
    'Monday':['monday','mondey','monady'],
    'Tuesday':['tuesday','tueday','tuesay','tueseday'],
    'Wednesday':['wednesday','wensday','wednsday','wedensday'],
    'Thursday':['thursday','thurday','thursay'],
    'Friday':['friday','firday'],
    'Saturday':['saturday','satarday'],
    'Sunday':['sunday','sundey'],
    'January':['januray','janary','januarry'],
    'February':['febuary','feburary','februuary'],
    'March':['marhc','mrach','marchh'],
    'April':['aprill'],
    'May':['mayy','maay'],
    'June':['junee','juen'],
    'July':['julyy','jly'],
    'August':['augustt','agust','auguest'],
    'September':['septemberr','septembar','setpember'],
    'October':['octobr','octuber','otcober'],
    'November':['novemberr','noovember','novembar'],
    'December':['decemberr','decembar','decmeber'],
    'I':['i'],
    'able':['abl','ab le'],
    add:['ad','a dd'],
    address:['adress','adresss','adrs'],
    advise:['adice','advice','advise'],
    agent:['agnt','agant'],
    agents:['agnts','agantS','agantes'],
    all:['al','a ll'],
    along:['alng','alogn'],
    am:['ma','a m'],
    an:['na','a n'],
    and:['adn','an d','snd','se nd'],
    any:['an y','anyy','ani'],
    appointments:['appontments','apointments','appoinments'],
    arrange:['arange','arrnge'],
    are:['ar','aer','arre'],
    as:['sa','a s'],
    at:['ta','a t'],
    available:['availble','avialable','avalable'],
    aware:['awre','awar'],
    be:['eb','b e'],
    because:['becuase','beacuse'],
    before:['befor','bfore','befroe'],
    believe:['belive','beleive'],
    book:['bok','bokk'],
    both:['bth','booth'],
    branches:['braches','branchs'],
    but:['bt','b ut'],
    calendar:['calender'],
    call:['cal','cal l'],
    calls:['cals','calss'],
    can:['csn'],
    "can't":['cant','can t','cnt'],
    central:['centrall','centrl'],
    closer:['closr','closeer','clsoer'],
    come:['cmoe','coem'],
    confirm:['confrm','cnfirm','confrim'],
    contact:['contat','contac'],
    costs:['csts'],
    "couldn't":['couldnt','coudnt',"could'nt"],
    currently:['curently','currenty','currenlty'],
    dealership:['delership','dealrship'],
    definitely:['definately','definatly','defently'],
    department:['departmnt','departent'],
    dates:['daets','datse'],
    detail:['detial'],
    details:['detials','detals'],
    directly:['directy','dirctly'],
    'do':['d0','od'],
    "don't":['dont','don t'],
    discuss:['dicuss','discus'],
    editor:['edtor','editro','edditor'],
    email:['emial','emiall'],
    enough:['enuf','enogh'],
    everything:['everyting','evrything'],
    expected:['expcted','expeced','expectd'],
    exchanged:['exhanged','exchnged'],
    find:['fnd','fi nd'],
    fine:['fien','fin'],
    'for':['fro','fo','fr'],
    fuel:['fuell','fu el'],
    further:['furhter'],
    get:['gt','git'],
    give:['giv','giev'],
    go:['og','g o'],
    have:['hvae','hae','hve','havet'],
    hate:['hat','haet'],
    heard:['herd','haerd'],
    hello:['helo','helllo'],
    help:['hlp','hepl','hekp'],
    here:['hre','he re'],
    how:['hw','hwo'],
    however:['hovewer','howeer','howerver'],
    'if':['fi','i f'],
    "I'm":['im'],
    immediate:['immediat','immediatly'],
    'in':['ni','i n'],
    information:['informtion','infromation','informaiton'],
    interested:['intrested','intersted','intereste'],
    instead:['instaed','insted'],
    into:['in to'],
    issue:['issuse','isssue','isue'],
    is:['si','i s'],
    it:['ut'],
    "i've":['ive'],
    just:['jst','ju st'],
    local:['locl','loca'],
    looking:['loking','lookng','lookin'],
    looked:['loked','lookked'],
    limited:['limted','limiited'],
    like:['lik','liek'],
    make:['mkae','mak'],
    may:['mya'],
    me:['m','mee'],
    miles:['miiles'],
    morning:['morng','morni ng'],
    move:['mvoe','moev'],
    my:['ny','ym'],
    need:['need'],
    needed:['neded','needd'],
    never:['nevr','neveer'],
    next:['nxt','nextt'],
    'no problem':['np'],
    not:['nto','noot'],
    number:['nubmer','numbr'],
    of:['fo','o f'],
    on:['o n'],
    onto:['on to','ont o'],
    or:['ro','o r'],
    orders:['ordres','oders'],
    our:['our'],
    'part-exchange':['px'],
    'part-exchanging':['pxing'],
    please:['plese','pleas'],
    postcode:['postocde'],
    price:['prcie','prce'],
    problem:['probelm','proble'],
    previously:['prevously','previoiusly'],
    purchase:['purches','purchace','pursch'],
    potential:['potental','potentail'],
    quarter:['quater','quartre','qarter'],
    receive:['recieve','recive'],
    referring:['refering'],
    recommend:['recomend','reccommend','recommnd'],
    recommended:['recomended','reommend','recommened'],
    require:['requre','requier'],
    sales:['saels','sles'],
    schedule:['shedule','schedul'],
    scheduling:['schedualling'],
    seems:['sems'],
    sent:['snt','se nt'],
    service:['sevice','srvice'],
    "shouldn't":['shouldnt','shoudnt',"should'nt"],
    site:['sitr','si te'],
    so:['os','s o'],
    'so I':['so i'],
    'so much':['sm'],
    something:['smt'],
    specific:['spefic','specfic'],
    sure:['sur','shure'],
    test:['tset','te st'],
    team:['tem','te am'],
    that:['thst'],
    'thank you':['thankyou','ty','thak you','thank yu'],
    the:['th','thee'],
    their:['thier'],
    these:['tehse','thes'],
    there:['ther','thre','thare'],
    'this':['tis','thsi','thes'],
    though:['tho','thogh','thugh','thouhg','thoough'],
    thought:['thot','thougth'],
    through:['throguh','thruogh','throuogh'],
    time:['tme','tiem'],
    today:['tody','todday','tdy'],
    tomorrow:['tommorow','tomorow','tmr'],
    transmission:['transmision','trasmission'],
    type:['tpe','ty pe'],
    unavailable:['unavaible','unavalible'],
    "unfortunately":['unfortunetly','unfortunatly'],
    valuation:['valutaion','valution','valuaton'],
    vehicle:['vehical','vechicle','vehicule','vehicel','vehicl','vehcilea','vehcile'],
    vehicles:['vehciles','vehicels','vehicles','vehicals','vechicles','vehicules','vehicels','vehicls','vehcileas'],
    viewings:['viewngs','vieewings'],
    website:['wesbite','webiste','websit'],
    we:['ew','w e'],
    West:['wset','we st'],
    which:['whcih','whihc'],
    will:['wil','wll'],
    'with':['wiht','w tih'],
    work:['wrok'],
    working:['workng','wroking','workiing'],
    would:['woudl','wold'],
    "wouldn't":['woudlnt','wouldnt'],
    wrong:['wron','wrnog'],
    yes:['ye','y es'],
    yet:['yte','yt'],
    you:['yo','yuo','u'],
    your:['uour','ur'],
    yourself:['yourslef','yourse lf']
  };

  function ensureDefaultCaps(){
    const caps=window._acCaps||(window._acCaps={});
    const defaults=[
      'Abarth','Alfa Romeo','Citroën','DS','DS Automobiles','Fiat','Jeep','Leapmotor','Peugeot','Vauxhall',
      'Stellantis','Stellantis &You','Birmingham Central','Birmingham','Birmingham North','Birmingham South',
      'Bristol Cribbs','Chelmsford','Chingford','Coventry','Crawley','Croydon','Edgware','Guildford','Hatfield',
      'Leicester','Liverpool','Maidstone','Manchester','Newport','Nottingham','Preston','Redditch','Romford',
      'Sale','Sheffield','Stockport','Walton','West London','Wimbledon','London','Motability','UK',
      'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
      'January','February','March','April','May','June','July','August','September','October','November','December'
    ];
    defaults.forEach(w=>{if(!Object.prototype.hasOwnProperty.call(caps,w))caps[w]=true;});
    saveCaps();
  }
  ensureDefaultCaps();

  let FLAT={},MULTI=[];
  function rebuildMaps(){
    FLAT={};MULTI=[];
    const canonSet=new Set();
    function applyDict(d){
      for(const correct in d){
        const list=d[correct]||[];
        const cLower=correct.toLowerCase();
        FLAT[cLower]=correct;
        canonSet.add(correct);
        list.forEach(m=>{const ml=m.toLowerCase();FLAT[ml]=correct;});
        if(correct.indexOf(" ")!==-1){
          MULTI.push({key:cLower,correct});
          list.forEach(m=>{if(m.indexOf(" ")!==-1)MULTI.push({key:m.toLowerCase(),correct});});
        }
      }
    }
    applyDict(DICT);
    applyDict(window._acDictExt||{});
    (window._acDictList||[]).forEach(w=>{
      if(!w)return;
      const lw=w.toLowerCase();
      canonSet.add(w);
      if(!FLAT[lw])FLAT[lw]=w;
    });
    window._acCanonicalList=Array.from(canonSet).sort((a,b)=>a.localeCompare(b));
  }
  rebuildMaps();

  function captureSentence(){
    const sel=window.getSelection();
    if(!sel.rangeCount)return "";
    const r=sel.getRangeAt(0);
    const pre=r.cloneRange();pre.collapse(true);
    while(pre.startOffset>0){pre.setStart(pre.startContainer,pre.startOffset-1);if(/[.!?]/.test(pre.toString().charAt(0)))break;}
    const post=r.cloneRange();post.collapse(false);
    while(post.endOffset<post.endContainer.length){post.setEnd(post.endContainer,post.endOffset+1);if(/[.!?]/.test(post.toString().slice(-1)))break;}
    let s=pre.toString()+r.toString()+post.toString();
    return s.replace(/\s+/g," ").trim();
  }

  function record(word){
    const w=word.toLowerCase();
    if(w.length<2||FLAT[w]||window._acDict.has(w))return;
    const today=(new Date()).toISOString().slice(0,10);
    const existsToday=window._acLog.some(e=>e.word===w&&e.when.slice(0,10)===today);
    if(existsToday)return;
    const entry={word:w,when:(new Date()).toISOString(),sentence:captureSentence()};
    window._acLog.push(entry);
    window._acSeen.add(w);
    saveLog();
  }

  function setCaret(div,i){
    const w=document.createTreeWalker(div,NodeFilter.SHOW_TEXT,null);
    let n=w.nextNode(),count=0;
    while(n){
      const next=count+n.nodeValue.length;
      if(next>=i){
        const r=document.createRange(),s=window.getSelection();
        r.setStart(n,i-count);r.collapse(true);
        s.removeAllRanges();s.addRange(r);
        return;
      }
      count=next;n=w.nextNode();
    }
  }

  function groupByWord(log){
    const g={};log.forEach(e=>{if(!g[e.word])g[e.word]=[];g[e.word].push(e);});return g;
  }

  function formatTxt(log){
    if(!log.length)return "No entries.";
    const g=groupByWord(log),keys=Object.keys(g).sort();let out="";
    keys.forEach(w=>{
      const arr=g[w];
      out+=`\n${w.toUpperCase()}  (x${arr.length})\n`;
      arr.forEach(e=>{out+=`   • ${e.when}${e.sentence?" - \""+e.sentence+"\"":""}\n`;});
      out+="\n";
    });
    return out.trim();
  }

  function makeStats(){
    const log=window._acLog,g=groupByWord(log),total=log.length,unique=Object.keys(g).length;
    const todayStr=(new Date()).toISOString().slice(0,10);
    const todayEntries=log.filter(e=>e.when.slice(0,10)===todayStr);
    const todayTotal=todayEntries.length;
    const todayUnique=(new Set(todayEntries.map(e=>e.word))).size;
    const freqArr=Object.keys(g).map(w=>({w,count:g[w].length})).sort((a,b)=>b.count-a.count).slice(0,10);
    let txt="";
    txt+=`Total entries: ${total}\n`;
    txt+=`Unique words: ${unique}\n\n`;
    txt+=`Today: ${todayTotal} entries, ${todayUnique} unique\n\n`;
    txt+=`Top words:\n`;
    freqArr.forEach(o=>{txt+=`  - ${o.w}  (x${o.count})\n`;});
    return txt;
  }

  window.exportSpellLogTXT=function(){
    const txt=formatTxt(window._acLog);
    const blob=new Blob([txt],{type:"text/plain"});
    const url=URL.createObjectURL(blob);
    window.open(url,"_blank");
  };

  window.exportSpellLogCSV=function(){
    const g=groupByWord(window._acLog),keys=Object.keys(g);
    if(!keys.length){
      const blobEmpty=new Blob(["word,count,first_seen,last_seen,sample\n"],{type:"text/csv"});
      const urlEmpty=URL.createObjectURL(blobEmpty);
      window.open(urlEmpty,"_blank");
      return;
    }
    let rows=["word,count,first_seen,last_seen,sample"];
    keys.forEach(w=>{
      const arr=g[w].slice().sort((a,b)=>a.when.localeCompare(b.when));
      const count=arr.length,first=arr[0].when,last=arr[arr.length-1].when;
      const sample=(arr[0].sentence||"").replace(/"/g,"''");
      rows.push(`"${w}",${count},"${first}","${last}","${sample}"`);
    });
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    window.open(url,"_blank");
  };

  window._acLastCorrection=null;
  window.undoLastCorrection=function(){
    const c=window._acLastCorrection;
    if(!c||!c.div)return;
    c.div.innerText=c.before;
    setCaret(c.div,Math.min(c.caretBefore,c.before.length));
    window._acLastCorrection=null;
  };

  function injectStyles(){
    if(document.getElementById("acStyles"))return;
    const st=document.createElement("style");
    st.id="acStyles";
    st.textContent="#acSidebar::-webkit-scrollbar,#acAssignPanel::-webkit-scrollbar{width:6px;}#acSidebar::-webkit-scrollbar-thumb,#acAssignPanel::-webkit-scrollbar-thumb{background:#2a2f6b;border-radius:3px;}#acSidebar::-webkit-scrollbar-track,#acAssignPanel::-webkit-scrollbar-track{background:#080c3c;}";
    document.head.appendChild(st);
  }

  function buildSidebar(){
    let sb=document.getElementById("acSidebar");
    if(sb)return sb;
    sb=document.createElement("div");
    sb.id="acSidebar";
    Object.assign(sb.style,{
      position:"fixed",
      left:"0",
      top:"0",
      width:"280px",
      height:"100%",
      background:"#080c3c",
      color:"#e5e9ff",
      padding:"8px",
      fontSize:"12px",
      overflowY:"auto",
      zIndex:999998,
      borderRight:"2px solid #1b2fbf",
      borderLeft:"4px solid #1b2fbf",
      fontFamily:"Arial, sans-serif",
      boxSizing:"border-box",
      boxShadow:"0 0 10px rgba(0,0,0,0.6)"
    });
    document.body.appendChild(sb);
    return sb;
  }

  function assignMisspelling(miss,correctRaw){
    const missWord=miss.toLowerCase();
    const correct=correctRaw.trim();
    if(!missWord||!correct)return;
    const ext=window._acDictExt||(window._acDictExt={});
    if(!ext[correct])ext[correct]=[];
    const arr=ext[correct];
    if(!arr.some(m=>m.toLowerCase()===missWord))arr.push(miss);
    saveExt();
    rebuildMaps();
    window._acLog=window._acLog.filter(e=>e.word!==missWord);
    saveLog();
    renderSidebar();
  }

  function buildAssignPanel(){
    let p=document.getElementById("acAssignPanel");
    if(p)return p;
    p=document.createElement("div");
    p.id="acAssignPanel";
    Object.assign(p.style,{
      position:"fixed",
      top:"0",
      right:"0",
      width:"320px",
      height:"100%",
      background:"#080c3c",
      color:"#e5e9ff",
      padding:"10px",
      boxSizing:"border-box",
      zIndex:999998,
      borderLeft:"2px solid #1b2fbf",
      fontFamily:"Arial, sans-serif",
      fontSize:"12px",
      overflowY:"auto",
      boxShadow:"0 0 10px rgba(0,0,0,0.6)",
      transform:"translateX(100%)",
      opacity:"0",
      transition:"transform 0.18s ease-out, opacity 0.18s ease-out",
      pointerEvents:"none"
    });
    const title=document.createElement("div");
    title.id="acAssignTitle";
    title.style.fontWeight="600";
    title.style.marginBottom="6px";
    p.appendChild(title);
    const hint=document.createElement("div");
    hint.textContent="Type to search existing words or enter a new one.";
    hint.style.marginBottom="6px";
    hint.style.opacity="0.85";
    p.appendChild(hint);
    const input=document.createElement("input");
    input.id="acAssignInput";
    Object.assign(input.style,{
      width:"100%",
      boxSizing:"border-box",
      padding:"6px 8px",
      marginBottom:"6px",
      border:"1px solid #444",
      borderRadius:"4px",
      background:"#101642",
      color:"#e5e9ff",
      fontSize:"14px"
    });
    input.onfocus=function(){input.style.outline="2px solid #f9772e88";};
    input.onblur=function(){input.style.outline="none";};
    input.addEventListener("input",function(){updateAssignList(input.value);});
    p.appendChild(input);
    const list=document.createElement("div");
    list.id="acAssignList";
    Object.assign(list.style,{
      maxHeight:"60vh",
      overflowY:"auto",
      marginBottom:"8px",
      border:"1px solid #1b2fbf",
      borderRadius:"4px",
      padding:"4px 0"
    });
    p.appendChild(list);
    const btnRow=document.createElement("div");
    btnRow.style.marginTop="4px";
    p.appendChild(btnRow);
    const ok=document.createElement("button");
    ok.textContent="Assign";
    Object.assign(ok.style,{
      padding:"4px 8px",
      fontSize:"12px",
      cursor:"pointer",
      background:"#f9772e",
      color:"#fff",
      border:"none",
      borderRadius:"4px",
      marginRight:"6px",
      boxShadow:"0 0 6px #f9772e99"
    });
    ok.onclick=function(){
      const miss=window._acAssignTarget;
      if(!miss)return;
      const correct=input.value.trim();
      if(!correct){alert("Enter a correct word first.");return;}
      assignMisspelling(miss,correct);
      closeAssignPanel();
    };
    btnRow.appendChild(ok);
    const cancel=document.createElement("button");
    cancel.textContent="Cancel";
    Object.assign(cancel.style,{
      padding:"4px 8px",
      fontSize:"12px",
      cursor:"pointer",
      background:"#444",
      color:"#fff",
      border:"1px solid #666",
      borderRadius:"4px"
    });
    cancel.onclick=function(){closeAssignPanel();};
    btnRow.appendChild(cancel);
    document.body.appendChild(p);
    return p;
  }

  function updateAssignList(filter){
    const list=document.getElementById("acAssignList");
    if(!list)return;
    const canon=window._acCanonicalList||[];
    const f=(filter||"").toLowerCase();
    list.innerHTML="";
    let shown=0;
    canon.forEach(w=>{
      if(f&&w.toLowerCase().indexOf(f)===-1)return;
      const row=document.createElement("div");
      row.textContent=w;
      Object.assign(row.style,{
        padding:"4px 6px",
        marginBottom:"2px",
        borderRadius:"3px",
        cursor:"pointer",
        fontSize:"14px"
      });
      row.onmouseenter=function(){row.style.background="#102060";};
      row.onmouseleave=function(){row.style.background="transparent";};
      row.onclick=function(){
        const inp=document.getElementById("acAssignInput");
        if(inp)inp.value=w;
      };
      list.appendChild(row);
      shown++;
    });
    if(!shown){
      const empty=document.createElement("div");
      empty.textContent="No matches.";
      empty.style.fontSize="12px";
      empty.style.opacity="0.8";
      empty.style.padding="4px 6px";
      list.appendChild(empty);
    }
  }

  function openAssignPanel(word){
    const p=buildAssignPanel();
    window._acAssignTarget=word;
    const title=document.getElementById("acAssignTitle");
    if(title)title.textContent=`Assign "${word}" to:`;
    const inp=document.getElementById("acAssignInput");
    if(inp){inp.value="";inp.focus();}
    updateAssignList("");
    p.style.pointerEvents="auto";
    requestAnimationFrame(function(){
      p.style.transform="translateX(0)";
      p.style.opacity="1";
    });
  }

  function closeAssignPanel(){
    const p=document.getElementById("acAssignPanel");
    if(!p)return;
    p.style.transform="translateX(100%)";
    p.style.opacity="0";
    p.style.pointerEvents="none";
    window._acAssignTarget=null;
  }

  function renderSidebar(){
    const sb=document.getElementById("acSidebar");
    if(!sb)return;
    const tab=window._acTab||"log";
    sb.innerHTML="";
    const tabs=document.createElement("div");
    tabs.style.marginBottom="6px";
    const tabNames=[
      {id:"log",label:"Log"},
      {id:"recent",label:"Recent"},
      {id:"stats",label:"Stats"},
      {id:"export",label:"Export"},
      {id:"dict",label:"Dictionary"},
      {id:"settings",label:"Settings"}
    ];
    tabNames.forEach(t=>{
      const b=document.createElement("button");
      b.textContent=t.label;
      Object.assign(b.style,{
        marginRight:"4px",
        padding:"2px 6px",
        fontSize:"11px",
        cursor:"pointer",
        background:(t.id===tab?"#f9772e":"#333"),
        color:"#fff",
        border:(t.id===tab?"none":"1px solid #555"),
        borderRadius:"3px"
      });
      b.onclick=function(){window._acTab=t.id;renderSidebar();};
      tabs.appendChild(b);
    });
    sb.appendChild(tabs);
    const content=document.createElement("div");
    content.style.whiteSpace="pre-wrap";
    sb.appendChild(content);

    if(tab==="log"){
      const log=window._acLog,g=groupByWord(log),keys=Object.keys(g).sort();
      if(!keys.length){
        content.textContent="No entries yet.";
      }else{
        const info=document.createElement("div");
        info.textContent="Click Add to ignore, Assign to map to a correct word.";
        info.style.marginBottom="6px";
        info.style.opacity="0.85";
        content.appendChild(info);
        keys.forEach(w=>{
          const row=document.createElement("div");
          row.style.padding="4px 0";
          row.style.borderBottom="1px solid #222";
          const header=document.createElement("div");
          header.textContent=`${w} (x${g[w].length})`;
          header.style.marginBottom="2px";
          row.appendChild(header);
          const btnWrap=document.createElement("div");
          const addBtn=document.createElement("button");
          addBtn.textContent="Add";
          Object.assign(addBtn.style,{
            padding:"2px 6px",
            fontSize:"11px",
            cursor:"pointer",
            background:"#444",
            color:"#fff",
            border:"1px solid #666",
            borderRadius:"3px",
            marginRight:"4px"
          });
          addBtn.onclick=function(){
            if(window._acDict.has(w))return;
            window._acDict.add(w);
            saveDict();
            rebuildMaps();
            window._acLog=window._acLog.filter(e=>e.word!==w);
            saveLog();
            renderSidebar();
          };
          btnWrap.appendChild(addBtn);
          const assignBtn=document.createElement("button");
          assignBtn.textContent="Assign";
          Object.assign(assignBtn.style,{
            padding:"2px 6px",
            fontSize:"11px",
            cursor:"pointer",
            background:"#f9772e",
            color:"#fff",
            border:"none",
            borderRadius:"3px",
            boxShadow:"0 0 6px #f9772e99"
          });
          assignBtn.onclick=function(){openAssignPanel(w);};
          btnWrap.appendChild(assignBtn);
          row.appendChild(btnWrap);
          content.appendChild(row);
        });
      }
      const undoBtn=document.createElement("button");
      undoBtn.textContent="Undo last correction";
      Object.assign(undoBtn.style,{
        marginTop:"8px",
        padding:"2px 6px",
        fontSize:"11px",
        cursor:"pointer",
        background:"#444",
        color:"#fff",
        border:"1px solid #666",
        borderRadius:"3px"
      });
      undoBtn.onclick=window.undoLastCorrection;
      content.appendChild(undoBtn);

    }else if(tab==="recent"){
      const log=window._acLog.slice().sort((a,b)=>b.when.localeCompare(a.when));
      const max=50;
      const info=document.createElement("div");
      info.textContent="Most recent logged spellings (latest first):";
      info.style.marginBottom="6px";
      info.style.opacity="0.85";
      content.appendChild(info);
      if(!log.length){
        const n=document.createElement("div");
        n.textContent="No entries yet.";
        content.appendChild(n);
      }else{
        log.slice(0,max).forEach(e=>{
          const row=document.createElement("div");
          row.style.padding="4px 0";
          row.style.borderBottom="1px solid #222";
          const when=document.createElement("div");
          when.textContent=e.when;
          when.style.fontSize="11px";
          when.style.opacity="0.8";
          row.appendChild(when);
          const word=document.createElement("div");
          word.textContent=e.word;
          word.style.fontWeight="600";
          row.appendChild(word);
          if(e.sentence){
            const sent=document.createElement("div");
            sent.textContent=`“${e.sentence}”`;
            sent.style.fontSize="11px";
            sent.style.opacity="0.9";
            row.appendChild(sent);
          }
          content.appendChild(row);
        });
      }

    }else if(tab==="stats"){
      content.textContent=makeStats();

    }else if(tab==="export"){
      const txtBtn=document.createElement("button");
      txtBtn.textContent="Download TXT";
      Object.assign(txtBtn.style,{
        marginRight:"6px",
        padding:"3px 8px",
        fontSize:"11px",
        cursor:"pointer",
        background:"#444",
        color:"#fff",
        border:"1px solid #666",
        borderRadius:"3px"
      });
      txtBtn.onclick=window.exportSpellLogTXT;
      const csvBtn=document.createElement("button");
      csvBtn.textContent="Download CSV";
      Object.assign(csvBtn.style,{
        padding:"3px 8px",
        fontSize:"11px",
        cursor:"pointer",
        background:"#444",
        color:"#fff",
        border:"1px solid #666",
        borderRadius:"3px"
      });
      csvBtn.onclick=window.exportSpellLogCSV;
      content.appendChild(txtBtn);
      content.appendChild(csvBtn);

    }else if(tab==="dict"){
      const info=document.createElement("div");
      info.textContent="Filter, remove, and manage custom dictionary words.";
      info.style.marginBottom="6px";
      info.style.opacity="0.85";
      content.appendChild(info);
      const filterInput=document.createElement("input");
      Object.assign(filterInput.style,{
        width:"100%",
        boxSizing:"border-box",
        padding:"6px 8px",
        marginBottom:"6px",
        border:"1px solid #444",
        borderRadius:"4px",
        background:"#101642",
        color:"#e5e9ff",
        fontSize:"13px"
      });
      filterInput.placeholder="Filter custom words...";
      content.appendChild(filterInput);
      const listBox=document.createElement("div");
      Object.assign(listBox.style,{
        maxHeight:"40vh",
        overflowY:"auto",
        marginBottom:"8px",
        border:"1px solid #1b2fbf",
        borderRadius:"4px",
        padding:"4px 0"
      });
      content.appendChild(listBox);

      function renderDictList(){
        const term=(filterInput.value||"").toLowerCase();
        listBox.innerHTML="";
        const arr=(window._acDictList||[]).slice().sort((a,b)=>a.localeCompare(b));
        let shown=0;
        arr.forEach(w=>{
          if(term&&w.toLowerCase().indexOf(term)===-1)return;
          shown++;
          const row=document.createElement("div");
          Object.assign(row.style,{
            padding:"4px 6px",
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            fontSize:"13px"
          });
          const label=document.createElement("span");
          label.textContent=w;
          row.appendChild(label);
          const iconWrap=document.createElement("span");
          iconWrap.style.marginLeft="6px";
          const caps=window._acCaps||{};
          const hasCaps=!!caps[w];
          const ext=window._acDictExt||{};
          const hasMap=!!(ext[w]&&ext[w].length);
          const star=document.createElement("span");
          star.textContent=hasCaps?"⭐":"☆";
          star.style.cursor="pointer";
          star.style.marginLeft="2px";
          star.title="Toggle always capitalise";
          star.onclick=function(e){
            e.stopPropagation();
            if(caps[w]){delete caps[w];}else{caps[w]=true;}
            saveCaps();
            renderSidebar();
          };
          iconWrap.appendChild(star);
          const icon=document.createElement("span");
          icon.textContent=hasMap?"⚙️":"⬜";
          icon.style.marginLeft="4px";
          icon.title=hasMap?"Has custom mapped misspellings":"Custom word, no mappings";
          iconWrap.appendChild(icon);
          row.appendChild(iconWrap);
          const btnWrap=document.createElement("span");
          const rm=document.createElement("button");
          rm.textContent="Remove";
          Object.assign(rm.style,{
            padding:"2px 6px",
            fontSize:"11px",
            cursor:"pointer",
            background:"#700",
            color:"#fff",
            border:"1px solid #a00",
            borderRadius:"3px",
            marginLeft:"6px"
          });
          rm.onclick=function(e){
            e.stopPropagation();
            if(window._acDict.has(w)){
              window._acDict.delete(w);
              saveDict();
              rebuildMaps();
            }
            if(window._acCaps&&window._acCaps[w]){
              delete window._acCaps[w];
              saveCaps();
            }
            renderSidebar();
          };
          btnWrap.appendChild(rm);
          row.appendChild(btnWrap);
          row.onmouseenter=function(){row.style.background="#102060";};
          row.onmouseleave=function(){row.style.background="transparent";};
          listBox.appendChild(row);
        });
        if(!shown){
          const empty=document.createElement("div");
          empty.textContent="No matches.";
          empty.style.fontSize="12px";
          empty.style.opacity="0.8";
          empty.style.padding="4px 6px";
          listBox.appendChild(empty);
        }
      }

      filterInput.addEventListener("input",renderDictList);
      renderDictList();

      const mapTitle=document.createElement("div");
      mapTitle.textContent="Add custom mapping (word or phrase):";
      mapTitle.style.marginTop="10px";
      mapTitle.style.marginBottom="4px";
      content.appendChild(mapTitle);
      const missInput=document.createElement("input");
      Object.assign(missInput.style,{
        width:"100%",
        boxSizing:"border-box",
        padding:"6px 8px",
        marginBottom:"4px",
        border:"1px solid #444",
        borderRadius:"4px",
        background:"#101642",
        color:"#e5e9ff",
        fontSize:"13px"
      });
      missInput.placeholder="Incorrect word or phrase (e.g. stellantis & you)";
      content.appendChild(missInput);
      const correctInput=document.createElement("input");
      Object.assign(correctInput.style,{
        width:"100%",
        boxSizing:"border-box",
        padding:"6px 8px",
        marginBottom:"6px",
        border:"1px solid #444",
        borderRadius:"4px",
        background:"#101642",
        color:"#e5e9ff",
        fontSize:"13px"
      });
      correctInput.placeholder="Correct form (e.g. Stellantis &You)";
      content.appendChild(correctInput);
      const mapBtn=document.createElement("button");
      mapBtn.textContent="Save mapping";
      Object.assign(mapBtn.style,{
        padding:"4px 8px",
        fontSize:"12px",
        cursor:"pointer",
        background:"#f9772e",
        color:"#fff",
        border:"none",
        borderRadius:"4px",
        boxShadow:"0 0 6px #f9772e99"
      });
      mapBtn.onclick=function(){
        const miss=missInput.value.trim();
        const correct=correctInput.value.trim();
        if(!miss||!correct){alert("Enter both incorrect and correct values.");return;}
        assignMisspelling(miss,correct);
        missInput.value="";
        correctInput.value="";
      };
      content.appendChild(mapBtn);

    }else if(tab==="settings"){
      const dictTitle=document.createElement("div");
      dictTitle.textContent="Custom dictionary words (raw):";
      dictTitle.style.marginBottom="4px";
      content.appendChild(dictTitle);
      const dictList=document.createElement("div");
      dictList.textContent=window._acDictList.length?window._acDictList.join(", "):"(none)";
      dictList.style.marginBottom="8px";
      content.appendChild(dictList);
      const clearLogBtn=document.createElement("button");
      clearLogBtn.textContent="Clear log";
      Object.assign(clearLogBtn.style,{
        marginRight:"6px",
        padding:"3px 8px",
        fontSize:"11px",
        cursor:"pointer",
        background:"#700",
        color:"#fff",
        border:"1px solid #a00",
        borderRadius:"3px"
      });
      clearLogBtn.onclick=function(){
        if(confirm("Clear spelling log?")){
          window._acLog=[];
          window._acSeen=new Set();
          saveLog();
          renderSidebar();
        }
      };
      const clearDictBtn=document.createElement("button");
      clearDictBtn.textContent="Clear dictionary";
      Object.assign(clearDictBtn.style,{
        padding:"3px 8px",
        fontSize:"11px",
        cursor:"pointer",
        background:"#704000",
        color:"#fff",
        border:"1px solid #a06000",
        borderRadius:"3px"
      });
      clearDictBtn.onclick=function(){
        if(confirm("Clear custom dictionary?")){
          window._acDict.clear();
          saveDict();
          rebuildMaps();
          renderSidebar();
        }
      };
      content.appendChild(clearLogBtn);
      content.appendChild(clearDictBtn);
    }
  }

  window.toggleSpellSidebar=function(){
    const existing=document.getElementById("acSidebar");
    if(existing){existing.remove();closeAssignPanel();return;}
    window._acTab=window._acTab||"log";
    buildSidebar();
    injectStyles();
    renderSidebar();
  };

  function ensureToggleButton(){
    if(window._acButtonInit)return;
    window._acButtonInit=true;
    if(document.getElementById("acToggleBtn"))return;
    const b=document.createElement("div");
    b.id="acToggleBtn";
    Object.assign(b.style,{
      position:"fixed",
      left:"12px",
      bottom:"12px",
      width:"18px",
      height:"18px",
      background:"#f9772e",
      border:"none",
      borderRadius:"50%",
      boxShadow:"0 0 8px #f9772e99",
      zIndex:999999,
      cursor:"pointer"
    });
    b.title="Spelling log - click or press Alt+T";
    b.onclick=window.toggleSpellSidebar;
    document.body.appendChild(b);
  }

  if(!window._acHotkey){
    window._acHotkey=true;
    window.addEventListener("keydown",function(e){
      if(e.altKey&&e.code==="KeyT"){
        e.preventDefault();
        e.stopPropagation();
        window.toggleSpellSidebar();
      }
    });
  }

  ensureToggleButton();
  injectStyles();

  function setup(div){
    if(div._acAuto)return;
    div._acAuto=true;
    div.addEventListener("keyup",function(e){
      if(![" ","Enter",".",",","!","?","›",">"].includes(e.key))return;
      const typed=e.key==="Enter"?"\n":e.key;
      const delim=typed;

      const sel=window.getSelection();
      if(!sel.rangeCount)return;
      const rng=sel.getRangeAt(0);
      if(!rng.collapsed)return;

      const pre=rng.cloneRange();
      pre.selectNodeContents(div);
      pre.setEnd(rng.endContainer,rng.endOffset);
      const full=pre.toString();
      if(!full.endsWith(typed))return;

      const t=full.slice(0,-1);
      const rest=div.innerText.slice(full.length);
      const low=t.toLowerCase();
      const fullBefore=t+delim+rest;
      const caretBefore=full.length;

      for(const obj of MULTI){
        const phrase=obj.key,correct=obj.correct;
        const esc=phrase.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        const re=new RegExp("("+esc+")((?:['’]s|s['’])?)([.,!?])?$");
        const m=low.match(re);
        if(m){
          const poss=m[2]||"";
          const punct=m[3]||"";
          const len=phrase.length+poss.length+punct.length;
          let p=t.length-len-1;
          while(p>=0&&/\s/.test(t.charAt(p)))p--;
          const start=(p<0)||/[.!?]/.test(t.charAt(p));
          const caps=window._acCaps||{};
          const always=!!caps[correct];
          let rep=correct;
          if(!always&&start)rep=correct.charAt(0).toUpperCase()+correct.slice(1);
          const newT=t.slice(0,-len)+rep+poss+punct;
          const fullAfter=newT+delim+rest;
          div.innerText=fullAfter;
          const caretAfter=newT.length+1;
          setCaret(div,caretAfter);
          window._acLastCorrection={div:div,before:fullBefore,after:fullAfter,caretBefore:caretBefore,caretAfter:caretAfter};
          return;
        }
      }

      const parts=t.split(/(\s+)/);
      let idx=-1;
      for(let i=parts.length-1;i>=0;i--){if(parts[i].trim()!==""){idx=i;break;}}
      if(idx<0)return;

      const raw=parts[idx].match(/^(.+?)(['’]s|s['’])?([.,!?])?$/);
      const core=raw?raw[1]:parts[idx];
      const poss=raw&&raw[2]?raw[2]:"";
      const punct=raw&&raw[3]?raw[3]:"";
      const lc=core.toLowerCase();

      record(core);

      let rep=FLAT[lc]||null;
      if(!rep&&lc==="i")rep="I"; // safety double-guard, though DICT maps i→I

      let count=0;
      for(let j=0;j<idx;j++)count+=parts[j].length;
      let p=count-1;
      while(p>=0&&/\s/.test(t.charAt(p)))p--;
      const start=(p<0)||/[.!?]/.test(t.charAt(p));
      const caps=window._acCaps||{};
      const always=rep?!!caps[rep]:false;

      if(rep){
        if(always){
        }else if(start){
          rep=rep.charAt(0).toUpperCase()+rep.slice(1);
        }
      }else{
        if(start)rep=core.charAt(0).toUpperCase()+core.slice(1);
        else rep=core;
      }

      if(rep&&rep!==core){
        parts[idx]=rep+poss+punct;
        const newT=parts.join("");
        const fullAfter=newT+delim+rest;
        div.innerText=fullAfter;
        const caretAfter=newT.length+1;
        setCaret(div,caretAfter);
        window._acLastCorrection={div:div,before:fullBefore,after:fullAfter,caretBefore:caretBefore,caretAfter:caretAfter};
      }
    });
  }

  document.querySelectorAll('div[contenteditable="true"]').forEach(setup);
  new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType!==1)return;
        if(n.matches&&n.matches('div[contenteditable="true"]'))setup(n);
        else if(n.querySelectorAll)n.querySelectorAll('div[contenteditable="true"]').forEach(setup);
      });
    });
  }).observe(document.body,{childList:true,subtree:true});
})();
