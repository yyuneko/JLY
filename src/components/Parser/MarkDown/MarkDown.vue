<template>
  <div>
    <textarea v-model="input" style="display: inline-block;float: left;width: 50%;height: 70vh"></textarea>
    <div v-html="content" style="display: inline-block;float: right;width: 50%"></div>
  </div>
</template>
<script>
import {Parser} from "parser";
import Lexer from "lexer";

export default {
  name: "MarkDown",
  data() {
    return {
      input: "",
      content: "",
      lexer: {
        rules: [
          {name: "headline", r: /(#{1,6})(.*)/},
          {name: "code", r: /```([^`]+)```/},
          {
            name: "hr",
            r: /[*\-_]+/
          },
          {name: "ulist", r: /((\s*(\*|-) [^\n]+)\n)+/},
          {name: "olist", r: /((\s*(\d+(\.|\))) [^\n]+)\n)+/}, {
            name: "bolditalic",
            r: /(?:([*_~]{1,3}))([^*_~\n]+[^*_~\s])\1/g
          }, {name: "links", r: /!?\[([^\]<>]+)\]\(([^ )<>]+)( "[^()"]+")?\)/g}, {
            name: "reflinks",
            r: /\[([^\]]+)\]\[([^\]]+)\]/g
          }, {name: "smlinks", r: /@([a-z0-9]{3,})@(t|gh|fb|gp|adn)/gi}, {
            name: "mail",
            r: /<(([a-z0-9_\-.])+@([a-z0-9_\-.])+\.([a-z]{2,7}))>/gim
          }, {
            name: "tables",
            r: /\n(([^|\n]+ *\| *)+([^|\n]+\n))((:?-+:?\|)+(:?-+:?)*\n)((([^|\n]+ *\| *)+([^|\n]+)\n)+)/g
          }, {
            name: "include",
            r: /[[<]include (\S+) from (https?:\/\/[a-z0-9.-]+\.[a-z]{2,9}[a-z0-9.\-?&/]+)[\]>]/gi
          }, {name: "url", r: /<([a-zA-Z0-9@:%_+.~#?&/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_+.~#?&//=]*)?)>/g},
          // {name: "skip", r: /\s+/},
          {
            name: "newline", r: /\n+/
          },
          // {name: "common_text", r: /.+/}
          {
            name: "error", func: function (t) {
              t.lexer.yytext = t.yytext;
              return "common_text";
            }
          }
        ],
        tokens: ["newline", "common_text", "headline", "code", "hr", "ulist", "olist", "bolditalic", "links", "reflinks", "smlinks", "mail", "tables", "include", "url"],
      },
      parser: {
        startSymbol: "start",
        tokens: ["newline", "common_text", "headline", "code", "hr", "ulist", "olist", "bolditalic", "links", "reflinks", "smlinks", "mail", "tables", "include", "url"],
        bnf: {
          start: [
            {
              handle: ["start common_text", "common_text"],
              func: function (symbols) {
                // eslint-disable-next-line no-debugger
                // debugger;
                console.log(symbols)
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + symbols[symbols.length - 1].value;
              }
            },
            {
              handle: ["start newline", "newline"],
              func: function (symbols) {
                if (symbols.length === 2) symbols[0] = "";
                else
                  symbols[0] = symbols[1] + (symbols[2].value.length >= 2 ? "<br/>" : "")
              }
            },
            {
              handle: [" start headline", "headline"],
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + `<h${symbols[symbols.length - 1].value.match(/^#+/)[0].length}>${symbols[symbols.length - 1].value.replace(/^#+/, '')}</h${symbols[symbols.length - 1].value.match(/^#+/)[0].length}>`
              },
            }, {
              handle: ["start code", "code"],
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + `<pre><code>${symbols[symbols.length - 1].value.slice(3, -3)}</code></pre>`
              }
            }, {
              handle: ["start hr", "hr"],
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + "<hr/>"
              }
            },
            {
              handle: ["start ulist", "ulist"],
              func: function (symbols) {
                const re = /\s*(\*|-) ([^\n]+)/;
                const list = symbols[symbols.length - 1].value.split(/\n+/).filter(item => item).map(item => re.exec(item)[2]);
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + `<ul>${list.map(item => `<li>${item} </li>`).join('\n')}</ul>`;
              }
            }, {
              handle: ["start olist", "olist"],
              func: function (symbols) {
                const re = /\s*(\d+\.|\)) ([^\n]+)/;
                const list = symbols[symbols.length - 1].value.split(/\n+/).filter(item => item).map(item => re.exec(item)[2]);
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + `<ol>${list.map(item => `<li>${item} </li>`).join('\n')}</ol>`;
              }
            },
            {
              handle: ["start bolditalic", "bolditalic"],
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + `<b><i>${symbols[symbols.length - 1].value}</i></b>`;
              }
            },
            {
              handle: ["start links", "links"],
              func: function (symbols) {
                const match = /!?\[([^\]<>]+)\]\(([^ )<>]+)( "[^()"]+")?\)/g.exec(symbols[symbols.length - 1].value);
                const _href = match[2], _name = match[1];
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + `<a href=${_href}>${_name}</a>`;
              }
            },
            {
              handle: ["start reflinks", "reflinks"],
              // todo
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + "";
              }
            },
            {
              handle: ["start smlinks", "smlinks"],
              // todo
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + "";
              }
            },
            {
              handle: ["start mail", "mail"],
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + `<a href=${symbols[symbols.length - 1].value.slice(1, -1)}></a>`;
              }
            },
            {
              handle: ["start tables", "tables"],
              // todo
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + "";
              }
            },
            {
              handle: ["start include", "include"],
              // todo
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + "";
              }
            },
            {
              handle: ["start url", "url"],
              // todo
              func: function (symbols) {
                symbols[0] = (symbols.length === 3 ? symbols[1] : '') + "";
              }
            }
          ],
        },
      },
      tool: undefined
    };
  },
  created() {
    this.tool = new Parser(this.parser, {type: "slr", debug: true});
    this.tool.lexer = new Lexer(this.lexer);
    this.content = this.tool.parse(`# 标题一
## 标题二
### 标题三`);
  },
  watch: {
    input(newV, oldV) {
      if (newV !== oldV)
        this.content = this.tool.parse(newV)
    }
  }
};
</script>
