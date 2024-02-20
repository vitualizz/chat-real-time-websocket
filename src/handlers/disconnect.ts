import { type APIGatewayEvent } from 'aws-lambda';
import dbClient from '../clients/dynamodb';
import { DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { validateEvent } from '../validators/params';

const nodeEnv = process.env.SLS_NODE_ENV;
export default async (event: APIGatewayEvent) => {
  const { connectionId, chatId } = validateEvent(event);

  console.log('Disconnecting from the DynamoDB');

  const deleteCommand = {
    TableName: `real-time-chat-${nodeEnv}-connections`,
    Key: {
      connectionId: { S: connectionId },
      chatId: { S: chatId },
    },
  }

  try {
    await dbClient.send(new DeleteItemCommand(deleteCommand));
  } catch (error) {
    return {
      statusCode: 500,
      body: {
        message: 'Error disconnecting from the database',
      },
    }
  }

  return {
    statusCode: 200,
    body: {
      message: 'Disconnected from the database',
    }
  }
}