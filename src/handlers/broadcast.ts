import { type APIGatewayEvent } from 'aws-lambda';
import dbClient from '../clients/dynamodb';
import { ScanCommand } from '@aws-sdk/client-dynamodb';
import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { validateEvent } from '../validators/params';

const nodeEnv = process.env.SLS_NODE_ENV;
export default async (event: APIGatewayEvent) => {
  const { chatId } = validateEvent(event);

  console.log('Broadcasting to the chat', chatId);

  const scanCommand = {
    TableName: `real-time-chat-${nodeEnv}-connections`,
    FilterExpression: 'chatId = :chatId',
    ExpressionAttributeValues: {
      ':chatId': { S: chatId },
    },
  };

  const endpoint = 'https://' + event.requestContext.domainName + '/' + event.requestContext.stage;
  const apiGateway = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint,
  });

  try {
    const data = await dbClient.send(new ScanCommand(scanCommand));
    const connections = data.Items || [];

    const postData = JSON.stringify(event.body);

    for (const connection of connections) {
      const connectionId = connection.connectionId.S;
      try {
        await apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: postData,
        });
      } catch (error) {
        console.log('Error broadcasting to connection', connectionId);
      }
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: {
        message: 'Error broadcasting to the chat',
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      message: 'Broadcasted to the chat',
    },
  };
}