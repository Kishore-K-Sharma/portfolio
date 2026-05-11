---
title: "From N+1 to O(1): Optimizing Complex Billing Schedules"
description: "How resolving redundant API calls and leveraging caching transformed a sluggish billing generation process into a performant operation."
date: "2026-05-11"
tags: ["backend", "performance", "database", "caching"]
---

Performance bottlenecks in enterprise software rarely appear overnight. Instead, they creep in gradually—a few extra database queries here, an unoptimized API call there. Before you know it, a core process like lease billing generation takes seconds (or minutes) instead of milliseconds.

I recently tackled a significant performance issue involving a lease billing schedule. The objective was to optimize the generation of lease updates, streamline per diem rate retrievals, and eliminate redundant payment duplicate checks.

Here is a look at how we identified the bottlenecks and the strategies used to dramatically improve system responsiveness.

## The Bottleneck: The N+1 Problem in Disguise

When generating billing schedules, the system needed to perform several operations for every single day or billing period in a lease:
1. Fetch the applicable per diem rate.
2. Check for duplicate payments.
3. Validate lease metadata against external APIs.

Initially, these operations were executed sequentially within a loop. If a lease had 30 billing periods, the system made 30 separate API calls to fetch rates and 30 separate database queries to check for duplicates. 

This is the classic N+1 problem, but instead of just hitting the database, it was hitting internal APIs, multiplying the network latency and dragging down the entire system.

![A flow diagram showing a single loop making multiple sequential API and database calls per iteration.](/writing/billing-n1-issue.svg "The N+1 problem manifesting through network calls and database queries.")

## The Strategy: Batching and Caching

To resolve this, we needed to shift from a sequential, per-item retrieval model to a bulk, batched model. The goal was to fetch everything the loop needed *before* the loop even started.

### 1. Bulk Retrievals and In-Memory Maps
Instead of fetching per diem rates inside the loop, we updated the query to fetch all rates for the entire lease duration in a single database call. We then constructed an in-memory hash map (or dictionary) keyed by date. 

Inside the loop, looking up the rate became an O(1) in-memory operation rather than a network request.

### 2. Optimizing Duplicate Checks
Duplicate checks are notoriously expensive. Instead of running a `SELECT COUNT(*)` for every potential payment, we queried all existing payments for the lease upfront. By storing these existing payment hashes in a `Set`, duplicate verification became instantaneous.

### 3. Aggressive Cache Management
For metadata that rarely changes (like tax rates or regional policies), we introduced an aggressive caching layer using Redis. We wrapped the external API calls in a caching function with a reasonable Time-To-Live (TTL), drastically reducing external network round-trips.

![A diagram showing data being fetched in bulk upfront and stored in memory, allowing the loop to execute instantaneously.](/writing/billing-cache-solution.svg "Batching and caching eliminate in-loop network calls.")

## The Implementation

Here is a simplified example of how we refactored the generation logic in Node.js to use bulk fetching and maps:

```typescript
// BEFORE: The sluggish N+1 approach
async function generateBillingSlow(leaseId: string, periods: Date[]) {
  const bills = [];
  for (const date of periods) {
    // 🔴 Network call inside a loop!
    const rate = await getPerDiemRate(leaseId, date); 
    const isDuplicate = await checkDuplicate(leaseId, date); // 🔴 DB query!
    
    if (!isDuplicate) {
       bills.push(createBill(rate, date));
    }
  }
  return bills;
}

// AFTER: The optimized O(1) approach
async function generateBillingFast(leaseId: string, periods: Date[]) {
  const startDate = periods[0];
  const endDate = periods[periods.length - 1];

  // 🟢 Single bulk fetch for all rates
  const ratesMap = await getPerDiemRatesBulk(leaseId, startDate, endDate);
  
  // 🟢 Single bulk fetch for existing payments
  const existingPaymentsSet = await getExistingPayments(leaseId);

  const bills = [];
  for (const date of periods) {
    // 🟢 O(1) in-memory lookups
    const rate = ratesMap.get(date.toISOString()); 
    const isDuplicate = existingPaymentsSet.has(date.toISOString());
    
    if (rate && !isDuplicate) {
       bills.push(createBill(rate, date));
    }
  }
  return bills;
}
```

## The Results

By replacing repetitive network calls with single bulk queries and in-memory data structures, the processing time for lease updates dropped by over 80%. 

The lesson here is simple: loops and network calls are natural enemies. Whenever you find yourself fetching data inside an iteration, pause and ask yourself if you can pull that data out of the loop. Batch your queries, cache your constants, and let the CPU do the work it was designed to do locally.
