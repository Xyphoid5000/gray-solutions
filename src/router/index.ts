import { defineComponent } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import ContactPage from '../views/ContactPage.vue';
import AboutPage from '../views/AboutPage.vue';
import ProjectsPage from '../views/ProjectsPage.vue';
import PremisePage from '../views/PremisePage.vue';
import CraftPage from '../views/CraftPage.vue';
import ArcPage from '../views/ArcPage.vue';
import PricingPage from '../views/PricingPage.vue';

/** Home (/) is rendered directly by App.vue — the manuscript experience
    owns the root. This placeholder satisfies the route record; it never
    mounts because App renders the home view itself when the path is '/'. */
const HomePlaceholder = defineComponent({
  name: 'HomePlaceholder',
  template: '<div></div>',
});

const router = createRouter({
  // Clean URLs — no hash. The Worker serves index.html for these paths
  // (see wrangler.jsonc `not_found_handling`), so direct loads work.
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePlaceholder },
    { path: '/contact', name: 'contact', component: ContactPage },
    { path: '/about', name: 'about', component: AboutPage },
    { path: '/projects', name: 'projects', component: ProjectsPage },
    // The book's chapters as regular pages — for readers who skip the book.
    { path: '/premise', name: 'premise', component: PremisePage },
    { path: '/craft', name: 'craft', component: CraftPage },
    { path: '/arc', name: 'arc', component: ArcPage },
    { path: '/pricing', name: 'pricing', component: PricingPage },
    // Unknown paths fall back to the manuscript, not a dead end.
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to) {
    // The socials live on the About page — contact roads can land there.
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },
});

export default router;
