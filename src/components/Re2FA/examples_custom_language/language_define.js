import {
    NFA, is_special_symbols,
    is_special_symbols_string
} from "../../../modules/Re2FA/nfa"
//A case-insensitive language
function to_re(keyword) {
    let RE = "";
    keyword = keyword.replace(/\\d/g, "(0|1|2|3|4|5|6|7|8|9)");
    for (let CH of keyword) {
        if ((CH >= "a" && CH <= "z") || (CH >= "A" && CH <= "Z")) {
            RE += `(${CH.toUpperCase()}|${CH.toLowerCase()})`;
        } else {
            RE += CH;
        }
    }
    RE = "(" + RE + ")";
    console.log("regex", RE);
    return RE;
}

function is_valid_identifier(INPUT) {
    if ("_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(INPUT[0]) > -1) {
        const TEMP = "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from(INPUT).every(CHAR => TEMP.indexOf(CHAR) > -1);
    }
    return false;
}

let Lexer = {
    reader: {
        props: {
            stream: "",
            length: 0,
            current_index: 0,
            current_line: 0
        },
        propsChange: {
            set(prop, value) {
                if (typeof Lexer.reader.props[prop] !== "undefined") {
                    Lexer.reader.props[prop] = value;
                    // console.log(prop, value)
                }
            },
            setDefault() {
                Lexer.reader.props.stream = "";
                Lexer.reader.props.length = 0;
                Lexer.reader.props.current_index = 0;
                Lexer.reader.props.current_line = 0;
            },
        },
        create(stream) {
            Lexer.reader.propsChange.set("stream", stream);
            Lexer.reader.propsChange.set("length", Lexer.reader.props.stream.length);
            Lexer.reader.propsChange.set("current_index", 0);
            Lexer.reader.propsChange.set("current_line", 0);
        },
        newToken(type, value) {
            return {
                line: Lexer.reader.props.current_line + 1,
                type: type,
                value: value
            }
        },
        nextChar() {
            if (Lexer.reader.props.current_index <= Lexer.reader.props.length - 1) {
                return Lexer.reader.props.stream[Lexer.reader.props.current_index++];
            }
            return false;
        },
        peekChar(len = 1) {
            if (Lexer.reader.props.current_index + len - 1 <= Lexer.reader.props.length - 1) {
                return Lexer.reader.props.stream.slice(Lexer.reader.props.current_index, Lexer.reader.props.current_index + len);
            }
            return false;
        },
        next() {
            let CHAR = '';
            while ((CHAR = Lexer.reader.nextChar()) !== false && CHAR === '\n') {
                Lexer.reader.props.current_line++;
            }
            do {
                if (CHAR !== ' '&&CHAR!=='\t') break;
            } while ((CHAR = Lexer.reader.nextChar()) !== false) ;
            if (CHAR) {
                let WORD = "";
                do {
                    WORD += CHAR;
                    let NEXT_STATE = Lexer.flowModel(Lexer.fa.state, CHAR);
                    if (NEXT_STATE) {
                        if (NEXT_STATE.is_accept) {
                            if (NEXT_STATE.id === "num" && Lexer.reader.peekChar(2) === "..") {
                                Lexer.fa.reset();
                                return Lexer.reader.newToken("num", WORD);
                            }
                            let t = Lexer.flowModel(Lexer.fa.state, Lexer.reader.peekChar(), true);
                            if (t === false) {
                                //if now can move to a new state, ignore NEXT_STATE and continue to move from NEXT_STATE to next new state.
                                // output new token.
                                Lexer.fa.reset();
                                if (NEXT_STATE.id === "num" || NEXT_STATE.id === "real") {
                                    return Lexer.reader.newToken(NEXT_STATE.id, WORD);
                                }
                                if (Lexer.fa.map_types[NEXT_STATE.id] === "comment") {
                                    while ((CHAR = Lexer.reader.nextChar()) !== '\n') ;
                                    let TOKEN = Lexer.reader.newToken(Lexer.fa.map_types[NEXT_STATE.id], NEXT_STATE.id);
                                    Lexer.reader.props.current_line++;
                                    return TOKEN;
                                }
                                return Lexer.reader.newToken(Lexer.fa.map_types[NEXT_STATE.id], NEXT_STATE.id);
                            }
                        } else {
                            if (Lexer.flowModel(Lexer.fa.state, Lexer.reader.peekChar(), true) === false) {
                                // console.log(WORD)
                                if (is_valid_identifier(WORD)) {
                                    // console.log(WORD,1);
                                    // console.log(WORD + Lexer.reader.peekChar())
                                    if (is_valid_identifier(WORD + Lexer.reader.peekChar())) continue;
                                    if (Lexer.reader.peekChar() === ' ' ||Lexer.reader.peekChar()==='\t'|| Lexer.fa.map_types[Lexer.reader.peekChar()] === "delimiter" || Lexer.fa.map_types[Lexer.reader.peekChar()] === "op") {
                                        Lexer.fa.reset();
                                        return Lexer.reader.newToken("identifier", WORD.toLowerCase());
                                    }
                                    while (!Lexer.fa.map_types[Lexer.reader.peekChar()]) {
                                        WORD+=Lexer.reader.nextChar();
                                    }
                                    Lexer.fa.reset();
                                    Lexer.errorHandler(WORD);
                                    return false;
                                } else {
                                    console.log(WORD,2)
                                    Lexer.errorHandler(WORD);
                                    return false;
                                }
                            }
                        }
                    } else {
                        if (is_valid_identifier(WORD)) {
                            if (is_valid_identifier(WORD + Lexer.reader.peekChar())) continue;
                            // console.log("jjjjj",WORD)
                            if (Lexer.reader.peekChar() === ' '||Lexer.reader.peekChar()==='\t' || Lexer.fa.map_types[Lexer.reader.peekChar()] === "delimiter" || Lexer.fa.map_types[Lexer.reader.peekChar()] === "op") {
                                Lexer.fa.reset();
                                return Lexer.reader.newToken("identifier", WORD.toLowerCase());
                            }
                            while (!Lexer.fa.map_types[Lexer.reader.peekChar()]) {
                               WORD+= Lexer.reader.nextChar();
                            }
                            Lexer.fa.reset();
                            Lexer.errorHandler(WORD);
                            return false;
                        } /*else {
                            Lexer.errorHandler(WORD);
                            return false;
                        }*/
                    }
                } while ((CHAR = Lexer.reader.nextChar()) !== false && CHAR !== ' '&&CHAR!=='\t');
            } else {
                //end
                return {done:true};
            }
        }
    },
    fa: {
        const_define: {
            // identifier:"(_|(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)|(A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z))(_|(a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z)|(A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z)|\\d)*",
            num: "(0|(0x))?\\d+",
            real: "\\d+.\\d+",
            keyword: [
                "int",
                "float",
                "const",
                "bool",
                "void",
                "char",
                "double",
                "struct",
                "return",
                "while",
                "do",
                "break",
                "continue",
                "true",
                "false",
                "in",
                "for",
                "if",
                "else",
            ],
            op: [
                "+",
                "-",
                "*",
                "/",
                "%",
                "=",
                "!",
                "&",
                "|",
                "<",
                ">",
                "^",
                "--",
                "++",
                "<<",
                ">>",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "==",
                "!=",
                "&=",
                "|=",
                "<=",
                ">=",
                "&&",
                "||",
                ":=",
            ],
            delimiter: [
                ";",
                ",",
                ".",
                "..",
                "‘",
                "“",
                ":",
                "(",
                ")",
                "[",
                "]",
                "{",
                "}",
                "?",
            ],
            comment: [
                "//"
            ]
        },
        map_types: {},
        state: undefined,
        FA: undefined,
        reset: () => {
            Lexer.fa.state = Lexer.fa.FA.start;
        },
        setStart: () => {
            let FAS = [];
            for (let TYPE in Lexer.fa.const_define) {
                if (TYPE !== "num" && TYPE !== "real" && TYPE !== "identifier") {
                    Lexer.fa.const_define[TYPE].forEach(WORD => {
                        Lexer.fa.map_types[WORD] = TYPE;
                    })
                } else {
                    let DFA = NFA.parse_regex_to_nfa(to_re(Lexer.fa.const_define[TYPE])).to_dfa();
                    for (let STATE of DFA.accepts) {
                        STATE.id = TYPE;
                    }
                    FAS.push(DFA);
                }
            }
            Lexer.fa.FA = NFA.merge(function () {
                for (let WORD in Lexer.fa.map_types) {
                    let DFA;
                    if (is_special_symbols(WORD)) {
                        DFA = NFA.build_nfa_for_single_input(WORD);
                        DFA.set_states_id();
                    } else if (is_special_symbols_string(WORD)) {
                        DFA = NFA.build_nfa_for_single_input(WORD[0]);
                        for (let i = 1; i < WORD.length; ++i) {
                            DFA.concatenate(NFA.build_nfa_for_single_input(WORD[i]));
                        }
                        DFA.set_states_id();
                    } else {
                        DFA = NFA.parse_regex_to_nfa(to_re(WORD)).to_dfa(true);
                        DFA.set_states_id();
                    }
                    for (let STATE of DFA.accepts) {
                        STATE.id = WORD;
                    }
                    FAS.push(DFA);
                }
                return FAS;
            }()).to_dfa(true, false);
            Lexer.fa.state = Lexer.fa.FA.start;
        }
        ,
    },
    flowModel: (current_state, next_input, peek = false) => {
        if (next_input === false) return false;
        let NEXT_STATES = current_state.goto_when_meet_input(next_input);
        if (NEXT_STATES.length === 1) {
            if (!peek) {
                Lexer.fa.state = NEXT_STATES[0];
            }
            return NEXT_STATES[0];
        }
        // alert("Error! Check the DFA!");
        return false;
    },
    errorHandler: (content) => {
        Lexer.fa.reset();
        console.error(`Line ${Lexer.reader.props.current_line + 1}, ERROR: ${content}`)
    },
    printPretty: () => {

    },
    run: (stream) => {
        Lexer.fa.setStart();
        Lexer.reader.create(stream);
    }
};
export {Lexer};
