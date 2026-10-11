/**
 * Lambda: updateStatus
 * PUT /reports/{id}/status
 *
 * Body: { status: 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED', assignedTo?: string }
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

const VALID_TRANSITIONS = {
  REPORTED:    ['ASSIGNED'],
  ASSIGNED:    ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED:    [],
};

exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');
    const { status: newStatus, assignedTo } = body;

    if (!id) return response(400, { error: 'Report ID is required.' });
    if (!newStatus) return response(400, { error: 'status is required in request body.' });

    // Fetch current report
    const current = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { id } }));
    if (!current.Item) return response(404, { error: `Report ${id} not found.` });

    const allowed = VALID_TRANSITIONS[current.Item.status] || [];
    if (!allowed.includes(newStatus)) {
      return response(400, {
        error: `Invalid transition from ${current.Item.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}.`,
      });
    }

    const now = new Date().toISOString();
    const updates = { status: newStatus };
    if (newStatus === 'ASSIGNED')    { updates.assignedAt = now; if (assignedTo) updates.assignedTo = assignedTo; }
    if (newStatus === 'IN_PROGRESS') updates.startedAt  = now;
    if (newStatus === 'RESOLVED')    updates.resolvedAt  = now;

    // Build DynamoDB update expression
    const exprParts = [];
    const exprNames = {};
    const exprValues = {};
    Object.entries(updates).forEach(([k, v], i) => {
      exprParts.push(`#k${i} = :v${i}`);
      exprNames[`#k${i}`] = k;
      exprValues[`:v${i}`] = v;
    });

    const updated = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `SET ${exprParts.join(', ')}`,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: 'ALL_NEW',
    }));

    return response(200, updated.Attributes);
  } catch (err) {
    console.error('updateStatus error:', err);
    return response(500, { error: 'Failed to update status.' });
  }
};

function response(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
