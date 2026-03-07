/**
 * Trigger a trending job manually
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6380,
  db: 0,
});

const trendingQueue = new Queue('trending-queue', { connection: redis });

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
  console.log('Waiting 10 seconds for job to be processed...');

  // Wait and check job status
  await new Promise(resolve => setTimeout(resolve, 10000));

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
