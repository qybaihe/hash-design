/**
 * The brief a demo direction shows, and the CLI command that prints the same text. `site/test/parity.test.ts`
 * bundles this file for the browser and checks, for many refs and constraints, that running the command
 * through the real CLI gives exactly `briefText()`.
 */
import { parseRef, renderBrief, reproduce, type ScenarioId } from 'hash-design/browser';

export interface BriefInput {
  ref: string;
  scenario?: ScenarioId;
  subject?: string;
  lightOnly?: boolean;
  darkOnly?: boolean;
  reducedMotion?: boolean;
  brand?: string[];
}

/** `hash-design` arguments, exactly as `hash-design brief` parses them. */
export function briefArgs(input: BriefInput): string[] {
  const args = ['brief', parseRef(input.ref).hash];
  if (input.scenario && input.scenario !== 'web') args.push('--scenario', input.scenario);
  if (input.lightOnly) args.push('--light-only');
  if (input.darkOnly) args.push('--dark-only');
  if (input.reducedMotion) args.push('--reduced-motion');
  for (const b of input.brand ?? []) args.push('--brand', b);
  if (input.subject?.trim()) args.push('--subject', input.subject.trim());
  return args;
}

/** POSIX shell quoting: bare when safe, otherwise single quotes. `#` is quoted: at the start of a word it begins a comment. */
export function shellQuote(arg: string): string {
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function briefCommand(input: BriefInput): string {
  return ['npx', '-y', 'hash-design', ...briefArgs(input)].map(shellQuote).join(' ');
}

/** The brief, built the way `hash-design brief` builds it. */
export function briefText(input: BriefInput): string {
  const design = reproduce(parseRef(input.ref), {
    lightOnly: Boolean(input.lightOnly),
    darkOnly: Boolean(input.darkOnly),
    reducedMotion: Boolean(input.reducedMotion),
    brandColors: input.brand ?? [],
    ...(input.scenario ? { scenario: input.scenario } : {}),
  });
  return renderBrief(design, { subject: input.subject?.trim() ?? '', facts: [] });
}
