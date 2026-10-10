import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCurrency,
  isWithinRange,
  percent,
  safeJsonParse,
  sanitizeSearchTerm,
  slugify,
  truncate,
} from "../utils";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    assert.equal(slugify("Hello World"), "hello-world");
  });

  it("strips punctuation", () => {
    assert.equal(slugify("Data Science 101!"), "data-science-101");
  });

  it("collapses underscores and repeated spaces", () => {
    assert.equal(slugify("  a__b   c  "), "a-b-c");
  });

  it("removes leading and trailing dashes", () => {
    assert.equal(slugify("--Start Tech--"), "start-tech");
  });

  it("returns empty string for empty input", () => {
    assert.equal(slugify(""), "");
  });
});

describe("truncate", () => {
  it("returns the text untouched when within the limit", () => {
    assert.equal(truncate("short", 10), "short");
    assert.equal(truncate("exact", 5), "exact");
  });

  it("truncates and appends an ellipsis", () => {
    const out = truncate("abcdefghij", 7);
    assert.equal(out, "abcd...");
    assert.equal(out.length, 7);
  });
});

describe("percent", () => {
  it("returns 0 when the total is 0", () => {
    assert.equal(percent(0, 0), 0);
    assert.equal(percent(5, 0), 0);
  });

  it("rounds to the nearest integer", () => {
    assert.equal(percent(1, 3), 33);
    assert.equal(percent(2, 3), 67);
    assert.equal(percent(3, 4), 75);
    assert.equal(percent(0, 10), 0);
    assert.equal(percent(10, 10), 100);
  });
});

describe("sanitizeSearchTerm", () => {
  it("removes commas and parentheses", () => {
    assert.equal(sanitizeSearchTerm("foo,bar(baz)"), "foo bar baz");
  });

  it("collapses whitespace and trims", () => {
    assert.equal(sanitizeSearchTerm("  a   b  "), "a b");
  });

  it("leaves plain terms alone", () => {
    assert.equal(sanitizeSearchTerm("react hooks"), "react hooks");
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    assert.deepEqual(safeJsonParse('{"a":1}', { a: 0 }), { a: 1 });
  });

  it("returns the fallback on invalid JSON", () => {
    assert.deepEqual(safeJsonParse("not json", { a: 0 }), { a: 0 });
    assert.equal(safeJsonParse("nope", "fallback"), "fallback");
  });

  it("keeps the caller-supplied type for scalars", () => {
    assert.equal(safeJsonParse("42", 0), 42);
    assert.equal(safeJsonParse("true", false), true);
  });
});

describe("isWithinRange", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  const end = new Date("2026-01-31T23:59:59.000Z");

  it("is inclusive of both boundaries", () => {
    assert.equal(isWithinRange(start, start, end), true);
    assert.equal(isWithinRange(end, start, end), true);
  });

  it("accepts ISO strings as boundaries", () => {
    const mid = new Date("2026-01-15T12:00:00.000Z");
    assert.equal(
      isWithinRange(mid, start.toISOString(), end.toISOString()),
      true
    );
  });

  it("rejects dates outside the range", () => {
    assert.equal(
      isWithinRange(new Date("2025-12-31T23:59:59.000Z"), start, end),
      false
    );
    assert.equal(
      isWithinRange(new Date("2026-02-01T00:00:00.000Z"), start, end),
      false
    );
  });
});

describe("formatCurrency", () => {
  it("formats with two decimal places", () => {
    assert.ok(formatCurrency(10).includes("10.00"));
    assert.ok(formatCurrency(1234.5, "USD", "en-US").includes("1,234.50"));
  });

  it("returns a non-empty string", () => {
    const out = formatCurrency(0, "GHS", "en-GH");
    assert.equal(typeof out, "string");
    assert.ok(out.length > 0);
  });

  it("formats negative amounts without throwing", () => {
    const out = formatCurrency(-5, "USD", "en-US");
    assert.ok(out.includes("5.00"));
  });
});
