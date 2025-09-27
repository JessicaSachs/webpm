// Fullstack App Example - TypeScript exercises
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import { createServer } from 'http'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

// Load environment variables
dotenv.config()

// Type definitions
interface User {
  _id: string
  email: string
  name: string
  password: string
  role: 'admin' | 'user' | 'moderator'
  createdAt: Date
  updatedAt: Date
}

interface Message {
  _id: string
  content: string
  author: string
  room: string
  createdAt: Date
}

interface ChatRoom {
  _id: string
  name: string
  description: string
  members: string[]
  createdAt: Date
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface AuthRequest extends Request {
  user?: User
}

// Zod schemas
const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

const MessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  room: z.string().min(1, 'Room ID is required'),
})

// Database models
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'user', 'moderator'],
      default: 'user',
    },
  },
  { timestamps: true }
)

const MessageSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    room: { type: String, required: true },
  },
  { timestamps: true }
)

const ChatRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

const User = mongoose.model('User', UserSchema)
const Message = mongoose.model('Message', MessageSchema)
const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema)

// Express app setup
const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Auth middleware
const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    })
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
      })
    }
    req.user = user as User
    next()
  })
}

// Utility functions
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

const generateToken = (user: User): string => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
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
    uptime: process.uptime(),
  })
})

// Auth routes
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const validatedData = RegisterSchema.parse(req.body)

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create user
    const user = new User({
      email: validatedData.email,
      name: validatedData.name,
      password: hashedPassword,
    })

    await user.save()

    // Generate token
    const token = generateToken(user)

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
      message: 'User created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      })
    }

    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const validatedData = LoginSchema.parse(req.body)

    // Find user
    const user = await User.findOne({ email: validatedData.email })
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      })
    }

    // Check password
    const isValidPassword = await comparePassword(
      validatedData.password,
      user.password
    )
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      })
    }

    // Generate token
    const token = generateToken(user)

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
      message: 'Login successful',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors.map((e) => e.message).join(', '),
      })
    }

    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    })
  }
})

// Protected routes
app.get(
  '/api/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(req.user!._id).select('-password')

      res.json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully',
      })
    } catch (error) {
      console.error('Profile error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }
)

// Chat rooms
app.get(
  '/api/rooms',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const rooms = await ChatRoom.find({
        members: req.user!._id,
      }).populate('members', 'name email')

      res.json({
        success: true,
        data: rooms,
        message: 'Rooms retrieved successfully',
      })
    } catch (error) {
      console.error('Rooms error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }
)

app.post(
  '/api/rooms',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body

      const room = new ChatRoom({
        name,
        description,
        members: [req.user!._id],
      })

      await room.save()

      res.status(201).json({
        success: true,
        data: room,
        message: 'Room created successfully',
      })
    } catch (error) {
      console.error('Create room error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }
)

// Messages
app.get(
  '/api/rooms/:roomId/messages',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params
      const { page = 1, limit = 50 } = req.query

      const messages = await Message.find({ room: roomId })
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))

      res.json({
        success: true,
        data: messages,
        message: 'Messages retrieved successfully',
      })
    } catch (error) {
      console.error('Messages error:', error)
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }
)

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Join room
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId)
    console.log(`User ${socket.id} joined room ${roomId}`)
  })

  // Leave room
  socket.on('leave-room', (roomId: string) => {
    socket.leave(roomId)
    console.log(`User ${socket.id} left room ${roomId}`)
  })

  // Send message
  socket.on(
    'send-message',
    async (data: { content: string; room: string; author: string }) => {
      try {
        const validatedData = MessageSchema.parse(data)

        const message = new Message({
          content: validatedData.content,
          author: validatedData.author,
          room: validatedData.room,
        })

        await message.save()

        // Broadcast to room
        socket.to(validatedData.room).emit('new-message', message)
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' })
      }
    }
  )

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
})

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
})

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/fullstack-app'
    )
    console.log('MongoDB connected successfully')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`)
  await mongoose.connection.close()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectDB()

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
    console.log(`Health check: http://localhost:${PORT}/health`)
  })
}

startServer().catch(console.error)

// Export for testing
export { app, server, io, User, Message, ChatRoom }
