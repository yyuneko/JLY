// import {Lexer, Token} from "@/components/Re2FA/NFA/lexer";

let Lexer = require('./lexer').Lexer, Token = require('./lexer').Token;

function is_special_symbols(INPUT) {
    let f = INPUT.length === 1 && ((INPUT >= String.fromCharCode(33) && INPUT <= String.fromCharCode(47)) ||
        (INPUT >= String.fromCharCode(91) && INPUT <= String.fromCharCode(96)) ||
        (INPUT >= String.fromCharCode(123) && INPUT <= String.fromCharCode(126)) ||
        (INPUT >= String.fromCharCode(58) && INPUT <= String.fromCharCode(64)));
    // console.log(INPUT, f);
    return f;
}

function is_special_symbols_string(INPUT) {
    return Array.from(INPUT).every(CH => is_special_symbols(CH));
}

class State {
    constructor(id, is_start, is_accept) {
        this.is_start = is_start;
        this.is_accept = is_accept;
        this.id = id;
        this.as_from_moves = [];
        this.as_to_moves = [];
    }

    /**
     * @brief get the states that a state will transfer to when it meets some input
     * @param input a operand
     * @returns {*[]} the next states
     */
    goto_when_meet_input(input) {
        let TO_STATES = [];
        for (let MOVE of this.as_from_moves) {
            if (MOVE.input === input) {
                TO_STATES.push(MOVE.to_state);
            }
        }
        /* According to Thompson's methodology, the length of TO_STATES won't be
        more than two because a state has two MOVEs when the input is EPSILON,
        or one MOVE when the input is a valid operand in the alphabet.*/
        return TO_STATES;
    }
}

class Move {
    /**
     * @brief a transfer from [from_state] to [to_state] when meet [input]
     * @param from_state
     * @param to_state
     * @param input
     */
    constructor(from_state, to_state, input) {
        this.from_state = from_state;
        this.to_state = to_state;
        this.input = input;
    }
}

class NFA {
    static EPSILON = 'ϵ';

    constructor() {
        this.start = null;
        this.accepts = [];
        this.alphabet = new Set();// Alphabet doesn't include EPSILON.
        this.states = new Set();
    }

    /**
     * @brief turn [old_regex] to a new regex which only includes closure, concatenate, alternate
     * @param old_regex
     */
    static normalize_regex(old_regex) {
        let NEW_REGEX = "", STACK = [];
        for (let i = 0; i < old_regex.length; ++i) {
            if (i > 0 && old_regex[i] === '?') {
                if (STACK[STACK.length - 1] === ')') {
                    let COUNT_RIGHT = 0, COUNT_LEFT = 0, IT, PRE = "";
                    for (IT = STACK.length - 1; IT >= 0; --IT) {
                        if (STACK[IT] === ')') {
                            ++COUNT_RIGHT;
                        } else if (STACK[IT] === '(') {
                            ++COUNT_LEFT;
                        }
                        if (COUNT_RIGHT === COUNT_LEFT) {
                            break;
                        }
                    }
                    if (COUNT_RIGHT === COUNT_LEFT) {
                        for (let K = STACK.length - 1; K >= IT; --K) {
                            PRE = STACK.pop() + PRE;
                        }
                        STACK.push('(' + PRE + "|ϵ)");
                    } else return "";
                } else {
                    let PRE = STACK.pop();
                    console.log('pre', PRE);
                    STACK.push('(' + PRE + "|ϵ)");
                }
            } else if (i > 0 && old_regex[i] === '+') {
                // NEW_REGEX += old_regex[i - 1] + '*';
                if (STACK[STACK.length - 1] === ')') {
                    let COUNT_RIGHT = 0, COUNT_LEFT = 0, IT, PRE = "";
                    for (IT = STACK.length - 1; IT >= 0; --IT) {
                        if (STACK[IT] === ')') {
                            ++COUNT_RIGHT;
                        } else if (STACK[IT] === '(') {
                            ++COUNT_LEFT;
                        }
                        if (COUNT_RIGHT === COUNT_LEFT) {
                            break;
                        }
                    }
                    if (COUNT_RIGHT === COUNT_LEFT) {
                        for (let K = STACK.length - 1; K >= IT; --K) {
                            PRE = STACK.pop() + PRE;
                        }
                        console.log('pre', PRE);
                        STACK.push('(' + PRE + PRE + "*)");
                    } else return "";
                } else {
                    let PRE = STACK.pop();
                    STACK.push('(' + PRE + PRE + "*)");
                }
            } else {
                // NEW_REGEX+=old_regex[i];
                STACK.push(old_regex[i]);
            }

        }
        while (STACK.length > 0) {
            NEW_REGEX = STACK.pop() + NEW_REGEX;
        }
        return NEW_REGEX;
    }

