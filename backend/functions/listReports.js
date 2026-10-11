/**
 * Lambda: listReports
 * GET /reports
 *
 * Returns all leak reports from DynamoDB, enriched with live priority scores,
 * sorted by score descending (active first, resolved last).
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { calculatePriorityScore, deriveHoursUnresolved } = require('./scoring');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    // Scan all reports (acceptable for prototype scale; use pagination for production)
    const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    const reports = (result.Items || []).map(enrich);

    // Sort: active by score desc; resolved at end
    reports.sort((a, b) => {
      if (a.status === 'RESOLVED' && b.status !== 'RESOLVED') return 1;
      if (b.status === 'RESOLVED' && a.status !== 'RESOLVED') return -1;
      return b.priorityScore - a.priorityScore;
    });

    return response(200, reports);
  } catch (err) {
    console.error('listReports error:', err);
    return response(500, { error: 'Failed to retrieve reports.' });
  }
};

function enrich(raw) {
  const hoursUnresolved =
    raw.status === 'RESOLVED'
      ? Math.max(0, (new Date(raw.resolvedAt) - new Date(raw.createdAt)) / (1000 * 60 * 60))
      : deriveHoursUnresolved(raw.createdAt);

  const scoring = calculatePriorityScore({
    severity: raw.severity,
    waterLossRate: raw.waterLossRate,
    affectedHouseholds: raw.affectedHouseholds,
    hoursUnresolved,
    nearCriticalFacility: raw.nearCriticalFacility,
  });

  return { ...raw, hoursUnresolved, priorityScore: scoring.total, priorityCategory: scoring.category };
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
