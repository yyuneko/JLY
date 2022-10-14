const Lexer = require("lexer");
const {EPSILON, END, NonTerminal, Production, Item, ItemSet, LRTable} = require("./types")


class Parser {
    constructor(grammar, options) {
        this.options = options;
        this.lexer = undefined;
        this.startSymbol = undefined;
        this.productions = [];
        this.operators = {};
        this.nonterminals = {};
        this.symbols = [];
        this.terminals = [];
        this.lrtable = undefined; // lr分析表
        this.processGrammar(grammar);
        this.buildLRTable();
    }

    get debug() {
        return this.options.debug || false;
    }

    get type() {
        return this.options.type || "slr";
    }

    firsts() {
        const first = {};
        const getFirst = (prod) => {
            if (this.terminals.includes(prod.handle[0])) { // if symbol is terminal, return itself
                return [prod.handle[0]];
            } else if (prod.handle.length === 0) {
                this.nonterminals[prod.symbol].nullable = true;
                return [EPSILON];
            } else {
                const ret = new Set();
                for (let i = 0; i < prod.handle.length; ++i) {
                    const symbol = prod.handle[i];
                    if (this.terminals.includes(symbol)) {
                        ret.add(symbol);
                        break;
                    }
                    for (let item of first[symbol]) {
                        if (item !== EPSILON)
                            ret.add(item);
                    }
                    if (!this.nonterminals[symbol].nullable) break;
                    else if (i === prod.handle.length - 1) {
                        ret.add(EPSILON);
                    }
                }
                return Array.from(ret);
            }
        }
        for (let symbol of Reflect.ownKeys(this.nonterminals)) {
            first[symbol] = new Set();
        }
        // todo 需要优化
        while (true) {
            let oldSize = Reflect.ownKeys(first).map(item => first[item].size).sort().toString();
            for (let prod of this.productions) {
                getFirst(prod).forEach(item => {
                    first[prod.symbol].add(item);
                })
            }
            if (Reflect.ownKeys(first).map(item => first[item].size).sort().toString() === oldSize) break;
        }

        for (let symbol of Reflect.ownKeys(this.nonterminals)) {
            first[symbol] = [...first[symbol]];
        }
        this.firsts = () => {
            return first
        };
        return first;
    }

    follows() {
        const follow = {};
        const getFollow = (prod) => {
            if (this.nonterminals.hasOwnProperty(prod.handle[prod.handle.length - 1])) {
                follow[prod.symbol].forEach(item => {
                    follow[prod.handle[prod.handle.length - 1]].add(item);
                })
            }
            for (let i = prod.handle.length - 2; i >= 0; --i) {
                if (this.nonterminals.hasOwnProperty(prod.handle[i])) {
                    if (this.terminals.includes(prod.handle[i + 1])) {
                        follow[prod.handle[i]].add(prod.handle[i + 1]);
                    } else {
                        this.first[prod.handle[i + 1]].forEach(item => {
                            if (item !== EPSILON)
                                follow[prod.handle[i]].add(item);
                        })
                        if (this.nonterminals[prod.handle[i + 1]].nullable) {
                            follow[prod.handle[i + 1]].forEach(item => {
                                follow[prod.handle[i]].add(item);
                            })
                        }
                    }
                }

            }
        };
        for (let symbol of Reflect.ownKeys(this.nonterminals)) {
            follow[symbol] = new Set();
        }
        follow[this.artificialStartSymbol.symbol].add(END);
        while (true) {
            let oldSize = Object.keys(follow).map(item => follow[item].size).sort().toString();
            this.productions.forEach(getFollow);
            if (Object.keys(follow).map(item => follow[item].size).sort().toString() === oldSize) break;
        }
        for (let symbol of Reflect.ownKeys(this.nonterminals)) {
            follow[symbol] = [...follow[symbol]];
        }
        this.follows = () => {
            return follow;
        }
        return follow;
    }

