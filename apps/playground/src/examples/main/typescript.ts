// TypeScript Project Example - Advanced TypeScript exercises
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

// Load environment variables
dotenv.config()

// Type definitions and interfaces
interface User {
  id: number
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

interface CreateUserRequest {
  email: string
  name: string
}

interface UpdateUserRequest {
  email?: string
  name?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Zod schemas for runtime validation
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
})

// Generic repository pattern with TypeScript
interface Repository<T, CreateInput, UpdateInput> {
  findAll(): Promise<T[]>
  findById(id: number): Promise<T | null>
  create(input: CreateInput): Promise<T>
  update(id: number, input: UpdateInput): Promise<T | null>
  delete(id: number): Promise<boolean>
}

class UserRepository
  implements Repository<User, CreateUserRequest, UpdateUserRequest>
{
  constructor(private prisma: PrismaClient) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    })
  }

  async create(input: CreateUserRequest): Promise<User> {
    return this.prisma.user.create({
      data: input,
    })
  }

  async update(id: number, input: UpdateUserRequest): Promise<User | null> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: input,
      })
    } catch {
      return null
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id },
      })
      return true
    } catch {
      return false
    }
  }
}

// Service layer with business logic
class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers(): Promise<ApiResponse<User[]>> {
    try {
      const users = await this.userRepository.findAll()
      return {
        success: true,
        data: users,
        message: 'Users retrieved successfully',
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async getUserById(id: number): Promise<ApiResponse<User>> {
    try {
      const user = await this.userRepository.findById(id)
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        }
      }
      return {
        success: true,
        data: user,
        message: 'User retrieved successfully',
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async createUser(input: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      // Validate input with Zod
      const validatedInput = CreateUserSchema.parse(input)

      const user = await this.userRepository.create(validatedInput)
      return {
        success: true,
        data: user,
        message: 'User created successfully',
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
        }
      }
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async updateUser(
    id: number,
    input: UpdateUserRequest
  ): Promise<ApiResponse<User>> {
    try {
      // Validate input with Zod
      const validatedInput = UpdateUserSchema.parse(input)

      const user = await this.userRepository.update(id, validatedInput)
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        }
      }
      return {
        success: true,
        data: user,
        message: 'User updated successfully',
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map((e) => e.message).join(', '),
        }
      }
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async deleteUser(id: number): Promise<ApiResponse<null>> {
    try {
      const deleted = await this.userRepository.delete(id)
      if (!deleted) {
        return {
          success: false,
          error: 'User not found',
        }
      }
      return {
        success: true,
        message: 'User deleted successfully',
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }
}

// Express app setup
const app = express()
const prisma = new PrismaClient()
const userRepository = new UserRepository(prisma)
const userService = new UserService(userRepository)

// Middleware
app.use(cors())
app.use(express.json())

// Error handling middleware
const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
}

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
}

app.use(requestLogger)

// Routes with proper TypeScript typing
app.get('/api/users', async (req: Request, res: Response) => {
  const result = await userService.getAllUsers()
  res.status(result.success ? 200 : 400).json(result)
})

app.get(
  '/api/users/:id',
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      })
    }

    const result = await userService.getUserById(id)
    res.status(result.success ? 200 : 404).json(result)
  }
)

app.post(
  '/api/users',
  async (
    req: Request<{}, ApiResponse<User>, CreateUserRequest>,
    res: Response
  ) => {
    const result = await userService.createUser(req.body)
    res.status(result.success ? 201 : 400).json(result)
  }
)

app.put(
  '/api/users/:id',
  async (
    req: Request<{ id: string }, ApiResponse<User>, UpdateUserRequest>,
    res: Response
  ) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      })
    }

    const result = await userService.updateUser(id, req.body)
    res.status(result.success ? 200 : 400).json(result)
  }
)

app.delete(
  '/api/users/:id',
  async (req: Request<{ id: string }>, res: Response) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      })
    }

    const result = await userService.deleteUser(id)
    res.status(result.success ? 200 : 404).json(result)
  }
)

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  })
})

// Error handling
app.use(errorHandler)

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`)
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})

// Export for testing
export { app, userService, userRepository }
