import Vue from 'vue'
import App from './App.vue'
import router from "@/router";
import * as d3 from "d3";

Vue.prototype.$d3 = d3;

Vue.config.productionTip = false
new Vue({
    router,
    render: h => h(App),
}).$mount('#app')
