import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

import type { ManualPaymentMethod } from "@/types/admin-data";

export type BookingDocumentType =
  | "booking_confirmation"
  | "payment_statement"
  | "payment_receipt"
  | "appreciation";

export type BookingDocumentPayment = {
  id: string;
  amount: number;
  currency: string;
  method: ManualPaymentMethod;
  transaction_reference: string | null;
  paid_at: string;
  created_at: string;
};

export type BookingDocumentBooking = {
  booking_reference: string;
  customer_name: string;
  customer_phone: string;
  event_type_name_snapshot: string;
  event_size_label_snapshot: string;
  duration: string;
  attendee_count: number;
  event_date: string;
  county: string;
  location_text: string;
  notes: string | null;
  currency: string;
  transport_disclaimer_snapshot: string;
  agreed_total_amount: number;
  booking_services: Array<{
    service_id: string | null;
    service_name_snapshot: string;
    description_snapshot: string | null;
    quantity: number;
    price_amount_snapshot: number;
    line_total_amount: number;
    currency: string;
  }>;
};

export type BookingDocumentBusiness = {
  business_name: string;
  business_phone: string | null;
  business_whatsapp: string | null;
  business_email: string | null;
  business_location: string | null;
  business_description: string | null;
};

export type BookingDocumentFinancials = {
  requiredDeposit: number;
  totalReceived: number;
  depositOutstanding: number;
  remainingBalance: number;
  depositStatus: "outstanding" | "satisfied";
  paymentStatus: "unpaid" | "partially_paid" | "paid";
};

export type BookingDocumentInput = {
  documentType: BookingDocumentType;
  documentNumber: string;
  issueDate: string;
  booking: BookingDocumentBooking;
  payments: BookingDocumentPayment[];
  financials: BookingDocumentFinancials;
  business: BookingDocumentBusiness;
  payment?: BookingDocumentPayment;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BLACK = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.38, 0.38, 0.38);
const GOLD = rgb(0.76, 0.55, 0.12);
const PALE_GOLD = rgb(0.98, 0.95, 0.87);
const PALE_GRAY = rgb(0.97, 0.97, 0.96);

type Fonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type DrawingContext = {
  document: PDFDocument;
  page: PDFPage;
  pages: PDFPage[];
  y: number;
};

function money(amount: number, currency = "KES") {
  if (currency === "KES") {
    return `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(amount)}`;
  }

  return `${currency} ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(amount)}`;
}

function dateLabel(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function paymentMethodLabel(method: ManualPaymentMethod) {
  return method === "mpesa"
    ? "M-Pesa"
    : method === "bank_transfer"
      ? "Bank transfer"
      : "Cash";
}

function statusLabel(status: BookingDocumentFinancials["paymentStatus"]) {
  return status === "paid"
    ? "Paid in full"
    : status === "partially_paid"
      ? "Partially paid"
      : "No payment recorded";
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      lines.push(line);
    }
    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : [""];
}

function drawWrapped(
  context: DrawingContext,
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  color = BLACK,
  lineHeight = size + 4,
) {
  const lines = wrapText(text, font, size, maxWidth);

  for (const line of lines) {
    context.page.drawText(line, {
      x: MARGIN,
      y: context.y,
      size,
      font,
      color,
    });
    context.y -= lineHeight;
  }

  return lines.length * lineHeight;
}

function drawRightText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK,
) {
  page.drawText(text, {
    x: x - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color,
  });
}

function drawRule(page: PDFPage, y: number, color = rgb(0.86, 0.84, 0.79)) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.7,
    color,
  });
}

function drawSectionTitle(context: DrawingContext, title: string, fonts: Fonts) {
  context.page.drawText(title.toUpperCase(), {
    x: MARGIN,
    y: context.y,
    size: 9,
    font: fonts.bold,
    color: GOLD,
  });
  context.y -= 16;
}

function drawLabelValue(
  context: DrawingContext,
  label: string,
  value: string,
  fonts: Fonts,
  x = MARGIN,
  width = CONTENT_WIDTH / 2 - 12,
) {
  context.page.drawText(label, {
    x,
    y: context.y,
    size: 8,
    font: fonts.regular,
    color: MUTED,
  });
  const lines = wrapText(value, fonts.bold, 10, width);
  lines.forEach((line, index) => {
    context.page.drawText(line, {
      x,
      y: context.y - 13 - index * 12,
      size: 10,
      font: fonts.bold,
      color: BLACK,
    });
  });
  context.y -= 30 + Math.max(0, lines.length - 1) * 12;
}

