const _Set = require("./set");
const EPSILON = Symbol("epsilon");
const END = Symbol("end");

class NonTerminal {
    constructor(symbol) {
        this.symbol = symbol;
        // this.productions = new _Set();
        this.productions = [];
        this.first = [];
        this.follows = [];
        this.nullable = false;
    }

    toString() {
        return `${this.symbol}
        ${this.nullable ? "nullable" : "not nullable"}
        Firsts: ${this.first.join(", ")}
        Follows: ${this.follows.join(", ")}
        Productions:
         ${this.productions.join("\n ")}`
    }
}

class Production {
    constructor(id, symbol, handle, func, precedence = 0) {
        this.symbol = symbol;
        if (typeof handle === "string")
            this.handle = handle.split(' ').filter(item => item);
        else this.handle = handle.map(item => {
            if (item.trim().includes(' ')) throw TypeError(`${item} should not contain space`);
            return item.trim();
        });
        this.nullable = false;
        this.id = id;
        this.func = func;
        this.first = [];
        this.precedence = precedence;

    }

    eq(production) {
        return production instanceof Production && this.toString() === production.toString();
    }

    toString() {
        return this.symbol.toString() + " -> " + this.handle.join(' ');
    }
}


/**
 * @brief LR 分析表中的项目
 */
class Item {
    constructor(production, dotPosition, follows, predecessor) {
        this.production = production;
        this.dotPosition = dotPosition;
        this.follows = follows;
        this.predecessor = predecessor;
        this.id = parseInt(production.id + 'a' + this.dotPosition, 36);
    }

    eq(item) {
        return this.id === item.id;
    }

    lookAhead() {
        return new Item(this.production, this.dotPosition + 1, this.follows, this.predecessor);
    }

    toString() {
        return `${this.production.symbol.toString()} -> ${this.production.handle.slice(0, this.dotPosition).join(' ')} · ${this.production.handle.slice(this.dotPosition).join(' ')}`;
    }
}

/**
 * @brief LR 分析表中的项集闭包
 */
class ItemSet extends _Set {
    constructor() {
        super();
        this.hash = {};
    }

    add(...items) {
        for (let item of items) {
            this.hash[item.id] = true;
        }
        super.add(...items);
    }

    has(item) {
        return this.hash[item.id];
    }

    valueOf() {
        return this.items.map(item => item.id).sort().join('|');
    }

    copy() {
        let ret = new ItemSet();
        ret.items = [...this.items];
        ret.hash = Object.create(this.hash);
        return ret;
    }

    toString() {
        return `\t${this.items.map(item => item.toString()).join('\n\t')}`
    }
}

class LRTable {
    constructor() {
        this.actions = [];
        this.stateNumbersMap = {};
        this.states = [];
    }

    accept(state) {
        this.actions[state][END.toString()] = { accept: true };
    }

    shift(fromState, toState, terminal) {
        if (typeof fromState === "string") fromState = this.stateNumbersMap[fromState];
        if (typeof toState === "string") toState = this.stateNumbersMap[toState];
        if (this.actions[fromState].hasOwnProperty(terminal)) {
            this.actions[fromState][terminal].shift = toState;
        } else {
            this.actions[fromState][terminal] = { shift: toState };
        }
    }

    reduce(fromState, terminal, productionId) {
        if (typeof fromState === "string") fromState = this.stateNumbersMap[fromState];
        if (this.actions[fromState].hasOwnProperty(terminal)) {
            this.actions[fromState][terminal].reduce = productionId;
        } else {
            this.actions[fromState][terminal] = { reduce: productionId };
        }
    }

    goto(fromState, toState, nonterminal) {
        if (typeof fromState === "string") fromState = this.stateNumbersMap[fromState];
        if (typeof toState === "string") toState = this.stateNumbersMap[toState];
        this.actions[fromState][nonterminal] = { goto: toState };
    }

    get size() {
        return Object.keys(this.stateNumbersMap).length;
    }

    addItemSet(itemSet) {
        const id = itemSet.valueOf();
        if (!id) return false;
        if (this.stateNumbersMap.hasOwnProperty(id)) return this.stateNumbersMap[id];
        this.stateNumbersMap[id] = this.size;
        this.states[this.stateNumbersMap[id]] = itemSet;
        this.actions[this.stateNumbersMap[id]] = {};
        return this.stateNumbersMap[id];
    }

    toString() {
        return `${this.states.map((state, index) => {
            return "state " + index + "\n" + state.toString();
        }).join("\n\n")}`;
    }
}

module.exports = {
    EPSILON, END, NonTerminal, Production, Item, ItemSet, LRTable
}