    buildLRTable() {
        this.artificialStartSymbol = new NonTerminal(Symbol("artificial start symbol"));
        this.productions.unshift(new Production(0, this.artificialStartSymbol.symbol, this.startSymbol));
        this.artificialStartSymbol.productions.push(this.productions[0]);
        this.nonterminals[this.artificialStartSymbol.symbol] = this.artificialStartSymbol;
        this.symbols.unshift(this.artificialStartSymbol.symbol);
        this.lrtable = new LRTable();
        switch (this.type) {
            case "slr": {
                this.buildLRTable4SLR();
                break;
            }
            case "lr0": {
                this.buildLRTableLR0();
                break;
            }
            case "lr1": {
                this.buildLRTableLR1();
                break;
            }
            case "lalr": {
                this.buildLRTableLALR();
                break;
            }
            default: {
                console.warn(`${this.type} is not supported now`);
            }
        }
    }

    buildLRTable4SLR() {
        // get set of firsts
        this.first = this.firsts();
        // get set of follows
        this.follow = this.follows();
        const getClosure = (initItemSet) => {
            let closure = initItemSet.copy();
            for (let i = 0; i < closure.size; i++) {
                const item = closure.items[i];
                if (this.nonterminals.hasOwnProperty(item.production.handle[item.dotPosition])) {
                    closure.add(...this.nonterminals[item.production.handle[item.dotPosition]].productions.map(prod => {
                        return new Item(prod, 0);
                    }));
                }
            }
            return closure;
        };
        const goto = (itemSet, symbol) => {
            let closure = new ItemSet();
            for (let i = 0; i < itemSet.size; ++i) {
                let item = itemSet.items[i];
                if (item.production.handle[item.dotPosition] === symbol) {
                    closure.add(item.lookAhead());
                }
            }
            return getClosure(closure);
        }
        // get sets of closure
        let itemSet = new ItemSet();
        itemSet.add(new Item(this.artificialStartSymbol.productions[0], 0));
        this.lrtable.addItemSet(getClosure(itemSet));
        for (let i = 0; i < this.lrtable.size; ++i) {
            itemSet = this.lrtable.states[i];
            for (let j = 0; j < itemSet.size; ++j) {
                let item = itemSet.items[j];
                if (item.dotPosition === item.production.handle.length) {
                    this.follow[item.production.symbol].forEach(symbol => {
                        this.lrtable.reduce(i, symbol, item.production.id);
                    })
                }
            }
            for (let symbol of this.symbols) {
                /**
                 * if `goto(itemSet, symbol)` is empty or exists in lrtable, then ignore, otherwise add to lrtable
                 */
                let nextItemSet = this.lrtable.addItemSet(goto(itemSet, symbol));
                if (nextItemSet !== false) {
                    if (this.lrtable.states[nextItemSet].has(this.lrtable.states[0].items[0].lookAhead())) {
                        this.lrtable.accept(nextItemSet);
                    }
                    if (this.terminals.includes(symbol)) {
                        this.lrtable.shift(i, nextItemSet, symbol);
                        if (this.lrtable.actions[i][symbol].shift && this.lrtable.actions[i][symbol].reduce) {
                            if (!this.operators.hasOwnProperty(symbol)
                                || this.productions[this.lrtable.actions[i][symbol].reduce].precedence < this.operators[symbol].precedence) {
                                delete this.lrtable.actions[i][symbol].reduce;
                            } else {
                                delete this.lrtable.actions[i][symbol].shift;
                            }
                        }
                    } else {
                        this.lrtable.goto(i, nextItemSet, symbol);
                    }
                }
            }
        }
    }

    buildLRTableLR0() {
    }

    buildLRTableLR1() {
    }

    buildLRTableLALR() {
    }

