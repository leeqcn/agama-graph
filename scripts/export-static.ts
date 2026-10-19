import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DATA_DIR = path.resolve(ROOT_DIR, 'dist', 'static-data');

interface SutraMeta {
  id: string;
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
  canUndoTags?: boolean;
  canUndoNote?: boolean;
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

function exportStaticData() {
  fs.mkdirSync(path.join(DIST_DATA_DIR, 'sutras'), { recursive: true });
  fs.mkdirSync(path.join(DIST_DATA_DIR, 'docs'), { recursive: true });

  // 0. Load bundled sutras_text.json and notes_bundle.json if present
  const sutrasTextPath = path.resolve(ROOT_DIR, 'data', 'sutras_text.json');
  let sutrasTextBundle: Record<string, string> = {};
  if (fs.existsSync(sutrasTextPath)) {
    try {
      sutrasTextBundle = JSON.parse(fs.readFileSync(sutrasTextPath, 'utf-8'));
    } catch (e) {
      console.error('Error parsing sutras_text.json:', e);
    }
  }

  const notesBundlePath = path.resolve(ROOT_DIR, 'data', 'notes_bundle.json');
  let notesBundle: Record<string, string> = {};
  if (fs.existsSync(notesBundlePath)) {
    try {
      notesBundle = JSON.parse(fs.readFileSync(notesBundlePath, 'utf-8'));
    } catch (e) {
      console.error('Error parsing notes_bundle.json:', e);
    }
  }

  // 1. Load tags_raw.csv
  const tagsRawPath = path.resolve(ROOT_DIR, 'data', 'tags_raw.csv');
  const tagsRawMap = new Map<string, { unsorted: string[]; sorted: string[]; core: string[]; notes: string }>();
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
  const sutrasCsvPath = path.resolve(ROOT_DIR, 'data', 'sutras.csv');
  let sutraRecords: Record<string, string>[] = [];
  if (fs.existsSync(sutrasCsvPath)) {
    sutraRecords = parseCsv(fs.readFileSync(sutrasCsvPath, 'utf-8'));
    sutraRecords.sort((a, b) => parseInt(a['顺序'] || '0', 10) - parseInt(b['顺序'] || '0', 10));
  }

  // 3. Build sutras list & detail JSONs
  const pagesDir = path.resolve(ROOT_DIR, 'pages', 'sutras');
  const sutraList: SutraMeta[] = [];
  const sutraMap = new Map<string, SutraDetail>();

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

    const rawData = tagsRawMap.get(id);
    if (rawData && (rawData.sorted.length > 0 || rawData.unsorted.length > 0)) {
      tags = rawData.sorted;
      coreTags = rawData.core;
      unsortedTags = rawData.unsorted;
      userNotes = rawData.notes;
    }

    if (fs.existsSync(mdPath)) {
      const md = fs.readFileSync(mdPath, 'utf-8');
      const titleMatch = md.match(/^#\s+(.+)$/m);
      if (titleMatch) title = titleMatch[1].trim();

      const metaLineMatch = md.match(/T99-.*·\s*(卷.+?)\s*·\s*(\d+)字/);
      if (metaLineMatch) {
        juan = metaLineMatch[1].trim();
      }

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

      const rawTextMatch = md.match(/## 原文([\s\S]*?)(?:## 学习笔记|## 整理表|\n---\n|$)/);
      if (rawTextMatch) {
        rawText = rawTextMatch[1].trim();
      }

      const notesMatch = md.match(/## 学习笔记([\s\S]*?)(?:## 整理表|\n---\n|$)/);
      if (notesMatch && !studyNotes) {
        studyNotes = notesMatch[1].trim();
      }

      const tableMatch = md.match(/## 整理表([\s\S]*?)(?:\n---\n|$)/);
      if (tableMatch) {
        tableContent = tableMatch[1].replace(/_此表由我根据原文整理[^_\n]*_/g, '').trim();
      }
    }

    if (!rawText) {
      const txtPath = path.resolve(ROOT_DIR, 'pipeline', 'out', 'sutras', `${id}.txt`);
      if (fs.existsSync(txtPath)) {
        rawText = fs.readFileSync(txtPath, 'utf-8').trim();
      }
    }

    const standaloneNote = path.resolve(ROOT_DIR, 'data', 'notes', `${id}.md`);
    if (fs.existsSync(standaloneNote)) {
      studyNotes = fs.readFileSync(standaloneNote, 'utf-8').trim();
    }
    const standaloneTable = path.resolve(ROOT_DIR, 'data', 'tables', `${id}.md`);
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
      canUndoTags: false,
      canUndoNote: false,
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

    fs.writeFileSync(
      path.join(DIST_DATA_DIR, 'sutras', `${id}.json`),
      JSON.stringify({ sutra: sutraDetail }),
      'utf-8'
    );
  }

  fs.writeFileSync(
    path.join(DIST_DATA_DIR, 'sutras.json'),
    JSON.stringify({ sutras: sutraList, readonly: true }),
    'utf-8'
  );

  // 4. Build tags.json
  const termsMap = new Map<string, { pali: string; matchLevel: string; samyukta: string; status: string }>();
  const termsCsvPath = path.resolve(ROOT_DIR, 'data', 'terms.csv');
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

  const tagsResult = Array.from(tagStats.values()).sort((a, b) => b.count - a.count || b.coreCount - a.coreCount);
  fs.writeFileSync(path.join(DIST_DATA_DIR, 'tags.json'), JSON.stringify({ tags: tagsResult }), 'utf-8');

  // 5. Build graph.json
  const nodesMap = new Map<string, { id: string; name: string; category: string; value: number; coreCount: number }>();
  const linkKeySet = new Set<string>();
  const links: { source: string; target: string; type: string; value: number; label?: string }[] = [];

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

  const relationsCsvPath = path.resolve(ROOT_DIR, 'data', 'relations.csv');
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

  fs.writeFileSync(
    path.join(DIST_DATA_DIR, 'graph.json'),
    JSON.stringify({ nodes: Array.from(nodesMap.values()), links }),
    'utf-8'
  );

  // 6. Build tagging-progress.json
  const total = sutraList.length;
  const annotated = sutraList.filter((s) => s.isAnnotated).length;
  const todoList = sutraList.filter((s) => !s.isAnnotated);
  const nextBatchIds = todoList.slice(0, 10).map((s) => s.id);
  const nextBatchDetails = nextBatchIds.map((id) => sutraMap.get(id)!);

  fs.writeFileSync(
    path.join(DIST_DATA_DIR, 'tagging-progress.json'),
    JSON.stringify({
      total,
      annotated,
      todoCount: todoList.length,
      nextBatch: nextBatchIds,
      nextBatchDetails,
    }),
    'utf-8'
  );

  // 7. Build docs/*.json
  const docMappings: Record<string, string> = {
    about: path.resolve(ROOT_DIR, 'pages', 'about.md'),
    readme: path.resolve(ROOT_DIR, 'README.md'),
    agents: path.resolve(ROOT_DIR, 'AGENTS.md'),
    changelog: path.resolve(ROOT_DIR, '修改记录_0001-0100.md'),
    changelog_2: path.resolve(ROOT_DIR, '修改记录_0101-0200.md'),
    changelog_3: path.resolve(ROOT_DIR, '修改记录_0201-0250.md'),
    changelog_4: path.resolve(ROOT_DIR, '修改记录_0251-0300.md'),
    changelog_5: path.resolve(ROOT_DIR, '修改记录_0301-0400.md'),
    changelog_6: path.resolve(ROOT_DIR, '修改记录_0401-0500.md'),
    changelog_7: path.resolve(ROOT_DIR, '修改记录_0501-0600.md'),
    changelog_8: path.resolve(ROOT_DIR, '修改记录_0601-0700.md'),
    changelog_9: path.resolve(ROOT_DIR, '修改记录_0701-0800.md'),
    changelog_10: path.resolve(ROOT_DIR, '修改记录_0801-0900.md'),
    关系类型: path.resolve(ROOT_DIR, 'docs', '关系类型.md'),
    标注规范: path.resolve(ROOT_DIR, 'docs', '标注规范.md'),
  };

  for (const [key, filePath] of Object.entries(docMappings)) {
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    fs.writeFileSync(
      path.join(DIST_DATA_DIR, 'docs', `${key}.json`),
      JSON.stringify({ title: key, content }),
      'utf-8'
    );
  }

  console.log(`Static data exported to ${DIST_DATA_DIR} (${sutraList.length} sutras, ${annotated} annotated).`);
}

exportStaticData();
