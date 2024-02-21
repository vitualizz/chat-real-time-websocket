import { type APIGatewayEvent } from 'aws-lambda'
import dbClient from '../clients/dynamodb'
import { PutItemCommand } from '@aws-sdk/client-dynamodb'
import { validateEvent } from '../validators/params'

const nodeEnv = process.env.SLS_NODE_ENV
export default async (event: APIGatewayEvent) => {
  const { connectionId, userId } = validateEvent(event)

  console.log('Connected to the DynamoDB')
  console.log('Connection ID:', connectionId)
  console.log('User ID:', userId)

  const putParams = {
    TableName: `real-time-chat-ws-${nodeEnv}-connections`,
    Item: {
      connectionId: { S: connectionId },
      userId: { S: userId },
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
    body: 'Connected'
  }
}
