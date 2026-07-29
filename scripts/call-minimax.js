// MiniMax 调用脚本（支持文本对话、图片生成、视频生成）
// 用法：
//   node scripts/call-minimax.js chat "你的提示词"
//   node scripts/call-minimax.js image "prompt" --name nebula-bg
//   node scripts/call-minimax.js video "prompt" --name nebula-trailer --first-frame url
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const API_KEY = process.env.MINIMAX_API_KEY;
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const CHAT_MODEL = process.env.MINIMAX_CHAT_MODEL || 'abab6.5s-chat';
const IMAGE_MODEL = process.env.MINIMAX_IMAGE_MODEL || 'image-01';
const VIDEO_MODEL = process.env.MINIMAX_VIDEO_MODEL || 'MiniMax-Hailuo-2.3';

async function chat(prompt) {
  const res = await fetch(`${BASE_URL}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MiniMax chat error ${res.status}: ${JSON.stringify(data)}`);
  return data.choices?.[0]?.message?.content || data.base_resp?.status_msg || JSON.stringify(data);
}

async function generateImage(prompt, name = 'generated-image') {
  const res = await fetch(`${BASE_URL}/image_generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      aspect_ratio: '16:9',
      response_format: 'url'
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MiniMax image error ${res.status}: ${JSON.stringify(data)}`);
  const url = data.data?.image_urls?.[0] || data.data?.image_url || data.data?.url;
  if (!url) throw new Error('No image URL returned');
  return download(url, `images/generated/${name}.png`);
}

async function generateVideo(prompt, name = 'generated-video', firstFrame = null) {
  const body = {
    model: VIDEO_MODEL,
    prompt,
    duration: 6,
    resolution: '1080P'
  };
  if (firstFrame) body.first_frame_image = firstFrame;

  const res = await fetch(`${BASE_URL}/video_generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MiniMax video error ${res.status}: ${JSON.stringify(data)}`);
  console.log(`Video task created: ${data.task_id}`);
  return pollVideo(data.task_id, name);
}

async function pollVideo(taskId, name) {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`${BASE_URL}/query/video_generation?task_id=${taskId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    const data = await res.json();
    const status = data.status;
    console.log(`  [${i + 1}/${maxAttempts}] status: ${status}`);
    if (status === 'Success') {
      const url = data.file_url || data.video_url;
      return download(url, `images/generated/${name}.mp4`);
    }
    if (status === 'Fail') throw new Error('Video generation failed');
  }
  throw new Error('Video generation timeout');
}

async function download(url, relativePath) {
  const outPath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved: ${outPath}`);
  return outPath;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args[0];
  let prompt = '';
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      flags[args[i].replace(/^--/, '')] = args[i + 1];
      i++;
    } else if (!prompt) {
      prompt = args[i];
    } else {
      prompt += ' ' + args[i];
    }
  }
  return { mode, prompt, flags };
}

async function main() {
  if (!API_KEY) throw new Error('MINIMAX_API_KEY not set in .env');
  const { mode, prompt, flags } = parseArgs();
  if (!mode) {
    console.log('Usage: node scripts/call-minimax.js <chat|image|video> "prompt" [--name xxx] [--first-frame url]');
    process.exit(0);
  }
  if (mode === 'chat') {
    const text = await chat(prompt);
    console.log(text);
  } else if (mode === 'image') {
    await generateImage(prompt, flags.name || 'minimax-image');
  } else if (mode === 'video') {
    await generateVideo(prompt, flags.name || 'minimax-video', flags['first-frame']);
  } else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
