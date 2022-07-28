import {
    // eslint-disable-next-line no-unused-vars
    NFA, is_special_symbols,
    // eslint-disable-next-line no-unused-vars
    is_special_symbols_string
} from "../../../modules/Re2FA/nfa.js"
import {HanziChaizi} from "./hanzi_chaizi/HanziChaizi.js";
// const fs=require("fs");
// import * as fs from "fs";
// import * as readline from "readline"

// const rl = readline.createInterface({
//     input: fs.createReadStream("./samples/org.txt"),
//     output: process.stdout,
//     terminal: false
// });
// rl.on("line",(line)=>{
//     console.log(line);
// });
const {pinyin} = require('pinyin-pro');

function isChinese(word) {
    return '\u4e00' <= word && word <= '\u9fff';
}

function isLetter(word) {
    let re = /[A-Za-z]/;
    return word.match(re) != null;
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
        homonym: (char) => {
            let PYS = pinyin(char, {
                pattern: "pinyin",
                toneType: "none",
                type: "array",
                multiple: false,
                v: true
            });
            let NEXT_STATE, IS_HOMONYM = false, FA_STATE_BACKUP = Lexer.fa.state;
            // Lexer.fa.reset();
            PYS.forEach(PY => {
                IS_HOMONYM |= Array.from(PY).every((v, i) => {
                    NEXT_STATE = Lexer.flowModel(Lexer.fa.state, v);
                    return NEXT_STATE !== false || i === PY.length - 1;
                });
                Lexer.fa.state = FA_STATE_BACKUP;
            })
            let res = IS_HOMONYM ? NEXT_STATE : null;
            // console.log(char, res);
            return res;
        },
        next() {
            let CHAR = '';
            while ((CHAR = Lexer.reader.nextChar()) !== false && CHAR === '\n') {
                Lexer.reader.props.current_line++;
            }
            do {
                if (CHAR !== ' ' && CHAR !== '\t') break;
            } while ((CHAR = Lexer.reader.nextChar()) !== false) ;
            if (CHAR) {
                let WORD = "", NEXT_STATE;
                do {
                    if (CHAR === '\n') {
                        Lexer.reader.props.current_line++;
                        Lexer.fa.reset();
                        return false;
                    }
                    if (!isChinese(CHAR) && !isLetter(CHAR)) {
                        if (WORD.length > 0) WORD += CHAR;
                        continue;
                    } else WORD += CHAR;
                    NEXT_STATE = Lexer.flowModel(Lexer.fa.state, CHAR, true);
                    if (!NEXT_STATE) {
                        let HOMONYM_NEXT_STATE;
                        if (isChinese(CHAR)) {
                            HOMONYM_NEXT_STATE = Lexer.reader.homonym(CHAR);
                        }
                        if (!HOMONYM_NEXT_STATE) {

                            Lexer.fa.reset();
                            return false;
                        } else {
                            // console.log('发现同音字 ' + CHAR)
                            Lexer.fa.state = HOMONYM_NEXT_STATE;
                            NEXT_STATE = HOMONYM_NEXT_STATE;
                        }
                    } else {
                        NEXT_STATE = Lexer.flowModel(Lexer.fa.state, CHAR);
                    }
                    if (NEXT_STATE) {
                        if (NEXT_STATE.is_accept) {
                            let t = Lexer.flowModel(Lexer.fa.state, Lexer.reader.peekChar(), true);
                            if (!t && (!isChinese(Lexer.reader.peekChar()) || !Lexer.reader.homonym(Lexer.reader.peekChar()))) {
                                //if now can move to a new state, ignore NEXT_STATE and continue to move from NEXT_STATE to next new state.
                                // output new token.
                                Lexer.fa.reset();
                                return Lexer.reader.newToken(NEXT_STATE.id, WORD);
                            }
                        }
                    } else {
                        Lexer.fa.reset();
                        return false;
                    }

                } while ((CHAR = Lexer.reader.nextChar()) !== false);
            } else {
                //end
                return {done: true};
            }
        }
    },
    fa: {
        words: ["法轮功", "邪教", "hello"],
        hanzi_chaizi_lib: new HanziChaizi(),
        state: undefined,
        FA: undefined,
        toRe: (word) => {
            let RE = "";
            Array.from(word).forEach(CHAR => {
                if (isChinese(CHAR)) {
                    // is Chinese
                    RE += "(";
                    // 拼音和首字母
                    let pys = pinyin(CHAR, {
                        pattern: "pinyin",
                        toneType: "none",
                        type: "array",
                        multiple: false,
                        v: true
                    })
                    pys.forEach(PINYIN => {
                        // console.log(PINYIN)
                        RE += `(${PINYIN[0]}(${PINYIN.slice(1, PINYIN.length)})?)|`
                        // RE+=`|(${PINYIN})`
                    })
                    // 汉字左右结构拆解
                    let structs = Lexer.fa.hanzi_chaizi_lib.query(CHAR);
                    structs.forEach(STRUCT => {
                        RE += `(${STRUCT.join("")})|`
                    })
                    RE += CHAR;
                    // console.log(RE)
                    RE += ")";
                } else {
                    // is English letter
                    RE += `(${CHAR.toLowerCase()}|${CHAR.toUpperCase()})`
                }
            })
            RE = "(" + RE + ")";
            return RE;
        },
        reset: () => {
            Lexer.fa.state = Lexer.fa.FA.start;
        },
        setStart: () => {
            Lexer.fa.FA = NFA.merge(Lexer.fa.words.map(WORD => {
                let DFA = NFA.parse_regex_to_nfa(Lexer.fa.toRe(WORD)).to_dfa(false);
                DFA.set_states_id();
                for (let STATE of DFA.accepts) {
                    STATE.id = WORD;
                }
                return DFA;
            })).to_dfa(true, false).to_dfa(false, false);
            Lexer.fa.state = Lexer.fa.FA.start;
        }
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
export {Lexer, isChinese};
