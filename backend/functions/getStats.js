/**
 * Lambda: getStats
 * GET /stats
 *
 * Returns dashboard aggregate statistics across all reports.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { calculatePriorityScore, deriveHoursUnresolved } = require('./scoring');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = result.Items || [];

    const enriched = items.map((raw) => {
      const h = raw.status === 'RESOLVED'
        ? Math.max(0, (new Date(raw.resolvedAt) - new Date(raw.createdAt)) / 3600000)
        : deriveHoursUnresolved(raw.createdAt);
      const scoring = calculatePriorityScore({
        severity: raw.severity, waterLossRate: raw.waterLossRate,
        affectedHouseholds: raw.affectedHouseholds, hoursUnresolved: h,
        nearCriticalFacility: raw.nearCriticalFacility,
      });
      return { ...raw, hoursUnresolved: h, priorityScore: scoring.total, priorityCategory: scoring.category };
    });

    const active = enriched.filter((r) => r.status !== 'RESOLVED');
    const resolved = enriched.filter((r) => r.status === 'RESOLVED');

    const dailyLoss = active.reduce((s, r) => s + (parseFloat(r.waterLossRate) || 0) * 24, 0);
    const waterSaved = resolved.reduce((s, r) => {
      const lph = parseFloat(r.waterLossRate) || 0;
      if (!lph || !r.resolvedAt || !r.createdAt) return s;
      const h = Math.max(0, (new Date(r.resolvedAt) - new Date(r.createdAt)) / 3600000);
      return s + lph * h;
    }, 0);

    return response(200, {
      total: enriched.length,
      critical: enriched.filter((r) => r.priorityCategory === 'CRITICAL' && r.status !== 'RESOLVED').length,
      pending: enriched.filter((r) => ['REPORTED','ASSIGNED','IN_PROGRESS'].includes(r.status)).length,
      resolved: resolved.length,
      estimatedDailyLossLitres: Math.round(dailyLoss),
      estimatedWaterSavedLitres: Math.round(waterSaved),
    });
  } catch (err) {
    console.error('getStats error:', err);
    return response(500, { error: 'Failed to compute statistics.' });
  }
};

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
