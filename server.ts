import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// In-memory data cache
interface SutraMeta {
  id: string; // e.g. T99-0001
  order: number;
  juan: string;
  wordCount: number;
  title: string;
  tags: string[];
  coreTags: string[];
  unsortedTags: string[];
  userNotes?: string;
  hasNote: boolean;
  hasTable: boolean;
  isAnnotated: boolean;
  prevId?: string;
  nextId?: string;
}

interface SutraDetail extends SutraMeta {
  rawText: string;
  studyNotes?: string;
  tableContent?: string;
  cbetaFootnote?: string;
  canUndoTags?: boolean;
  canUndoNote?: boolean;
}

// Helper to parse CSV simple quotes
function parseCsv(content: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // skip
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }

  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const vals = parseCsvLine(line);
    const rec: Record<string, string> = {};
    for (let h = 0; h < header.length; h++) {
      rec[header[h]] = vals[h] || '';
    }
    records.push(rec);
  }
  return records;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// Load and cache all sutras and tags
let sutraList: SutraMeta[] = [];
let sutraMap: Map<string, SutraDetail> = new Map();
let tagsRawMap: Map<string, { unsorted: string[]; sorted: string[]; core: string[]; notes: string }> = new Map();

// Undo history stacks per sutra ID
interface TagSnapshot {
  unsorted: string[];
  sorted: string[];
  core: string[];
  notes: string;
}
interface NoteSnapshot {
  existed: boolean;
  content: string;
}
const tagHistoryMap = new Map<string, TagSnapshot[]>();
const noteHistoryMap = new Map<string, NoteSnapshot[]>();

function cnNum(n: number): string {
  const d = '零一二三四五六七八九';
  if (n < 10) return d[n];
  if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
  return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
}

function formatSutraTitle(sid: string): string {
  const part = sid.split('-')[1] || '';
  const nums = (part.match(/\d+/g) || []).map((x) => parseInt(x, 10));
  if (nums.length === 1) return `杂阿含经 第${nums[0]}经`;
  if (nums.length >= 2) return `杂阿含经 第${nums[0]}～${nums[1]}经`;
  return `杂阿含经 ${sid}`;
}

