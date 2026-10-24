export const DEPOSIT_RATE = 0.5;

export type PaymentLike = {
  amount: number;
};

export type BookingFinancialSummary = {
  agreedTotal: number | null;
  requiredDeposit: number | null;
  totalReceived: number;
  depositOutstanding: number | null;
  remainingBalance: number | null;
  depositStatus: "not_set" | "outstanding" | "satisfied";
  paymentStatus: "not_set" | "unpaid" | "partially_paid" | "paid";
};

export function calculateRequiredDeposit(agreedTotal: number) {
  return Math.ceil(agreedTotal * DEPOSIT_RATE);
}

export function calculateBookingFinancials(
  agreedTotal: number | null | undefined,
  payments: PaymentLike[] = [],
): BookingFinancialSummary {
  const totalReceived = payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (agreedTotal === null || agreedTotal === undefined) {
    return {
      agreedTotal: null,
      requiredDeposit: null,
      totalReceived,
      depositOutstanding: null,
      remainingBalance: null,
      depositStatus: "not_set",
      paymentStatus: "not_set",
    };
  }

  const requiredDeposit = calculateRequiredDeposit(agreedTotal);
  const depositOutstanding = Math.max(0, requiredDeposit - totalReceived);
  const remainingBalance = Math.max(0, agreedTotal - totalReceived);

  return {
    agreedTotal,
    requiredDeposit,
    totalReceived,
    depositOutstanding,
    remainingBalance,
    depositStatus: depositOutstanding === 0 ? "satisfied" : "outstanding",
    paymentStatus:
      remainingBalance === 0
        ? "paid"
        : totalReceived === 0
          ? "unpaid"
          : "partially_paid",
  };
}

export function validatePaymentAmount(amount: number, maximum: number) {
  return Number.isInteger(amount) && amount > 0 && amount <= maximum;
}
