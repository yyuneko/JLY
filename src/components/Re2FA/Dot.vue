<template>
  <div>
    <!--    <input type="text" v-model="regex"/>-->
    <div class="alert alert-primary mb-3" role="alert">
      Only support "|", "?", "*", "+" and concatenation.
    </div>
    <div class="input-group mb-3">
      <input type="text" class="form-control" placeholder="A regular expression" v-model="regex">
      <div class="input-group-append">
        <button class="btn btn-outline-secondary" type="button"
                @click="nfa()">nfa
        </button>
        <button class="btn btn-outline-secondary" type="button"
                @click="dfa()">dfa
        </button>
        <button class="btn btn-outline-secondary" type="button"
                @click="dfa(true)">dfa minimize
        </button>
        <button class="btn btn-outline-secondary" type="button"
                @click="save_as_picture">save as picture
        </button>
      </div>
    </div>
    <div class="alert alert-warning mb-3" role="alert" v-show="alert">
      Regular expression is null!
    </div>
    <div id="graph"></div>
    <!--    <div>
          <button @click="nfa()">nfa</button>
          <button @click="dfa()">dfa</button>
          <button @click="dfa(true)">dfa最小化</button>
          <button @click="save_as_picture">保存为图片</button>
        </div>-->
    <!--    <div id="tokens">
          <textarea id="stream" v-model="stream"></textarea>
          总计{{ tokens.length }}个token
          <table>
            <thead>
            <td>Line</td>
            <td>Type</td>
            <td>Value</td>
            </thead>
            <tr v-for="(token,i) in tokens" :key="i">
              <td>{{ token.line }}</td>
              <td>{{ token.type }}</td>
              <td>{{ token.value }}</td>
            </tr>
          </table>
        </div>
        <button @click="nextToken()">next</button>-->
  </div>
</template>
<script>
import {graphviz} from "d3-graphviz";
// eslint-disable-next-line no-unused-vars
import {play} from "../node";
import {
  NFA
} from "@/modules/Re2FA/nfa";
// import html2canvas from 'html2canvas'
import saveSvgAsPng from "save-svg-as-png";
import {Lexer} from "./sensitive_word_detection/main";
// import Index from "../../../public/index.html";

export default {
  name: "Dot",
  data() {
    return {
      regex: "(a|b|c)**",
      animate: null,
      canvas: null,
      fa: null,
      width: 0,
      height: 0,
      lexer: Lexer,
      tokens: [],
      stream: "",
      alert: false
    };
  },
  created() {
    window.onload = () => {
      this.canvas = document.getElementById("graph");
      this.width = this.canvas.clientWidth;
      this.height = this.canvas.clientHeight;
      window.onresize = () => {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
      };

      // this.fa = NFA.parse_regex_to_nfa(this.regex);
      this.lexer.run(this.stream);
      this.fa = this.lexer.fa.FA;
      // eslint-disable-next-line no-constant-condition
      /*while (true) {
        if (this.nextToken()) break;
      }*/
      if (this.fa) {
        this.d3();
      }
    };
  },
  watch: {
    width: function (newV, oldV) {
      if (oldV !== newV) {
        this.d3();
      }
    },
    height: function (newV, oldV) {
      if (oldV !== newV) {
        this.d3();
      }
    },
    stream: function (newV, oldV) {
      if (oldV !== newV) {
        this.lexer.run(this.stream);
        this.fa = this.lexer.fa.FA;
        this.d3();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (this.nextToken()) break;
        }
        let t = "";
        this.tokens.forEach(TOKEN => {
          t += `Line${TOKEN.line}: <${TOKEN.type}> ${TOKEN.value}\n`;
        })
        console.log(t);
      }
    }
  },
  methods: {
    nextToken() {
      let TOKEN;
      while ((TOKEN = this.lexer.reader.next()) === false) ;
      if (TOKEN) {
        if (TOKEN.done === true) return true;
        else {
          this.tokens.push(TOKEN);
          return false;
        }
        // console.log(TOKEN)
      }
      return false;
      // console.log(TOKEN);
    },
    save_as_picture() {
      saveSvgAsPng
          .svgAsPngUri(document.querySelector("#graph>svg"))
          .then((URI) => {
            // console.log("URI",URI)
            let a = document.createElement("a");
            a.setAttribute("href", URI);
            a.setAttribute("download", "dot.png");
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
    },
    nfa() {
      if (this.regex) {
        this.fa = NFA.parse_regex_to_nfa(this.regex);
        this.d3();
      } else if (!this.fa) {
        this.alert = true;
        setTimeout(() => {
          this.alert = false;
        }, 3000)
      }
    },
    dfa(minimize = false) {
      if (this.regex) {
        this.fa = NFA.parse_regex_to_nfa(this.regex)
        if (this.fa) this.fa = this.fa.to_dfa(minimize, false);
      } else if (!this.fa) {
        this.alert = true;
        setTimeout(() => {
          this.alert = false;
        }, 3000)
      }
      this.d3();
    },
    d3() {
      // console.log('graph', this.fa.to_dot());
      if (this.fa)
        graphviz("#graph")
            .width(this.width)
            .height(this.height)
            .options({fit: true})
            .renderDot(this.fa.to_dot());
      else graphviz("#graph")
          .width(this.width)
          .height(this.height)
          .options({fit: true})
          .renderDot("digraph graphviz{}");
    },
    next() {
      let p = this.animate.next();
      p.value.then((res) => {
        this.d3(res);
      });
    },
    e() {
      this.animate = play();
    },
  },
};
</script>
<style scoped lang="scss">
#graph {
  color: inherit;
  background: inherit;
  width: 80%;
  margin: 0 auto;
  border: 1px solid #ced4da;
  min-height: 70vh;
}

.input-group {
  width: 80%;
  margin: 0 auto;

  > .input-group-append > .btn {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  > .input-group-append:last-child > .btn:not(:last-child):not(.dropdown-toggle) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
  }
}

.alert {
  width: fit-content;
  margin: 0 auto;
}
.alert-primary{
  width: 80%;
  margin: 0 auto;
  border-left-color: #084298;
  border-left-width: 0.25rem;
}
#tokens {
  width: 100%;

  textarea {
    width: 80%;
    height: 200px;
  }

  table {
    margin: 0 auto;
  }
}

:root {
  --color-content: "";
}

/* Light mode */
@media (prefers-color-scheme: light) {
  :root {
    --color-content: light;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-content: dark;
  }
}
</style>
