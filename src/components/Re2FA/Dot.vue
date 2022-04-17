<template>
  <div>
    <input type="text" v-model="regex">
    <div id="graph"></div>
    <button @click="nfa">nfa</button>
    <button @click="dfa">dfa</button>
  </div>

</template>
<script>
import {graphviz} from 'd3-graphviz';
// eslint-disable-next-line no-unused-vars
import {play} from '../node'
import {NFA} from "@/components/Re2FA/nfa";

export default {
  name: 'Dot',
  data() {
    return {
      regex: "",
      animate: null,
      canvas: null,
      fa: null,
      width: 0,
      height: 0
    }
  },
  created() {
    window.onload = () => {
      this.canvas = document.getElementById('graph');
      this.width = this.canvas.clientWidth;
      this.height = this.canvas.clientHeight;
      window.onresize = () => {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
      }
      // this.regex="n(i|ϵ)h(ao|ϵ)|((你|亻尔)(好|女子))";
      this.regex = "ba*ba";
      // this.regex="ni";
      this.fa = NFA.parse_regex_to_nfa(this.regex);
      if (this.fa) {
        this.d3();
      }
    }
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
    }
  },
  methods: {
    nfa() {
      this.fa = NFA.parse_regex_to_nfa(this.regex);
      if (this.fa) this.d3();
    },
    dfa() {
      this.fa = NFA.parse_regex_to_nfa(this.regex).to_dfa();
      this.d3();
    },
    d3() {
      // console.log('graph', this.fa.to_dot());
      graphviz('#graph').width(this.width).height(this.height).options({fit: true}).renderDot(this.fa.to_dot());
    },
    next() {
      let p = this.animate.next();
      p.value.then(res => {
        this.d3(res)
      })
    },
    e() {
      this.animate = play()
    }
  }
}
</script>
<style scoped lang="scss">
#graph {
  color: inherit;
  background:inherit;
  width: 80%;
  margin: 0 auto;
  border: black solid 1px;
  min-height: 50vh;
}
:root {
  --color-content: '';
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
