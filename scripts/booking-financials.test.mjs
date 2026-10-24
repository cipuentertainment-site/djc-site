import assert from "node:assert/strict";
import test from "node:test";

import { calculateBookingFinancials } from "../src/lib/bookings/financials.ts";

test("calculates the required deposit and outstanding balances", () => {
  const result = calculateBookingFinancials(55_000, [{ amount: 10_000 }]);

  assert.equal(result.requiredDeposit, 27_500);
  assert.equal(result.totalReceived, 10_000);
  assert.equal(result.depositOutstanding, 17_500);
  assert.equal(result.remainingBalance, 45_000);
  assert.equal(result.depositStatus, "outstanding");
  assert.equal(result.paymentStatus, "partially_paid");
});

test("supports multiple instalments without double-counting", () => {
  const result = calculateBookingFinancials(100_000, [
    { amount: 25_000 },
    { amount: 25_000 },
    { amount: 50_000 },
  ]);

  assert.equal(result.totalReceived, 100_000);
  assert.equal(result.depositOutstanding, 0);
  assert.equal(result.remainingBalance, 0);
  assert.equal(result.depositStatus, "satisfied");
  assert.equal(result.paymentStatus, "paid");
});

test("shows no-payment state when the initial amount is zero", () => {
  const result = calculateBookingFinancials(80_000);

  assert.equal(result.totalReceived, 0);
  assert.equal(result.requiredDeposit, 40_000);
  assert.equal(result.depositOutstanding, 40_000);
  assert.equal(result.remainingBalance, 80_000);
  assert.equal(result.paymentStatus, "unpaid");
});
