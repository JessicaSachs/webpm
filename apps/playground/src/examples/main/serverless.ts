// Serverless Example - TypeScript exercises
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import { DynamoDB } from 'aws-sdk'

// Types
interface User {
  id: string
  name: string
  email: string
}

interface CreateUserRequest {
  name: string
  email: string
}

// Lambda handlers
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const { httpMethod, pathParameters, body } = event
    
    switch (httpMethod) {
      case 'GET':
        return await getUsers()
      case 'POST':
        return await createUser(JSON.parse(body || '{}'))
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Get users
async function getUsers(): Promise<APIGatewayProxyResult> {
  const dynamoDB = new DynamoDB.DocumentClient()
  
  const result = await dynamoDB.scan({
    TableName: 'Users'
  }).promise()
  
  return {
    statusCode: 200,
    body: JSON.stringify(result.Items)
  }
}

// Create user
async function createUser(userData: CreateUserRequest): Promise<APIGatewayProxyResult> {
  const dynamoDB = new DynamoDB.DocumentClient()
  
  const user: User = {
    id: Date.now().toString(),
    ...userData
  }
  
  await dynamoDB.put({
    TableName: 'Users',
    Item: user
  }).promise()
  
  return {
    statusCode: 201,
    body: JSON.stringify(user)
  }
}
