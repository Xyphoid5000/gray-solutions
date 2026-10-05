<script setup lang="ts">
import { ref } from 'vue';
import BookSandwich from './BookSandwich.vue';

const emit = defineEmits<{ done: [] }>();

const bitten = ref(false);
const chomping = ref(false);

/** We take a bite. That's the binding. */
function takeBite() {
  if (bitten.value || chomping.value) return;
  chomping.value = true;
  window.setTimeout(() => {
    bitten.value = true;
    chomping.value = false;
  }, 450);
  window.setTimeout(() => emit('done'), 1700);
}
</script>

<template>
  <div class="bite-overlay" role="dialog" aria-label="Sandwich binding">
    <div class="bite-stage" :class="{ chomping }">
      <BookSandwich :bitten="bitten" />
    </div>
    <button
      v-if="!bitten"
      type="button"
      class="bite-button"
      @click="takeBite"
    >
      Take a bite
    </button>
    <p v-else class="bite-bound">Delicious</p>
  </div>
</template>

<style scoped>
.bite-overlay {
  --swb-backdrop: #0b0705;
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #0b0705;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 24px;
}
.bite-stage.chomping {
  animation: bite-chomp 0.45s ease;
}
@keyframes bite-chomp {
  0% { transform: scale(1, 1); }
  35% { transform: scale(1.12, 0.82) rotate(-2deg); }
  70% { transform: scale(0.94, 1.06) rotate(1.5deg); }
  100% { transform: scale(1, 1); }
}
.bite-button {
  font: inherit;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 14px 34px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  color: #14100a;
  background: linear-gradient(180deg, #f2b355, #d08a4e);
  box-shadow: 0 6px 24px rgba(208, 138, 78, 0.35);
}
.bite-button:active {
  transform: scale(0.96);
}
.bite-bound {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f2ecdf;
  margin: 0;
  min-height: 1.6em;
}
</style>