function drawHeader(
  document: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  logo: PDFImage | null,
  title: string,
  documentNumber: string,
  issueDate: string,
  business: BookingDocumentBusiness,
) {
  if (logo) {
    const logoScale = Math.min(112 / logo.width, 70 / logo.height);
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - logo.height * logoScale,
      width: logo.width * logoScale,
      height: logo.height * logoScale,
    });
  }

  page.drawText(business.business_name, {
    x: MARGIN + 126,
    y: PAGE_HEIGHT - MARGIN - 11,
    size: 17,
    font: fonts.bold,
    color: BLACK,
  });
  page.drawText(title.toUpperCase(), {
    x: MARGIN + 126,
    y: PAGE_HEIGHT - MARGIN - 29,
    size: 9,
    font: fonts.bold,
    color: GOLD,
  });
  page.drawText(`Issued ${dateLabel(issueDate)}`, {
    x: MARGIN + 126,
    y: PAGE_HEIGHT - MARGIN - 45,
    size: 8,
    font: fonts.regular,
    color: MUTED,
  });

  drawRightText(page, documentNumber, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN - 12, fonts.bold, 10);
  drawRightText(page, "DOCUMENT NUMBER", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN - 27, fonts.regular, 7, MUTED);
  drawRule(page, PAGE_HEIGHT - MARGIN - 84, GOLD);
}

function drawFooter(page: PDFPage, fonts: Fonts, business: BookingDocumentBusiness) {
  const contacts = [
    business.business_phone,
    business.business_whatsapp ? `WhatsApp ${business.business_whatsapp}` : null,
    business.business_email,
    business.business_location,
  ].filter(Boolean).join("  •  ");

  drawRule(page, 48);
  const contactLines = wrapText(
    contacts || "Please contact DJC Entertainment for verified payment instructions.",
    fonts.regular,
    7.5,
    CONTENT_WIDTH - 120,
  );
  contactLines.forEach((line, index) => {
    page.drawText(line, { x: MARGIN, y: 33 - index * 9, size: 7.5, font: fonts.regular, color: MUTED });
  });
  drawRightText(page, "DJC Entertainment", PAGE_WIDTH - MARGIN, 20, fonts.bold, 7.5, BLACK);
}

function drawInfoGrid(context: DrawingContext, fonts: Fonts, booking: BookingDocumentBooking) {
  drawSectionTitle(context, "Booking details", fonts);
  const startY = context.y;
  const secondX = MARGIN + CONTENT_WIDTH / 2 + 12;
  const first = { ...context, y: startY };
  const second = { ...context, y: startY };

  drawLabelValue(first, "Client", booking.customer_name, fonts, MARGIN);
  drawLabelValue(first, "Contact", booking.customer_phone, fonts, MARGIN);
  drawLabelValue(first, "Location", `${booking.county} — ${booking.location_text}`, fonts, MARGIN);

  drawLabelValue(second, "Booking reference", booking.booking_reference, fonts, secondX);
  drawLabelValue(second, "Event", `${booking.event_type_name_snapshot} — ${booking.event_size_label_snapshot}`, fonts, secondX);
  drawLabelValue(second, "Event date", dateLabel(booking.event_date), fonts, secondX);
  drawLabelValue(
    second,
    "Format and attendees",
    `${booking.duration === "half_day" ? "Half Day" : "Full Day"} - ${booking.attendee_count} attendees`,
    fonts,
    secondX,
  );

  context.y = Math.min(first.y, second.y) - 4;

  if (booking.notes) {
    drawSectionTitle(context, "Event notes", fonts);
    drawWrapped(context, booking.notes, fonts.regular, 8.5, CONTENT_WIDTH, MUTED, 11);
    context.y -= 4;
  }
}

