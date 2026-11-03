/**
 * The public map of the site under test.
 *
 * Everything here is a page a visitor can reach without signing in. Pages
 * that require an account are deliberately absent: see README, "What this
 * suite does not do".
 */

export interface PublicPage {
  /** Short name used in test titles. */
  name: string;
  /** Path relative to the base URL. */
  path: string;
  /** Text expected in the nav link that reaches this page. */
  navText?: string;
}

export const PUBLIC_PAGES: PublicPage[] = [
  { name: 'Home', path: '/', navText: 'Home' },
  { name: 'Courses', path: '/courses.php', navText: 'Courses' },
  { name: 'Play & Learn', path: '/games.php', navText: 'Play' },
  { name: 'AI Tutor', path: '/chat.php', navText: 'AI Tutor' },
  { name: 'Teachers', path: '/teachers.php', navText: 'Teachers' },
  { name: 'Pricing', path: '/pricing.php', navText: 'Pricing' },
  { name: 'Remote Jobs', path: '/job.php', navText: 'Jobs' },
  { name: 'About Us', path: '/about.php', navText: 'About' },
  { name: 'Contact Us', path: '/contact.php', navText: 'Contact' },
];

/** Account pages. Rendering is checked; nothing is ever submitted. */
export const ACCOUNT_PAGES: PublicPage[] = [
  { name: 'Login', path: '/login.php' },
  { name: 'Register', path: '/register.php' },
];

/**
 * The pages accessibility is scanned on. Kept to a representative set rather
 * than every page, so the suite stays quick and light on the live server.
 */
export const ACCESSIBILITY_TARGETS: PublicPage[] = [
  { name: 'Home', path: '/' },
  { name: 'Courses', path: '/courses.php' },
  { name: 'Pricing', path: '/pricing.php' },
  { name: 'Contact Us', path: '/contact.php' },
];

export const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;
