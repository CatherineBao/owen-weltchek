/**
 * The standing facts about whose site this is: who he is, and how to reach him
 * when the database has nothing to say. They are not content the editor owns —
 * the hero prints them under the dial, the world clock hangs its marks off
 * them and the footer repeats them, and the three have to agree.
 */
export const IDENTITY = {
  name: 'Owen Weltchek',
  school: 'Carnegie Mellon University',
  degree: 'Bachelors of Engineering and Art',
  majors: 'Mechanical Engineering • Robotics • Art',
}

// Settings still win wherever they carry a value; these stand in when the row
// is blank, so a fresh database never leaves dead links behind.
export const CONTACT = {
  email: 'oweltche@andrew.cmu.edu',
  phone: '(415) 933-0720',
  linkedin: 'https://www.linkedin.com/in/weltchek/',
}

/** Digits only — a space or a bracket is not valid inside a tel: URI. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
