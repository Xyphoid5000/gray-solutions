import { defineStore } from 'pinia';
import { ref } from 'vue';

/** Graydio — the desk phone's music player. Streams royalty-free MP3s
    through a plain HTML audio element. The audio lives here (not in the
    phone component) so music keeps playing while the phone is closed or
    the route changes. */

export interface GraydioTrack {
  title: string;
  artist: string;
  url: string; // direct MP3 URL
}

// Royalty-free tunes (Kevin MacLeod, CC-BY). Swap URLs to change the lineup.
const TRACKS: GraydioTrack[] = [
  { title: 'Mesmerizing Galaxy', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Mesmerizing%20Galaxy%20Loop.mp3' },
  { title: 'Galactic Rap', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Galactic%20Rap.mp3' },
  { title: 'Equatorial Complex', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Equatorial%20Complex.mp3' },
  { title: 'Cloud Dancer', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cloud%20Dancer.mp3' },
  { title: 'Brain Dance', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Brain%20Dance.mp3' },
  { title: 'Ouroboros', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Ouroboros.mp3' },
  { title: 'Crypto', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crypto.mp3' },
  { title: 'At Launch', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/At%20Launch.mp3' },
  { title: 'Rocket', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Rocket.mp3' },
  { title: 'Lightless Dawn', artist: 'Kevin MacLeod', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lightless%20Dawn.mp3' },
];

export const useMusicStore = defineStore('music', () => {
  const tracks = ref<GraydioTrack[]>(TRACKS);
  const currentIndex = ref(0);
  const isPlaying = ref(false);
  const volume = ref(0.8);

  let audio: HTMLAudioElement | null = null;

  /** Create the audio element once, lazily on first play. */
  function ensureAudio(): HTMLAudioElement {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume.value;
    audio.addEventListener('ended', () => next());
    audio.addEventListener('play', () => { isPlaying.value = true; });
    audio.addEventListener('pause', () => { isPlaying.value = false; });
    audio.src = tracks.value[currentIndex.value].url;
    return audio;
  }

  function setVolume(v: number) {
    volume.value = Math.max(0, Math.min(1, v));
    if (audio) audio.volume = volume.value;
  }

  async function playIndex(i: number) {
    const a = ensureAudio();
    currentIndex.value = (i + tracks.value.length) % tracks.value.length;
    if (a.src !== tracks.value[currentIndex.value].url) {
      a.src = tracks.value[currentIndex.value].url;
    }
    await a.play();
  }

  async function play() {
    await ensureAudio().play();
  }

  function pause() {
    audio?.pause();
  }

  async function toggle() {
    if (isPlaying.value) pause();
    else await play();
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
    volume,
    setVolume,
    play,
    pause,
    toggle,
    next,
    prev,
    playIndex,
  };
});
