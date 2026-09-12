const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3020").replace(/\/$/, "");

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    signal: AbortSignal.timeout(20_000),
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const publicRoutes = ["/", "/book", "/terms", "/privacy", "/admin/login"];

for (const path of publicRoutes) {
  const response = await request(path);
  assert(response.status === 200, `${path} returned ${response.status}`);
}

const adminResponse = await request("/admin", { redirect: "manual" });
assert(adminResponse.status === 307, `/admin returned ${adminResponse.status}`);
assert(
  adminResponse.headers.get("location")?.includes("/admin/login"),
  "/admin did not redirect to /admin/login",
);

const homepage = await request("/");
for (const [header, expected] of [
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
]) {
  assert(
    homepage.headers.get(header) === expected,
    `${header} did not match ${expected}`,
  );
}
assert(!homepage.headers.has("x-powered-by"), "x-powered-by header is exposed");

const manualBooking = await request("/api/bookings/manual", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
assert(manualBooking.status === 400, `/api/bookings/manual returned ${manualBooking.status}`);
assert((await manualBooking.json()).ok === false, "manual booking validation unexpectedly passed");

const methodCheck = await request("/api/bookings/manual");
assert(methodCheck.status === 405, `/api/bookings/manual GET returned ${methodCheck.status}`);

console.log(`Smoke tests passed for ${baseUrl}`);
