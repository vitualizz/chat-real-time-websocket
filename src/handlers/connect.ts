import { type APIGatewayEvent } from 'aws-lambda'
import dbClient from '../clients/dynamodb'
import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { validateEvent } from '../validators/params'

const nodeEnv = process.env.SLS_NODE_ENV
export default async (event: APIGatewayEvent) => {
  const { connectionId, chatId } = validateEvent(event)

  console.log('Connected to the DynamoDB')

  const putParams = {
    TableName: `real-time-chat-${nodeEnv}-connections`,
    Item: {
      connectionId: { S: connectionId },
      chatId: { S: chatId },
    },
  }

  try {
    await dbClient.send(new PutItemCommand(putParams))
  } catch (error) {
    return {
      statusCode: 500,
      body: {
        message: 'Error connecting to the database',
      },
    }
  }

  return {
    statusCode: 200,
    body: {
      message: 'Connected to the database',
    }
  }
}