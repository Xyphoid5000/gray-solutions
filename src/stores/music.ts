import { defineStore } from 'pinia';
import { ref } from 'vue';

/** Graydio — the desk phone's music player. Streams Chris's SoundCloud
    tracks through the SoundCloud widget API; the audio element lives
    here (not in the phone component) so music keeps playing while the
    phone is closed or the route changes. */

export interface GraydioTrack {
  title: string;
  url: string; // SoundCloud track page URL
}

// A handful of Chris's tracks on loop. Swap/add URLs to change the lineup.
const TRACKS: GraydioTrack[] = [
  { title: 'Neptune', url: 'https://soundcloud.com/xyphoid/hope' },
  { title: 'Pluto', url: 'https://soundcloud.com/xyphoid/pluto' },
  { title: 'D V N C E', url: 'https://soundcloud.com/xyphoid/dvnce' },
  { title: "Don't Eat Ladies Off The Sidewalk", url: 'https://soundcloud.com/chris-bubba-gray/dont-eat-ladies-off-the-sidewalk' },
  { title: 'New Age', url: 'https://soundcloud.com/chris-bubba-gray/new-age' },
];

declare global {
  interface Window {
    SC?: {
      Widget: (el: HTMLIFrameElement) => ScWidget;
    };
  }
}

interface ScWidget {
  load: (url: string, opts?: Record<string, unknown>) => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  bind: (event: string, cb: () => void) => void;
  getCurrentSound: (cb: (sound: { title: string }) => void) => void;
  isPaused: (cb: (paused: boolean) => void) => void;
}

const WIDGET_JS = 'https://w.soundcloud.com/player/api.js';
let widgetPromise: Promise<void> | null = null;

function loadWidgetApi(): Promise<void> {
  if (window.SC?.Widget) return Promise.resolve();
  if (widgetPromise) return widgetPromise;
  widgetPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = WIDGET_JS;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('SoundCloud widget failed to load'));
    document.head.appendChild(s);
  });
  return widgetPromise;
}

export const useMusicStore = defineStore('music', () => {
  const tracks = ref<GraydioTrack[]>(TRACKS);
  const currentIndex = ref(0);
  const isPlaying = ref(false);
  const ready = ref(false);

  let widget: ScWidget | null = null;
  let iframe: HTMLIFrameElement | null = null;

  /** Create the hidden widget iframe. Called once, lazily on first play. */
  async function ensureWidget(): Promise<ScWidget> {
    if (widget) return widget;
    await loadWidgetApi();
    iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src =
      'https://w.soundcloud.com/player/?url=' +
      encodeURIComponent(tracks.value[0].url) +
      '&auto_play=false&hide_related=true&show_comments=false&show_user=false';
    document.body.appendChild(iframe);
    widget = window.SC!.Widget(iframe);
    // The widget ignores commands until it fires 'ready' — wait for it.
    await new Promise<void>((resolve) => widget!.bind('ready', () => resolve()));
    widget.bind('finish', () => next());
    widget.bind('play', () => { isPlaying.value = true; });
    widget.bind('pause', () => { isPlaying.value = false; });
    ready.value = true;
    return widget;
  }

  async function playIndex(i: number) {
    const w = await ensureWidget();
    currentIndex.value = (i + tracks.value.length) % tracks.value.length;
    w.load(tracks.value[currentIndex.value].url, { auto_play: true });
    // isPlaying flips via the widget's 'play' event — not optimistically.
  }

  async function play() {
    const w = await ensureWidget();
    w.play();
  }

  async function pause() {
    if (!widget) return;
    widget.pause();
    isPlaying.value = false;
  }

  async function toggle() {
    if (isPlaying.value) await pause();
    else {
      // First play: load the current track explicitly so something plays.
      if (!widget) await playIndex(currentIndex.value);
      else await play();
    }
  }

  async function next() {
    await playIndex(currentIndex.value + 1);
  }

  async function prev() {
    await playIndex(currentIndex.value - 1);
  }

  const currentTrack = () => tracks.value[currentIndex.value];

  return {
    tracks,
    currentIndex,
    currentTrack,
    isPlaying,
    ready,
    play,
    pause,
    toggle,
    next,
    prev,
    playIndex,
  };
});
