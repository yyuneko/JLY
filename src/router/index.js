import Vue from "vue";
import VueRouter from 'vue-router';
import Dot from "@/components/Re2FA/Dot";
Vue.use(VueRouter);
const routes = [
    {
        path: "/",
        component: Dot
    }
];
const router = new VueRouter({
    mode:'history',
    routes
});
export default router;
