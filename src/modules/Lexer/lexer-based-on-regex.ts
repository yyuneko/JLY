import { macros, dict } from "./types";

class Lexer {
  done: boolean;
  lex_data?: string;
  lex_regex?: RegExp;
  lex_pos: number;
  lex_data_len: number;
  fname2token: {};
  lineno: number;
  colno: number;
  yytext: string;
  regex_list?: { name: string; r: string }[];
  lex_regex_func: {
    [name: string]: (t: { yytext: string; lexer: Lexer }) => string | void;
  };
  error_handle?: (t: { yytext: string; lexer: Lexer }) => string | void;
  constructor(dict: dict, input?: string) {
    this.done = false;
    this.lex_regex_func = {};
    this.lex_pos = 0;
    this.lex_data_len = 0;
    this.fname2token = {};
    this.lineno = 1;
    this.colno = 1;
    this.yytext = "";
    dict.rules = this.prepareRules(dict);
    this.processGrammar(dict);
    this.input(input);
  }

  /**
   * @brief expand all macros
   * @param macros
   * @returns macros
   */
  prepareMacros(macros?: macros) {
    if (typeof macros === "undefined") {
      return {};
    }
    let finished = false;
    while (!finished) {
      finished = true;
      Object.keys(macros).forEach((macroName) => {
        let old_macro = macros[macroName];
        Object.keys(macros).forEach((_macroName) => {
          if (macroName !== _macroName) {
            macros[macroName] = macros[macroName]
              .split(`{${_macroName}}`)
              .join(`(${macros[_macroName]})`);
          }
        });
        if (macros[macroName] !== old_macro) {
          finished = false;
        }
      });
    }
    return macros;
  }

  /**
   * @brief replace macros in rules with macros which are expanded
   * @param  dict
   * @returns rules
   */
  prepareRules(dict: dict) {
    dict.macros = this.prepareMacros(dict.macros);
    for (let i = 0; i < dict.rules.length; ++i) {
      if (typeof dict.rules[i].r !== "string") {
        dict.rules[i].r = dict.rules[i].r.source;
        continue;
      }
      Object.keys(dict.macros).forEach((macroName: string) => {
        dict.rules[i].r = (dict.rules[i].r as string)
          .split(`{${macroName}}`)
          .join(`(${dict.macros[macroName]})`);
      });
    }
    return dict.rules;
  }

  /**
   *
   * @param  dict
   * @returns dict
   */
  processGrammar(dict: dict) {
    if (!dict.tokens) dict.tokens = [];
    if (typeof dict.tokens === "string") {
      dict.tokens = dict.tokens.split(/\s+/);
    }

    if (dict.rules) {
      this.regex_list = [];
      for (let rule of dict.rules) {
        if (rule.name === "error") {
          this.error_handle = rule.func;
        } else if (rule.r && rule.name) {
          this.regex_list.push({
            name: rule.name,
            r: `(?<${rule.name}>${rule.r})`,
          });
          if (rule.name === "skip") {
            continue;
          } else if (rule.func) {
            if (this.lex_regex_func[rule.name]) {
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
      this.lex_regex = new RegExp(
        this.regex_list.map((item) => item.r).join("|"),
        "y"
      );
    }
  }

  /**
   * @brief set new input, reset the lexer
   * @param data:String
   */
  input(data?: string) {
    if (!data) return;
    this.lex_data = data;
    this.lex_pos = 0;
    this.lex_data_len = data.length;
    this.yytext = "";
    this.lineno = 1;
    this.colno = 1;
    this.done = false;
    if (this.lex_regex) this.lex_regex.lastIndex = 0;
  }

  next() {
    if (!this.lex_regex || !this.regex_list?.length || !this.lex_data) return;
    this.yytext = "";
    if (this.lex_pos >= this.lex_data_len) {
      this.done = true;
    }
    if (this.done) {
      return "EOF";
    }
    let match = this.lex_regex.exec(this.lex_data ?? "");
    if (match) {
      let func_name;
      let groups = match.groups;

      while (groups) {
        let index = -1;
        for (let key in groups) {
          if (
            groups[key] !== undefined &&
            groups[key].length > this.yytext.length
          ) {
            func_name = key;
            this.yytext = groups[key];
            index = this.regex_list.map((item) => item.name).indexOf(key);
            this.lex_regex.lastIndex = this.lex_pos + this.yytext.length;
            break;
          }
        }
        if (index === -1) break;
        groups = (() => {
          let re = new RegExp(
            this.regex_list
              .slice(index + 1)
              .map((item) => item.r)
              .join("|"),
            "y"
          );
          re.lastIndex = this.lex_pos;
          return re;
        })().exec(this.lex_data ?? "")?.groups;
      }
      this.lex_pos = this.lex_regex.lastIndex;

      if (this.lex_regex_func[func_name]) {
        let func_res = this.lex_regex_func[func_name].call(this, {
          yytext: this.yytext,
          lexer: this,
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
        const res = this.error_handle({
          yytext: this.lex_data[this.lex_pos],
          lexer: this,
        });
        this.lex_pos++;
        this.lex_regex.lastIndex = this.lex_pos;
        return res;
      } else {
        console.error(
          `Illegal character '${this.lex_data[this.lex_pos]}' at index ${
            this.lex_pos
          }`
        );
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
