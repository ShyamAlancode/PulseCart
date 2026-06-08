// Ensure the DynamoDB client connects to the local development server
(process.env as any).NODE_ENV = "development";

// Constants
const INVENTORY = 50;
const CONCURRENT_REQUESTS = 200;
const DROP_ID = "drop-001";
const PRODUCT_ID = "product-001";

async function runStressTest() {
  const { createOrder } = await import("../src/lib/checkout");

  console.log("==================================================");
  console.log("🚀 STARTING PULSECART HIGH-CONCURRENCY STRESS TEST");
  console.log("==================================================");
  console.log(`Target Available Inventory: ${INVENTORY}`);
  console.log(`Concurrent Requests:       ${CONCURRENT_REQUESTS}`);
  console.log(`Drop ID:                   ${DROP_ID}`);
  console.log(`Product ID:                ${PRODUCT_ID}`);
  console.log("--------------------------------------------------");

  // 1. Generate 200 unique test user IDs
  const userIds = Array.from({ length: CONCURRENT_REQUESTS }).map(
    (_, i) => `user-test-${i + 1}`
  );

  console.log(`Created ${CONCURRENT_REQUESTS} unique user IDs.`);
  console.log("Firing checkout transaction requests simultaneously...");

  // 2. Fire requests concurrently using Promise.allSettled
  const startTime = Date.now();
  const promises = userIds.map((userId) =>
    createOrder({
      dropId: DROP_ID,
      productId: PRODUCT_ID,
      userId,
      email: `${userId}@example.com`,
      price: 1999, // ₹19.99 in paise
    })
  );

  const results = await Promise.allSettled(promises);
  const duration = Date.now() - startTime;

  console.log(`Completed all checkouts in ${duration}ms.`);
  console.log("--------------------------------------------------");

  // 3. Process outcomes
  let confirmedCount = 0;
  let soldOutCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled") {
      const outcome = result.value;
      if (outcome.success) {
        confirmedCount++;
      } else if (outcome.reason === "SOLD_OUT") {
        soldOutCount++;
      } else {
        errorCount++;
        if (outcome.error) {
          console.error(`[ERROR] Checkout transaction error: ${outcome.error}`);
        }
      }
    } else {
      errorCount++;
      console.error(`[REJECTED] Promise rejection error:`, result.reason);
    }
  }

  const oversellDetected = confirmedCount > INVENTORY;

  // 4. Print results table
  console.log("STRESS TEST RESULTS TABLE:");
  console.log(`- CONFIRMED:         ${confirmedCount} (Expected: ${INVENTORY})`);
  console.log(`- SOLD_OUT:          ${soldOutCount} (Expected: ${CONCURRENT_REQUESTS - INVENTORY})`);
  console.log(`- ERROR:             ${errorCount} (Expected: 0)`);
  console.log(`- OVERSELL DETECTED: ${oversellDetected ? "YES ❌" : "NO  ✅"}`);
  console.log("==================================================");

  // 5. Assertions and Exit Codes
  if (oversellDetected) {
    console.error("FAIL: Oversell detected! Available stock was overallocated under concurrency.");
    process.exit(1);
  }

  if (confirmedCount !== INVENTORY) {
    console.error(`FAIL: Confirmed checkouts (${confirmedCount}) did not meet expected inventory (${INVENTORY}).`);
    process.exit(1);
  }

  console.log("SUCCESS: Stress test passed successfully! Isolation locks held under pressure.");
  process.exit(0);
}

runStressTest().catch((err) => {
  console.error("Stress test crashed during execution:", err);
  process.exit(1);
});
