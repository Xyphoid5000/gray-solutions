<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { chapterMeta, neighbor } from '../router';

const route = useRoute();
const router = useRouter();

const meta = computed(() => chapterMeta(route.path));
const prev = computed(() => neighbor(route.path, -1));
const next = computed(() => neighbor(route.path, 1));

function go(path: string) {
  router.push(path);
}
</script>

<template>
  <nav
    v-if="route.path !== '/'"
    class="page-turner"
    aria-label="Turn the page"
  >
    <button :disabled="!prev" @click="prev && go(prev.path)">
      <span aria-hidden="true">&larr;</span>
      <span class="turner-word">Prev</span>
    </button>
    <span class="turner-label">{{ meta.short }}</span>
    <button :disabled="!next" @click="next && go(next.path)">
      <span class="turner-word">Next</span>
      <span aria-hidden="true">&rarr;</span>
    </button>
  </nav>
</template>