    /**
     * @brief build nfa for a single input
     * @param input a operand
     * @returns {NFA}
     */
    static build_nfa_for_single_input(input) {
        let FA = new NFA();
        let FROM_STATE = new State(undefined, false, false), TO_STATE = new State(undefined, false, false);
        FROM_STATE.is_start = true;
        TO_STATE.is_accept = true;
        FA.move(FROM_STATE, TO_STATE, input);
        FA.start = FROM_STATE;
        FA.accepts = [TO_STATE];
        return FA;
    }

    static parse_regex_to_nfa(regex) {
        regex = NFA.normalize_regex(regex);
        console.log('new regex', regex)
        let TOKENS = Lexer.get_tokens(regex);
        // console.log('tokens',TOKENS)
        let STACK_FOR_NFA = [];
        for (let TOKEN of TOKENS) {
            if (!TOKEN.is_operator()) {
                STACK_FOR_NFA.push(NFA.build_nfa_for_single_input(TOKEN.value));
                continue;
            }
            if (TOKEN.type === Token.TYPES.concatenation) {
                if (STACK_FOR_NFA.length >= 2) {
                    STACK_FOR_NFA[STACK_FOR_NFA.length - 2].concatenate(STACK_FOR_NFA[STACK_FOR_NFA.length - 1]);
                    STACK_FOR_NFA.pop();
                } else {
                    return null;
                }
                continue;
            }
            if (TOKEN.type === Token.TYPES.alternation) {
                STACK_FOR_NFA[STACK_FOR_NFA.length - 2].alternate(STACK_FOR_NFA[STACK_FOR_NFA.length - 1]);
                STACK_FOR_NFA.pop();
                continue;
            }
            if (TOKEN.type === Token.TYPES.closure) {
                if (STACK_FOR_NFA.length > 0) {
                    STACK_FOR_NFA[STACK_FOR_NFA.length - 1].closure();
                } else return null;
            }
        }
        if (STACK_FOR_NFA.length === 1) return STACK_FOR_NFA[0];
        return null;
    }

    /**
     * @brief use BFS to get the states that [states] will transfer to when they meet EPSILON.
     * @param states
     * @returns {{value: *[], key: string}}
     */
    static epsilon_closure(states) {
        let EPSILON_CLOSURE = [],
            UNVISITED_STATES = [],
            SET_FOR_STATE_IDS = new Set();
        UNVISITED_STATES = UNVISITED_STATES.concat(states);
        while (UNVISITED_STATES.length > 0) {
            let STATE = UNVISITED_STATES.shift();
            if (!SET_FOR_STATE_IDS.has(STATE.id)) {
                // console.log(STATE.id)
                SET_FOR_STATE_IDS.add(STATE.id)
                EPSILON_CLOSURE.push(STATE);
                UNVISITED_STATES = UNVISITED_STATES.concat(STATE.goto_when_meet_input(NFA.EPSILON));
            }
        }
        return {
            key: Array.from(SET_FOR_STATE_IDS).sort().toString(),
            value: EPSILON_CLOSURE
        }
    }

    /**
     * @brief given a group of states, return the states that they will transfer to when they meet a given input
     * @param from_states
     * @param input
     * @returns {*[]}
     */
    static moves(from_states, input) {
        // console.log('from',from_states.length)
        // console.log('input',input,'\n')
        let TO_STATES = [];
        for (let STATE of from_states) {
            TO_STATES = TO_STATES.concat(STATE.goto_when_meet_input(input));
        }
        // console.log(`to: ${TO_STATES}`)
        return TO_STATES;
    }

