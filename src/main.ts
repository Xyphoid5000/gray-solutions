import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { vReveal } from './directives/reveal';
import { initSandwichSwap } from './lib/sandwichSwap';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.directive('reveal', vReveal);
app.mount('#app');
initSandwichSwap();
