import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf-8')
    console.log("File content length:", fileContent.length)
    fileContent.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1')
            process.env[key] = value
        } else {
            console.log("Skipping line:", line)
        }
    })
}

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY not found in .env.local")
        return
    }

    console.log("✅ Found API Key:", apiKey.substring(0, 10) + "...")

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    console.log("🔄 Sending test prompt to Gemini...")
    try {
        const result = await model.generateContent("Hello! Are you working? Reply with 'Yes, I am connected!'")
        const response = await result.response
        console.log("✅ Response received:\n", response.text())
    } catch (error: any) {
        console.error("❌ Error connecting to Gemini:", error.message)
    }
}

testGemini()
