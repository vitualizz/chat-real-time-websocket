import { type APIGatewayEvent } from 'aws-lambda'

export const validateEvent = (event: APIGatewayEvent) => {
  const connectionId = event.requestContext.connectionId
  const chatId = event.queryStringParameters?.chatId

  if (!connectionId) {
    throw 'Connection ID not found'
  }

  if (!chatId) {
    throw 'Chat ID not found'
  }

  return {
    connectionId,
    chatId
  }
}