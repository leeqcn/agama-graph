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
  const termsMap = new Map<
    string,
    {
      pali: string;
      matchLevel: string;
      samyukta: string;
      status: string;
      definition: string;
      aspect: string;
      hierarchy: string;
      aliases: string;
    }
  >();
  const termsCsvPath = path.resolve(ROOT_DIR, 'data', 'terms.csv');
  if (fs.existsSync(termsCsvPath)) {
    const tRows = parseCsv(fs.readFileSync(termsCsvPath, 'utf-8'));
    for (const r of tRows) {
      const name = r['名相']?.trim();
      if (name) {
        const meta = {
          pali: r['巴利']?.trim() || '',
          matchLevel: r['对应类型']?.trim() || r['对等程度']?.trim() || '',
          samyukta: r['所属相应']?.trim() || '',
          status: r['状态']?.trim() || '',
          definition: r['定义']?.trim() || '',
          aspect: r['面向']?.trim() || '',
          hierarchy: r['层级']?.trim() || '',
          aliases: r['异称']?.trim() || '',
        };
        termsMap.set(name, meta);
        const aliasList = (r['异称'] || '')
          .split(/[、，,;；/]/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const al of aliasList) {
          if (!termsMap.has(al)) {
            termsMap.set(al, meta);
          }
        }
      }
    }
  }

  let taxonomyMap: Record<string, { category: string; subCategory: string; attribute: string }> = {};
  const taxonomyPath = path.resolve(ROOT_DIR, 'data', 'tag_taxonomy.json');
  if (fs.existsSync(taxonomyPath)) {
    try {
      taxonomyMap = JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'));
    } catch (e) {
      console.error('Error reading tag_taxonomy.json:', e);
    }
  }

  const tagStats = new Map<
    string,
    {
      name: string;
      count: number;
      coreCount: number;
      sutras: string[];
      category: string;
      subCategory: string;
      attribute: string;
      pali?: string;
      samyukta?: string;
      definition?: string;
      aspect?: string;
      hierarchy?: string;
      aliases?: string;
    }
  >();

  for (const s of sutraList) {
    const allForSutra = new Set([...s.tags, ...s.coreTags, ...s.unsortedTags]);
    for (const tag of allForSutra) {
      if (!tag) continue;
      const termMeta = termsMap.get(tag);
      const taxMeta = taxonomyMap[tag] || { category: '法义', subCategory: '四谛·道谛', attribute: '因' };
      const entry = tagStats.get(tag) || {
        name: tag,
        count: 0,
        coreCount: 0,
        sutras: [],
        category: taxMeta.category,
        subCategory: taxMeta.subCategory,
        attribute: taxMeta.attribute || '',
        pali: termMeta?.pali,
        samyukta: termMeta?.samyukta,
        definition: termMeta?.definition,
        aspect: termMeta?.aspect,
        hierarchy: termMeta?.hierarchy,
        aliases: termMeta?.aliases,
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

  // 5. Build graph.json (3-tier nodes, 4+ relation families, and Audience/Speaker Sankey matrices)
  const tagToSutras = new Map<string, string[]>();
  const tagToCoreCount = new Map<string, number>();
  for (const s of sutraList) {
    const allTags = new Set([...s.tags, ...s.coreTags, ...s.unsortedTags]);
    for (const t of allTags) {
      if (!t) continue;
      const arr = tagToSutras.get(t) || [];
      arr.push(s.id);
      tagToSutras.set(t, arr);
    }
    for (const ct of s.coreTags) {
      if (!ct) continue;
      tagToCoreCount.set(ct, (tagToCoreCount.get(ct) || 0) + 1);
    }
  }

  const inferPillar = (name: string, cat: string, subCat: string): string => {
    if (cat === '人物' || cat === '地点') return '人物与场景';
    if (subCat === '蕴、处、界') {
      if (name.includes('入处') || name.includes('六根') || name.includes('六境') || name.includes('六触')) {
        return '六入处';
      }
      return '五阴（蕴处界）';
    }
    if (subCat === '四谛·道谛') return '道品（三十七道品）';
    if (subCat.startsWith('四谛')) return '杂因（缘起·四谛）';
    if (subCat === '譬喻' || subCat === '法数') return '譬喻与法数';
    return '杂因（缘起·四谛）';
  };

  const nodesMap = new Map<
    string,
    {
      id: string;
      name: string;
      category: string;
      subCategory: string;
      attribute: string;
      tier: string;
      pillar: string;
      value: number;
      coreCount: number;
      pali?: string;
      samyukta?: string;
      definition?: string;
      sutras: string[];
    }
  >();

  const ensureNode = (name: string, defaultBoost = 8) => {
    const existing = nodesMap.get(name);
    if (existing) return existing;
    const tax = taxonomyMap[name] || { category: '法义', subCategory: '四谛·道谛', attribute: '' };
    const term = termsMap.get(name);
    const sutras = tagToSutras.get(name) || [];
    const coreCount = tagToCoreCount.get(name) || 0;
    const tier = tax.category === '人物' || tax.category === '地点' ? '人物场景层' : '法义层';
    const pillar = inferPillar(name, tax.category, tax.subCategory);
    const node = {
      id: name,
      name,
      category: tax.category,
      subCategory: tax.subCategory,
      attribute: tax.attribute || '',
      tier,
      pillar,
      value: Math.max(defaultBoost, sutras.length),
      coreCount,
      pali: term?.pali || '',
      samyukta: term?.samyukta || '',
      definition: term?.definition || '',
      sutras: sutras.slice(0, 40),
    };
    nodesMap.set(name, node);
    return node;
  };

  const linkKeySet = new Set<string>();
  const links: {
    source: string;
    target: string;
    type: string;
    value: number;
    label?: string;
    sutras?: string[];
  }[] = [];

  const canonicalRelations: { source: string; target: string; type: string; label: string }[] = [
    { source: '五蕴', target: '色蕴', type: '开合', label: '五蕴总摄色受想行识（T99-0001、0055）' },
    { source: '五蕴', target: '受蕴', type: '开合', label: '五蕴总摄色受想行识（T99-0001、0055）' },
    { source: '五蕴', target: '想蕴', type: '开合', label: '五蕴总摄色受想行识（T99-0001、0055）' },
    { source: '五蕴', target: '行蕴', type: '开合', label: '五蕴总摄色受想行识（T99-0001、0055）' },
    { source: '五蕴', target: '识蕴', type: '开合', label: '五蕴总摄色受想行识（T99-0001、0055）' },
    { source: '无常', target: '苦', type: '缘起序', label: '无常故苦（T99-0009～0012）' },
    { source: '苦', target: '非我', type: '缘起序', label: '苦故非我（T99-0009～0012）' },
    { source: '非我', target: '厌离', type: '修证', label: '观非我则于五受阴生厌离（T99-0001～0012）' },
    { source: '正观', target: '厌离', type: '修证', label: '正观则生厌离（T99-0001）' },
    { source: '厌离', target: '喜贪尽', type: '修证', label: '厌离则喜贪尽（T99-0001）' },
    { source: '喜贪尽', target: '心解脱', type: '修证', label: '喜贪尽则心解脱（T99-0001）' },
    { source: '正思惟', target: '欲贪断', type: '修证', label: '正思惟则断欲贪（T99-0002）' },
    { source: '欲贪断', target: '心解脱', type: '修证', label: '欲贪断则心解脱（T99-0002）' },
    { source: '无明', target: '行', type: '缘起序', label: '缘无明有行（T99-0296、0298）' },
    { source: '行', target: '识', type: '缘起序', label: '缘行有识（T99-0296、0298）' },
    { source: '识', target: '名色', type: '缘起序', label: '缘识有名色，名色与识如三芦相依（T99-0288、0298）' },
    { source: '名色', target: '六入处', type: '缘起序', label: '缘名色有六入处（T99-0298）' },
    { source: '六入处', target: '触', type: '缘起序', label: '缘六入处有触（T99-0298）' },
    { source: '触', target: '受', type: '缘起序', label: '缘触有受（T99-0298）' },
    { source: '受', target: '爱', type: '缘起序', label: '缘受有爱（T99-0298）' },
    { source: '爱', target: '取', type: '缘起序', label: '缘爱有取（T99-0298）' },
    { source: '取', target: '有', type: '缘起序', label: '缘取有有（T99-0298）' },
    { source: '有', target: '生', type: '缘起序', label: '缘有有生（T99-0298）' },
    { source: '生', target: '老死', type: '缘起序', label: '缘生有老死忧悲苦恼纯大苦聚集（T99-0298）' },
    { source: '三十七道品', target: '四念处', type: '开合', label: '三十七道品初门统摄四念处（T99-0605～0639）' },
    { source: '三十七道品', target: '四正断', type: '开合', label: '三十七道品统摄四正断（T99-0874～0879）' },
    { source: '三十七道品', target: '四如意足', type: '开合', label: '三十七道品统摄四如意足（T99-0561）' },
    { source: '三十七道品', target: '五根', type: '开合', label: '三十七道品统摄信精进念定慧五根（T99-0642～0659）' },
    { source: '三十七道品', target: '五力', type: '开合', label: '三十七道品统摄五力（T99-0661～0703）' },
    { source: '三十七道品', target: '七觉支', type: '开合', label: '三十七道品统摄七觉支（T99-0704～0747）' },
    { source: '三十七道品', target: '八圣道分', type: '开合', label: '三十七道品统摄八圣道分（T99-0748～0800）' },
    { source: '四圣谛', target: '苦圣谛', type: '开合', label: '四圣谛之世间苦果（T99-0379）' },
    { source: '四圣谛', target: '苦集圣谛', type: '开合', label: '四圣谛之流转苦因（T99-0379）' },
    { source: '四圣谛', target: '苦灭圣谛', type: '开合', label: '四圣谛之出世灭果（T99-0379）' },
    { source: '四圣谛', target: '苦灭道迹圣谛', type: '开合', label: '四圣谛之还灭道因（T99-0379）' },
    { source: '苦灭道迹圣谛', target: '八圣道分', type: '异译同实', label: '苦灭道迹圣谛即八圣道分（SN 56.11 对读）' },
    { source: '尊者舍利弗', target: '六入处', type: '人物专精', label: '智慧第一：详辨六入处、界与中间欲贪结系（T99-0211、0250、0490）' },
    { source: '尊者舍利弗', target: '七觉支', type: '人物专精', label: '舍利弗开演七觉支十四心及自在入定如易衣（T99-0718）' },
    { source: '尊者舍利弗', target: '五根', type: '人物专精', label: '舍利弗以堂阁众材唯栋为首喻慧根统摄五根（T99-0646、0654）' },
    { source: '尊者阿难', target: '四念处', type: '人物专精', label: '多闻第一：开演圣戒为修四念处、四念处摄修多罗（T99-0628、0636）' },
    { source: '尊者阿难', target: '止、观', type: '人物专精', label: '阿难开演断诸使必由先止后观等止观四道（T99-0560）' },
    { source: '尊者阿难', target: '安那般那念', type: '人物专精', label: '阿难请问并传持安那般那念→四念处→七觉支→明解脱（T99-0810）' },
    { source: '尊者摩诃迦叶', target: '阿兰若、乞食、粪扫衣', type: '人物专精', label: '头陀第一：终生行三头陀行，佛分半座印证四禅六通（T99-1141、1142）' },
    { source: '尊者大目揵连', target: '第二禅', type: '人物专精', label: '神通第一：住第二禅无觉无观圣默然及无相心三昧（T99-0501～0503）' },
    { source: '尊者摩诃迦旃延', target: '四姓平等', type: '人物专精', label: '论议第一：于摩偷罗破婆罗门种姓傲慢，立依业平等（T99-0548）' },
    { source: '尊者阿那律', target: '四念处', type: '人物专精', label: '天眼第一：于重病及禅思中以四念处安住身苦心不苦（T99-0535～0545）' },
    { source: '给孤独长者', target: '四不坏净', type: '人物专精', label: '护法居士之首：成就四不坏净、六念与三归五戒家风（T99-0550、0843、1241）' },
    { source: '摩诃男', target: '四不坏净', type: '人物专精', label: '释氏居士代表：屡问优婆塞具足、四不坏净、六念与临终往生（T99-0927～0936）' },
    { source: '质多罗长者', target: '四种心三昧', type: '人物专精', label: '在家第一论师：精辨四种三昧名异义同与结系之理（T99-0567～0575）' },
    { source: '波斯匿王', target: '不放逸', type: '人物专精', label: '憍萨罗国王：佛为其开示不放逸二世安乐、四事知人、以正法治国（T99-1145～1163）' },
    { source: '释提桓因', target: '忍辱', type: '人物专精', label: '三十三天主：以具力能忍（上士之忍）及本生七善法统御诸天（T99-1104～1120）' },
  ];

  const relationsCsvPath = path.resolve(ROOT_DIR, 'data', 'relations.csv');
  if (fs.existsSync(relationsCsvPath)) {
    const rels = parseCsv(fs.readFileSync(relationsCsvPath, 'utf-8'));
    for (const r of rels) {
      if (r['起点'] && r['终点']) {
        canonicalRelations.push({
          source: r['起点'].trim(),
          target: r['终点'].trim(),
          type: r['关系类型']?.trim() || '修证',
          label: r['备注']?.trim() || r['关系类型']?.trim(),
        });
      }
    }
  }

  for (const rel of canonicalRelations) {
    const sNode = ensureNode(rel.source, 10);
    const tNode = ensureNode(rel.target, 8);
    const key = `${rel.source}->${rel.target}`;
    if (!linkKeySet.has(key)) {
      linkKeySet.add(key);
      const sSet = new Set(sNode.sutras);
      const shared = tNode.sutras.filter((id) => sSet.has(id));
      const cited = rel.label.match(/T99-\d{4}/g) || [];
      const mergedSutras = Array.from(new Set([...cited, ...shared])).slice(0, 25);
      links.push({
        source: rel.source,
        target: rel.target,
        type: rel.type,
        value: Math.max(4, mergedSutras.length),
        label: rel.label,
        sutras: mergedSutras,
      });
    }
  }

  const pairWeights = new Map<string, { s: string; t: string; count: number; sutras: string[] }>();
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
          const current = pairWeights.get(key) || { s: u1, t: u2, count: 0, sutras: [] };
          current.count += 1;
          if (current.sutras.length < 30) current.sutras.push(s.id);
          pairWeights.set(key, current);
        }
      }
    }
    for (const t of core) {
      ensureNode(t, 12);
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
        value: pair.count,
        label: `同经核心共现 ${pair.count} 次`,
        sutras: pair.sutras,
      });
    }
  }

  const dharmaPillars = [
    {
      id: '五蕴无常苦非我观',
      desc: '观色受想行识无常、苦、空、非我，厌离喜贪得解脱',
      match: (tags: string[]) =>
        tags.some((t) =>
          /五蕴|五受阴|色蕴|受蕴|想蕴|行蕴|识蕴|无常、苦|非我|二十种身见|重担|聚沫/.test(t)
        ),
    },
    {
      id: '六入处与守护根门',
      desc: '观眼耳鼻舌身意六处无常，善护根门律仪，不生欲贪结系',
      match: (tags: string[]) =>
        tags.some((t) => /六入处|六内入处|六触入处|守护诸根|守护根门|眼入处|结、系|六众生系一绳/.test(t)),
    },
    {
      id: '十二缘起与中道正见',
      desc: '此有故彼有、无明乃至老死流转还灭，离常见断见二边说中道',
      match: (tags: string[]) =>
        tags.some((t) => /十二缘起|因缘法|缘生法|无明|名色|中道|四食|三芦|法住智|第一义空/.test(t)),
    },
    {
      id: '四圣谛与三转十二行',
      desc: '苦集灭道四圣谛如实知、三转十二行法轮、渐次无间等',
      match: (tags: string[]) =>
        tags.some((t) => /四圣谛|苦圣谛|苦集圣谛|苦灭圣谛|苦灭道迹|三转十二行|无间等/.test(t)),
    },
    {
      id: '四念处与安那般那念',
      desc: '身受心法四念处一乘道、安那般那十六胜行、正念正智',
      match: (tags: string[]) =>
        tags.some((t) => /四念处|身念处|受念处|心念处|法念处|安那般那|一乘道|自洲以自依/.test(t)),
    },
    {
      id: '七觉支与八圣道分',
      desc: '修习五根、五力、七觉支、八圣道分三十七道品，对治五盖与八邪道',
      match: (tags: string[]) =>
        tags.some((t) => /八圣道|八正道|七觉支|五根|五力|四正断|四如意足|三十七道品|五盖/.test(t)),
    },
    {
      id: '四不坏净与六念法门',
      desc: '于佛法僧戒成就四不坏净（法镜经），进修六念，证须陀洹不堕恶趣',
      match: (tags: string[]) =>
        tags.some((t) => /四不坏净|六念|六随念|念佛|念法|念僧|念戒|念施|念天|法镜经|须陀洹/.test(t)),
    },
    {
      id: '十善业道与布施生天',
      desc: '断十不善业道、修十善业道，孝养父母、净施持戒、正法治世与生天福报',
      match: (tags: string[]) =>
        tags.some((t) => /十善业|十不善业|布施|持戒|生天|三归五戒|理财|四事知人|不放逸|本生七善法|惭愧/.test(t)),
    },
    {
      id: '四禅八定与三昧解脱',
      desc: '初禅至四禅、四无色定、空无相无所有三昧、灭尽定、止观俱行与心慧解脱',
      match: (tags: string[]) =>
        tags.some((t) => /四禅|初禅|第二禅|第三禅|第四禅|三昧|灭尽正受|灭尽定|止、观|圣默然|心解脱|慧解脱|阿罗汉/.test(t)),
    },
    {
      id: '破斥邪见与无记辨析',
      desc: '破斥外道常见断见、宿作因论、无因论、种姓傲慢，悬置十无记/十四无记，降伏魔怨',
      match: (tags: string[]) =>
        tags.some((t) => /无记|常见|断见|身见|六十二见|四姓平等|宿作因|无因|波旬|外道/.test(t)),
    },
  ];

  const audienceGroups = [
    {
      id: '比丘僧团（出家男众）',
      short: '比丘僧团',
      desc: '常随比丘、异比丘、新学及病比丘，占比最高，直示五蕴、六处、缘起、道品与漏尽解脱',
      match: (tags: string[]) =>
        tags.some((t) => t === '比丘' || t === '异比丘' || t.includes('比丘')) &&
        !tags.some((t) => /比丘尼|波斯匿王|给孤独长者|摩诃男|婆罗门|外道|释提桓因|天子|魔波旬/.test(t)),
    },
    {
      id: '在家居士（长者·优婆塞）',
      short: '在家居士',
      desc: '给孤独长者、摩诃男、质多罗长者、郁伽长者、鹿母等，多开示四不坏净、六念、布施持戒与三昧深义',
      match: (tags: string[]) =>
        tags.some((t) => /给孤独长者|摩诃男|质多罗长者|郁伽长者|优婆塞|优婆夷|长者|居士|鹿母|村主|聚落主/.test(t)),
    },
    {
      id: '外道与婆罗门梵志',
      short: '外道与婆罗门',
      desc: '婆罗门、出家外道、婆蹉种、尼揵子、六师外道等，多以中道缘起破常断二见、辨十无记、明四姓依业平等',
      match: (tags: string[]) =>
        tags.some((t) => /婆罗门|外道|梵志|尼揵|婆蹉|富楼那迦叶|末伽梨|阿耆多|迦罗拘陀|先阇那|火姓/.test(t)),
    },
    {
      id: '诸天与帝释天子',
      short: '诸天与天帝释',
      desc: '释提桓因（天帝释）、梵天、诸天子、日天子、月天子等，多以偈颂问答忍辱、正法行、度驶流及七善法',
      match: (tags: string[]) =>
        tags.some((t) => /释提桓因|天帝释|天子|梵天|天女|三十三天|四天王|伊赊那/.test(t)),
    },
    {
      id: '国王与王室大臣',
      short: '国王与王臣',
      desc: '波斯匿王、摩利夫人、阿阇世王、频婆娑罗王、优填王等，多开示不放逸、四事观人、少欲节量与正法治国',
      match: (tags: string[]) =>
        tags.some((t) => /波斯匿王|摩利夫人|末利夫人|阿阇世王|频婆娑罗王|优填王|五王|大臣/.test(t)),
    },
    {
      id: '魔波旬与鬼神阿修罗',
      short: '魔众与鬼神',
      desc: '魔波旬、魔女、夜叉、阿修罗王、龙、紧那罗等，展现比丘与比丘尼以正念正智、空无我慧识破魔境',
      match: (tags: string[]) =>
        tags.some((t) => /魔波旬|波旬|魔女|夜叉|阿修罗|鬼|毗摩质多罗|罗睺/.test(t)),
    },
    {
      id: '比丘尼众（出家女众）',
      short: '比丘尼众',
      desc: '大爱道瞿昙弥、莲华色、苏摩、尸罗、企师瞿昙弥、阿罗毗等，显扬女众同证四禅六通与漏尽阿罗汉',
      match: (tags: string[]) =>
        tags.some((t) => /比丘尼|大爱道|莲华色|苏摩比丘尼|尸罗比丘尼|企师瞿昙弥|阿罗毗比丘尼|偷兰难陀/.test(t)),
    },
  ];

  const speakerGroups = [
    {
      id: '佛陀（世尊亲说）',
      short: '佛陀亲说',
      desc: '世尊于舍卫国、王舍城等处观机逗教，总摄五蕴、六处、杂因（缘起·四谛）、道品四大板块',
      match: (tags: string[]) =>
        (tags.includes('佛') || tags.includes('世尊') || tags.includes('如来')) &&
        !tags.some((t) =>
          /舍利弗|尊者阿难|阿难|摩诃迦叶|大目揵连|摩诃迦旃延|阿那律|质多罗长者|尸罗比丘尼|苏摩比丘尼/.test(t)
        ),
    },
    {
      id: '尊者舍利弗（智慧第一）',
      short: '尊者舍利弗',
      desc: '如来长子随转法轮，高度聚焦于五蕴、六入处、十八界、五根、七觉支之阿毗达磨式严密法义辨析',
      match: (tags: string[]) => tags.some((t) => /舍利弗/.test(t)),
    },
    {
      id: '尊者阿难（多闻第一）',
      short: '尊者阿难',
      desc: '总持如来修多罗，常为比丘及居士开示四念处、止观四道、圣戒因缘、安那般那念与不生忧悲',
      match: (tags: string[]) => tags.some((t) => t === '阿难' || t === '尊者阿难'),
    },
    {
      id: '尊者摩诃迦叶（头陀第一）',
      short: '尊者摩诃迦叶',
      desc: '终生行阿兰若、乞食、粪扫衣头陀行，与佛分半座，常劝勉比丘守护根门、精勤禅思、整肃僧风',
      match: (tags: string[]) => tags.some((t) => /摩诃迦叶|迦叶/.test(t) && !/富楼那迦叶|优楼频螺迦叶/.test(t)),
    },
    {
      id: '尊者大目揵连（神通第一）',
      short: '尊者大目揵连',
      desc: '深住第二禅圣默然与无相心三昧，与舍利弗共论四预流支、无学智，并现神通教化人天',
      match: (tags: string[]) => tags.some((t) => /目揵连/.test(t)),
    },
    {
      id: '尊者摩诃迦旃延（论议第一）',
      short: '尊者摩诃迦旃延',
      desc: '善于略说广演，常开演六入处无常苦空、破婆罗门种姓高慢立四姓平等、为长者授四不坏净六念',
      match: (tags: string[]) => tags.some((t) => /摩诃迦旃延|迦旃延/.test(t) && !/迦罗拘陀|婆蹉种/.test(t)),
    },
    {
      id: '尊者阿那律（天眼第一）',
      short: '尊者阿那律',
      desc: '专精修习四念处一乘道，于重病中住四念处令身苦自息，成就千世界净天眼通',
      match: (tags: string[]) => tags.some((t) => /阿那律/.test(t)),
    },
    {
      id: '质多罗长者与诸比丘尼',
      short: '质多罗与比丘尼',
      desc: '质多罗长者折服外道并辨析四三昧、六入结系；尸罗、苏摩等比丘尼以合材为车等妙喻破波旬实我见',
      match: (tags: string[]) =>
        tags.some((t) => /质多罗长者|比丘尼|苏摩比丘尼|尸罗比丘尼|企师瞿昙弥|阿罗毗比丘尼/.test(t)),
    },
  ];

  const computeMatrix = (
    leftDefs: { id: string; short: string; desc: string; match: (tags: string[]) => boolean }[]
  ) => {
    const linksOut: { source: string; target: string; count: number; sutras: string[] }[] = [];
    const leftCounts = new Map<string, number>();
    const rightCounts = new Map<string, number>();

    for (const lDef of leftDefs) {
      for (const rDef of dharmaPillars) {
        const matchedSutras: string[] = [];
        for (const s of sutraList) {
          const allTags = Array.from(new Set([...s.tags, ...s.coreTags, ...s.unsortedTags]));
          if (lDef.match(allTags) && rDef.match(allTags)) {
            matchedSutras.push(s.id);
          }
        }
        if (matchedSutras.length > 0) {
          linksOut.push({
            source: lDef.id,
            target: rDef.id,
            count: matchedSutras.length,
            sutras: matchedSutras.slice(0, 40),
          });
          leftCounts.set(lDef.id, (leftCounts.get(lDef.id) || 0) + matchedSutras.length);
          rightCounts.set(rDef.id, (rightCounts.get(rDef.id) || 0) + matchedSutras.length);
        }
      }
    }

    return {
      leftNodes: leftDefs.map((d) => ({
        id: d.id,
        short: d.short,
        desc: d.desc,
        total: leftCounts.get(d.id) || 0,
      })),
      rightNodes: dharmaPillars.map((d) => ({
        id: d.id,
        desc: d.desc,
        total: rightCounts.get(d.id) || 0,
      })),
      links: linksOut.sort((a, b) => b.count - a.count),
    };
  };

  fs.writeFileSync(
    path.join(DIST_DATA_DIR, 'graph.json'),
    JSON.stringify({
      nodes: Array.from(nodesMap.values()),
      links,
      sankey: {
        audience: computeMatrix(audienceGroups),
        speakers: computeMatrix(speakerGroups),
      },
    }),
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
    changelog_11: path.resolve(ROOT_DIR, '修改记录_0901-1000.md'),
    changelog_12: path.resolve(ROOT_DIR, '修改记录_1001-1100.md'),
    changelog_13: path.resolve(ROOT_DIR, '修改记录_1101-1200.md'),
    changelog_14: path.resolve(ROOT_DIR, '修改记录_1201-1300.md'),
    changelog_15: path.resolve(ROOT_DIR, '修改记录_1301-1362.md'),
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
