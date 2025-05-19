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
    
    const user = await users.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    // 生成JWT token
    const token = jwt.sign({ email }, secret, { expiresIn: '1h' })
    
    res.status(200).json({ 
      token,
      user: {
        email: user.email,
        usdt_balance: user.usdt_balance,
        btc_balance: user.btc_balance
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}