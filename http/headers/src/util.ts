import type { NameValueEntries } from "./types";

export function entries(
  value: Map<string, unknown>,
): IterableIterator<[string, string]>;

export function entries(
  value: Record<string, unknown>,
): IterableIterator<[string, string]>;

export function entries(
  value: NameValueEntries,
): IterableIterator<[string, string]>;

export function* entries(arg: unknown): IterableIterator<[string, string]> {
  // Map<string, unknown> overload.
  if (arg instanceof Map) {
    yield* entries0(arg);
    return;
  }

  // NameValueEntries overload.
  if (Array.isArray(arg)) {
    yield* entries0(arg);
    return;
  }

  // Record<string, unknown> overload.
  if (typeof arg === "object" && arg != null) {
    yield* entries0(Object.entries(arg));
    return;
  }

  throw new TypeError();
}

function* entries0(
  entries: Iterable<readonly [string, unknown]>,
): IterableIterator<[string, string]> {
  for (const [name, value] of entries) {
    yield [name, String(value)];
  }
}

/**
 * HTTP protocol makes heavy use of [name, value] string pairs. This function
 * takes arbitrary map and transforms it into an array of such pairs.
 *
 * Entry values are flattened and stringified.
 *
 * Example input:
 *
 * ```
 * const map = new Map<string, unknown>();
 * map.set("a", 1);
 * map.set("b", [2, 3]);
 * ```
 *
 * Example output:
 *
 * ```
 * [
 *   ["a", "1"],
 *   ["b", "2"],
 *   ["b", "3"],
 * ]
 * ```
 */
export function multiEntries(
  value: Map<string, unknown>,
): IterableIterator<[string, string]>;

/**
 * HTTP protocol makes heavy use of [name, value] string pairs. This function
 * takes arbitrary object and transforms it into an array of such pairs.
 *
 * Entry values are flattened and stringified.
 *
 * Example input:
 *
 * ```
 * const map = { a: 1, b: [2, 3] };
 * ```
 *
 * Example output:
 *
 * ```
 * [
 *   ["a", "1"],
 *   ["b", "2"],
 *   ["b", "3"],
 * ]
 * ```
 */
export function multiEntries(
  value: Record<string, unknown>,
): IterableIterator<[string, string]>;

/**
 * HTTP protocol makes heavy use of [name, value] string pairs. This function
 * takes arbitrary array and transforms it into an array of such pairs.
 *
 * Entry values are flattened and stringified.
 *
 * Example input:
 *
 * ```
 * const list = [];
 * list.push(["a", 1]);
 * list.push(["b", [2, 3]]);
 * ```
 *
 * Example output:
 *
 * ```
 * [
 *   ["a", "1"],
 *   ["b", "2"],
 *   ["b", "3"],
 * ]
 * ```
 */
export function multiEntries(
  value: NameValueEntries,
): IterableIterator<[string, string]>;

export function* multiEntries(
  arg: unknown,
): IterableIterator<[string, string]> {
  // Map<string, unknown> overload.
  if (arg instanceof Map) {
    yield* multiEntries0(arg);
    return;
  }

  // NameValueEntries overload.
  if (Array.isArray(arg)) {
    yield* multiEntries0(arg);
    return;
  }

  // Record<string, unknown> overload.
  if (typeof arg === "object" && arg != null) {
    yield* multiEntries0(Object.entries(arg));
    return;
  }

  throw new TypeError();
}

function* multiEntries0(
  entries: Iterable<readonly [string, unknown]>,
): IterableIterator<[string, string]> {
  for (const [name, value] of entries) {
    if (Array.isArray(value)) {
      for (const item of value) {
        yield [name, String(item)];
      }
    } else {
      yield [name, String(value)];
    }
  }
}