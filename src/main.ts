import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { vReveal } from './directives/reveal';
import { initSandwichSwap } from './lib/sandwichSwap';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.directive('reveal', vReveal);
app.mount('#app');
initSandwichSwap();
