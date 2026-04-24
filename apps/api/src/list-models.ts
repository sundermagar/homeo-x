import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found');
    return;
  }
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data: any = await response.json();
    console.log(JSON.stringify(data.models.map((m: any) => m.name), null, 2));
  } catch (err: any) {
    console.error('Error fetching models:', err.message);
  } finally {
    process.exit(0);
  }
}

listModels();
