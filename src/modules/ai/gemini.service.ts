import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  
  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY is not set in environment variables.');
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) throw new Error('Gemini API not configured');
    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      this.logger.error(`Error creating embedding: ${error.message}`);
      throw error;
    }
  }

  async generateAnswer(query: string, context: string): Promise<string> {
    if (!this.genAI) return "Maaf, sistem AI belum dikonfigurasi dengan benar.";
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
Anda adalah Asisten Virtual (Chatbot) resmi untuk Badan Pusat Statistik (BPS) RI.
Gunakan HANYA konteks di bawah ini untuk menjawab pertanyaan pengguna.
Jika jawaban tidak ada di dalam konteks, katakan bahwa Anda tidak memiliki informasi tersebut dan sarankan pengguna untuk mengetik "chat dengan admin".
Jawablah dengan bahasa Indonesia yang sopan dan profesional.

Konteks BPS RI:
${context}

Pertanyaan Pengguna:
${query}

Jawaban Anda:
`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error(`Error generating answer: ${error.message}`);
      return "Maaf, saat ini saya sedang mengalami gangguan sistem. Silakan ketik 'chat dengan admin' untuk bantuan manusia.";
    }
  }
}
