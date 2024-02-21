import { type APIGatewayEvent } from 'aws-lambda';
import dbClient from '../clients/dynamodb';
import { ScanCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { validateEvent } from '../validators/params';

const nodeEnv = process.env.SLS_NODE_ENV;
export default async (event: APIGatewayEvent) => {
  if (!event.body) {
    console.log('No body provided');
    return {
      statusCode: 400,
      body: {
        message: 'No message provided',
      },
    };
  }

  const postData = JSON.parse(event.body as string).data;
  console.log('postData', postData);
  const { chatId, content, userIds, currentUserId } = postData

  if (!currentUserId) {
    console.log('No current user ID provided');
    return {
      statusCode: 400,
      body: {
        message: 'No current user ID provided',
      },
    };
  }

  if (!userIds) {
    console.log('No user IDs provided');
    return {
      statusCode: 400,
      body: {
        message: 'No user IDs provided',
      },
    };
  }

  console.log('Broadcasting to the chat', userIds);

  const putCommand = {
    TableName: `real-time-chat-ws-${nodeEnv}-messages`,
    Item: {
      userId: { S: String(currentUserId) },
      messageId: { S: String(Date.now() + currentUserId) },
      chatId: { S: String(chatId) },
      content: { S: content },
    },
  };

  try {
    await dbClient.send(new PutItemCommand(putCommand));
  } catch (error) {
    console.log('Error saving the message');
    return {
      statusCode: 500,
      body: {
        message: 'Error saving the message',
      },
    };
  }

  let connections: any = [];

  const scanCommand = (userId: string) => ({
    TableName: `real-time-chat-ws-${nodeEnv}-connections`,
    FilterExpression: '#userId = :userId',
    ExpressionAttributeValues: {
      ':userId': { S: userId },
    },
    ExpressionAttributeNames: {
      '#userId': 'userId',
    },
  });

  const endpoint = 'https://' + event.requestContext.domainName + '/' + event.requestContext.stage;
  const apiGateway = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint,
  });

  const promisesScan = userIds.map(async (userId: string) => {
    try {
      const data = await dbClient.send(new ScanCommand(scanCommand(String(userId))));
      connections = connections.concat(data.Items || []);
    } catch (error) {
      console.log('Error scanning the connections');
      return {
        statusCode: 500,
        body: {
          message: 'Error scanning the connections',
        },
      };
    }
  })

  try {
    await Promise.all(promisesScan);
    console.log('Connections found', connections);
  } catch (error) {
    console.log('Error scanning the connections');
    return {
      statusCode: 500,
      body: {
        message: 'Error scanning the connections',
      },
    };
  }

  const promisesPostConnections = connections.map(async (connection: any) => {
    const connectionId = connection.connectionId.S as string;
    try {
      await apiGateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          chatId,
          content,
          userId: currentUserId,
        }),
      });
    } catch (error: any) {
      if (error.statusCode === 410) {
        console.log('Stale connection found');
        return dbClient.send(new DeleteItemCommand({
          TableName: `real-time-chat-ws-${nodeEnv}-connections`,
          Key: {
            connectionId: { S: connectionId },
            userId: { S: currentUserId },
          },
        }));
      }
    }
  })

  try {
    await Promise.all(promisesPostConnections);
  } catch (error) {
    console.log('Error posting to connections');
    return {
      statusCode: 500,
      body: {
        message: 'Error posting to connections',
      },
    };
  }

  return {
    statusCode: 200,
    body: 'Data sent',
  };
}
