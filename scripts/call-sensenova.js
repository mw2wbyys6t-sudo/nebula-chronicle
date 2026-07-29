// 商汤日日新 SenseNova 调用脚本（OpenAI 兼容协议）
// 用法：node scripts/call-sensenova.js "你的提示词"
import 'dotenv/config';

const API_KEY = process.env.SENSENOVA_API_KEY;
const BASE_URL = process.env.SENSENOVA_BASE_URL || 'https://token.sensenova.cn/v1';
const MODEL = process.env.SENSENOVA_MODEL || 'sensenova-6.7-flash-lite';

async function chat(prompt, system = '你是一个有帮助的助手。') {
  if (!API_KEY) {
    throw new Error('SENSENOVA_API_KEY not set in .env');
  }
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`SenseNova error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data.choices?.[0]?.message?.content || '';
}

const prompt = process.argv[2];
if (prompt) {
  chat(prompt).then(console.log).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

export { chat };