function drawServices(context: DrawingContext, fonts: Fonts, booking: BookingDocumentBooking) {
  drawSectionTitle(context, "Agreed services", fonts);
  const tableTop = context.y;
  const quantityX = MARGIN + 300;
  const unitPriceX = MARGIN + 405;
  const amountX = PAGE_WIDTH - MARGIN;
  context.page.drawRectangle({
    x: MARGIN,
    y: tableTop - 20,
    width: CONTENT_WIDTH,
    height: 23,
    color: PALE_GOLD,
  });
  context.page.drawText("SERVICE", { x: MARGIN + 10, y: tableTop - 13, size: 8, font: fonts.bold, color: MUTED });
  drawRightText(context.page, "QTY", quantityX, tableTop - 13, fonts.bold, 8, MUTED);
  drawRightText(context.page, "UNIT", unitPriceX, tableTop - 13, fonts.bold, 8, MUTED);
  drawRightText(context.page, "LINE TOTAL", amountX - 10, tableTop - 13, fonts.bold, 8, MUTED);
  context.y = tableTop - 40;

  if (!booking.booking_services.length) {
    context.page.drawText("No service snapshot available.", { x: MARGIN + 10, y: context.y, size: 9, font: fonts.regular, color: MUTED });
    context.y -= 24;
    return;
  }

  booking.booking_services.forEach((service, index) => {
    const serviceLabel = service.description_snapshot
      ? `${service.service_name_snapshot} - ${service.description_snapshot}`
      : service.service_name_snapshot;
    const serviceLines = wrapText(serviceLabel, fonts.regular, 9, 245);
    const rowHeight = Math.max(23, serviceLines.length * 11 + 12);
    if (index % 2 === 1) {
      context.page.drawRectangle({ x: MARGIN, y: context.y - 7, width: CONTENT_WIDTH, height: rowHeight, color: PALE_GRAY });
    }
    serviceLines.forEach((line, lineIndex) => {
      context.page.drawText(line, { x: MARGIN + 10, y: context.y - lineIndex * 11, size: 9, font: fonts.regular, color: BLACK });
    });
    drawRightText(context.page, String(service.quantity), quantityX, context.y, fonts.bold, 9);
    drawRightText(context.page, money(service.price_amount_snapshot, service.currency), unitPriceX, context.y, fonts.regular, 8.5);
    drawRightText(context.page, money(service.line_total_amount, service.currency), amountX - 10, context.y, fonts.bold, 9);
    context.y -= rowHeight;
  });
  drawRule(context.page, context.y + 7);
  context.y -= 10;
}

function drawFinancialSummary(
  context: DrawingContext,
  fonts: Fonts,
  booking: BookingDocumentBooking,
  financials: BookingDocumentFinancials,
) {
  drawSectionTitle(context, "Payment summary", fonts);
  const rows = [
    ["Agreed total", money(booking.agreed_total_amount, booking.currency)],
    ["Required deposit (50%)", money(financials.requiredDeposit, booking.currency)],
    ["Balance after required deposit", money(booking.agreed_total_amount - financials.requiredDeposit, booking.currency)],
    ["Amount received", money(financials.totalReceived, booking.currency)],
    ["Deposit outstanding", money(financials.depositOutstanding, booking.currency)],
    ["Remaining balance", money(financials.remainingBalance, booking.currency)],
  ];
  const tableTop = context.y;
  const rowHeight = 19;

  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      context.page.drawRectangle({ x: MARGIN, y: tableTop - (index + 1) * rowHeight + 2, width: CONTENT_WIDTH, height: rowHeight, color: PALE_GRAY });
    }
    context.page.drawText(label, { x: MARGIN + 10, y: tableTop - (index + 1) * rowHeight + 8, size: 9, font: fonts.regular, color: MUTED });
    drawRightText(context.page, value, PAGE_WIDTH - MARGIN - 10, tableTop - (index + 1) * rowHeight + 8, fonts.bold, 9);
  });
  context.y = tableTop - rows.length * rowHeight - 8;
  context.page.drawText(`Deposit status: ${financials.depositStatus === "satisfied" ? "Satisfied" : "Pending"}`, { x: MARGIN, y: context.y, size: 8.5, font: fonts.bold, color: financials.depositStatus === "satisfied" ? rgb(0.06, 0.45, 0.25) : GOLD });
  drawRightText(context.page, `Overall status: ${statusLabel(financials.paymentStatus)}`, PAGE_WIDTH - MARGIN, context.y, fonts.bold, 8.5, financials.paymentStatus === "paid" ? rgb(0.06, 0.45, 0.25) : BLACK);
  context.y -= 19;
}

