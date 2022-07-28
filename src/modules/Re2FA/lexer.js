class Token {
    static TYPES = {
        alternation: 'ALTERNATION',
        concatenation: 'CONCATENATION',
        closure: 'CLOSURE',
        operand: 'OPERAND',
        left_parenthesis: 'LEFT_PARENTHESIS',
        right_parenthesis: 'RIGHT_PARENTHESIS'
    }
    static PRIORITIES = {
        ALTERNATION: 0x66,
        CONCATENATION: 0xcc,
        CLOSURE: 0xff
    }

    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    higher_priority(right) {
        return Token.PRIORITIES[this.type] > Token.PRIORITIES[right.type];
    }

    is_left_parenthesis() {
        return this.type === Token.TYPES.left_parenthesis;
    }

    is_right_parenthesis() {
        return this.type === Token.TYPES.right_parenthesis;
    }

    is_operator() {
        return this.type !== Token.TYPES.operand;
    }

    toString() {
        return `<${this.type}, ${this.value}>`
    }
}

class Lexer {
    static OPERATORS = {
        alternation: new Token(Token.TYPES.alternation, '|'),
        concatenation: new Token(Token.TYPES.concatenation, ''),
        closure: new Token(Token.TYPES.closure, '*'),
        left_parenthesis: new Token(Token.TYPES.left_parenthesis, '('),
        right_parenthesis: new Token(Token.TYPES.right_parenthesis, ')')
    }

    constructor(regex) {
        this.regex = regex;
    }

    static get_tokens(regex) {
        let LEXER = new Lexer(regex), TOKEN;
        let IT = LEXER[Symbol.iterator]();

        let STACK_FOR_OPERATORS = [], STACK_FOR_TOKENS = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // console.log(i++);
            // console.log('token', TOKEN)
            // console.log('操作栈', STACK_FOR_OPERATORS.toString())
            // console.log('最终表达式', STACK_FOR_TOKENS.toString())
            // console.log('\n')
            TOKEN = IT.next();
            if (TOKEN.done) break;
            TOKEN = TOKEN.value;
            if (TOKEN.is_left_parenthesis()) {
                STACK_FOR_OPERATORS.push(TOKEN);
                continue;
            }
            if (TOKEN.is_right_parenthesis()) {
                while (STACK_FOR_OPERATORS.length > 0
                && !STACK_FOR_OPERATORS[STACK_FOR_OPERATORS.length - 1].is_left_parenthesis()) {
                    STACK_FOR_TOKENS.push(STACK_FOR_OPERATORS.pop());
                }
                if (STACK_FOR_OPERATORS.length > 0) {
                    STACK_FOR_OPERATORS.pop();
                    continue;
                } else {
                    return null;
                }
            }
            if (!TOKEN.is_operator()) {
                STACK_FOR_TOKENS.push(TOKEN);
                continue;
            }
            while (STACK_FOR_OPERATORS.length > 0
            && !STACK_FOR_OPERATORS[STACK_FOR_OPERATORS.length - 1].is_left_parenthesis()
            && !TOKEN.higher_priority(STACK_FOR_OPERATORS[STACK_FOR_OPERATORS.length - 1])) {

                STACK_FOR_TOKENS.push(STACK_FOR_OPERATORS.pop());
            }
            STACK_FOR_OPERATORS.push(TOKEN);
        }
        while (STACK_FOR_OPERATORS.length > 0) {
            let TOKEN = STACK_FOR_OPERATORS.pop();
            if (TOKEN.is_left_parenthesis()) {
                return null;
            }
            STACK_FOR_TOKENS.push(TOKEN);
        }
        return STACK_FOR_TOKENS;
    }

    [Symbol.iterator]() {
        let POSITION = 0, PRE = null;
        let CREATE_TOKEN_FOR_INPUT = new Map();
        //use cache to get the return value quickly
        CREATE_TOKEN_FOR_INPUT.set(')', () => {
            PRE = Lexer.OPERATORS.right_parenthesis;
            ++POSITION;
            return {value: PRE, done: false};
        });
        CREATE_TOKEN_FOR_INPUT.set('|', () => {
            PRE = Lexer.OPERATORS.alternation;
            ++POSITION;
            return {value: PRE, done: false};
        });
        CREATE_TOKEN_FOR_INPUT.set('*', () => {
            PRE = Lexer.OPERATORS.closure;
            ++POSITION;
            return {value: PRE, done: false};
        });
        CREATE_TOKEN_FOR_INPUT.set('(', () => {
            //decide if there will be a CONCATENATION
            if (PRE && (PRE.type === Token.TYPES.operand || PRE.type === Token.TYPES.right_parenthesis || PRE === Token.TYPES.closure)) {
                PRE = Lexer.OPERATORS.concatenation;
                return {value: PRE, done: false};
            } else {
                PRE = Lexer.OPERATORS.left_parenthesis;
                ++POSITION;
                return {value: PRE, done: false};
            }
        })
        return {
            next: () => {
                if (POSITION >= this.regex.length)
                    return {done: true};
                let CURRENT_INPUT = this.regex[POSITION];
                return (CREATE_TOKEN_FOR_INPUT.get(CURRENT_INPUT) || (() => {
                    //decide if there will be a CONCATENATION
                    if (PRE && (PRE.type === Token.TYPES.operand || PRE.type === Token.TYPES.right_parenthesis || PRE.type === Token.TYPES.closure)) {
                        PRE = Lexer.OPERATORS.concatenation;
                        // console.log('插入连接符', PRE)
                        return {value: PRE, done: false};
                    }
                    PRE = new Token(Token.TYPES.operand, CURRENT_INPUT);
                    // console.log('now', PRE)
                    ++POSITION;
                    return {value: PRE, done: false};
                }))();
            }
        }
    }
}

export {Lexer, Token}
// exports.Lexer=Lexer;
// exports.Token=Token;
