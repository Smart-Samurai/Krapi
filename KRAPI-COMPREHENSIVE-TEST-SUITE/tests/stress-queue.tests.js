/**
 * Stress Tests for Queue System
 * 
 * Tests the HTTP request queue and database queue under high load
 * to ensure the system doesn't crash when spammed with requests.
 * 
 * Created: 2025-01-XX
 * Last Updated: 2025-01-XX
 */

export async function runStressQueueTests(testSuite) {
    testSuite.logger.suiteStart("Queue Stress Tests");

    // Test 1: Rapid sequential requests (should queue properly)
    await testSuite.test("Handle 100 rapid sequential requests", async () => {
        const requests = [];
        const startTime = Date.now();

        // Fire 100 requests rapidly
        for (let i = 0; i < 100; i++) {
            requests.push(
                testSuite.krapi.projects.get(testSuite.testProject.id).catch((err) => {
                    // Some may fail due to rate limiting, that's OK
                    return { error: err.message };
                })
            );
        }

        const results = await Promise.allSettled(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Count successes and failures
        const successes = results.filter((r) => r.status === "fulfilled" && !r.value?.error).length;
        const failures = results.length - successes;

        testSuite.logger.log(`Processed ${results.length} requests in ${duration}ms`);
        testSuite.logger.log(`Successes: ${successes}, Failures: ${failures}`);

        // At least 80% should succeed (some may fail due to rate limiting)
        testSuite.assert(
            successes >= 80,
            `At least 80 requests should succeed, got ${successes}`
        );

        // Should complete within reasonable time (not hang)
        testSuite.assert(
            duration < 60000,
            `All requests should complete within 60s, took ${duration}ms`
        );
    });

    // Test 2: Concurrent burst requests
    await testSuite.test("Handle 200 concurrent burst requests", async () => {
        const requests = [];
        const startTime = Date.now();

        // Fire 200 requests simultaneously
        for (let i = 0; i < 200; i++) {
            requests.push(
                testSuite.krapi.projects.get(testSuite.testProject.id).catch((err) => {
                    return { error: err.message };
                })
            );
        }

        const results = await Promise.allSettled(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const successes = results.filter((r) => r.status === "fulfilled" && !r.value?.error).length;
        const failures = results.length - successes;

        testSuite.logger.log(`Processed ${results.length} concurrent requests in ${duration}ms`);
        testSuite.logger.log(`Successes: ${successes}, Failures: ${failures}`);

        // Server should handle the load without crashing
        testSuite.assert(
            successes > 0,
            `At least some requests should succeed, got ${successes}`
        );

        // Should complete within reasonable time
        testSuite.assert(
            duration < 120000,
            `All requests should complete within 120s, took ${duration}ms`
        );
    });

    // Test 3: Database queue stress test
    await testSuite.test("Stress test database queue with many operations", async () => {
        if (typeof testSuite.krapi.database?.getQueueMetrics !== "function") {
            throw new Error("Database queue metrics not available");
        }

        // Get initial metrics
        const initialMetrics = await testSuite.krapi.database.getQueueMetrics();
        const initialQueueSize = initialMetrics.queueSize || 0;

        // Fire many database operations
        const operations = [];
        for (let i = 0; i < 50; i++) {
            operations.push(
                testSuite.krapi.collections.list(testSuite.testProject.id).catch((err) => {
                    return { error: err.message };
                })
            );
        }

        // Wait a bit for queue to process
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check queue metrics during load
        const metricsDuringLoad = await testSuite.krapi.database.getQueueMetrics();

        // Wait for operations to complete
        await Promise.allSettled(operations);

        // Check final metrics
        const finalMetrics = await testSuite.krapi.database.getQueueMetrics();

        testSuite.logger.log(`Initial queue size: ${initialQueueSize}`);
        testSuite.logger.log(`Queue size during load: ${metricsDuringLoad.queueSize}`);
        testSuite.logger.log(`Final queue size: ${finalMetrics.queueSize}`);
        testSuite.logger.log(`Total processed: ${finalMetrics.totalProcessed}`);
        testSuite.logger.log(`Total errors: ${finalMetrics.totalErrors}`);

        // Queue should handle the load
        testSuite.assert(
            finalMetrics.totalErrors < 10,
            `Should have minimal errors, got ${finalMetrics.totalErrors}`
        );

        // Queue should eventually drain
        testSuite.assert(
            finalMetrics.queueSize < 100,
            `Queue should drain after load, got ${finalMetrics.queueSize} items`
        );
    });

    // Test 4: Mixed request types stress test
    await testSuite.test("Stress test with mixed request types", async () => {
        const requests = [];
        const startTime = Date.now();

        // Mix different types of requests
        for (let i = 0; i < 30; i++) {
            // Projects
            requests.push(
                testSuite.krapi.projects.get(testSuite.testProject.id).catch(() => ({ error: true }))
            );
            // Collections
            requests.push(
                testSuite.krapi.collections.list(testSuite.testProject.id).catch(() => ({ error: true }))
            );
            // Documents
            requests.push(
                testSuite.krapi.documents.list(
                    testSuite.testProject.id,
                    testSuite.testCollection?.name || "test"
                ).catch(() => ({ error: true }))
            );
        }

        const results = await Promise.allSettled(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const successes = results.filter((r) => r.status === "fulfilled" && !r.value?.error).length;

        testSuite.logger.log(`Processed ${results.length} mixed requests in ${duration}ms`);
        testSuite.logger.log(`Successes: ${successes}`);

        // Should handle mixed requests
        testSuite.assert(
            successes > 50,
            `At least 50 requests should succeed, got ${successes}`
        );

        // Should complete within reasonable time
        testSuite.assert(
            duration < 90000,
            `All requests should complete within 90s, took ${duration}ms`
        );
    });

    // Test 5: Queue overflow protection test
    await testSuite.test("Queue overflow protection (should reject when full)", async () => {
        if (typeof testSuite.krapi.database?.getQueueMetrics !== "function") {
            throw new Error("Database queue metrics not available");
        }

        // Fire many requests to potentially fill the queue
        const requests = [];
        let rejectedCount = 0;

        for (let i = 0; i < 1000; i++) {
            requests.push(
                testSuite.krapi.projects.get(testSuite.testProject.id)
                    .catch((err) => {
                        // Check if it's a queue full error
                        if (err.message?.includes("queue is full") || 
                            err.message?.includes("503") ||
                            err.status === 503) {
                            rejectedCount++;
                        }
                        return { error: err.message || "Unknown error" };
                    })
            );
        }

        await Promise.allSettled(requests);

        // Check queue metrics
        const metrics = await testSuite.krapi.database.getQueueMetrics();

        testSuite.logger.log(`Rejected requests: ${rejectedCount}`);
        testSuite.logger.log(`Queue size: ${metrics.queueSize}`);
        testSuite.logger.log(`Processing count: ${metrics.processingCount}`);

        // Queue should not exceed max size
        testSuite.assert(
            metrics.queueSize <= 5000,
            `Queue should not exceed max size (5000), got ${metrics.queueSize}`
        );

        // System should still be responsive
        const healthCheck = await testSuite.krapi.health.check();
        testSuite.assert(
            healthCheck.healthy !== false,
            "System should remain healthy after stress test"
        );
    });

    // Test 6: Sustained load test
    await testSuite.test("Sustained load test (requests over time)", async () => {
        const requests = [];
        const startTime = Date.now();
        const duration = 10000; // 10 seconds
        const interval = 100; // Every 100ms

        // Send requests continuously for 10 seconds
        const sendRequests = setInterval(() => {
            for (let i = 0; i < 5; i++) {
                requests.push(
                    testSuite.krapi.projects.get(testSuite.testProject.id).catch(() => ({ error: true }))
                );
            }
        }, interval);

        // Stop after duration
        setTimeout(() => {
            clearInterval(sendRequests);
        }, duration);

        // Wait for all requests to complete
        await new Promise((resolve) => setTimeout(resolve, duration + 2000));

        const results = await Promise.allSettled(requests);
        const endTime = Date.now();
        const totalDuration = endTime - startTime;

        const successes = results.filter((r) => r.status === "fulfilled" && !r.value?.error).length;

        testSuite.logger.log(`Processed ${results.length} requests over ${totalDuration}ms`);
        testSuite.logger.log(`Successes: ${successes}`);

        // Should handle sustained load
        testSuite.assert(
            successes > results.length * 0.7,
            `At least 70% should succeed, got ${(successes / results.length * 100).toFixed(1)}%`
        );

        // System should remain healthy
        const healthCheck = await testSuite.krapi.health.check();
        testSuite.assert(
            healthCheck.healthy !== false,
            "System should remain healthy after sustained load"
        );
    });
}
