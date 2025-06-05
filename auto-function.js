(function autocorrectAndLogUnknowns_v5() {
        // 1. Dictionary: correct → [misspellings]
        const DICT = {
                'Abarth': ['abart', 'abarht', 'abarth?'],
                'Alfa Romeo': ['alfaromeo', 'alpha romeo', 'alfa romo', 'alfaromeo', 'alfa romieo', 'alf aromeo', 'alpharomeo', 'alfa romio', 'alfa romero', 'alfa romeao', 'alfa romeo', 'alfa romeo', 'alfar omeo', 'alfa romeo', 'alfa romeo', 'alfaromeoo', 'alfa romeeo', 'alfa rome0', 'alfa r omeo', 'alfa romeo'],
                'Citroën': ['citroen', 'citreon', 'citroean', 'citroan', 'citroin', 'citoren', 'citroem'],
                'DS': ['ds', 'd.s.'],
                'DS Automobiles': ['ds automoblies', 'ds automobils', 'ds autom'],
                'Fiat': ['fiatt', 'fiadt'],
                'Jeep': ['jepp', 'jeap', 'jepe', 'jep'],
                'Leapmotor': ['leap motor', 'leapmotors'],
                'Peugeot': ['peugot', 'peugeut', 'peuguot', 'pegeot', 'pugeot', 'peugoet', 'peugeoet', 'pegueot', 'puegoe'],
                'Vauxhall': ['vauxel', 'vauxall', 'vaxhall', 'vauxhal', 'vaulxhall', 'vauxheel'],
                'Stellantis': ['stellantus', 'stellentis', 'stellantis'],
                'Stellantis &You': ['stellantis and you', 'stellantis & you', 'stellantis &you', 'stellantis andyou'],
                'Birmingham Central': ['birmingam central', 'birmingham cental', 'birmingham centreal', 'brum central'],
                'Birmingham': ['brum'],
                'Birmingham North': ['birmingam north', 'birmingham nrth', 'birmingham northh', 'brum north'],
                'Birmingham South': ['birmingam south', 'birmingham soouth', 'birmingham southh', 'brum south'],
                'Bristol Cribbs': ['bristol cribs', 'bristolcribbs', 'bristol cribbb'],
                'Chelmsford': ['chelsford', 'chelmsord', 'chelmsfrod'],
                'Chingford': ['chingferd', 'chingfor', 'chingfrod'],
                'Coventry': ['coverty', 'coventary', 'covenrty'],
                'Crawley': ['crawely', 'crawly', 'crawlley'],
                'Croydon': ['croyden', 'croydun', 'croyodon'],
                'Edgware': ['edgeware', 'edgwer', 'edgwarre'],
                'Guildford': ['guilford', 'guild ford', 'guildfrod'],
                'Hatfield': ['hatfeild', 'hatfiled', 'hattfield'],
                'Leicester': ['lester', 'leister', 'liestter'],
                'Liverpool': ['liverpol', 'liverpoool', 'liverpoll'],
                'Maidstone': ['maidston', 'maidstoen', 'maidstoon'],
                'Manchester': ['manchestor', 'manchster', 'mannchester','manny'],
                'Newport': ['new port', 'newpport', 'newprot'],
                'Nottingham': ['nottingam', 'nottinghum', 'nothtingham'],
                'Preston': ['prestan', 'prestron', 'prestonn'],
                'Redditch': ['reditch', 'reddich', 'reddittch'],
                'Romford': ['romferd', 'romfor', 'romfford'],
                'Sale': ['sael', 'sal', 'salle'],
                'Sheffield': ['shefffield', 'sheffied', 'sheffild'],
                'Stockport': ['stcokport', 'stockprt', 'stookport'],
                'Walton': ['waltom', 'waltn', 'waulton'],
                'West London': ['westlondon', 'west londn', 'west londom'],
                'Wimbledon': ['wimbeldon', 'wimbeldun', 'wimbeldoon'],
                'London': ['londen', 'londan', 'lindon', 'londdon', 'lndon', 'londn', 'ldn'],
                'Motability': ['motab', 'motabilty', 'motivability'],
                'UK': ['uk', 'u k'],
                'Monday': ['monday', 'mondey', 'monady'],
                'Tuesday': ['tuesday', 'tueday', 'tuesay', 'tueseday'],
                'Wednesday': ['wednesday', 'wensday', 'wednsday', 'wedensday'],
                'Thursday': ['thursday', 'thurday', 'thursay'],
                'Friday': ['friday', 'firday'],
                'Saturday': ['saturday', 'satarday'],
                'Sunday': ['sunday', 'sundey'],
                'January': ['januray', 'janary', 'januarry'],
                'February': ['febuary', 'feburary', 'februuary'],
                'March': ['marhc', 'mrach', 'marchh'],
                'April': ['aprill'],
                'May': ['mayy', 'maay'],
                'June': ['junee', 'juen'],
                'July': ['julyy', 'jly'],
                'August': ['augustt', 'agust', 'auguest'],
                'September': ['septemberr', 'septembar', 'setpember'],
                'October': ['octobr', 'octuber', 'otcober'],
                'November': ['novemberr', 'noovember', 'novembar'],
                'December': ['decemberr', 'decembar', 'decmeber'],
                'able': ['abl','ab le'],
                access: ['acces', 'acess'],
                add: ['ad', 'a dd'],
                address: ['adress', 'adresss', 'adrs'],
                advise: ['advice', 'advise'],
                agent: ['agnt', 'agant'],
                agents: ['agnts', 'agantS', 'agantes'],
                all: ['al', 'a ll'],
                along: ['alng', 'alogn'],
                am: ['ma', 'a m'],
                an: ['na', 'a n'],
                and: ['adn', 'an d', 'snd', 'se nd'],
                any: ['an y', 'anyy', 'ani'],
                appointments: ['appontments', 'apointments', 'appoinments'],
                are: ['ar', 'aer', 'arre'],
                arrange: ['arange', 'arrnge'],
                as: ['sa', 'a s'],
                at: ['ta', 'a t'],
                auto: ['ato', 'auot'],
                availability: ['availabilty', 'availablity'],
                available: ['availble', 'avialable', 'avalable'],
                aware: ['awre', 'awar'],
                back: ['bak', 'ba ck'],
                be: ['eb', 'b e'],
                because: ['becuase', 'beacuse'],
                before: ['befor', 'bfore', 'befroe'],
                believe: ['belive', 'beleive'],
                benificial: ['beneficial'],
                best: ['bst', 'beest'],
                book: ['bok', 'bokk'],
                both: ['bth', 'booth'],
                branches: ['braches', 'branchs'],
                but: ['bt', 'b ut'],
                calendar: ['calender'],
                call: ['cal', 'cal l', 'cll'],
                calling: ['caling', 'callng'],
                calls: ['cals', 'calss'],
                can: ['csn'],
                "can't": ['cant', 'can t', 'cnt'],
                central: ['centrall', 'centrl'],
                closer: ['closr', 'closeer', 'clsoer'],
                come: ['cmoe', 'coem'],
                comes: ['comse', 'comees'],
                confirm: ['confrm', 'cnfirm', 'confrim'],
                confirmed: ['confrimed', 'confirmd'],
                contact: ['contat', 'contac'],
                costs: ['csts'],
                "couldn't": ['couldnt', 'coudnt', "could'nt"],
                credit: ['creddit', 'creit'],
                currently: ['curently', 'currenty', 'currenlty'],
                customers: ['costumers', 'custmers'],
                date: ['dat', 'daet'],
                dates: ['daets', 'datse'],
                day: ['dae', 'dy'],
                dealership: ['delership', 'dealrship'],
                definitely: ['definately', 'definatly', 'defently'],
                department: ['departmnt', 'departent'],
                detail: ['detial'],
                details: ['detials', 'detals'],
                different: ['differerent', 'differernt'],
                directly: ['directy', 'dirctly'],
                discuss: ['dicuss', 'discus'],
                'do': ['d0', 'od'],
                "don't": ['dont', 'don t'],
                down: ['dwn', 'do wn'],
                editor: ['edtor', 'editro', 'edditor'],
                either: ['ither', 'eithr'],
                'else': ['els', 'ellse'],
                email: ['emial', 'emiall'],
                enough: ['enuf', 'enogh'],
                everything: ['everyting', 'evrything'],
                exchanged: ['exhanged', 'exchnged'],
                expected: ['expcted', 'expeced', 'expectd'],
                extended: ['extnded', 'exteneded'],
                find: ['fnd', 'fi nd'],
                fine: ['fien', 'fin'],
                'for': ['fro', 'fo', 'fr'],
                free: ['frree', 'fre'],
                fuel: ['fuell', 'fu el'],
                full: ['ful', 'fll'],
                further: ['furhter'],
                get: ['gt', 'git'],
                give: ['giv', 'giev'],
                go: ['og', 'g o'],
                hand: ['hnd', 'ha nd'],
                hate: ['hat', 'haet'],
                have: ['hvae', 'hae', 'hve', 'havet'],
                heard: ['herd', 'haerd'],
                hello: ['helo', 'helllo'],
                help: ['hlp', 'hepl', 'hekp'],
                here: ['hre', 'he re'],
                how: ['hw', 'hwo'],
                however: ['hovewer', 'howeer', 'howerver'],
                "I'm":['im'],
                "i've": ['ive'],
                'if': ['fi', 'i f'],
                immediate: ['immediat', 'immediatly'],
                'in': ['ni', 'i n'],
                information: ['informtion', 'infromation', 'informaiton'],
                instead: ['instaed', 'insted'],
                interested: ['intrested', 'intersted', 'intereste'],
                into: ['in to'],
                is: ['si', 'i s'],
                issue: ['issuse', 'isssue', 'isue'],
                it: ['ut'],
                just: ['jst', 'ju st'],
                leave: ['leav', 'lave'],
                'let': ['lt', 'le t'],
                like: ['lik', 'liek', 'likee', 'likeee'],
                limited: ['limted', 'limiited'],
                local: ['locl', 'loca'],
                looked: ['loked', 'lookked'],
                looking: ['loking', 'lookng', 'lookin'],
                lovely: ['lovly', 'lovley'],
                make: ['mkae', 'mak'],
                may: ['mya'],
                me: ['m', 'mee'],
                message: ['mesage', 'messgae'],
                miles: ['miiles'],
                model: ['model', 'modle'],
                models: ['modles', 'modeles'],
                month: ['mnth', 'moth'],
                morning: ['morng', 'morni ng'],
                move: ['mvoe', 'moev'],
                my: ['ny', 'ym'],
                name: ['nam', 'nae'],
                need: ['need'],
                needed: ['neded', 'needd'],
                never: ['nevr', 'neveer'],
                next: ['nxt', 'nextt'],
                'no problem': ['np'],
                not: ['nto', 'noot'],
                notice: ['notce', 'notcie'],
                number: ['nubmer', 'numbr'],
                of: ['fo', 'o f'],
                offer: ['ofr', 'offfer'],
                on: ['no', 'o n'],
                only: ['onl', 'on ly'],
                onto: ['on to', 'ont o'],
                or: ['ro', 'o r'],
                orders: ['ordres', 'oders'],
                our: ['our'],
                out: ['ot', 'o ut'],
                'part-exchange': ['px'],
                'part-exchanging': ['pxing'],
                please: ['plese', 'pleas'],
                postcode: ['postocde'],
                potential: ['potental', 'potentail'],
                previously: ['prevously', 'previoiusly'],
                price: ['prcie', 'prce'],
                problem: ['probelm', 'proble'],
                purchase: ['purches','purchace','pursch'],
                purchasing: ['puchasing', 'purcahsing'],
                'Q3': ['q3'],
                quarter: ['quater', 'quartre', 'qarter'],
                receive: ['recieve', 'recive'],
                recommend: ['recomend', 'reccommend', 'recommnd'],
                recommended: ['recomended', 'reommend', 'recommened'],
                referring: ['refering'],
                regards: ['regard', 'reguards'],
                release: ['relase', 'rellese'],
                require: ['requre', 'requier'],
                rough: ['rogh', 'rouhg'],
                sales: ['saels', 'sles'],
                schedule: ['shedule', 'schedul'],
                scheduled: ['scheduld', 'schedueld'],
                scheduling: ['schedualling'],
                seems: ['sems'],
                selenium: ['selenium', 'selenuium'],
                sell: ['sel', 'selll'],
                sent: ['snt', 'se nt'],
                separate: ['seperate'],
                separately: ['seperately', 'seperatly', 'seperatley', 'seperatel'],
                service: ['sevice', 'srvice'],
                "shouldn't": ['shouldnt', 'shoudnt', "should'nt"],
                site: ['sitr', 'si te'],
                so: ['os', 's o'],
                'so I': ['so i'],
                'so much': ['sm'],
                something: ['smt'],
                specialists: ['specialsts', 'specialists'],
                specific: ['spefic', 'specfic', 'specfifc'],
                specification: ['specfication', 'specifiction'],
                still: ['stil', 'stil l'],
                sure: ['sur', 'shure'],
                team: ['tem', 'te am'],
                test: ['tset', 'te st'],
                'thank you': ['thankyou', 'ty', 'thak you', 'thank yu'],
                that: ['thst'],
                the: ['th', 'thee', 'thr'],
                their: ['thier'],
                there: ['ther', 'thre', 'thare'],
                these: ['tehse', 'thes'],
                'this': ['tis', 'thsi', 'thes'],
                though: ['tho', 'thogh', 'thugh', 'thouhg', 'thoough'],
                thought: ['thot', 'thougth'],
                through: ['throguh', 'thruogh', 'throuogh'],
                time: ['tme', 'tiem'],
                today: ['tody', 'todday', 'tdy'],
                tomo: ['tomorrow'],
                tomorrow: ['tommorow', 'tomorow', 'tmr'],
                transmission: ['transmision', 'trasmission'],
                type: ['tpe', 'ty pe'],
                unavailable: ['unavaible', 'unavalible'],
                "unfortunately": ['unfortunetly', 'unfortunatly'],
                up: ['up', 'u p'],
                valuation: ['valutaion', 'valution', 'valuaton'],
                vehicle: ['vehical', 'vechicle', 'vehicule', 'vehicel', 'vehicl', 'vehcilea', 'vehcile', 'vehiclee'],
                vehicles: ['vehciles', 'vehicels', 'vehicles', 'vehicals', 'vechicles', 'vehicules', 'vehicels', 'vehicls', 'vehcileas'],
                viewings: ['viewngs', 'vieewings'],
                we: ['ew', 'w e'],
                website: ['wesbite', 'webiste', 'websit'],
                West: ['wset', 'we st'],
                where: ['wher', 'wheer'],
                which: ['whcih', 'whihc'],
                will: ['wil', 'wll'],
                'with': ['wiht', 'w tih'],
                work: ['wrok'],
                working: ['workng', 'wroking', 'workiing'],
                would: ['woudl', 'wold'],
                "wouldn't": ['woudlnt', 'wouldnt'],
                wrong: ['wron', 'wrnog'],
                year: ['yer', 'ye ar'],
                yes: ['ye', 'y es'],
                yet: ['yte', 'yt'],
                you: ['yo', 'yuo', 'u'],
                your: ['uour', 'ur', 'yuor'],
                yourself: ['yourslef', 'yourse lf'],
            },
            FLAT = {},
            // Will hold { key: lowercase multi-word or multi-word misspelling, correct: canonical form }
            MULTI_PHRASES = [];

        // 2. Build FLAT (lowercase → canonical) and MULTI_PHRASES (for multi-word matches)
        for (const correct in DICT) {
            // 2a) Map the correct form itself into FLAT
            FLAT[correct.toLowerCase()] = correct;

            // 2b) Map each misspelling into FLAT
            DICT[correct].forEach(missp => {
                FLAT[missp.toLowerCase()] = correct;
            });

            // 2c) If this correct entry has spaces, collect both its correct-lowercase and all lowercase misspellings
            if (correct.includes(' ')) {
                const lowCorrect = correct.toLowerCase();
                MULTI_PHRASES.push({ key: lowCorrect, correct });

                DICT[correct].forEach(missp => {
                    if (missp.includes(' ')) {
                        MULTI_PHRASES.push({ key: missp.toLowerCase(), correct });
                    }
                });
            }
        }

        // 3. Prepare global storage for unknown-word logging
        window._lpUnknownLog = window._lpUnknownLog || [];
        window._lpSeenWords  = window._lpSeenWords  || new Set();

        function record(word) {
            const lower = word.toLowerCase();
            // Skip:
            //   a) anything under length 2
            //   b) anything already in FLAT (correct form or known misspelling)
            //   c) the standalone "i"
            if (lower.length < 2 || FLAT[lower] || lower === 'i') return;

            if (!window._lpSeenWords.has(lower)) {
                window._lpSeenWords.add(lower);
                window._lpUnknownLog.push({
                    word: lower,
                    when: new Date().toISOString()
                });
            }
        }

        // 4. Helper: place the caret at a given character index in a contenteditable div
        function setCaretPosition(container, charIndex) {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
            let currentNode = walker.nextNode();
            let count = 0;

            while (currentNode) {
                const nextCount = count + currentNode.nodeValue.length;
                if (nextCount >= charIndex) {
                    const range = document.createRange();
                    const sel   = window.getSelection();
                    range.setStart(currentNode, charIndex - count);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return;
                }
                count = nextCount;
                currentNode = walker.nextNode();
            }
        }

        // 5. The main setupEditor function (autocorrect + capitalise + logging, anywhere in text)
        function setupEditor(div) {
            if (div._autoc) return;
            div._autoc = true;

            div.addEventListener('keyup', k => {
                // 5a) Trigger on space, Enter, or punctuation . , ! ?
                if (!(
                    k.key === ' ' ||
                    k.key === 'Enter' ||
                    k.key === '.' ||
                    k.key === ',' ||
                    k.key === '!' ||
                    k.key === '?'
                )) {
                    return;
                }

                // 5b) Determine the delimiter character we actually inserted
                const delimiter = (
                    k.key === ' '     ? ' ' :
                        k.key === 'Enter' ? '\n' :
                            k.key            // one of '.', ',', '!' or '?'
                );

                // 5c) Find the text up to (and including) the delimiter, at the caret position
                const sel = window.getSelection();
                if (!sel.rangeCount) return;
                const range = sel.getRangeAt(0);
                if (!range.collapsed) return;  // Only proceed if caret is not selecting text

                // Clone a range that spans from the start of the editor to the caret
                const preRange = range.cloneRange();
                preRange.selectNodeContents(div);
                preRange.setEnd(range.endContainer, range.endOffset);

                const textUpToCursor = preRange.toString();
                if (!textUpToCursor.endsWith(delimiter)) return;

                // Separate:
                //   t = text up to—but not including—this delimiter
                //   rest = everything after the delimiter, unchanged
                const t    = textUpToCursor.slice(0, -1);
                const rest = div.innerText.slice(textUpToCursor.length);
                const lowT = t.toLowerCase();

                // 5d) Multi-word corrections (misspellings & correct forms containing spaces)
                for (const { key: phrase, correct } of MULTI_PHRASES) {
                    // Match phrase at the very end of t, possibly with a trailing .,!? before the delimiter
                    const m = lowT.match(new RegExp(`(${phrase})([.,!?])?$`));
                    if (m) {
                        const punct = m[2] || '';
                        const phraseLen = phrase.length + (punct ? 1 : 0);

                        // Build the corrected text:
                        //   newT = everything before that phrase + the canonical correct form + any punctuation
                        const newT = t.slice(0, -phraseLen) + correct + punct;

                        // Reassemble full text directly into innerText:
                        div.innerText = newT + delimiter + rest;

                        // Place the caret immediately after newT + delimiter
                        setCaretPosition(div, newT.length + 1);
                        return;
                    }
                }

                // 5e) Single-word correction / logging: find the last "token" before delimiter
                const tokens = t.split(/(\s+)/);
                let idx = -1;
                for (let i = tokens.length - 1; i >= 0; i--) {
                    if (tokens[i].trim() !== '') {
                        idx = i;
                        break;
                    }
                }
                if (idx < 0) return;

                const rawMatch = tokens[idx].match(/^(.+?)([.,!?])?$/);
                const core     = rawMatch ? rawMatch[1] : tokens[idx];
                const punct    = rawMatch && rawMatch[2] ? rawMatch[2] : '';
                const lowerCore = core.toLowerCase();

                // 5f) Record the token if unknown
                record(core);

                // 5g) Standard lookup in FLAT for corrections (single-word)
                let rep = FLAT[lowerCore] || null;
                if (!rep && lowerCore === 'i') {
                    // Always capitalise standalone "i" if not already in DICT
                    rep = 'I';
                }

                // 5h) Detect if that word was at the start of a sentence
                let charCount = 0;
                for (let j = 0; j < idx; j++) {
                    charCount += tokens[j].length;
                }
                let prevIdx = charCount - 1;
                while (prevIdx >= 0 && /\s/.test(t.charAt(prevIdx))) {
                    prevIdx--;
                }
                const atStart = (prevIdx < 0) || /[.!?]/.test(t.charAt(prevIdx));

                if (rep && FLAT[lowerCore] && atStart) {
                    rep = rep.charAt(0).toUpperCase() + rep.slice(1);
                } else if (!rep && atStart) {
                    rep = core.charAt(0).toUpperCase() + core.slice(1);
                }

                // 5i) If there's a valid replacement that differs, splice it in
                if (rep && rep !== core) {
                    tokens[idx] = rep + punct;
                    const newT = tokens.join('');

                    // Directly assign innerText without the extra variable
                    div.innerText = newT + delimiter + rest;

                    setCaretPosition(div, newT.length + 1);
                }
            });
        }

        // 6. Initialise any existing editor divs
        document.querySelectorAll('div[contenteditable="true"]').forEach(setupEditor);

        // 7. Watch for dynamically added editor divs
        new MutationObserver(muts => {
            for (const m of muts) {
                m.addedNodes.forEach(n => {
                    if (n.nodeType !== 1) return;
                    if (n.matches && n.matches('div[contenteditable="true"]')) {
                        setupEditor(n);
                    } else if (n.querySelectorAll) {
                        n.querySelectorAll('div[contenteditable="true"]').forEach(setupEditor);
                    }
                });
            }
        }).observe(document.body, { childList: true, subtree: true });
    })();

    // “Open New Chat” button: inserts another contenteditable div
    document.getElementById('newChatBtn').addEventListener('click', () => {
        const newDiv = document.createElement('div');
        newDiv.className = 'editor';
        newDiv.setAttribute('contenteditable', 'true');
        document.body.insertBefore(newDiv, document.getElementById('newChatBtn'));
        newDiv.focus();
    });

    // Convenience: copy the unknown-word log to clipboard via console
    window.copyUnknownLog = function() {
        const text = JSON.stringify(window._lpUnknownLog, null, 2);
        if (!navigator.clipboard) {
            console.warn('Clipboard API not available');
            console.log(text);
            return;
        }
        navigator.clipboard.writeText(text).then(
            () => console.log('Unknown-word log copied to clipboard'),
            err => console.error('Failed to copy: ', err)
        );
    };
