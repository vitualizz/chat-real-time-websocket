import { type APIGatewayEvent } from 'aws-lambda';
import dbClient from '../clients/dynamodb';
import { ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { validateEvent } from '../validators/params';

const nodeEnv = process.env.SLS_NODE_ENV;
export default async (event: APIGatewayEvent) => {
  const { chatId } = validateEvent(event);

  console.log('Broadcasting to the chat', chatId);

  if (!event.body) {
    return {
      statusCode: 400,
      body: {
        message: 'No message provided',
      },
    };
  }

  const { userId, content } = JSON.parse(event.body);
  const putCommand = {
    TableName: `real-time-chat-${nodeEnv}-messages`,
    Item: {
      chatId: { S: chatId },
      messageId: { S: String(Date.now() + chatId + userId) },
      userId: { S: userId },
      content: { S: content },
    },
  };

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
    await dbClient.send(new PutItemCommand(putCommand));
    const data = await dbClient.send(new ScanCommand(scanCommand));
    const connections = data.Items || [];

    for (const connection of connections) {
      const connectionId = connection.connectionId.S;
      try {
        await apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: String(content),
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