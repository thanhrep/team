import { GoogleGenerativeAI } from '@google/generative-ai';
import { runtimeConfig } from './runtime-config';

export type AiProvider = 'gemini' | 'gpt';

function safeJson(data: unknown) {
  return JSON.stringify(data, (_key, value) => {
    if (typeof value === 'string' && (value.includes('@') || /^\+?\d[\d ()-]{7,}$/.test(value))) return '[ĐÃ ẨN DANH]';
    return value;
  });
}

export async function analyzeWithAi(provider: AiProvider, question: string, data: unknown) {
  const prompt = `Bạn là chuyên gia phân tích vận hành doanh nghiệp. Trả lời bằng tiếng Việt, rõ ràng, có mục tiêu, bằng chứng và hành động đề xuất. Không đoán dữ liệu không có.\n\nYêu cầu: ${question}\n\nDữ liệu đã ẩn danh:\n${safeJson(data)}`;
  if (provider === 'gemini') {
    if (!runtimeConfig.geminiApiKey) throw new Error('Chưa cấu hình GEMINI_API_KEY.');
    const client = new GoogleGenerativeAI(runtimeConfig.geminiApiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
  if (!runtimeConfig.openAiApiKey) throw new Error('Chưa cấu hình OPENAI_API_KEY.');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${runtimeConfig.openAiApiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`GPT API lỗi ${response.status}.`);
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content || 'AI không trả về nội dung.';
}