    /**
     * @brief merge an epsilon_closure to a single state. During this process, if a state is start state, then set it as the start of [fa], or if accept state, then add it as one of the accepts of [fa].
     * @param fa
     * @param states
     * @returns {State}
     */
    static merge_to_single_state(fa, states) {
        let STATE_AFTER_MERGE = new State(undefined, false, false);
        for (let STATE of states) {
            if (STATE.is_start) {
                STATE_AFTER_MERGE.is_start = true;
            }
            if (STATE.is_accept) {
                if (!Number.isFinite(STATE.id)) STATE_AFTER_MERGE.id = STATE.id;
                STATE_AFTER_MERGE.is_accept = true;
            }
        }
        if (STATE_AFTER_MERGE.is_start) fa.start = STATE_AFTER_MERGE;
        if (STATE_AFTER_MERGE.is_accept) fa.accepts.push(STATE_AFTER_MERGE);
        return STATE_AFTER_MERGE;
    }

    /**
     * @brief from NFA to DFA
     * @returns {NFA} actually a DFA which is a special NFA
     */
    to_dfa(minimize = true, merge_accepts = true) {
        this.set_states_id();
        let dfa = new NFA();
        let TRANSFER_TABLE_FOR_STATES = new Map(),
            UNVISITED_STATES_GROUP = [],
            E_CLOSURE = NFA.epsilon_closure([this.start]);
        TRANSFER_TABLE_FOR_STATES.set(E_CLOSURE.key, NFA.merge_to_single_state(dfa, E_CLOSURE.value));
        UNVISITED_STATES_GROUP.push(E_CLOSURE);
        // console.log('key',E_CLOSURE.key)
        // console.log('value',E_CLOSURE.value)
        while (UNVISITED_STATES_GROUP.length > 0) {
            let UNVISITED_STATES = UNVISITED_STATES_GROUP.shift();
            for (let INPUT of this.alphabet) {
                E_CLOSURE = NFA.epsilon_closure(NFA.moves(UNVISITED_STATES.value, INPUT));
                // console.log(E_CLOSURE)
                if (E_CLOSURE.value.length > 0) {
                    if (!TRANSFER_TABLE_FOR_STATES.has(E_CLOSURE.key)) {
                        TRANSFER_TABLE_FOR_STATES.set(E_CLOSURE.key, NFA.merge_to_single_state(dfa, E_CLOSURE.value));
                        UNVISITED_STATES_GROUP.push(E_CLOSURE);
                    }
                    dfa.move(TRANSFER_TABLE_FOR_STATES.get(UNVISITED_STATES.key), TRANSFER_TABLE_FOR_STATES.get(E_CLOSURE.key), INPUT);
                }
            }
        }
        // console.log("DFA", dfa)
        if (minimize) {
            console.log("当前正在最小化DFA")
            //Minimize DFA
            let GROUPS_NOT_ACCEPT = [[]], GROUPS_ACCEPT = [[]];
            //divide into ACCEPT and not ACCEPT
            // console.log(dfa);
            // dfa.set_states_id();
            console.log("hhhh")
            dfa.states=dfa.get_states();
            for (let STATE of dfa.states) {
                if (STATE.is_accept) GROUPS_ACCEPT[0].push(STATE);
                else GROUPS_NOT_ACCEPT[0].push(STATE);
            }
            let include = (GROUP, TO_STATE) => {
                // console.log(GROUP[0].as_from_moves.map(MOVE => MOVE.to_state))
                for (let ITEM of GROUP) {
                    if (ITEM.as_from_moves.map(MOVE => MOVE.to_state).includes(TO_STATE)) return true;
                }
                return false;
            };
            let divide = (GROUP) => {
                // console.log("待划分", GROUP.map(v => v.id));
                if (GROUP.length <= 1) return [GROUP];
                let SUB_0 = [], SUB_1 = [];
                for (let STATE of GROUP) {
                    if (Number.isFinite(STATE.id) && STATE.as_from_moves.every(TO => GROUP.includes(TO.to_state))) {
                        SUB_0.push(STATE);
                    } else {
                        if (SUB_1.length !== 0) {
                            let LEN = SUB_1.length;
                            for (let INDEX = 0; INDEX < LEN; ++INDEX) {
                                if (STATE.as_from_moves.every(TO => include(SUB_1[INDEX], TO.to_state))) {
                                    SUB_1[INDEX].push(STATE);
                                    break
                                } else if (INDEX === SUB_1.length - 1) {
                                    SUB_1.push([STATE])
                                }
                            }
                        } else SUB_1.push([STATE]);
                    }
                }
                /* console.log("划分后");
                 console.log("第一组", SUB_0.map(v => v.id))
                 console.log("第二组")
                 SUB_1.forEach(v => {
                     console.log(v.map(u => u.id))
                 })*/
                SUB_1.push(SUB_0)
                return SUB_1
            }

            let CAN_DIVIDE = true;
            while (CAN_DIVIDE) {
                let LEN_QUEUE = GROUPS_NOT_ACCEPT.length;
                console.log(LEN_QUEUE)
                for (let i = 0; i < LEN_QUEUE; ++i) {
                    if (GROUPS_NOT_ACCEPT[0].length > 0) {
                        let NEW_GROUPS = divide(GROUPS_NOT_ACCEPT.shift());
                        for (let SUB_GROUP of NEW_GROUPS) {
                            if (SUB_GROUP.length !== 0)
                                GROUPS_NOT_ACCEPT.push(SUB_GROUP);
                        }
                    }
                }
                // console.log(LEN_QUEUE,GROUPS_NOT_ACCEPT.length)
                if (LEN_QUEUE === GROUPS_NOT_ACCEPT.length) {
                    CAN_DIVIDE = false;
                }
            }
            console.log("已完成第一部分")
            CAN_DIVIDE = true;
            // console.log(merge_accepts)
            while (CAN_DIVIDE) {
                let LEN_QUEUE = GROUPS_ACCEPT.length;
                for (let i = 0; i < LEN_QUEUE; ++i) {
                    if (GROUPS_ACCEPT[0].length > 0) {
                        let NEW_GROUPS = divide(GROUPS_ACCEPT.shift());
                        // console.log("划分后的Accpet",NEW_GROUPS);
                        for (let SUB_GROUP of NEW_GROUPS) {
                            GROUPS_ACCEPT.push(SUB_GROUP);
                        }
                    }
                }
                if (LEN_QUEUE === GROUPS_ACCEPT.length) {
                    CAN_DIVIDE = false;
                }
            }
            console.log("已完成第二部分")
            // merge groups
            for (let GROUP of GROUPS_NOT_ACCEPT) {
                let STATE_AFTER_MERGE = new State(undefined, false, false);
                for (let STATE of GROUP) {
                    if (STATE.is_start) {
                        STATE_AFTER_MERGE.is_start = true;
                    }
                    // if (STATE.is_accept) {
                    //     STATE_AFTER_MERGE.is_accept = true;

                    // }
                    for (let MOVE of STATE.as_from_moves) {
                        MOVE.from_state = STATE_AFTER_MERGE;
                        // if (STATE_AFTER_MERGE.as_from_moves.every(_MOVE => _MOVE.input !== MOVE.input||_MOVE.from_state!==MOVE.from_state))
                        STATE_AFTER_MERGE.as_from_moves.push(MOVE);
                        // else console.log("已有")
                    }
                    for (let MOVE of STATE.as_to_moves) {
                        MOVE.to_state = STATE_AFTER_MERGE;
                        // if (STATE_AFTER_MERGE.as_to_moves.every(_MOVE => _MOVE.input !== MOVE.input||_MOVE.to_state!==MOVE.to_state))
                        STATE_AFTER_MERGE.as_to_moves.push(MOVE);
                        // else console.log("已有")
                    }
                    STATE = null;// free memory
                }
                if (STATE_AFTER_MERGE.is_start) dfa.start = STATE_AFTER_MERGE;
                // if (STATE_AFTER_MERGE.is_accept) dfa.accepts.add(STATE_AFTER_MERGE);
            }
            if (merge_accepts) {
                dfa.accepts = [];
                for (let GROUP of GROUPS_ACCEPT) {
                    // console.log("GROUP", GROUP)
                    if (GROUP.length > 0) {
                        let STATE_AFTER_MERGE = new State(undefined, false, false);
                        for (let STATE of GROUP) {
                            if (STATE.is_start) {
                                STATE_AFTER_MERGE.is_start = true;
                            }
                            if (STATE.is_accept) {
                                STATE_AFTER_MERGE.is_accept = true;
                            }
                            for (let MOVE of STATE.as_from_moves) {
                                MOVE.from_state = STATE_AFTER_MERGE;
                                // if (STATE_AFTER_MERGE.as_from_moves.every(_MOVE => _MOVE.input !== MOVE.input||_MOVE.from_state!==MOVE.from_state))
                                STATE_AFTER_MERGE.as_from_moves.push(MOVE);
                                // else console.log("已有")
                            }
                            for (let MOVE of STATE.as_to_moves) {
                                MOVE.to_state = STATE_AFTER_MERGE;
                                // if (STATE_AFTER_MERGE.as_to_moves.every(_MOVE => _MOVE.input !== MOVE.input||_MOVE.to_state!==MOVE.to_state))
                                STATE_AFTER_MERGE.as_to_moves.push(MOVE);
                                // else console.log("已有")
                            }
                            if (!Number.isFinite(STATE.id)) {
                                STATE_AFTER_MERGE.id = STATE.id;
                            }
                            STATE = null;//free memory
                        }
                        if (STATE_AFTER_MERGE.is_start) dfa.start = STATE_AFTER_MERGE;
                        if (STATE_AFTER_MERGE.is_accept) dfa.accepts.push(STATE_AFTER_MERGE);
                    }
                }
            }
            // dfa.states.clear();
            dfa.set_states_id();
        }
        return dfa;
    }

