import { type APIGatewayEvent } from 'aws-lambda'

export const validateEvent = (event: APIGatewayEvent) => {
  const connectionId = event.requestContext.connectionId
  const userId = event.queryStringParameters?.userId

  if (!connectionId) {
    throw 'Connection ID not found'
  }

  if (!userId) {
    throw 'User ID not found'
  }

  return {
    connectionId,
    userId
  }
}
