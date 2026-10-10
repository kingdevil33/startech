import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_RULES,
  checkEligibility,
  type CertificateRules,
  type CompletionStats,
} from "../certificates";

const fullStats: CompletionStats = {
  lessons_percent: 100,
  attendance_percent: 100,
  assignments_percent: 100,
  reviews_percent: 100,
};

const zeroStats: CompletionStats = {
  lessons_percent: 0,
  attendance_percent: 0,
  assignments_percent: 0,
  reviews_percent: 0,
};

describe("DEFAULT_RULES", () => {
  it("has the expected shape and values", () => {
    assert.deepEqual(DEFAULT_RULES, {
      lessons_complete_percent: 80,
      live_attendance_percent: 70,
      assignments_submitted_percent: 100,
      peer_reviews_completed_percent: 100,
    });
  });

  it("uses numeric percentages between 0 and 100", () => {
    for (const value of Object.values(DEFAULT_RULES)) {
      assert.equal(typeof value, "number");
      assert.ok(value >= 0 && value <= 100);
    }
  });
});

describe("checkEligibility", () => {
  it("passes when every stat meets every rule", () => {
    const result = checkEligibility(fullStats, DEFAULT_RULES);
    assert.equal(result.eligible, true);
    assert.deepEqual(result.missing, []);
    assert.equal(result.stats, fullStats);
    assert.equal(result.rules, DEFAULT_RULES);
  });

  it("passes at exactly the threshold", () => {
    const atThreshold: CompletionStats = {
      lessons_percent: DEFAULT_RULES.lessons_complete_percent,
      attendance_percent: DEFAULT_RULES.live_attendance_percent,
      assignments_percent: DEFAULT_RULES.assignments_submitted_percent,
      reviews_percent: DEFAULT_RULES.peer_reviews_completed_percent,
    };
    const result = checkEligibility(atThreshold, DEFAULT_RULES);
    assert.equal(result.eligible, true);
    assert.deepEqual(result.missing, []);
  });

  it("fails only the lessons rule when lessons are short", () => {
    const stats: CompletionStats = { ...fullStats, lessons_percent: 79 };
    const result = checkEligibility(stats, DEFAULT_RULES);
    assert.equal(result.eligible, false);
    assert.deepEqual(result.missing, ["lessons_complete_percent"]);
  });

  it("fails only the attendance rule when attendance is short", () => {
    const stats: CompletionStats = { ...fullStats, attendance_percent: 69 };
    const result = checkEligibility(stats, DEFAULT_RULES);
    assert.equal(result.eligible, false);
    assert.deepEqual(result.missing, ["live_attendance_percent"]);
  });

  it("fails only the assignments rule when assignments are short", () => {
    const stats: CompletionStats = { ...fullStats, assignments_percent: 50 };
    const result = checkEligibility(stats, DEFAULT_RULES);
    assert.equal(result.eligible, false);
    assert.deepEqual(result.missing, ["assignments_submitted_percent"]);
  });

  it("fails only the reviews rule when reviews are short", () => {
    const stats: CompletionStats = { ...fullStats, reviews_percent: 0 };
    const result = checkEligibility(stats, DEFAULT_RULES);
    assert.equal(result.eligible, false);
    assert.deepEqual(result.missing, ["peer_reviews_completed_percent"]);
  });

  it("reports every missing rule at once", () => {
    const result = checkEligibility(zeroStats, DEFAULT_RULES);
    assert.equal(result.eligible, false);
    assert.deepEqual(result.missing, [
      "lessons_complete_percent",
      "live_attendance_percent",
      "assignments_submitted_percent",
      "peer_reviews_completed_percent",
    ]);
  });

  it("treats zeroed rules as always satisfied", () => {
    const emptyRules: CertificateRules = {
      lessons_complete_percent: 0,
      live_attendance_percent: 0,
      assignments_submitted_percent: 0,
      peer_reviews_completed_percent: 0,
    };
    const result = checkEligibility(zeroStats, emptyRules);
    assert.equal(result.eligible, true);
    assert.deepEqual(result.missing, []);
  });

  it("honours relaxed per-course rules", () => {
    const relaxed: CertificateRules = {
      ...DEFAULT_RULES,
      lessons_complete_percent: 10,
      live_attendance_percent: 10,
      assignments_submitted_percent: 10,
      peer_reviews_completed_percent: 10,
    };
    const stats: CompletionStats = {
      lessons_percent: 50,
      attendance_percent: 50,
      assignments_percent: 50,
      reviews_percent: 50,
    };
    const result = checkEligibility(stats, relaxed);
    assert.equal(result.eligible, true);
  });
});
