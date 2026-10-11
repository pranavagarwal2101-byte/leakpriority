/**
 * Lambda: createReport
 * POST /reports
 *
 * Validates a new leak report, calculates its priority score, and saves it to DynamoDB.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { calculatePriorityScore } = require('./scoring');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const errors = validate(body);
    if (Object.keys(errors).length) {
      return response(400, { error: 'Validation failed', details: errors });
    }

    // Generate ID (count-based for prototype; use UUID in production)
    const count = await getCount();
    const id = `LK-${String(count + 1).padStart(3, '0')}`;

    const scoring = calculatePriorityScore({
      severity: body.severity,
      waterLossRate: parseFloat(body.waterLossRate) || 0,
      affectedHouseholds: parseInt(body.affectedHouseholds, 10) || 0,
      hoursUnresolved: 0, // new report
      nearCriticalFacility: Boolean(body.nearCriticalFacility),
    });

    const item = {
      id,
      location: body.location.trim(),
      zone: body.zone || 'Unspecified',
      severity: body.severity,
      waterLossRate: parseFloat(body.waterLossRate) || 0,
      affectedHouseholds: parseInt(body.affectedHouseholds, 10) || 0,
      nearCriticalFacility: Boolean(body.nearCriticalFacility),
      criticalFacilityName: body.criticalFacilityName || '',
      createdAt: new Date().toISOString(),
      status: 'REPORTED',
      reportedBy: body.reportedBy || 'Staff',
      notes: body.notes || '',
      assignedTo: '',
      assignedAt: null,
      startedAt: null,
      resolvedAt: null,
      // Denormalised score for GSI sorting
      priorityScore: scoring.total,
      priorityCategory: scoring.category,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return response(201, item);
  } catch (err) {
    console.error('createReport error:', err);
    return response(500, { error: 'Failed to create report.' });
  }
};

function validate(body) {
  const errors = {};
  if (!body.location?.trim()) errors.location = 'Location is required.';
  if (!body.severity || !['CRITICAL','HIGH','MEDIUM','LOW'].includes(body.severity)) {
    errors.severity = 'Valid severity is required (CRITICAL, HIGH, MEDIUM, LOW).';
  }
  const lph = parseFloat(body.waterLossRate);
  if (isNaN(lph) || lph < 0) errors.waterLossRate = 'Valid flow rate (≥ 0 L/h) is required.';
  const hh = parseInt(body.affectedHouseholds, 10);
  if (isNaN(hh) || hh < 0) errors.affectedHouseholds = 'Valid household count (≥ 0) is required.';
  if (!body.reportedBy?.trim()) errors.reportedBy = 'reportedBy is required.';
  return errors;
}

async function getCount() {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    Select: 'COUNT',
  }));
  return result.Count || 0;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}