function loadAllData() {
  try {
    // 0. Load bundled sutras_text.json and notes_bundle.json if present
    const sutrasTextPath = path.resolve(__dirname, 'data', 'sutras_text.json');
    let sutrasTextBundle: Record<string, string> = {};
    if (fs.existsSync(sutrasTextPath)) {
      try {
        sutrasTextBundle = JSON.parse(fs.readFileSync(sutrasTextPath, 'utf-8'));
      } catch (e) {
        console.error('Error parsing sutras_text.json:', e);
      }
    }

    const notesBundlePath = path.resolve(__dirname, 'data', 'notes_bundle.json');
    let notesBundle: Record<string, string> = {};
    if (fs.existsSync(notesBundlePath)) {
      try {
        notesBundle = JSON.parse(fs.readFileSync(notesBundlePath, 'utf-8'));
      } catch (e) {
        console.error('Error parsing notes_bundle.json:', e);
      }
    }

    // 1. Load tags_raw.csv
    const tagsRawPath = path.resolve(__dirname, 'data', 'tags_raw.csv');
    tagsRawMap.clear();
    if (fs.existsSync(tagsRawPath)) {
      const rawCsv = fs.readFileSync(tagsRawPath, 'utf-8');
      const records = parseCsv(rawCsv);
      for (const r of records) {
        const id = r['经号']?.trim();
        if (!id) continue;
        const unsorted = (r['标签（unsorted）'] || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const sorted = (r['标签'] || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const core = (r['核心'] || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        const notes = r['备注'] || '';
        tagsRawMap.set(id, { unsorted, sorted, core, notes });
      }
    }

    // 2. Load sutras.csv
    const sutrasCsvPath = path.resolve(__dirname, 'data', 'sutras.csv');
    let sutraRecords: Record<string, string>[] = [];
    if (fs.existsSync(sutrasCsvPath)) {
      sutraRecords = parseCsv(fs.readFileSync(sutrasCsvPath, 'utf-8'));
      sutraRecords.sort((a, b) => parseInt(a['顺序'] || '0', 10) - parseInt(b['顺序'] || '0', 10));
    }

    // 3. Scan and load each sutra according to canonical sutras.csv
    const pagesDir = path.resolve(__dirname, 'pages', 'sutras');
    sutraList = [];
    sutraMap.clear();

    for (let i = 0; i < sutraRecords.length; i++) {
      const r = sutraRecords[i];
      const id = r['经号']?.trim();
      if (!id) continue;

      const order = parseInt(r['顺序'] || '0', 10) || i + 1;
      const juanNum = parseInt(r['卷'] || '1', 10);
      let juan = !isNaN(juanNum) ? `卷${cnNum(juanNum)}` : r['卷'] ? `卷${r['卷']}` : '卷一';
      const wordCount = parseInt(r['字数'] || '0', 10);
      const remarks = r['备注'] || '';

      const mdPath = path.join(pagesDir, `${id}.md`);
      let title = formatSutraTitle(id);
      let rawText = sutrasTextBundle[id] || '';
      let studyNotes = notesBundle[id] || '';
      let tableContent = '';

      let tags: string[] = [];
      let coreTags: string[] = [];
      let unsortedTags: string[] = [];
      let userNotes = '';

      // Check tags_raw.csv first
      const rawData = tagsRawMap.get(id);
      if (rawData && (rawData.sorted.length > 0 || rawData.unsorted.length > 0)) {
        tags = rawData.sorted;
        coreTags = rawData.core;
        unsortedTags = rawData.unsorted;
        userNotes = rawData.notes;
      }

      if (fs.existsSync(mdPath)) {
        const md = fs.readFileSync(mdPath, 'utf-8');

        // Extract title
        const titleMatch = md.match(/^#\s+(.+)$/m);
        if (titleMatch) title = titleMatch[1].trim();

        const metaLineMatch = md.match(/T99-.*·\s*(卷.+?)\s*·\s*(\d+)字/);
        if (metaLineMatch) {
          juan = metaLineMatch[1].trim();
        }

        // If not in tagsRawMap, extract tags from md
        if (tags.length === 0 && unsortedTags.length === 0) {
          const tagSectionMatch = md.match(/## 标签（个人标注）([\s\S]*?)## 原文/);
          if (tagSectionMatch) {
            const tagSec = tagSectionMatch[1];
            const tagsLine = tagSec.match(/标签：([^\n]+)/);
            if (tagsLine) {
              const rawParts = tagsLine[1].split('·').map((s) => s.trim());
              for (const part of rawParts) {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const cleaned = part.replace(/\*\*/g, '').trim();
                  coreTags.push(cleaned);
                  tags.push(cleaned);
                } else if (part) {
                  tags.push(part);
                }
              }
            }
            const unsortedLine = tagSec.match(/未整理：([^\n]+)/);
            if (unsortedLine) {
              unsortedTags = unsortedLine[1].split('·').map((s) => s.trim()).filter(Boolean);
            }
            const noteLine = tagSec.match(/笔记：([^\n]+)/);
            if (noteLine && !userNotes) {
              userNotes = noteLine[1].trim();
            }
          }
        }

        // Extract rawText
        const rawTextMatch = md.match(/## 原文([\s\S]*?)(?:## 学习笔记|## 整理表|\n---\n|$)/);
        if (rawTextMatch) {
          rawText = rawTextMatch[1].trim();
        }

        // Extract study notes from md as fallback
        const notesMatch = md.match(/## 学习笔记([\s\S]*?)(?:## 整理表|\n---\n|$)/);
        if (notesMatch && !studyNotes) {
          studyNotes = notesMatch[1].trim();
        }

        // Extract tables from md as fallback
        const tableMatch = md.match(/## 整理表([\s\S]*?)(?:\n---\n|$)/);
        if (tableMatch) {
          tableContent = tableMatch[1]
            .replace(/_此表由我根据原文整理[^_\n]*_/g, '')
            .trim();
        }
      }

      if (!rawText) {
        const txtPath = path.resolve(__dirname, 'pipeline', 'out', 'sutras', `${id}.txt`);
        if (fs.existsSync(txtPath)) {
          rawText = fs.readFileSync(txtPath, 'utf-8').trim();
        }
      }

      // Check standalone note/table in data/notes and data/tables (takes precedence over bundle/generated md)
      const standaloneNote = path.resolve(__dirname, 'data', 'notes', `${id}.md`);
      if (fs.existsSync(standaloneNote)) {
        studyNotes = fs.readFileSync(standaloneNote, 'utf-8').trim();
      }
      const standaloneTable = path.resolve(__dirname, 'data', 'tables', `${id}.md`);
      if (fs.existsSync(standaloneTable)) {
        tableContent = fs.readFileSync(standaloneTable, 'utf-8').trim();
      }

      const isAnnotated = tags.length > 0 || unsortedTags.length > 0 || coreTags.length > 0;
      const prevId = i > 0 ? sutraRecords[i - 1]['经号']?.trim() : undefined;
      const nextId = i < sutraRecords.length - 1 ? sutraRecords[i + 1]['经号']?.trim() : undefined;

      const sutraDetail: SutraDetail = {
        id,
        order,
        juan,
        wordCount,
        title,
        tags,
        coreTags,
        unsortedTags,
        userNotes: userNotes || remarks,
        hasNote: !!studyNotes,
        hasTable: !!tableContent,
        isAnnotated,
        prevId,
        nextId,
        rawText,
        studyNotes,
        tableContent,
      };

      sutraMap.set(id, sutraDetail);
      sutraList.push({
        id,
        order,
        juan,
        wordCount,
        title,
        tags,
        coreTags,
        unsortedTags,
        userNotes: userNotes || remarks,
        hasNote: !!studyNotes,
        hasTable: !!tableContent,
        isAnnotated,
        prevId,
        nextId,
      });
    }
    console.log(`Loaded ${sutraList.length} sutras, ${tagsRawMap.size} raw tag rows.`);
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

// Initial load
loadAllData();

// API Routes
app.get('/api/sutras', (req, res) => {
  res.json({ sutras: sutraList });
});

app.get('/api/sutras/:id', (req, res) => {
  const id = req.params.id;
  const detail = sutraMap.get(id);
  if (!detail) {
    return res.status(404).json({ error: `经号 ${id} 未找到` });
  }
  res.json({
    sutra: {
      ...detail,
      canUndoTags: (tagHistoryMap.get(id)?.length || 0) > 0,
      canUndoNote: (noteHistoryMap.get(id)?.length || 0) > 0,
    },
  });
});

// All aggregated tags + canonical terms from terms.csv
app.get('/api/tags', (req, res) => {
  const termsMap = new Map<string, { pali: string; matchLevel: string; samyukta: string; status: string }>();
  const termsCsvPath = path.resolve(__dirname, 'data', 'terms.csv');
  if (fs.existsSync(termsCsvPath)) {
    const tRows = parseCsv(fs.readFileSync(termsCsvPath, 'utf-8'));
    for (const r of tRows) {
      const name = r['名相']?.trim();
      if (name) {
        termsMap.set(name, {
          pali: r['巴利']?.trim() || '',
          matchLevel: r['对等程度']?.trim() || '',
          samyukta: r['所属相应']?.trim() || '',
          status: r['状态']?.trim() || '',
        });
      }
    }
  }

  const tagStats = new Map<
    string,
    { name: string; count: number; coreCount: number; sutras: string[]; pali?: string; samyukta?: string }
  >();

  for (const s of sutraList) {
    const allForSutra = new Set([...s.tags, ...s.coreTags, ...s.unsortedTags]);
    for (const tag of allForSutra) {
      if (!tag) continue;
      const termMeta = termsMap.get(tag);
      const entry = tagStats.get(tag) || {
        name: tag,
        count: 0,
        coreCount: 0,
        sutras: [],
        pali: termMeta?.pali,
        samyukta: termMeta?.samyukta,
      };
      entry.count += 1;
      if (s.coreTags.includes(tag)) {
        entry.coreCount += 1;
      }
      entry.sutras.push(s.id);
      tagStats.set(tag, entry);
    }
  }

  const result = Array.from(tagStats.values()).sort((a, b) => b.count - a.count || b.coreCount - a.coreCount);
  res.json({ tags: result });
});

// Relational knowledge graph
app.get('/api/graph', (req, res) => {
  const nodesMap = new Map<string, { id: string; name: string; category: string; value: number; coreCount: number }>();
  const linkKeySet = new Set<string>();
  const links: { source: string; target: string; type: string; value: number; label?: string }[] = [];

  // 1. Built-in relational nodes from Buddhist doctrinal structures (docs/关系类型.md)
  const canonicalRelations = [
    { source: '五蕴', target: '色蕴', type: '开合', label: '开合（总摄别）' },
    { source: '五蕴', target: '受蕴', type: '开合', label: '开合（总摄别）' },
    { source: '五蕴', target: '想蕴', type: '开合', label: '开合（总摄别）' },
    { source: '五蕴', target: '行蕴', type: '开合', label: '开合（总摄别）' },
    { source: '五蕴', target: '识蕴', type: '开合', label: '开合（总摄别）' },
    { source: '无常', target: '苦', type: '缘起序', label: '无常故苦' },
    { source: '苦', target: '非我', type: '缘起序', label: '苦故非我' },
    { source: '正观', target: '厌离', type: '修证', label: '正观则生厌离' },
    { source: '厌离', target: '喜贪尽', type: '修证', label: '厌离则喜贪尽' },
    { source: '喜贪尽', target: '心解脱', type: '修证', label: '喜贪尽则心解脱' },
    { source: '正思惟', target: '欲贪断', type: '修证', label: '正思惟则断欲贪' },
    { source: '欲贪断', target: '心解脱', type: '修证', label: '欲贪断则心解脱' },
    { source: '五阴', target: '五蕴', type: '异译同实', label: '异译同实' },
    { source: '六入处', target: '眼入处', type: '开合', label: '开合' },
    { source: '六入处', target: '耳入处', type: '开合', label: '开合' },
    { source: '六入处', target: '鼻入处', type: '开合', label: '开合' },
    { source: '六入处', target: '舌入处', type: '开合', label: '开合' },
    { source: '六入处', target: '身入处', type: '开合', label: '开合' },
    { source: '六入处', target: '意入处', type: '开合', label: '开合' },
  ];

  // Also check relations.csv
  const relationsCsvPath = path.resolve(__dirname, 'data', 'relations.csv');
  if (fs.existsSync(relationsCsvPath)) {
    const rels = parseCsv(fs.readFileSync(relationsCsvPath, 'utf-8'));
    for (const r of rels) {
      if (r['起点'] && r['终点']) {
        canonicalRelations.push({
          source: r['起点'].trim(),
          target: r['终点'].trim(),
          type: r['关系类型']?.trim() || '关联',
          label: r['备注']?.trim() || r['关系类型']?.trim(),
        });
      }
    }
  }

  // Register canonical relations
  for (const rel of canonicalRelations) {
    if (!nodesMap.has(rel.source)) {
      nodesMap.set(rel.source, { id: rel.source, name: rel.source, category: '名相', value: 10, coreCount: 3 });
    }
    if (!nodesMap.has(rel.target)) {
      nodesMap.set(rel.target, { id: rel.target, name: rel.target, category: '名相', value: 8, coreCount: 2 });
    }
    const key = `${rel.source}->${rel.target}`;
    if (!linkKeySet.has(key)) {
      linkKeySet.add(key);
      links.push({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        value: 3,
        label: rel.label,
      });
    }
  }

  // 2. Co-occurrence relations between Core tags in annotated sutras
  const pairWeights = new Map<string, { s: string; t: string; count: number }>();

  for (const s of sutraList) {
    const core = s.coreTags;
    if (core.length >= 2) {
      for (let i = 0; i < core.length; i++) {
        for (let j = i + 1; j < core.length; j++) {
          const t1 = core[i];
          const t2 = core[j];
          if (t1 === t2) continue;
          const [u1, u2] = t1 < t2 ? [t1, t2] : [t2, t1];
          const key = `${u1}|${u2}`;
          const current = pairWeights.get(key) || { s: u1, t: u2, count: 0 };
          current.count += 1;
          pairWeights.set(key, current);
        }
      }
    }

    // Add nodes for core tags
    for (const t of core) {
      const existing = nodesMap.get(t);
      if (existing) {
        existing.value += 3;
        existing.coreCount += 1;
      } else {
        nodesMap.set(t, { id: t, name: t, category: '核心', value: 12, coreCount: 1 });
      }
    }
  }

  // Add co-occurrence links
  for (const [, pair] of pairWeights) {
    const key = `${pair.s}->${pair.t}`;
    if (!linkKeySet.has(key) && !linkKeySet.has(`${pair.t}->${pair.s}`)) {
      linkKeySet.add(key);
      links.push({
        source: pair.s,
        target: pair.t,
        type: '共现',
        value: Math.min(pair.count * 2, 8),
        label: `同经共现 ${pair.count} 次`,
      });
    }
  }

  res.json({
    nodes: Array.from(nodesMap.values()),
    links,
  });
});

// Tagging workflow stats and next batch
app.get('/api/tagging-progress', (req, res) => {
  const total = sutraList.length;
  const annotated = sutraList.filter((s) => s.isAnnotated).length;
  const todoList = sutraList.filter((s) => !s.isAnnotated);

  const nextBatchIds = todoList.slice(0, 10).map((s) => s.id);
  const nextBatchDetails = nextBatchIds.map((id) => sutraMap.get(id)!);

  res.json({
    total,
    annotated,
    todoCount: todoList.length,
    nextBatch: nextBatchIds,
    nextBatchDetails,
  });
});

function writeTagsRawCsv(rows: Record<string, string>[]) {
  const tagsRawPath = path.resolve(__dirname, 'data', 'tags_raw.csv');
  const csvLines = ['经号,标签（unsorted）,标签,核心,备注'];
  for (const r of rows) {
    const escape = (val: string) => {
      if (!val) return '';
      if (val.includes('\n') || val.includes(',') || val.includes('"')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    csvLines.push(
      `${r['经号']},${escape(r['标签（unsorted）'])},${escape(r['标签'])},${escape(r['核心'])},${escape(r['备注'])}`
    );
  }
  fs.writeFileSync(tagsRawPath, csvLines.join('\n'), 'utf-8');
}

// Update or save tags for a sutra
app.post('/api/save-tags', (req, res) => {
  const { sutraId, unsortedTags, tags, coreTags, notes } = req.body;
  if (!sutraId) {
    return res.status(400).json({ error: '经号不能为空' });
  }

  try {
    // Push current state to undo stack before modifying
    const currentDetail = sutraMap.get(sutraId);
    const currentRaw = tagsRawMap.get(sutraId);
    const prevSnapshot: TagSnapshot = {
      unsorted: currentRaw ? [...currentRaw.unsorted] : [...(currentDetail?.unsortedTags || [])],
      sorted: currentRaw ? [...currentRaw.sorted] : [...(currentDetail?.tags || [])],
      core: currentRaw ? [...currentRaw.core] : [...(currentDetail?.coreTags || [])],
      notes: currentRaw ? currentRaw.notes : currentDetail?.userNotes || '',
    };
    const stack = tagHistoryMap.get(sutraId) || [];
    stack.push(prevSnapshot);
    tagHistoryMap.set(sutraId, stack);

    const tagsRawPath = path.resolve(__dirname, 'data', 'tags_raw.csv');
    let rows: Record<string, string>[] = [];
    if (fs.existsSync(tagsRawPath)) {
      rows = parseCsv(fs.readFileSync(tagsRawPath, 'utf-8'));
    }

    const unsortedStr = Array.isArray(unsortedTags) ? unsortedTags.join('\n') : unsortedTags || '';
    const sortedStr = Array.isArray(tags) ? tags.join('\n') : tags || '';
    const coreStr = Array.isArray(coreTags) ? coreTags.join('\n') : coreTags || '';
    const notesStr = notes !== undefined ? String(notes) : '';

    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]['经号'] === sutraId) {
        rows[i]['标签（unsorted）'] = unsortedStr;
        rows[i]['标签'] = sortedStr;
        rows[i]['核心'] = coreStr;
        rows[i]['备注'] = notesStr;
        found = true;
        break;
      }
    }

    if (!found) {
      rows.push({
        经号: sutraId,
        '标签（unsorted）': unsortedStr,
        标签: sortedStr,
        核心: coreStr,
        备注: notesStr,
      });
    }

    writeTagsRawCsv(rows);
    loadAllData();

    const updated = sutraMap.get(sutraId);
    res.json({
      success: true,
      sutraId,
      message: `经号 ${sutraId} 标签已成功保存。`,
      sutra: updated
        ? {
            ...updated,
            canUndoTags: (tagHistoryMap.get(sutraId)?.length || 0) > 0,
            canUndoNote: (noteHistoryMap.get(sutraId)?.length || 0) > 0,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || '保存失败' });
  }
});

// Undo last tag change for a sutra
app.post('/api/undo-tags', (req, res) => {
  const { sutraId } = req.body;
  if (!sutraId) {
    return res.status(400).json({ error: '经号不能为空' });
  }

  const stack = tagHistoryMap.get(sutraId);
  if (!stack || stack.length === 0) {
    return res.status(400).json({ error: '没有可撤销的标签修改记录' });
  }

  try {
    const prev = stack.pop()!;
    tagHistoryMap.set(sutraId, stack);

    const tagsRawPath = path.resolve(__dirname, 'data', 'tags_raw.csv');
    let rows: Record<string, string>[] = [];
    if (fs.existsSync(tagsRawPath)) {
      rows = parseCsv(fs.readFileSync(tagsRawPath, 'utf-8'));
    }

    const unsortedStr = prev.unsorted.join('\n');
    const sortedStr = prev.sorted.join('\n');
    const coreStr = prev.core.join('\n');
    const notesStr = prev.notes || '';

    for (let i = 0; i < rows.length; i++) {
      if (rows[i]['经号'] === sutraId) {
        rows[i]['标签（unsorted）'] = unsortedStr;
        rows[i]['标签'] = sortedStr;
        rows[i]['核心'] = coreStr;
        rows[i]['备注'] = notesStr;
        break;
      }
    }

    writeTagsRawCsv(rows);
    loadAllData();

    const updated = sutraMap.get(sutraId);
    res.json({
      success: true,
      sutraId,
      message: `已撤销经号 ${sutraId} 的标签修改。`,
      sutra: updated
        ? {
            ...updated,
            canUndoTags: (tagHistoryMap.get(sutraId)?.length || 0) > 0,
            canUndoNote: (noteHistoryMap.get(sutraId)?.length || 0) > 0,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || '撤销失败' });
  }
});

// Save or update study notes for a sutra (data/notes_bundle.json & optional data/notes/T99-xxxx.md)
app.post('/api/save-note', (req, res) => {
  const { sutraId, studyNotes } = req.body;
  if (!sutraId || !sutraMap.has(sutraId)) {
    return res.status(400).json({ error: '有效经号不能为空' });
  }

  try {
    const notesBundlePath = path.resolve(__dirname, 'data', 'notes_bundle.json');
    let bundle: Record<string, string> = {};
    if (fs.existsSync(notesBundlePath)) {
      try {
        bundle = JSON.parse(fs.readFileSync(notesBundlePath, 'utf-8'));
      } catch {
        bundle = {};
      }
    }

    const notesDir = path.resolve(__dirname, 'data', 'notes');
    const notePath = path.join(notesDir, `${sutraId}.md`);
    const currentDetail = sutraMap.get(sutraId);
    const existed = fs.existsSync(notePath) || Boolean(bundle[sutraId]);
    const prevContent = fs.existsSync(notePath)
      ? fs.readFileSync(notePath, 'utf-8')
      : bundle[sutraId] || currentDetail?.studyNotes || '';

    const stack = noteHistoryMap.get(sutraId) || [];
    stack.push({ existed, content: prevContent });
    noteHistoryMap.set(sutraId, stack);

    const trimmed = (studyNotes || '').trim();
    if (trimmed) {
      bundle[sutraId] = trimmed;
      if (fs.existsSync(notePath)) {
        fs.writeFileSync(notePath, trimmed + '\n', 'utf-8');
      }
    } else {
      delete bundle[sutraId];
      if (fs.existsSync(notePath)) {
        fs.unlinkSync(notePath);
      }
    }
    fs.writeFileSync(notesBundlePath, JSON.stringify(bundle, null, 2), 'utf-8');

    loadAllData();

    const updated = sutraMap.get(sutraId);
    res.json({
      success: true,
      sutraId,
      message: `经号 ${sutraId} 学习笔记已保存。`,
      sutra: updated
        ? {
            ...updated,
            canUndoTags: (tagHistoryMap.get(sutraId)?.length || 0) > 0,
            canUndoNote: (noteHistoryMap.get(sutraId)?.length || 0) > 0,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || '保存学习笔记失败' });
  }
});

// Undo last study note change for a sutra
app.post('/api/undo-note', (req, res) => {
  const { sutraId } = req.body;
  if (!sutraId) {
    return res.status(400).json({ error: '经号不能为空' });
  }

  const stack = noteHistoryMap.get(sutraId);
  if (!stack || stack.length === 0) {
    return res.status(400).json({ error: '没有可撤销的学习笔记修改记录' });
  }

  try {
    const prev = stack.pop()!;
    noteHistoryMap.set(sutraId, stack);

    const notesBundlePath = path.resolve(__dirname, 'data', 'notes_bundle.json');
    let bundle: Record<string, string> = {};
    if (fs.existsSync(notesBundlePath)) {
      try {
        bundle = JSON.parse(fs.readFileSync(notesBundlePath, 'utf-8'));
      } catch {
        bundle = {};
      }
    }

    const notesDir = path.resolve(__dirname, 'data', 'notes');
    const notePath = path.join(notesDir, `${sutraId}.md`);

    if (!prev.existed && !prev.content.trim()) {
      delete bundle[sutraId];
      if (fs.existsSync(notePath)) {
        fs.unlinkSync(notePath);
      }
    } else {
      const restored = prev.content ? prev.content.trim() : '';
      if (restored) {
        bundle[sutraId] = restored;
      } else {
        delete bundle[sutraId];
      }
      if (fs.existsSync(notePath)) {
        fs.writeFileSync(notePath, restored ? restored + '\n' : '', 'utf-8');
      }
    }
    fs.writeFileSync(notesBundlePath, JSON.stringify(bundle, null, 2), 'utf-8');

    loadAllData();

    const updated = sutraMap.get(sutraId);
    res.json({
      success: true,
      sutraId,
      message: `已撤销经号 ${sutraId} 的学习笔记修改。`,
      sutra: updated
        ? {
            ...updated,
            canUndoTags: (tagHistoryMap.get(sutraId)?.length || 0) > 0,
            canUndoNote: (noteHistoryMap.get(sutraId)?.length || 0) > 0,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || '撤销学习笔记失败' });
  }
});

// Documentation endpoints
app.get('/api/docs/:name', (req, res) => {
  const name = req.params.name;
  let filePath = '';

  if (name === 'about') {
    filePath = path.resolve(__dirname, 'pages', 'about.md');
  } else if (name === 'readme') {
    filePath = path.resolve(__dirname, 'README.md');
  } else if (name === 'agents') {
    filePath = path.resolve(__dirname, 'AGENTS.md');
  } else if (name === 'changelog' || name === '修改记录_0001-0100') {
    filePath = path.resolve(__dirname, '修改记录_0001-0100.md');
  } else if (name === 'changelog_2' || name === '修改记录_0101-0200') {
    filePath = path.resolve(__dirname, '修改记录_0101-0200.md');
  } else if (name === 'changelog_3' || name === '修改记录_0201-0250') {
    filePath = path.resolve(__dirname, '修改记录_0201-0250.md');
  } else if (name === 'changelog_4' || name === '修改记录_0251-0300') {
    filePath = path.resolve(__dirname, '修改记录_0251-0300.md');
  } else if (name === 'changelog_5' || name === '修改记录_0301-0400') {
    filePath = path.resolve(__dirname, '修改记录_0301-0400.md');
  } else if (name === 'changelog_6' || name === '修改记录_0401-0500') {
    filePath = path.resolve(__dirname, '修改记录_0401-0500.md');
  } else if (name === 'changelog_7' || name === '修改记录_0501-0600') {
    filePath = path.resolve(__dirname, '修改记录_0501-0600.md');
  } else if (name === 'changelog_8' || name === '修改记录_0601-0700') {
    filePath = path.resolve(__dirname, '修改记录_0601-0700.md');
  } else if (name === 'changelog_9' || name === '修改记录_0701-0800') {
    filePath = path.resolve(__dirname, '修改记录_0701-0800.md');
  } else if (name === 'changelog_10' || name === '修改记录_0801-0900') {
    filePath = path.resolve(__dirname, '修改记录_0801-0900.md');
  } else {
    // Check in docs/
    const candidate = path.resolve(__dirname, 'docs', `${name}.md`);
    if (fs.existsSync(candidate)) {
      filePath = candidate;
    }
  }

  if (filePath && fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ title: name, content });
  } else {
    res.status(404).json({ error: '文档未找到' });
  }
});

// Set up Vite or static serving
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Studio] Agama-Graph server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
