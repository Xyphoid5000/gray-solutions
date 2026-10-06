/** Project case data. Rendered by ProjectShowcase — used in the book's
    proof exhibits (inside ProjectModal) and on the /projects page.
    Pro Bros slots in here when it's ready. */

export interface Project {
  slug: string;
  name: string;
  kicker: string;
  url: string;
  image: string;
  imageAlt: string;
  /** What the business is and what the site does for it. */
  description: string;
  tech: string[];
  /** How the story was written — the creative call behind the site. */
  story: string;
}

export const PROJECTS: Project[] = [
  {
    slug: 'burning-river',
    name: 'Burning River Auto Glass',
    kicker: 'Client work',
    url: 'https://burningriverautoglass.com/',
    image: '/projects/burning-river.jpg',
    imageAlt: 'Burning River Auto Glass website on a laptop screen',
    description:
      'A local auto glass company stuck on a generic Squarespace template. I rebuilt it as a cinematic custom site — the same business, an entirely different first impression.',
    tech: ['Vue 3', 'Vite', 'GSAP', 'Design'],
    story:
      'A cracked windshield is a bad day, so the site treats it like the start of an adventure instead of an errand. Scroll-driven storytelling carries the visitor from the damage to the fix — a cracked windshield feels like the opening scene, not a chore.',
  },
  {
    slug: 'gray-solutions',
    name: 'Gray Solutions — this very website',
    kicker: 'The portfolio itself',
    url: 'https://graywebsolutions.com/',
    image: '/projects/gray-solutions.jpg',
    imageAlt: 'Gray Solutions portfolio website on a laptop screen',
    description:
      'The portfolio is the pitch. You open a manuscript, bind it into a book, and shelve it — cover, chapters, page turns and all. No templates, no themes.',
    tech: ['Vue 3', 'TypeScript', 'Vite', 'GSAP', 'Three.js'],
    story:
      'Every web designer says "I tell stories." This site makes you live inside one before you have read a word. The manuscript you are holding is the argument: if a portfolio can keep you turning pages, imagine what it can do for a business. The medium is the pitch.',
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
