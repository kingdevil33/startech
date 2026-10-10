import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { CRON_UNAUTHORIZED, verifyCronSecret } from "../cron";

type CronRequest = Parameters<typeof verifyCronSecret>[0];

function makeRequest(headers: Record<string, string> = {}): CronRequest {
  return new Request("http://localhost:3000/api/cron/reminders", {
    headers,
  }) as unknown as CronRequest;
}

const ORIGINAL_SECRET = process.env.CRON_SECRET;
const TEST_SECRET = "test-cron-secret";

describe("verifyCronSecret", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = ORIGINAL_SECRET;
    }
  });

  it("accepts the configured secret as a bearer token", () => {
    assert.equal(
      verifyCronSecret(
        makeRequest({ authorization: `Bearer ${TEST_SECRET}` })
      ),
      true
    );
  });

  it("accepts the configured secret in the x-cron-secret header", () => {
    assert.equal(
      verifyCronSecret(makeRequest({ "x-cron-secret": TEST_SECRET })),
      true
    );
  });

  it("rejects a wrong bearer token", () => {
    assert.equal(
      verifyCronSecret(makeRequest({ authorization: "Bearer wrong" })),
      false
    );
  });

  it("rejects a wrong x-cron-secret header", () => {
    assert.equal(
      verifyCronSecret(makeRequest({ "x-cron-secret": "wrong" })),
      false
    );
  });

  it("rejects requests with no credentials", () => {
    assert.equal(verifyCronSecret(makeRequest()), false);
  });

  it("rejects a bearer token that is only partially equal", () => {
    assert.equal(
      verifyCronSecret(
        makeRequest({ authorization: `Bearer ${TEST_SECRET}x` })
      ),
      false
    );
    assert.equal(
      verifyCronSecret(
        makeRequest({ authorization: `Bearer ${TEST_SECRET.slice(0, -1)}` })
      ),
      false
    );
  });

  it("fails closed when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    assert.equal(
      verifyCronSecret(
        makeRequest({ authorization: `Bearer ${TEST_SECRET}` })
      ),
      false
    );
    assert.equal(verifyCronSecret(makeRequest({ "x-cron-secret": "" })), false);
  });
});

describe("CRON_UNAUTHORIZED", () => {
  it("has the expected shape", () => {
    assert.deepEqual(CRON_UNAUTHORIZED, {
      json: { error: "Unauthorized" },
      status: 401,
    });
  });
});