    parse(input) {
        if (input === null || typeof input === "undefined") throw TypeError("input must be not null or undefined");
        if (typeof input !== "string") throw TypeError("input must be a string");
        if (!(this.lexer instanceof Lexer)) throw TypeError("lexer of this parser is undefined or not instance of Lexer");
        this.lexer.input(input);
        const getToken = this.lexer.lex.bind(this.lexer);
        this.stateStack = [0];
        this.symbolStack = [];

        class Token {
            constructor(type, value, lineno, lexPos) {
                this.type = type;
                this.value = value;
                this.lineno = lineno;
                this.lexPos = lexPos;
            }
        }

        this.log = [];
        let terminal, reduce, shift, goto;
        while (true) {
            // if previous action is `reduce`, then use previous `terminal`, because action `reduce` doesn't consume `terminal`
            if (typeof reduce === "undefined") {
                let type = getToken();
                if (type === "EOF") {
                    type = END;
                }
                terminal = new Token(type, this.lexer.yytext, this.lexer.lineno, this.lexer.lex_pos);
            }
            ({shift, reduce, goto} = this.lrtable.actions[this.stateStack[this.stateStack.length - 1]][terminal.type]);
            if ((shift !== undefined + reduce !== undefined + goto !== undefined) > 1) {
                throw Error(`reduce: ${reduce} / shift: ${shift} conflict`)
            } else {
                if (shift !== undefined) {
                    this.stateStack.push(shift);
                    this.symbolStack.push(terminal);
                    this.log.push({
                        stateStack: this.stateStack.join(' '),
                        symbolStack: this.symbolStack.map(symbol => {
                            return symbol.type || symbol.toString();
                        }).join(' '),
                        action: `shift ${shift}`
                    });
                } else if (reduce !== undefined) {
                    const len = this.productions[reduce].handle.length;
                    this.stateStack.splice(this.stateStack.length - len, len);
                    let slice = this.symbolStack.splice(this.symbolStack.length - len, len);
                    if (typeof this.productions[reduce].func === "function") {
                        let p = this.productionProxy(slice);
                        this.productions[reduce].func(p);
                        let symbolAfterReduce = p[0];
                        this.symbolStack.push(symbolAfterReduce);
                        this.stateStack.push(this.lrtable.actions[this.stateStack[this.stateStack.length - 1]][this.productions[reduce].symbol.toString()].goto);
                    } else {
                        this.symbolStack.push(this.productions[reduce].symbol);
                        this.stateStack.push(this.lrtable.actions[this.stateStack[this.stateStack.length - 1]][this.productions[reduce].symbol.toString()].goto);
                    }
                    this.log.push({
                        stateStack: this.stateStack.join(' '),
                        symbolStack: this.symbolStack.map(symbol => {
                            return symbol.type || symbol.toString();
                        }).join(' '),
                        action: `reduce ${this.productions[reduce].toString()}`
                    })
                }
            }
            if (terminal.type === END && this.symbolStack.length === 1) {
                return this.symbolStack[0];
                // break;
            }
        }
    }

    productionProxy(inputs) {
        let proxy = {
            lexer: this.lexer,
            parser: this,
            symbolsOfProduction: [null, ...inputs],
        };
        return new Proxy(proxy, {
            get(target, key) {
                // only allow to access proxy.lexer, proxy.parser, and proxy.symbolsOfProduction
                if (typeof key === "string" && /^\d+$/.test(key) || typeof key === "number") {
                    return target.symbolsOfProduction[key];
                }
                if (key === "length") {
                    return target.symbolsOfProduction.length;
                }
                if (key === "lexer") {
                    return target.lexer;
                }
                if (key === "parser") {
                    return target.parser;
                }
                throw RangeError(`All property names include 'lexer', 'parser', number, 'length', '${key}' is not a valid property name.`)
            },
            set(target, key, value) {
                if (typeof key === "string" && /^\d+$/.test(key)) {
                    if (parseInt(key) >= target.symbolsOfProduction.length) {
                        console.warn(`You are not allowed to write to index ${key}, cause it's out of range`);
                        return false;
                    }
                    target.symbolsOfProduction[key] = value;
                    return true;
                } else {
                    throw RangeError(`Number is the only valid property name`);
                }
            }
        })
    }

