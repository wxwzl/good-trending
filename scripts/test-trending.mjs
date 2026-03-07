/**
 * Test script to trigger a trending job manually
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
});

const trendingQueue = new Queue('trending', { connection: redis });

async function triggerTrendingJob() {
  console.log('Triggering trending job...');

  const job = await trendingQueue.add(
    'update',
    {
      type: 'update',
      triggeredBy: 'manual-test',
      timestamp: new Date().toISOString(),
    },
    {
      jobId: `trending-update-${Date.now()}-test`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );

  console.log(`Job added: ${job.id}`);

  // Wait a bit and check job status
  await new Promise(resolve => setTimeout(resolve, 5000));

  const status = await job.getState();
  console.log(`Job status: ${status}`);

  if (status === 'failed') {
    const failedReason = job.failedReason;
    console.error(`Job failed: ${failedReason}`);
  } else if (status === 'completed') {
    console.log('Job completed successfully!');
    const returnValue = await job.returnvalue;
    console.log(`Return value:`, returnValue);
  }

  await redis.quit();
  process.exit(0);
}

triggerTrendingJob().catch(err => {
  console.error('Error:', err);
  redis.quit();
  process.exit(1);
});
