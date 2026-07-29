// scripts/build-knowledge-graph.js
// 基于 anime-corpus.json 自动生成作品关系知识图谱

import fs from 'fs';

const corpus = JSON.parse(fs.readFileSync('./public/data/anime-corpus.json', 'utf8'));
const edges = [];

function addEdge(source, target, type, weight) {
  if (source === target) return;
  edges.push({ source: String(source), target: String(target), type, weight });
}

for (const a of corpus) {
  for (const b of corpus) {
    if (a.id === b.id) continue;

    // 年代相近
    if (Math.abs(a.year - b.year) <= 2) {
      addEdge(a.id, b.id, 'same-era', 0.15);
    }

    // 同公司
    if (a.studios?.some(s => b.studios?.includes(s))) {
      addEdge(a.id, b.id, 'same-studio', 0.6);
    }

    // 同作者
    if (a.authors?.some(s => b.authors?.includes(s))) {
      addEdge(a.id, b.id, 'same-author', 0.8);
    }

    // 同类型
    if (a.genres?.some(g => b.genres?.includes(g))) {
      addEdge(a.id, b.id, 'same-genre', 0.35);
    }

    // 同音乐（不太常见，权重中等）
    if (a.music?.some(m => b.music?.includes(m)) && a.music[0] !== 'Original Soundtrack') {
      addEdge(a.id, b.id, 'same-music', 0.55);
    }

    // 续作/前作（来自 corpus 的 relations）
    if (a.relations?.sequel?.includes(b.id)) {
      addEdge(a.id, b.id, 'sequel', 1.0);
    }
    if (a.relations?.prequel?.includes(b.id)) {
      addEdge(a.id, b.id, 'prequel', 1.0);
    }
  }
}

// 去重并限制每个节点的边数
const grouped = {};
for (const e of edges) {
  const key = [e.source, e.target, e.type].join('::');
  if (!grouped[key]) grouped[key] = e;
}

const deduped = Object.values(grouped);

// 按源节点聚合，保留权重最高的边
const bySource = {};
for (const e of deduped) {
  if (!bySource[e.source]) bySource[e.source] = [];
  bySource[e.source].push(e);
}

const finalEdges = [];
for (const source of Object.keys(bySource)) {
  const list = bySource[source]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 30); // 每个节点最多 30 条边
  finalEdges.push(...list);
}

const nodes = corpus.map(c => ({
  id: String(c.id),
  title: c.titleRomaji,
  titleJa: c.titleJa,
  year: c.year,
  genres: c.genres,
  score: c.score,
  popularity: c.popularity
}));

const graph = { nodes, edges: finalEdges, generatedAt: new Date().toISOString() };

fs.writeFileSync('./public/data/knowledge-graph.json', JSON.stringify(graph, null, 2));
console.log(`✅ 知识图谱生成完成：${nodes.length} 个节点，${finalEdges.length} 条边`);
