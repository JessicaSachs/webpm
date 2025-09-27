// Microservices Example - TypeScript exercises
import express from 'express'
import axios from 'axios'

// Service interfaces
interface User {
  id: string
  name: string
  email: string
}

interface AuthService {
  validateToken(token: string): Promise<User>
}

interface ApiService {
  getUsers(): Promise<User[]>
  createUser(user: Omit<User, 'id'>): Promise<User>
}

// Auth service implementation
class AuthServiceImpl implements AuthService {
  async validateToken(token: string): Promise<User> {
    // Mock JWT validation
    if (token === 'valid-token') {
      return { id: '1', name: 'John Doe', email: 'john@example.com' }
    }
    throw new Error('Invalid token')
  }
}

// API service implementation
class ApiServiceImpl implements ApiService {
  private users: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  ]

  async getUsers(): Promise<User[]> {
    return this.users
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const newUser: User = {
      id: (this.users.length + 1).toString(),
      ...user,
    }
    this.users.push(newUser)
    return newUser
  }
}

// Gateway service
class GatewayService {
  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  async handleRequest(req: any): Promise<any> {
    try {
      const user = await this.authService.validateToken(
        req.headers.authorization
      )
      return await this.apiService.getUsers()
    } catch (error) {
      throw new Error('Unauthorized')
    }
  }
}

// Service factory
class ServiceFactory {
  static createAuthService(): AuthService {
    return new AuthServiceImpl()
  }

  static createApiService(): ApiService {
    return new ApiServiceImpl()
  }

  static createGateway(): GatewayService {
    return new GatewayService(this.createAuthService(), this.createApiService())
  }
}

// Example usage
const gateway = ServiceFactory.createGateway()
const result = await gateway.handleRequest({
  headers: { authorization: 'valid-token' },
})

console.log('Microservices result:', result)
