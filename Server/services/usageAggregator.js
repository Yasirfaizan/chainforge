/**
 * Nightly aggregation of ApiUsageLog into DailyUsage.
 */
import ApiUsageLog from "../models/ApiUsageLog.js";
import DailyUsage from "../models/DailyUsage.js";

function dayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function aggregateUsageForDate(date = new Date()) {
  const day = dayString(date);
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(`${day}T23:59:59.999Z`);
  const rows = await ApiUsageLog.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: { apiKeyId: "$apiKeyId", userId: "$userId" }, totalCalls: { $sum: 1 } } },
  ]);

  await Promise.all(
    rows.map((row) =>
      DailyUsage.updateOne(
        {
          apiKeyId: row._id.apiKeyId,
          userId: row._id.userId,
          date: day,
        },
        { $set: { totalCalls: row.totalCalls } },
        { upsert: true },
      ),
    ),
  );
}

export function startUsageAggregationJob() {
  // Run every 24h; first run at startup for today's partial data.
  aggregateUsageForDate().catch(() => {});
  setInterval(() => {
    aggregateUsageForDate().catch(() => {});
  }, 24 * 60 * 60 * 1000).unref();
}

