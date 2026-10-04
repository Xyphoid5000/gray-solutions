import { ref } from 'vue';

/**
 * Whether the visitor's contact message has been sent this visit.
 * Session-scoped: set once the form submits successfully, read by the
 * cover (to retire the contact section) and by every "contact me" road
 * (to reroute to the socials once the form is gone). Resets on refresh,
 * like everything else on the desk.
 */
export const contactSubmitted = ref(false);

/**
 * Where a "contact me" road should land: the contact form while it's
 * still on the page, the socials once it's been submitted and retired.
 * Returns the element id to scroll to.
 */
export function contactTarget(): string {
  return contactSubmitted.value ? 'socials' : 'contact';
}