    processGrammar(grammar) {
        if (!grammar.tokens) this.terminals = [];
        else if (typeof grammar.tokens === 'string') {
            this.terminals = grammar.tokens.split(/ +/);
        } else if (Array.isArray(grammar.tokens)) {
            this.terminals = grammar.tokens;
        } else {
            throw TypeError("tokens of grammar must be a string or array");
        }
        this.symbols.push(...this.terminals);
        this.processOperators(grammar.operators);
        this.processProductions(grammar.bnf);
        if (!grammar.hasOwnProperty("startSymbol")) {
            throw Error("startSymbol is required");
        } else if (!this.nonterminals.hasOwnProperty(grammar.startSymbol)) {
            throw Error(`${grammar.startSymbol} is undefined or not a nonterminal`);
        } else {
            this.startSymbol = grammar.startSymbol;
        }
    }

    processOperators(operators) {
        if (typeof operators === "undefined") operators = [];
        if (!Array.isArray(operators)) {
            throw TypeError(`${operators} should be array`);
        }
        for (let i = 0; i < operators.length; ++i) {
            for (let j = 1; j < operators[i].length; ++j) {
                this.operators[operators[i][j]] = {
                    precedence: i + 1, associativity: operators[i][0]
                };
            }
        }
    }

    processProductions(bnf) {
        this.symbols.push(...Object.keys(bnf));
        const check = () => {
            this.productions[this.productions.length - 1].handle.forEach(sym => {
                if (!this.symbols.includes(sym)) {
                    throw RangeError(`'${sym}' is undefined in terminals`);
                }
                if (this.operators.hasOwnProperty(sym))
                    this.productions[this.productions.length - 1].precedence = Math.max(this.productions[this.productions.length - 1].precedence, this.operators[sym].precedence);
            })
        }
        const getCustomPrecedence = (handle) => {
            let handleWithoutPrec = handle.split("%prec")
            let precedenceLevel = handleWithoutPrec[1]?.trim();
            if (precedenceLevel?.length) {
                if (this.operators.hasOwnProperty(precedenceLevel)) {
                    return [handleWithoutPrec[0], this.operators[precedenceLevel].precedence];
                } else {
                    throw RangeError(`precedence of \`${precedenceLevel}\` is undefined`);
                }
            } else if (typeof precedenceLevel === "undefined") {
                return [handleWithoutPrec[0], 0];
            } else {
                throw SyntaxError("`%prec` must be followed by a precedence name");
            }
        }
        for (let symbol of Object.keys(bnf)) {
            if (this.terminals.includes(symbol)) {
                throw Error(`'${symbol}' can't be defined as a nonterminal as it is a terminal`);
            }
            const lenOfProductionsBefore = this.productions.length;
            this.nonterminals[symbol] = new NonTerminal(symbol);
            if (Array.isArray(bnf[symbol])) {
                for (let prod of bnf[symbol]) {
                    if (Array.isArray(prod.handle)) {
                        prod.handle.forEach(item => {
                            let [handleWithoutPrec, prec] = getCustomPrecedence(item);
                            this.productions.push(new Production(this.productions.length + 1, symbol, handleWithoutPrec, prod.func, prec));
                            check();
                        })
                    } else {
                        let [handleWithoutPrec, prec] = getCustomPrecedence(prod.handle);
                        this.productions.push(new Production(this.productions.length + 1, symbol, handleWithoutPrec, prod.func, prec));
                        check();
                    }
                }
            } else {
                let [handleWithoutPrec, prec] = getCustomPrecedence(bnf[symbol].handle);
                this.productions.push(new Production(this.productions.length + 1, symbol, handleWithoutPrec, bnf[symbol].func, prec));
                check();
            }
            this.nonterminals[symbol].productions = this.productions.slice(lenOfProductionsBefore);
        }
    }
}

module.exports = {
    Production, Parser
}