    /**
     * @brief some like function moves
     * @param from_state
     * @param to_state
     * @param input
     * @returns {Move}
     */
    move(from_state, to_state, input) {
        let MOVE = new Move(from_state, to_state, input);
        from_state.as_from_moves.push(MOVE);//Out
        to_state.as_to_moves.push(MOVE);//Into
        if (input !== NFA.EPSILON) this.alphabet.add(input);//add an operand to alphabet
        return MOVE;
    }

    /**
     * @brief a implementation of '*' in Regex
     */
    closure() {
        let FROM_STATE = new State(undefined, false, false), TO_STATE = new State(undefined, false, false);
        FROM_STATE.is_start = true;
        TO_STATE.is_accept = true;
        this.move(FROM_STATE, TO_STATE, NFA.EPSILON);
        this.move(FROM_STATE, this.start, NFA.EPSILON);
        this.move(this.accepts[0], TO_STATE, NFA.EPSILON);
        this.move(this.accepts[0], this.start, NFA.EPSILON);
        this.start.is_start = false;
        this.accepts[0].is_accept = false;
        this.start = FROM_STATE;
        this.accepts[0] = TO_STATE;
    }

    /**
     * @brief a implementation of concatenation which is implicit in Regex. This function will concatenate [this] NFA and [right] NFA.
     * @param right
     */
    concatenate(right) {
        this.move(this.accepts[0], right.start, NFA.EPSILON);
        this.accepts[0].is_accept = false;
        right.start.is_start = false
        this.accepts[0] = right.accepts[0];
        for (let input of right.alphabet)
            this.alphabet.add(input);
        right.start = null;
        right.accepts = null;
    }

