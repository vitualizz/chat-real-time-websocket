import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const region = process.env.SLS_AWS_REGION || 'us-east-1'

const client = new DynamoDBClient({ region })

export default client