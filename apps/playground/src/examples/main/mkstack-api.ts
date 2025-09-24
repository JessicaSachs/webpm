// MkStack API Example - TypeScript exercises
import express from 'express'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

class ApiController {
  async getUsers(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    try {
      const users = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ]
      
      return {
        success: true,
        data: users
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch users'
      }
    }
  }
}

const app = express()
const controller = new ApiController()

app.get('/api/users', async (req, res) => {
  const result = await controller.getUsers()
  res.json(result)
})

export { ApiController }
