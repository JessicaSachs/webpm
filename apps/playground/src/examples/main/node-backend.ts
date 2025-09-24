// Node.js Backend Example - TypeScript exercises
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'

// Load environment variables
config()

// Type definitions
interface User {
  id: number
  email: string
  name: string
  password: string
  role: 'admin' | 'user' | 'moderator'
  createdAt: Date
  updatedAt: Date
}

interface AuthRequest extends Request {
  user?: User
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  email: string
  password: string
  name: string
}

// Zod schemas for validation
const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters')
})

// Database client
const prisma = new PrismaClient()

// Express app setup
const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(compression())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Auth middleware
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    })
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      })
    }
    req.user = user as User
    next()
  })
}

// Admin middleware
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    })
  }
  next()
}

// Utility functions
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

const generateToken = (user: User): string => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  )
}

// API Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Auth routes
app.post('/api/auth/register', async (req: Request<{}, ApiResponse<{ user: Omit<User, 'password'>, token: string }>, RegisterRequest>, res: Response) => {
  try {
    // Validate input
    const validatedData = RegisterSchema.parse(req.body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      })
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: 'user'
      }
    })
    
    // Generate token
    const token = generateToken(user)
    
    // Return user without password
    const { password, ...userWithoutPassword } = user
    
    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'User created successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      })
    }
    
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

app.post('/api/auth/login', async (req: Request<{}, ApiResponse<{ user: Omit<User, 'password'>, token: string }>, LoginRequest>, res: Response) => {
  try {
    // Validate input
    const validatedData = LoginSchema.parse(req.body)
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      })
    }
    
    // Check password
    const isValidPassword = await comparePassword(validatedData.password, user.password)
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      })
    }
    
    // Generate token
    const token = generateToken(user)
    
    // Return user without password
    const { password, ...userWithoutPassword } = user
    
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Login successful'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      })
    }
    
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Protected routes
app.get('/api/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: user,
      message: 'Profile retrieved successfully'
    })
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

app.get('/api/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    res.json({
      success: true,
      data: users,
      message: 'Users retrieved successfully'
    })
  } catch (error) {
    console.error('Users error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  })
})

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  })
})

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
export { app, prisma }
