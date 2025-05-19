import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'

const uri = process.env.MONGODB_URI
const secret = process.env.JWT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { amount, btcPrice } = req.body
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    // 验证JWT token
    const { email } = jwt.verify(token, secret)
    
    const client = new MongoClient(uri)
    await client.connect()
    
    const db = client.db('bitcoin-trader')
    const users = db.collection('users')
    const transactions = db.collection('transactions')
    
    // 获取用户
    const user = await users.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    // 计算交易金额
    const cost = amount * btcPrice
    
    // 检查余额
    if (user.usdt_balance < cost) {
      return res.status(400).json({ message: 'Insufficient USDT balance' })
    }
    
    // 更新用户余额
    await users.updateOne(
      { email },
      { 
        $inc: { 
          usdt_balance: -cost,
          btc_balance: +amount 
        } 
      }
    )
    
    // 记录交易
    await transactions.insertOne({
      user_email: email,
      type: 'buy',
      btc_amount: amount,
      usdt_amount: cost,
      btc_price: btcPrice,
      timestamp: new Date()
    })
    
    // 获取更新后的用户数据
    const updatedUser = await users.findOne({ email })
    
    res.status(200).json({ 
      message: 'Buy order executed',
      user: {
        email: updatedUser.email,
        usdt_balance: updatedUser.usdt_balance,
        btc_balance: updatedUser.btc_balance
      }
    })
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' })
    }
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}