    /**
     * @brief a implementation of '|' in Regex. This function will make an alternation between [this] NFA and [right] NFA.
     * @param right
     */
    alternate(right) {
        let FROM_STATE = new State(undefined, false, false), TO_STATE = new State(undefined, false, false);
        FROM_STATE.is_start = true;
        TO_STATE.is_accept = true;
        this.move(FROM_STATE, this.start, NFA.EPSILON);
        this.move(FROM_STATE, right.start, NFA.EPSILON);
        this.move(this.accepts[0], TO_STATE, NFA.EPSILON);
        this.move(right.accepts[0], TO_STATE, NFA.EPSILON);
        this.start.is_start = false;
        this.accepts[0].is_accept = false;
        this.start = FROM_STATE;
        this.accepts[0] = TO_STATE;
        right.start.is_start = false;
        right.accepts[0].is_accept = false;
        right.start = null;
        right.accepts = null;
        for (let input of right.alphabet)
            this.alphabet.add(input);
    }

    get_states() {
        let STATES = [], FINAL_STATES = new Set();
        STATES.push(this.start);
        FINAL_STATES.add(this.start);
        try {
            while (STATES.length > 0) {
                let STATE = STATES.shift();
                for (let MOVE of STATE.as_from_moves) {
                    if (!FINAL_STATES.has(MOVE.to_state)) {
                        STATES.push(MOVE.to_state);
                        FINAL_STATES.add(MOVE.to_state);
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
        return FINAL_STATES;
    }

    set_states_id() {
        let STATE_ID = 0;
        this.states = this.get_states();
        for (let STATE of this.states) {
            if (STATE.id === undefined)
                STATE.id = ++STATE_ID;
        }
        /*try {
            while (STATES.length > 0) {
                // console.log(`当前${STATES.length}个状态待处理`)
                let STATE = STATES.shift();
                // STATE.as_from_moves = Array.from(new Set(STATE.as_from_moves));
                for (let MOVE of STATE.as_from_moves) {
                    if (MOVE.to_state.id === undefined || !Number.isFinite(MOVE.to_state.id)) {
                        if (MOVE.to_state.id === undefined)
                            MOVE.to_state.id = STATE_ID++;
                        /!* console.log({
                             cur: STATE,
                             states: STATES,
                             to: MOVE.to_state
                         })*!/
                        // if (STATE !== MOVE.to_state ) {
                        STATES.push(MOVE.to_state);
                        // console.log("新状态");
                        // }
                        this.states.add(MOVE.to_state);
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }*/
    }

    to_dot() {
        this.set_states_id();
        // console.log('nodes', this.states)
        let EDGES = [], STATES = [], VISITED = new Set();
        STATES.push(this.start);
        VISITED.add(this.start.id);
        while (STATES.length > 0) {
            let STATE = STATES.shift();
            for (let MOVE of STATE.as_from_moves) {
                if (!VISITED.has(MOVE.to_state.id)) {
                    VISITED.add(MOVE.to_state.id);
                    STATES.push(MOVE.to_state);
                }
                EDGES.push(MOVE);
            }
        }
        let WINDOW_WIDTH = window.innerWidth, WINDOW_HEIGHT = window.innerHeight, RANDIR;
        if (WINDOW_WIDTH > WINDOW_HEIGHT) RANDIR = 'TB';
        else RANDIR = 'LR';
        let DOT_SOURCE = `digraph graphviz{
bgcolor="transparent"
rankdir=${RANDIR}
node [height=${30 / 300},width=${30 / 300}]
edge [color=gray]
0 [label="" peripheries=0]
0 ->${this.start.id} [label="start"]
`;
        for (let STATE of this.states) {
            if (Number.isFinite(STATE.id))
                DOT_SOURCE += `${STATE.id} `;
            else if (is_special_symbols(STATE.id)) {
                DOT_SOURCE += `"\\${STATE.id}"  `;
            } else if (is_special_symbols_string(STATE.id)) {
                DOT_SOURCE += `"${STATE.id.replace('%', '\\%')}"`;
            } else {
                DOT_SOURCE += `${STATE.id}  `;
            }
            DOT_SOURCE += ` [peripheries=${STATE.is_accept ? 2 : 1}]\n`;
        }
        for (let EDGE of EDGES) {
            let FROM_ID = EDGE.from_state.id, TO_ID = EDGE.to_state.id;

            if (Number.isFinite(FROM_ID))
                DOT_SOURCE += `${FROM_ID} -> `;
            else if (is_special_symbols(FROM_ID)) {
                DOT_SOURCE += `"\\${FROM_ID}" -> `;
            } else if (is_special_symbols_string(FROM_ID)) {
                DOT_SOURCE += `"${FROM_ID}"`;
            } else {
                DOT_SOURCE += `${FROM_ID} -> `;
            }
            if (Number.isFinite(TO_ID))
                DOT_SOURCE += `${TO_ID}  `;
            else if (is_special_symbols(TO_ID)) {
                DOT_SOURCE += `"\\${TO_ID}" `;
            } else if (is_special_symbols_string(TO_ID)) {
                TO_ID = TO_ID.replace('%', '\\%');
                DOT_SOURCE += `"${TO_ID}"`;
            } else {
                DOT_SOURCE += `${TO_ID}  `;
            }
            if (Number.isFinite(EDGE.input))
                DOT_SOURCE += ` [label="${EDGE.input}"]\n`;
            else if (is_special_symbols(EDGE.input)) {
                DOT_SOURCE += ` [label="\\${EDGE.input}"]\n`;
            } else if (is_special_symbols_string(EDGE.input)) {
                DOT_SOURCE += `"${EDGE.input}"`;
            } else {
                DOT_SOURCE += ` [label="${EDGE.input}"]\n `;
            }

        }
        DOT_SOURCE += '}';
        // console.log(DOT_SOURCE);
        return DOT_SOURCE;
    }

    static merge(fas) {
        console.log(`共有${fas.length}个FA`);
        if (fas.length === 0) {
            console.error("Error! There are not fas");
            return null;
        }
        let NEW_FA = new NFA();
        // console.log(Array.from(fas[0].states).map(STATE => STATE.id));
        let ALL_ACCEPTS = new Set(), ALL_ALPHABET = new Set();
        let NEW_START_FOR_FAS = new State(undefined, true, false);
        let NEW_START_NUMBER = Math.max(...(Array.from(fas[0].states).filter(STATE => Number.isFinite(STATE.id)).map(STATE => STATE.id))) + 1;
        if (!Number.isFinite(NEW_START_NUMBER)) NEW_START_NUMBER = fas[0].states.length + 1;
        for (let i = 0; i < fas.length; ++i) {
            console.log(`当前正在处理第${i + 1}个FA`)
            fas[i].start.is_start = false;
            let OLD_START_NUMBER = fas[i].start.id;
            // console.log("新起点", NEW_START_NUMBER);
            // console.log("旧起点", OLD_START_NUMBER);
            if (i === 0) {
                for (let STATE of fas[i].states) {
                    if (Number.isFinite(STATE.id))
                        ++STATE.id;
                }
            } else {
                for (let STATE of fas[i].states) {
                    if (Number.isFinite(STATE.id))
                        STATE.id = NEW_START_NUMBER + STATE.id - OLD_START_NUMBER;
                }
            }
            NEW_START_NUMBER = Math.max(...Array.from(fas[i].states).filter(STATE => Number.isFinite(STATE.id)).map(STATE => STATE.id)) + fas.length;
            for (let MOVE of fas[i].start.as_from_moves) {
                MOVE.from_state = NEW_START_FOR_FAS;
                NEW_START_FOR_FAS.as_from_moves.push(MOVE);
            }
            for (let MOVE of fas[i].start.as_to_moves) {
                MOVE.to_state = NEW_START_FOR_FAS;
                NEW_START_FOR_FAS.as_to_moves.push(MOVE);
            }
            // fas[i].start = null;
            ALL_ACCEPTS = new Set([...ALL_ACCEPTS, ...(fas[i].accepts)]);
            ALL_ALPHABET = new Set([...ALL_ALPHABET, ...(fas[i].alphabet)]);
            fas[i] = null;
        }
        NEW_FA.start = NEW_START_FOR_FAS;
        NEW_FA.accepts = Array.from(ALL_ACCEPTS);
        NEW_FA.alphabet = ALL_ALPHABET;
        NEW_FA.set_states_id();
        // console.log(NEW_FA)
        return NEW_FA;
    }
}

// export {NFA}
exports.NFA = NFA;
exports.is_special_symbols = is_special_symbols;
exports.is_special_symbols_string = is_special_symbols_string;
