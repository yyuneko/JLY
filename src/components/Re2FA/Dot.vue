<template>
  <div>
    <input type="text" v-model="regex"/>
    <div id="graph"></div>
    <div >
      <button @click="nfa()">nfa</button>
      <button @click="dfa()">dfa</button>
      <button @click="dfa(true)">dfa最小化</button>
      <button @click="save_as_picture">保存为图片</button>
    </div>
    <div id="tokens">
      <textarea id="stream" v-model="stream"></textarea>
      <table>
        <thead>
        <td>Line</td>
        <td>Type</td>
        <td>Value</td>
        </thead>
        <tr v-for="(token,i) in tokens" :key="i">
          <td>{{token.line}}</td>
          <td>{{token.type}}</td>
          <td>{{token.value}}</td>
        </tr>
      </table>
    </div>
    <button @click="nextToken()">next</button>
  </div>
</template>
<script>
import {graphviz} from "d3-graphviz";
// eslint-disable-next-line no-unused-vars
import {play} from "../node";
import {
  NFA
} from "@/components/Re2FA/nfa";
// import html2canvas from 'html2canvas'
import saveSvgAsPng from "save-svg-as-png";
import {Lexer} from "./examples_custom_language/language_define";

export default {
  name: "Dot",
  data() {
    return {
      regex: "",
      animate: null,
      canvas: null,
      fa: null,
      width: 0,
      height: 0,
      lexer: Lexer,
      tokens: [],
      stream: `int? x; int _a[3][5][6], i,j,k;  float s; x:=0.75;
 _a[i][j][k]-= 19.52 *0x291 / _A[I][K][j]       //Line 2
   //空一行
 while(i>=95) { i--; abcd$ade}  //分号后的内容有错，至少需要报错：Line 4, ERROR
 for(j in 015..0x15) {   //报错后，下一行要继续
\tiF(k!=i<<4 && s<1.0345 || k >=3975){
         \t\ts:= 36.8-21.5*32.4+s^39;        \t
\t}else{
\t\tk=123456789123456789; //整数越界,最大2^31-1，
       \t\ts/=x+x-x*x+x;;
\t}
}`,
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
      // console.log(this.fa.to_dot())
      for(let i=0;i<130;++i)
        this.nextToken();
      // if (this.fa) {
      //   this.d3();
      // }
    };
  },
  watch: {
    width: function (newV, oldV) {
      if (oldV !== newV) {
        this.d3(this.fa.to_dot());
      }
    },
    height: function (newV, oldV) {
      if (oldV !== newV) {
        this.d3(this.fa.to_dot());
      }
    },
  },
  methods: {
    nextToken() {
      let TOKEN;
      while ((TOKEN = this.lexer.reader.next()) === false) ;
      if (TOKEN) {
        this.tokens.push(TOKEN);
        console.log(TOKEN)
      }
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
      this.fa = NFA.parse_regex_to_nfa(this.regex);
      if (this.fa) this.d3();
    },
    dfa(minimize = false) {
      if (minimize) console.log("dfa最小化");
      if (this.fa && this.regex.length === 0) {
        this.fa = this.fa.to_dfa(minimize);
      } else {
        this.fa = NFA.parse_regex_to_nfa(this.regex).to_dfa(minimize);
      }
      this.d3();
    },
    d3() {
      // console.log('graph', this.fa.to_dot());
      graphviz("#graph")
          .width(this.width)
          .height(this.height)
          .options({fit: true})
          .renderDot(this.fa.to_dot());
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
  border: black solid 1px;
  min-height: 70vh;
}
#tokens{
  width: 100%;
  textarea{
    width: 80%;
    height: 200px;
  }
  table{
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
