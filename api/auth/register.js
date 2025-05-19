import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const uri = process.env.MONGODB_URI
const secret = process.env.JWT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { email, password } = req.body

  try {
    const client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db('bitcoin-trader')
    const users = db.collection('users')
    
    // 检查用户是否已存在
    const existingUser = await users.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }
    
    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = {
      email,
      password: hashedPassword,
      usdt_balance: 1000, // 初始余额
      btc_balance: 0,
      createdAt: new Date()
    }
    
    await users.insertOne(newUser)
    
    // 生成JWT token
    const token = jwt.sign({ email }, secret, { expiresIn: '1h' })
    
    res.status(201).json({ token })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}