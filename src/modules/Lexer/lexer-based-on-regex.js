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
        dict.rules = this.prepareRules(dict);
        this.processGrammar(dict);
        this.input(input);
    }
    /**
     * @brief expand all macros
     * @param macros 
     * @returns macros
     */
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
    /**
     * @brief replace macros in rules with macros which are expanded
     * @param  dict 
     * @returns rules
     */
    prepareRules(dict) {
        if (dict.macros) {
            dict.macros = this.prepareMacros(dict.macros);
        }
        for (let i = 0; i < dict.rules.length; ++i) {
            if (dict.rules[i].r instanceof RegExp) {
                dict.rules[i].r = dict.rules[i].r.source;
                continue;
            }
            for (let j in dict.macros) {
                dict.rules[i].r = dict.rules[i].r.split(`{${j}}`).join(`(${dict.macros[j]})`);
            }
        }
        return dict.rules;
    }
    /**
     * 
     * @param  dict 
     * @returns dict
     */
    processGrammar(dict) {
        if (!dict.tokens) dict.tokens = [];
        if (typeof dict.tokens === 'string') {
            dict.tokens = dict.tokens.split(/\s+/);
        }
        if (dict.hasOwnProperty("rules")) {
            this.regex_list = [];
            for (let rule of dict.rules) {
                if (rule.name === "error") {
                    this.error_handle = rule.func;
                } else if (rule.hasOwnProperty("r") && rule.hasOwnProperty("name")) {
                    this.regex_list.push({ name: rule.name, r: `(?<${rule.name}>${rule.r})` });
                    if (rule.name === "skip") {
                        continue;
                    } else if (rule.hasOwnProperty("func")) {
                        if (this.lex_regex_func.hasOwnProperty(rule.name)) {
                            throw Error(`Duplicate name is not allowed: ${rule.name}`);
                        }
                        this.lex_regex_func[rule.name] = rule.func;
                    } else {
                        if (dict.tokens.includes(rule.r)) {
                            this.fname2token[rule.name] = rule.r;
                        } else if (dict.tokens.includes(rule.name)) {
                            this.fname2token[rule.name] = rule.name;
                        } else {
                            console.error(`token '${rule.r}' undefined`);
                        }
                    }
                } else {
                    throw Error("Illegal rule!");
                }
            }
            this.lex_regex = new RegExp(this.regex_list.map(item => item.r).join('|'), 'y');
        }
    }

    /**
     * @brief set new input, reset the lexer
     * @param data:String
     */
    input(data) {
        if (data === null || typeof data === "undefined") return;
        this.lex_data = data;
        this.lex_pos = 0;
        this.lex_data_len = data.length;
        this.yytext = "";
        this.lineno = 1;
        this.colno = 0;
        this.done = false;
        this.EOF = false;
        this.lex_regex.lastIndex = 0;
    }

    next() {
        this.yytext = "";
        if (this.lex_pos >= this.lex_data_len) {
            this.done = true;
        }
        if (this.done) {
            this.EOF = true;
            return "EOF";
        }
        let match = this.lex_regex.exec(this.lex_data);
        if (match) {
            let token, func_name, value;
            let groups = match.groups;

            while (groups) {
                let index = -1;
                for (let key in groups) {
                    if (groups[key] !== undefined && groups[key].length > this.yytext.length) {
                        func_name = key;
                        this.yytext = groups[key];
                        index = this.regex_list.map(item => item.name).indexOf(key);
                        this.lex_regex.lastIndex = this.lex_pos + this.yytext.length;
                        break;
                    }
                }
                if (index === -1) break;
                groups = (() => {
                    let re = new RegExp(this.regex_list.slice(index + 1).map(item => item.r).join('|'), 'y');
                    re.lastIndex = this.lex_pos;
                    return re;
                })().exec(this.lex_data)?.groups;
            }
            this.lex_pos = this.lex_regex.lastIndex;

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
                let t = this.error_handle.call(this, { yytext: this.lex_data[this.lex_pos], lexer: this });
            } else {
                console.error(`Illegal character '${this.lex_data[this.lex_pos]}' at index ${this.lex_pos}`);
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


export default Lexer;