function drawPaymentHistory(context: DrawingContext, fonts: Fonts, booking: BookingDocumentBooking, payments: BookingDocumentPayment[]) {
  drawSectionTitle(context, "Payment history", fonts);
  if (!payments.length) {
    context.page.drawText("No payments have been recorded for this booking.", { x: MARGIN, y: context.y, size: 9, font: fonts.regular, color: MUTED });
    context.y -= 22;
    return;
  }

  const top = context.y;
  context.page.drawRectangle({ x: MARGIN, y: top - 20, width: CONTENT_WIDTH, height: 23, color: PALE_GOLD });
  context.page.drawText("DATE", { x: MARGIN + 10, y: top - 13, size: 8, font: fonts.bold, color: MUTED });
  context.page.drawText("METHOD / REFERENCE", { x: MARGIN + 108, y: top - 13, size: 8, font: fonts.bold, color: MUTED });
  drawRightText(context.page, "AMOUNT", PAGE_WIDTH - MARGIN - 10, top - 13, fonts.bold, 8, MUTED);
  context.y = top - 40;

  payments.forEach((payment, index) => {
    if (context.y < 90) {
      context.page = context.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      context.pages.push(context.page);
      context.y = PAGE_HEIGHT - MARGIN;
      context.page.drawText("PAYMENT HISTORY CONTINUED", { x: MARGIN, y: context.y, size: 9, font: fonts.bold, color: GOLD });
      context.y -= 22;
    }
    const method = `${paymentMethodLabel(payment.method)}${payment.transaction_reference ? ` — ${payment.transaction_reference}` : ""}`;
    const methodLines = wrapText(method, fonts.regular, 8.5, 260);
    const rowHeight = Math.max(24, methodLines.length * 10 + 10);
    if (index % 2 === 1) {
      context.page.drawRectangle({ x: MARGIN, y: context.y - 7, width: CONTENT_WIDTH, height: rowHeight, color: PALE_GRAY });
    }
    context.page.drawText(dateTimeLabel(payment.paid_at || payment.created_at), { x: MARGIN + 10, y: context.y, size: 8.5, font: fonts.regular, color: BLACK });
    methodLines.forEach((line, lineIndex) => {
      context.page.drawText(line, { x: MARGIN + 108, y: context.y - lineIndex * 10, size: 8.5, font: fonts.regular, color: BLACK });
    });
    drawRightText(context.page, money(payment.amount, booking.currency), PAGE_WIDTH - MARGIN - 10, context.y, fonts.bold, 8.5);
    context.y -= rowHeight;
  });
  context.y -= 3;
}

function drawTerms(context: DrawingContext, fonts: Fonts, booking: BookingDocumentBooking, financials: BookingDocumentFinancials) {
  drawSectionTitle(context, "Terms and conditions", fonts);
  const terms = [
    "Administrative confirmation reserves the event date but does not mean that the required deposit has been paid.",
    financials.depositOutstanding > 0
      ? `The required deposit of ${money(financials.requiredDeposit, booking.currency)} remains pending and must be paid according to the agreed terms.`
      : "The required deposit has been satisfied based on the payments recorded to date.",
    `The remaining balance is ${money(financials.remainingBalance, booking.currency)} and is part of the agreed total, not an additional charge.`,
    "Payment entries and references in this statement are recorded by the business based on its own verification.",
  ];
  terms.forEach((term) => {
    context.page.drawCircle({ x: MARGIN + 3, y: context.y + 3, size: 2.2, color: GOLD });
    const lines = wrapText(term, fonts.regular, 8.5, CONTENT_WIDTH - 18);
    lines.forEach((line, index) => {
      context.page.drawText(line, { x: MARGIN + 13, y: context.y - index * 11, size: 8.5, font: fonts.regular, color: MUTED });
    });
    context.y -= lines.length * 11 + 5;
  });
}

