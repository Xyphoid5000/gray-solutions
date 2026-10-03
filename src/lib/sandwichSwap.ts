import { watch } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { sandwichize } from './sandwichWords';

/**
 * Sandwich-mode gag, site-wide: while sandwich mode is on, every visible
 * text node under #app gets website/websites/site/sites/business/
 * businesses swapped for sandwich/sandwiches. A MutationObserver keeps
 * late-rendered copy swapped too. Toggling sandwich mode off restores
 * every node's original text.
 *
 * Text nodes only — never attributes, URLs, emails, input/textarea
 * values, or code. Elements whose text must stay literal are skipped.
 */

/** Elements whose text we never touch. */
const SKIP = new Set(['INPUT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'NOSCRIPT']);

/** Original text of every swapped node, for restore on toggle-off. */
const originals = new WeakMap<Text, string>();
const swappedNodes = new Set<Text>();
let observer: MutationObserver | null = null;

function swapTextNode(node: Text) {
  const current = node.nodeValue ?? '';
  const swapped = sandwichize(current);
  if (swapped === current) return;
  if (!originals.has(node)) originals.set(node, current);
  swappedNodes.add(node);
  node.nodeValue = swapped;
}

function walk(root: Node) {
  const tree = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || SKIP.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n = tree.nextNode() as Text | null;
  while (n) {
    swapTextNode(n);
    n = tree.nextNode() as Text | null;
  }
}

function start() {
  const root = document.getElementById('app');
  if (!root) return;
  walk(root);
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') {
        swapTextNode(m.target as Text);
      } else {
        m.addedNodes.forEach((n) => walk(n));
      }
    }
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
}

function stop() {
  observer?.disconnect();
  observer = null;
  swappedNodes.forEach((node) => {
    const orig = originals.get(node);
    if (orig !== undefined && node.isConnected) node.nodeValue = orig;
  });
  swappedNodes.clear();
}

/** Wire the swap to the sandwich setting. Call once after pinia is installed. */
export function initSandwichSwap() {
  const settings = useSettingsStore();
  watch(
    () => settings.sandwich,
    (on) => (on ? start() : stop()),
    { immediate: true },
  );
}
