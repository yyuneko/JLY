import Vue from "vue";
import VueRouter from 'vue-router';
import Dot from "@/components/Re2FA/Dot";
import Lexer from "@/components/Lexer/Lexer";
import MarkDown from "@/components/Parser/MarkDown/MarkDown";
Vue.use(VueRouter);
const routes = [
    {
        path: "/",
        component: Dot
    }, {
        path: "/re2fa",
        component: Dot
    }, {
        path: "/lexer",
        component: Lexer
    }, {
        path: "/markdown",
        component: MarkDown
    }
];
const router = new VueRouter({
    mode: 'history',
    routes
});
export default router;
