/**
 * Lambda: getReport
 * GET /reports/{id}
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { calculatePriorityScore, deriveHoursUnresolved } = require('./scoring');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) return response(400, { error: 'Report ID is required.' });

    const result = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    if (!result.Item) return response(404, { error: `Report ${id} not found.` });

    const hours = result.Item.status === 'RESOLVED'
      ? Math.max(0, (new Date(result.Item.resolvedAt) - new Date(result.Item.createdAt)) / 3600000)
      : deriveHoursUnresolved(result.Item.createdAt);

    const scoring = calculatePriorityScore({
      severity: result.Item.severity,
      waterLossRate: result.Item.waterLossRate,
      affectedHouseholds: result.Item.affectedHouseholds,
      hoursUnresolved: hours,
      nearCriticalFacility: result.Item.nearCriticalFacility,
    });

    return response(200, { ...result.Item, hoursUnresolved: hours, priorityScore: scoring.total, priorityCategory: scoring.category });
  } catch (err) {
    console.error('getReport error:', err);
    return response(500, { error: 'Failed to retrieve report.' });
  }
};

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
