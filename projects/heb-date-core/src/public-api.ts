/*
 * Public API Surface of heb-date-core
 *
 * A framework-agnostic, self-contained Hebrew-calendar engine (zero runtime
 * dependencies; the arithmetic is verified against ICU in the test suite).
 * No Angular / React imports live in this package — that is what allows the
 * same logic to back the Angular picker today and a React picker tomorrow.
 */

export * from './lib/types';
export * from './lib/hdate-utils';
export * from './lib/constraints';
export * from './lib/selection';
export * from './lib/calendar-grid';