function drawReceiptDetails(context: DrawingContext, fonts: Fonts, input: BookingDocumentInput) {
  const payment = input.payment;
  if (!payment) {
    return;
  }

  drawSectionTitle(context, "Payment received", fonts);
  const rows = [
    ["Payment date", dateTimeLabel(payment.paid_at)],
    ["Amount received", money(payment.amount, input.booking.currency)],
    ["Payment method", paymentMethodLabel(payment.method)],
    ["Transaction reference", payment.transaction_reference ?? "Not applicable — cash"],
    ["Total received after this payment", money(input.financials.totalReceived, input.booking.currency)],
    ["Remaining balance after this payment", money(input.financials.remainingBalance, input.booking.currency)],
  ];
  rows.forEach(([label, value], index) => {
    context.page.drawText(label, { x: MARGIN, y: context.y, size: 9, font: fonts.regular, color: MUTED });
    drawRightText(context.page, value, PAGE_WIDTH - MARGIN, context.y, fonts.bold, 9);
    context.y -= 20;
    if (index === 1) {
      drawRule(context.page, context.y + 7);
      context.y -= 5;
    }
  });
}

function drawAppreciation(context: DrawingContext, fonts: Fonts, input: BookingDocumentInput) {
  context.y -= 15;
  context.page.drawText(`Dear ${input.booking.customer_name},`, { x: MARGIN, y: context.y, size: 13, font: fonts.bold, color: BLACK });
  context.y -= 28;
  drawWrapped(
    context,
    `Thank you for trusting ${input.business.business_name} to be part of your ${input.booking.event_type_name_snapshot.toLowerCase()}. We appreciate the opportunity to help make your event memorable.`,
    fonts.regular,
    11,
    CONTENT_WIDTH,
    MUTED,
    16,
  );
  context.y -= 12;
  drawLabelValue(context, "Event", `${dateLabel(input.booking.event_date)} — ${input.booking.location_text}`, fonts, MARGIN, CONTENT_WIDTH);
  drawLabelValue(context, "Booking reference", input.booking.booking_reference, fonts, MARGIN, CONTENT_WIDTH);
  context.y -= 8;
  drawWrapped(context, "We look forward to serving you again. With appreciation,", fonts.regular, 10, CONTENT_WIDTH, MUTED, 15);
  context.y -= 10;
  context.page.drawText(input.business.business_name, { x: MARGIN, y: context.y, size: 12, font: fonts.bold, color: BLACK });
}

export async function createBookingPdf(input: BookingDocumentInput) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let logo: PDFImage | null = null;

  try {
    const logoBytes = await readFile(join(process.cwd(), "public", "brand", "djc-entertainment-logo-cropped.png"));
    logo = await document.embedPng(logoBytes);
  } catch {
    logo = null;
  }

  const title = input.documentType === "booking_confirmation"
    ? "Booking confirmation"
    : input.documentType === "payment_statement"
      ? "Deposit invoice / payment statement"
      : input.documentType === "payment_receipt"
        ? "Payment receipt"
        : "Appreciation";

  drawHeader(document, page, fonts, logo, title, input.documentNumber, input.issueDate, input.business);
  const context: DrawingContext = {
    document,
    page,
    pages: [page],
    y: PAGE_HEIGHT - MARGIN - 106,
  };

  if (input.documentType === "appreciation") {
    drawAppreciation(context, fonts, input);
  } else if (input.documentType === "payment_receipt") {
    drawInfoGrid(context, fonts, input.booking);
    drawReceiptDetails(context, fonts, input);
  } else {
    drawInfoGrid(context, fonts, input.booking);
    drawServices(context, fonts, input.booking);
    drawFinancialSummary(context, fonts, input.booking, input.financials);
    if (input.documentType === "payment_statement") {
      drawPaymentHistory(context, fonts, input.booking, input.payments);
      context.y -= 4;
      drawWrapped(context, "Payment instructions: please contact the business using the verified contact details below before sending payment. No payment credentials or account details are printed unless configured by the business.", fonts.regular, 8.5, CONTENT_WIDTH, MUTED, 11);
    } else {
      drawTerms(context, fonts, input.booking, input.financials);
    }
  }

  context.pages.forEach((documentPage) => drawFooter(documentPage, fonts, input.business));
  return document.save();
}
