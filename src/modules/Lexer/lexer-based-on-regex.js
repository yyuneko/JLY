class Lexer {
    constructor(dict, input) {
        this.EOF = 1;
        this.done = false;
        this.lex_data = undefined;
        this.lex_regex = undefined;
        this.lex_regex_func = {};
        this.lex_pos = 0;
        this.lex_data_len = 0;
        this.fname2token = {};
        this.lineno = 1;
        this.yytext = "";
        this.error_handle = undefined;
        dict = this.prepareRules(dict);
        this.processGrammar(dict);
        this.input(input);
    }

    get_tokens() {

    }

    validate_rules() {

    }

    prepareMacros(macros) {
        let finished = false;
        while (!finished) {
            finished = true;
            for (let i in macros) {
                let old_macros = macros[i];
                for (let j in macros) {
                    if (i !== j) {
                        macros[i] = macros[i].split(`{${j}}`).join(`(${macros[j]})`);
                    }
                }
                if (macros[i] !== old_macros) {
                    finished = false;
                }
            }
        }
        return macros;
    }

    prepareRules(dict) {
        if (dict.macros) {
            dict.macros = this.prepareMacros(dict.macros);
        }
        for (let i = 0; i < dict.rules.length; ++i) {
            for (let j in dict.macros) {
                dict.rules[i].r = dict.rules[i].r.split(`{${j}}`).join(`(${dict.macros[j]})`);
            }
        }
        let rules_with_func = dict.rules.filter((rule) => rule.func !== undefined),
            rules_without_func = dict.rules.filter((rule) => rule.func === undefined);
        rules_without_func.sort((a, b) => {
            if (a.r && b.r)
                return b.r.length - a.r.length;
            return 1;
        })
        dict.rules = rules_with_func.concat(rules_without_func);
        return dict;
    }

    processGrammar(dict) {
        if (!dict.tokens) dict.tokens = [];
        if (typeof dict.tokens === 'string') {
            dict.tokens = dict.tokens.split(/ +/);
        }
        if (dict.hasOwnProperty("rules")) {
            let regex_list = [];
            for (let rule of dict.rules) {
                if (rule.name === "error") {
                    this.error_handle = rule.func;
                } /*else if (rule.name === "skip") {

                }*/ else if (rule.hasOwnProperty("r") && rule.hasOwnProperty("name")) {
                    regex_list.push(`(?<${rule.name}>${rule.r})`);
                    if (rule.name === "skip") {

                    } else if (rule.hasOwnProperty("func")) {
                        this.lex_regex_func[rule.name] = rule.func;
                    } else {
                        if (dict.tokens.includes(rule.r)) {
                            this.fname2token[rule.name] = rule.r;
                        } else if (dict.tokens.includes(rule.name)) {
                            this.fname2token[rule.name] = rule.name;
                        } else {
                            console.error(`token '${rule.r}' 未定义`);
                        }
                    }
                } else {
                    console.error("规则无效")
                }
            }
            let lex_re = new RegExp(regex_list.join('|'), 'y');

            this.lex_regex = lex_re;
        }
    }

    /**
     * @brief set new input, reset the lexer
     * @param data:String
     */
    input(data) {
        this.lex_data = data;
        this.lex_pos = 0;
        this.lex_data_len = data.length;
        this.yytext = "";
        this.lineno = 1;
        this.colno = 0;
    }

    next() {
        this.yytext = "";
        if (this.lex_pos >= this.lex_data_len) {
            this.done = true;
            // return false;
        }
        if (this.done) {
            this.EOF = true;
            return "EOF";
        }
        let match = this.lex_regex.exec(this.lex_data);
        if (match) {
            let token, func_name, value;
            this.lex_pos = this.lex_regex.lastIndex;
            let groups = match.groups;
            for (let key in groups) {
                if (groups[key] !== undefined) {
                    func_name = key;
                    this.yytext = groups[key];
                    break;
                }
            }
            if (this.lex_regex_func.hasOwnProperty(func_name)) {
                let func_res = this.lex_regex_func[func_name].call(this, {
                    yytext: this.yytext,
                    lexer: this
                });
                if (func_res !== undefined) {
                    return func_res;
                }
                return false;
            } else {
                if (func_name === "skip") return false;
                // return this.fname2token[func_name];
                return func_name;
            }
        } else {
            // No match, see if error_handle if defined
            if (this.error_handle) {
                let t = this.error_handle.call(this, {yytext: this.lex_data[this.lex_pos], lexer: this});
            } else {
                console.error(`Illegal character ${this.lex_data[this.lex_pos]} at index ${this.lex_pos}`);
                this.lex_pos++;
                this.lex_regex.lastIndex = this.lex_pos;
            }
        }
    }

    lex() {
        let r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    }
}


module.exports = Lexer;