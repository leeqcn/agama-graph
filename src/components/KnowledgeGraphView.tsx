import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Network,
  GitBranch,
  Users,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  BookOpen,
  Search,
  Filter,
  Layers,
  Compass,
  CheckCircle2,
  ChevronsUpDown,
} from 'lucide-react';

export interface GraphNode {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  attribute?: string;
  tier?: string;
  pillar?: string;
  value: number;
  coreCount: number;
  pali?: string;
  samyukta?: string;
  definition?: string;
  sutras?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  value: number;
  label?: string;
  sutras?: string[];
}

export interface SankeyMatrix {
  leftNodes: { id: string; short: string; desc: string; total: number }[];
  rightNodes: { id: string; desc: string; total: number }[];
  links: { source: string; target: string; count: number; sutras: string[] }[];
}

export interface GraphDataPayload {
  nodes: GraphNode[];
  links: GraphLink[];
  sankey?: {
    audience: SankeyMatrix;
    speakers: SankeyMatrix;
  };
}

interface MindmapNodeData {
  id: string;
  label: string;
  formula?: string;
  tagRef: string;
  attribute?: string;
  pali?: string;
  sutraExamples: string[];
  desc?: string;
  children?: MindmapNodeData[];
}

// Structured Mindmap Tree modeled after the user's reference diagram & Yinshun's Samyukta-agama structure
const MINDMAP_TREE_DATA: MindmapNodeData = {
  id: 'root',
  label: '杂阿含经心识流转与还灭',
  tagRef: '五受阴',
  pali: 'Saṃyutta Nikāya (SN)',
  sutraExamples: ['T99-0001', 'T99-0042', 'T99-0296', 'T99-0379'],
  desc: '以「五阴、六入处、杂因（缘起·四谛）、道品（三十七道品）」四大修多罗板块为骨干，总摄世间流转与还灭解脱。',
  children: [
    {
      id: 'branch-skandha',
      label: '五蕴与五取蕴法义',
      tagRef: '五蕴',
      attribute: '苦谛·果 / 所观境',
      pali: 'Khandha-saṃyutta (SN 22)',
      sutraExamples: ['T99-0001', 'T99-0036', 'T99-0046', 'T99-0055', 'T99-0058'],
      desc: '《五阴诵》核心：辨明五阴与五受阴（五取蕴）之体相、因缘集灭与十一分别（过去未来现在、内外、麁细、好丑、远近）。',
      children: [
        {
          id: 'sk-rupa',
          label: '色阴与四大造色',
          tagRef: '色蕴',
          sutraExamples: ['T99-0046', 'T99-0055', 'T99-0061', 'T99-0265'],
          desc: '四大及四大所造色，如聚沫不坚，无常、苦、变易法。',
          children: [
            {
              id: 'sk-rupa-1',
              label: '四大毒蛇与色身：地水火风四大及四大所造色',
              tagRef: '四大',
              sutraExamples: ['T99-0055', 'T99-0061', 'T99-1172'],
              desc: '四大违调则生病苦，观色如聚沫无坚实（T99-0265、1172）。',
            },
            {
              id: 'sk-rupa-2',
              label: '十一分别总观：过去未来现在、内外、麁细、好丑、远近',
              tagRef: '非我、不异我、不相在',
              sutraExamples: ['T99-0023', 'T99-0024', 'T99-0058'],
              desc: '于一切色蕴以平等慧如实正观：非我、不异我、不相在。',
            },
          ],
        },
        {
          id: 'sk-nama',
          label: '受想行识阴',
          tagRef: '五受阴',
          sutraExamples: ['T99-0046', 'T99-0055', 'T99-0058', 'T99-0273'],
          desc: '眼等六触因缘生受、生想、生思（行），依名色生六识身。',
          children: [
            {
              id: 'sk-nama-1',
              label: '受阴：眼等六触生受（苦、乐、不苦不乐受）',
              tagRef: '受蕴',
              sutraExamples: ['T99-0046', 'T99-0055', 'T99-0470', 'T99-0485'],
              desc: '六触因缘生六受身，观受如水泡速起速灭（T99-0265）。',
            },
            {
              id: 'sk-nama-2',
              label: '想阴：眼等六触生想（取相分别）',
              tagRef: '想蕴',
              sutraExamples: ['T99-0046', 'T99-0055', 'T99-0265'],
              desc: '六触因缘生六想身，观想如春燄阳燄虚妄（T99-0265）。',
            },
            {
              id: 'sk-nama-3',
              label: '行阴：眼等六触生思（造作迁流）',
              tagRef: '行蕴',
              sutraExamples: ['T99-0046', 'T99-0055', 'T99-0265'],
              desc: '六触因缘生六思身，为有漏业因，观行如芭蕉中空（T99-0265）。',
            },
            {
              id: 'sk-nama-4',
              label: '识阴：眼等六识身（别知境界）',
              tagRef: '识蕴',
              sutraExamples: ['T99-0046', 'T99-0055', 'T99-0265', 'T99-0289'],
              desc: '眼耳鼻舌身意六识身，须臾转变如幻、如猕猴游林（T99-0265、0289）。',
            },
          ],
        },
        {
          id: 'sk-origin',
          label: '五受阴集灭',
          tagRef: '味、患、离',
          sutraExamples: ['T99-0013', 'T99-0014', 'T99-0035', 'T99-0053', 'T99-0064'],
          desc: '观五受阴之因缘集与因缘灭，彻知味、患、离。',
          children: [
            {
              id: 'sk-or-1',
              label: '色集灭：爱喜集是色集，食集是色集',
              tagRef: '五受阴',
              sutraExamples: ['T99-0053', 'T99-0064', 'T99-0065'],
              desc: '爱喜集、段食集则色集；爱喜灭、食灭则色灭。',
            },
            {
              id: 'sk-or-2',
              label: '受想行集：触集是受想行集，触灭则受想行灭',
              tagRef: '三事和合触',
              sutraExamples: ['T99-0053', 'T99-0064', 'T99-0273'],
              desc: '根境识三事和合触，触集故受、想、行集；触灭故受、想、行灭。',
            },
            {
              id: 'sk-or-3',
              label: '识集：名色集是识集，名色灭则识灭',
              tagRef: '识、名色互缘',
              sutraExamples: ['T99-0053', 'T99-0064', 'T99-0288'],
              desc: '名色与识如三芦立于空地展转相依，名色集即是识集。',
            },
            {
              id: 'sk-or-4',
              label: '苦灭：爱喜灭即苦灭，不复生长增广',
              tagRef: '喜贪尽',
              sutraExamples: ['T99-0001', 'T99-0039', 'T99-0064'],
              desc: '于五受阴断除爱喜润泽，则取阴俱识无所住，纯大苦聚灭。',
            },
          ],
        },
      ],
    },
    {
      id: 'branch-defilement',
      label: '感染流转与系著',
      tagRef: '十二缘起',
      attribute: '集谛·因 ➔ 苦谛·果',
      pali: 'Nidāna & Saḷāyatana (SN 12 / SN 35)',
      sutraExamples: ['T99-0039', 'T99-0250', 'T99-0296', 'T99-0371', 'T99-0490'],
      desc: '无明所盖、爱系其颈，于五受阴与六入处起随使、结缚、四取、四食，长夜轮转生死。',
      children: [
        {
          id: 'def-anusaya',
          label: '随使与增数',
          tagRef: '三使',
          sutraExamples: ['T99-0023', 'T99-0103', 'T99-0468', 'T99-0470'],
          desc: '愚痴无闻凡夫于五受阴、三受起贪欲使、瞋恚使、无明使，随使死而增诸数。',
          children: [
            {
              id: 'def-an-1',
              label: '随使死：随我见欲贪使死则随使死',
              tagRef: '我、我所见、我慢使',
              sutraExamples: ['T99-0023', 'T99-0024', 'T99-0109'],
              desc: '计五蕴是我、异我、相在（二十种身见），为我慢使所系。',
            },
            {
              id: 'def-an-2',
              label: '取缚：随使死则为四取与三使所缚',
              tagRef: '三使',
              sutraExamples: ['T99-0468', 'T99-0470', 'T99-0490'],
              desc: '乐受贪使、苦受瞋使、不苦不乐受无明使，如双毒箭重伤（T99-0470）。',
            },
            {
              id: 'def-an-3',
              label: '增诸数：染著缠绵假名众生、增生死数',
              tagRef: '无始生死',
              sutraExamples: ['T99-0122', 'T99-0937', 'T99-0940'],
              desc: '于五蕴染著缠绵假名众生，如小儿聚土作舍，长夜轮转（T99-0122）。',
            },
          ],
        },
        {
          id: 'def-bond',
          label: '结缚与四取',
          tagRef: '结、系',
          sutraExamples: ['T99-0250', 'T99-0490', 'T99-0572', 'T99-0707'],
          desc: '非眼系色、非色系眼，中间欲贪是其系；四取、五盖、九结障蔽圣道。',
          children: [
            {
              id: 'def-bd-1',
              label: '结所系法：非根系境，中间欲贪是其系',
              tagRef: '结、系',
              sutraExamples: ['T99-0250', 'T99-0572'],
              desc: '如黑白二牛共一轭鞅缚系，中间欲贪结系根与境（T99-0250）。',
            },
            {
              id: 'def-bd-2',
              label: '四取：欲取、见取、戒取、我取',
              tagRef: '取',
              sutraExamples: ['T99-0298', 'T99-0490', 'T99-0707'],
              desc: '缘爱有四取，缘四取有三有，引生未来生老病死苦集。',
            },
            {
              id: 'def-bd-3',
              label: '动摇缚与五盖：心怀动摇五盖则为魔波旬所缚',
              tagRef: '五盖',
              sutraExamples: ['T99-0611', 'T99-0707', 'T99-0715', 'T99-1171'],
              desc: '贪欲、瞋恚、睡眠、掉悔、疑五盖染污心，令慧力羸弱（T99-0707）。',
            },
          ],
        },
        {
          id: 'def-nutriment',
          label: '识住与四食',
          tagRef: '四食',
          sutraExamples: ['T99-0039', 'T99-0064', 'T99-0371', 'T99-0372', 'T99-0373'],
          desc: '取阴俱识攀缘色受想行四识住，依段食、触食、意思食、识食四食长养生死。',
          children: [
            {
              id: 'def-nu-1',
              label: '四识住：色、受、想、行四识住处',
              tagRef: '四识住',
              sutraExamples: ['T99-0039', 'T99-0064'],
              desc: '如封植种子得地界水界润泽则生芽，取阴俱识依四识住生长增广。',
            },
            {
              id: 'def-nu-2',
              label: '四食：麁抟食、细触食、意思食、识食',
              tagRef: '四食',
              sutraExamples: ['T99-0371', 'T99-0372', 'T99-0373'],
              desc: '四食以爱为因、爱集、爱生；观段食如旷野食子肉喻（T99-0373）。',
            },
            {
              id: 'def-nu-3',
              label: '十二缘起流转：无明缘行乃至生缘老死纯大苦聚集',
              tagRef: '因缘法',
              sutraExamples: ['T99-0296', 'T99-0298', 'T99-0300', 'T99-0347'],
              desc: '此有故彼有，此起故彼起，如城邑古道，佛出世未出世法住法界。',
            },
          ],
        },
      ],
    },
    {
      id: 'branch-path',
      label: '观行与还灭道迹',
      tagRef: '三十七道品',
      attribute: '道谛·因',
      pali: 'Magga, Bojjhaṅga, Satipaṭṭhāna (SN 45-54)',
      sutraExamples: ['T99-0042', 'T99-0281', 'T99-0609', 'T99-0714', 'T99-0750', 'T99-0810'],
      desc: '依戒清净与守护根门，修习七处善、四念处、安那般那念、七觉支、八圣道分及止观四禅，断集证灭。',
      children: [
        {
          id: 'path-7skill',
          label: '七处善与三观义',
          tagRef: '七处善',
          sutraExamples: ['T99-0042', 'T99-0043', 'T99-0262', 'T99-0301'],
          desc: '比丘于五受阴善知七事，并观察阴、界、入三种义，疾得漏尽。',
          children: [
            {
              id: 'path-7s-1',
              label: '三种观义：于空闲树下观五阴、十八界、十二入处',
              tagRef: '三种观义',
              sutraExamples: ['T99-0042', 'T99-0211', 'T99-0452'],
              desc: '方便禅思内寂其心，遍历观察阴、界、入三科皆无我我所（T99-0042）。',
            },
            {
              id: 'path-7s-2',
              label: '七处善：如实知色、色集、色灭、色灭道迹、味、患、离',
              tagRef: '七处善',
              sutraExamples: ['T99-0042', 'T99-0013', 'T99-0014'],
              desc: '于五受阴各知体相、集因、灭果、道迹及爱味、过患、出离七处。',
            },
            {
              id: 'path-7s-3',
              label: '如实知见：观五蕴无常、苦、空、非我，离有无二边中道',
              tagRef: '离有无二边之中道',
              sutraExamples: ['T99-0001', 'T99-0262', 'T99-0301'],
              desc: '正观世间集不生断见，正观世间灭不生常见，离二边说于中道（T99-0262）。',
            },
          ],
        },
        {
          id: 'path-8fold',
          label: '八圣道分与七觉支',
          tagRef: '八圣道分',
          sutraExamples: ['T99-0609', 'T99-0714', 'T99-0750', 'T99-0785', 'T99-0810'],
          desc: '安那般那念→四念处→七觉支→八圣道分，如东方日出先相，展转相润趣向涅槃。',
          children: [
            {
              id: 'path-8f-1',
              label: '正道法：正见、正志、正语、正业、正命、正方便、正念、正定',
              tagRef: '八圣道分',
              sutraExamples: ['T99-0750', 'T99-0754', 'T99-0785'],
              desc: '第一义正见为导首，前七支为正定资具助伴，统摄戒定慧三学（T99-0785）。',
            },
            {
              id: 'path-8f-2',
              label: '灭道迹：四念处一乘道与安那般那十六胜行',
              tagRef: '四念处',
              sutraExamples: ['T99-0607', 'T99-0609', 'T99-0803', 'T99-0810'],
              desc: '修安那般那十六胜行满身受心法四念处，满七觉支，满明与解脱（T99-0810）。',
            },
            {
              id: 'path-8f-3',
              label: '调伏欲贪：七觉支对治五盖，止观俱行离欲寂静',
              tagRef: '七觉支',
              sutraExamples: ['T99-0464', 'T99-0560', 'T99-0707', 'T99-0714'],
              desc: '心微劣时修择法精进喜，心掉举时修猗定舍，念觉支一切时常用（T99-0714）。',
            },
          ],
        },
        {
          id: 'path-lib',
          label: '离贪与心解脱',
          tagRef: '心解脱',
          sutraExamples: ['T99-0001', 'T99-0039', 'T99-0064', 'T99-0080', 'T99-0567'],
          desc: '厌离五受阴与六触入处，断除喜贪，成就无量、无相、无所有、空三昧与不动心解脱。',
          children: [
            {
              id: 'path-lb-1',
              label: '色界离贪：于色受想行识界离贪，意生缚断、攀缘断',
              tagRef: '离欲',
              sutraExamples: ['T99-0039', 'T99-0064'],
              desc: '于四识住离贪，则封植断、攀缘断，识无所住。',
            },
            {
              id: 'path-lb-2',
              label: '识无住处：彼识不复住，不复生长增广',
              tagRef: '心解脱',
              sutraExamples: ['T99-0039', 'T99-0064', 'T99-1267'],
              desc: '无所住故心解脱，心解脱故安住，安住故知足，知足故不恐怖。',
            },
            {
              id: 'path-lb-3',
              label: '心善解脱与慧解脱：无明离故慧解脱，贪爱离故心解脱',
              tagRef: '慧解脱',
              sutraExamples: ['T99-0347', 'T99-0567', 'T99-0710'],
              desc: '先得缘起法住智，后得涅槃智；贪欲染心离得心解脱，无明染心离得慧解脱。',
            },
          ],
        },
      ],
    },
    {
      id: 'branch-truths',
      label: '四圣谛与究竟解脱',
      tagRef: '四圣谛',
      attribute: '灭谛·果 / 四沙门果',
      pali: 'Sacca-saṃyutta (SN 56)',
      sutraExamples: ['T99-0027', 'T99-0061', 'T99-0379', 'T99-0435', 'T99-0843'],
      desc: '佛于鹿野苑三转十二行法轮，示苦、集、灭、道四圣谛；弟子依四不坏净与八圣道历证四沙门果，究竟苦边。',
      children: [
        {
          id: 'tr-4noble',
          label: '四圣谛三转十二行',
          tagRef: '三转十二行',
          sutraExamples: ['T99-0379', 'T99-0380', 'T99-0435', 'T99-0436'],
          desc: '此是苦（当知）、此是苦集（当断）、此是苦灭（当证）、此是苦灭道迹（当修），生眼智明觉。',
          children: [
            {
              id: 'tr-4n-1',
              label: '苦圣谛【果】：生老病死、恩爱别离、怨憎会、所求不得、略说五受阴是苦',
              tagRef: '苦圣谛',
              sutraExamples: ['T99-0379', 'T99-0382', 'T99-1307'],
              desc: '世间有漏业报异熟果、一寻之身五受阴炽然皆苦（T99-0379、1307）。',
            },
            {
              id: 'tr-4n-2',
              label: '苦集圣谛【因】：当来有爱、喜贪俱行、于彼彼处染著润泽',
              tagRef: '苦集圣谛',
              sutraExamples: ['T99-0379', 'T99-0382'],
              desc: '欲爱、有爱、无有爱三爱及无明有漏业因，能招未来生死苦果。',
            },
            {
              id: 'tr-4n-3',
              label: '苦灭圣谛【果】：于彼当来有爱永尽无余、舍离、吐尽、离欲、灭尽、涅槃',
              tagRef: '苦灭圣谛',
              sutraExamples: ['T99-0379', 'T99-0890'],
              desc: '贪欲永尽、瞋恚永尽、愚痴永尽，一切烦恼与苦息灭之无为涅槃。',
            },
            {
              id: 'tr-4n-4',
              label: '苦灭道迹【因】：谓八圣道分（正见乃至正定）',
              tagRef: '苦灭道迹圣谛',
              sutraExamples: ['T99-0379', 'T99-0750'],
              desc: '导向苦灭涅槃之唯一正因道迹，如四阶昇殿堂渐次无间等（T99-0435）。',
            },
          ],
        },
        {
          id: 'tr-nirvana',
          label: '见法涅槃与四果',
          tagRef: '见法涅槃',
          sutraExamples: ['T99-0027', 'T99-0028', 'T99-0061', 'T99-0821', 'T99-0843'],
          desc: '成就四入流分与四不坏净，依次断三结、薄贪恚痴、断五下分结、断五上分结，证阿罗汉。',
          children: [
            {
              id: 'tr-nv-1',
              label: '四不坏净与须陀洹：断身见、戒取、疑三结，极七有生',
              tagRef: '须陀洹果',
              sutraExamples: ['T99-0061', 'T99-0843', 'T99-0851'],
              desc: '成就佛法僧戒四不坏净，入八圣道流，永脱地狱畜生饿鬼三恶趣。',
            },
            {
              id: 'tr-nv-2',
              label: '不起诸漏：生厌、离欲、灭尽、心正解脱，名见法涅槃',
              tagRef: '见法涅槃',
              sutraExamples: ['T99-0027', 'T99-0028', 'T99-1177'],
              desc: '现法中自知自觉，如薪尽火灭不可说去向四方（T99-0028、1177）。',
            },
            {
              id: 'tr-nv-3',
              label: '究竟苦边：我生已尽、梵行已立、所作已作、自知不受后有',
              tagRef: '阿罗汉',
              sutraExamples: ['T99-0001', 'T99-0379', 'T99-0642', 'T99-1079'],
              desc: '成就无知根（阿罗汉果）与无学三明，永断有漏生死轮回。',
            },
          ],
        },
      ],
    },
  ],
};

export default function KnowledgeGraphView({
  graphData,
  tags,
  onSelectTagFilter,
  onSelectSutra,
}: {
  graphData: GraphDataPayload;
  tags: {
    name: string;
    count: number;
    coreCount: number;
    sutras: string[];
    category?: string;
    subCategory?: string;
    attribute?: string;
    pali?: string;
    samyukta?: string;
    definition?: string;
  }[];
  onSelectTagFilter: (tag: string) => void;
  onSelectSutra: (sutraId: string) => void;
}) {
  // Active chart tab:
  // 'mindmap' -> 图表 1A：心识流转可折叠思维导图（如截图样式）
  // 'flowchart' -> 图表 1B：核心法义流转与对治闭环图（五蕴/六处 → 十二缘起 → 四圣谛 → 八正道）
  // 'sankey' -> 图表 2：根机与说法对象矩阵（桑基流向图 / 观机逗教双分图）
  // 'network' -> 图表 3：概念共现与六类关系网络图（三层核心骨架双向链接图谱）
  const [activeChart, setActiveChart] = useState<'mindmap' | 'flowchart' | 'sankey' | 'network'>('mindmap');

  // Mindmap state (zoom, 2D pan offset, drag tracking, and inspector toggle)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [mindmapZoom, setMindmapZoom] = useState<number>(0.72);
  const [mindmapPan, setMindmapPan] = useState<{ x: number; y: number }>({ x: 64, y: 20 });
  const [isDraggingMindmap, setIsDraggingMindmap] = useState<boolean>(false);
  const [showMindmapInspector, setShowMindmapInspector] = useState<boolean>(true);
  const mindmapViewportRef = useRef<HTMLDivElement | null>(null);
  const mindmapContentRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    moved: false,
  });
  const [selectedMindmapNode, setSelectedMindmapNode] = useState<MindmapNodeData>(
    MINDMAP_TREE_DATA.children![0].children![1]
  );

  // Fit entire mindmap tree into current viewport so user sees full panorama
  const fitMindmapToScreen = () => {
    const vp = mindmapViewportRef.current;
    const ct = mindmapContentRef.current;
    if (!vp || !ct) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const cw = ct.offsetWidth || 1050;
    const ch = ct.offsetHeight || 980;
    const padX = 76;
    const padY = 36;
    const scaleX = (vw - padX) / cw;
    const scaleY = (vh - padY) / ch;
    const bestScale = Math.max(0.28, Math.min(1.05, Number(Math.min(scaleX, scaleY).toFixed(2))));
    const centeredX = Math.max(58, Math.round((vw - cw * bestScale) / 2));
    const centeredY = Math.max(16, Math.round((vh - ch * bestScale) / 2));
    setMindmapZoom(bestScale);
    setMindmapPan({ x: centeredX, y: centeredY });
  };

  // Auto-fit when switching to mindmap or collapsing/expanding all
  useEffect(() => {
    if (activeChart !== 'mindmap') return;
    const timer = setTimeout(() => {
      fitMindmapToScreen();
    }, 60);
    return () => clearTimeout(timer);
  }, [activeChart, showMindmapInspector]);

  const handleMindmapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Allow normal clicks on buttons, but still enable dragging anywhere
    if ((e.target as HTMLElement).closest('[data-no-pan="true"]')) return;
    setIsDraggingMindmap(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: mindmapPan.x,
      panY: mindmapPan.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMindmapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMindmap) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.moved = true;
    }
    setMindmapPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMindmapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMindmap) return;
    setIsDraggingMindmap(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleMindmapWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setMindmapZoom((z) => Math.max(0.25, Math.min(1.8, Number((z + delta).toFixed(2)))));
    } else {
      setMindmapPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Sankey state
  const [sankeyMode, setSankeyMode] = useState<'audience' | 'speakers'>('audience');
  const [selectedSankeyLeft, setSelectedSankeyLeft] = useState<string | null>(null);
  const [selectedSankeyRight, setSelectedSankeyRight] = useState<string | null>(null);

  // Network state
  const [networkTierFilter, setNetworkTierFilter] = useState<'all' | '法义层' | '人物场景层' | 'pali'>('all');
  const [networkPillarFilter, setNetworkPillarFilter] = useState<string>('all');
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>('all');
  const [minCooccurrence, setMinCooccurrence] = useState<number>(2);
  const [networkSearch, setNetworkSearch] = useState<string>('');
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);

  // Lookup map from tag name to tag stat
  const tagMap = useMemo(() => {
    const m = new Map<string, (typeof tags)[0]>();
    for (const t of tags) {
      m.set(t.name, t);
    }
    return m;
  }, [tags]);

  const toggleMindmapNode = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandCollapseAll = () => {
    if (collapsedIds.size > 0) {
      setCollapsedIds(new Set());
    } else {
      // Collapse all level-2 nodes so only level-1 trunks and level-2 headers show
      const toCollapse = new Set<string>();
      for (const b of MINDMAP_TREE_DATA.children || []) {
        for (const sub of b.children || []) {
          toCollapse.add(sub.id);
        }
      }
      setCollapsedIds(toCollapse);
    }
  };

  // Resolve sutras for selectedMindmapNode by combining sutraExamples + live tagMap sutras
  const activeMindmapInspector = useMemo(() => {
    const stat = tagMap.get(selectedMindmapNode.tagRef);
    const mergedSutras = Array.from(
      new Set([...(selectedMindmapNode.sutraExamples || []), ...(stat?.sutras || [])])
    ).slice(0, 36);
    return {
      node: selectedMindmapNode,
      stat,
      sutras: mergedSutras,
    };
  }, [selectedMindmapNode, tagMap]);

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-3.5rem)] bg-[#fcfaf6] dark:bg-stone-950">
      {/* Top Architecture Header & 3-Chart Switcher */}
      <div className="border-b border-amber-200/70 dark:border-stone-800 bg-amber-50/40 dark:bg-stone-900/60 px-3 sm:px-6 py-3 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Network className="w-5 h-5 text-amber-800 dark:text-amber-400" />
              <h2 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                《杂阿含经》立体知识图谱（法义相从 · 事类相聚）
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-stone-800 text-amber-900 dark:text-amber-300 font-medium">
                三层核心骨架 · 四大关系逻辑 · 三张专题图谱
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              依印顺导师等学者还原之《杂阿含经》组织（五阴 · 六入处 · 杂因〔缘起/四谛〕 · 道品），串联法义层、人物场景层与经号巴利对读层
            </p>
          </div>

          {/* 3 Core Charts Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-stone-900 p-1 rounded-xl border border-amber-200/80 dark:border-stone-800 shadow-2xs">
            <button
              onClick={() => setActiveChart('mindmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeChart === 'mindmap'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-amber-100/60 dark:hover:bg-stone-800'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>1A. 心识流转思维导图</span>
            </button>

            <button
              onClick={() => setActiveChart('flowchart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeChart === 'flowchart'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-amber-100/60 dark:hover:bg-stone-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>1B. 法义流转与对治闭环</span>
            </button>

            <button
              onClick={() => setActiveChart('sankey')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeChart === 'sankey'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-amber-100/60 dark:hover:bg-stone-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. 根机与说法矩阵（桑基图）</span>
            </button>

            <button
              onClick={() => setActiveChart('network')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeChart === 'network'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-amber-100/60 dark:hover:bg-stone-800'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>3. 概念共现与六类关系网络</span>
            </button>
          </div>
        </div>

        {/* Three-Tier Architecture Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="px-3 py-2 rounded-lg bg-white/90 dark:bg-stone-900/90 border border-amber-200/60 dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-300">第一层：法义层（四大主干）</span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                五阴 · 六入处 · 杂因（缘起/四谛因果） · 道品（三十七道品）
              </p>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 font-semibold">
              {tags.filter((t) => t.category === '法义').length}
            </span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-white/90 dark:bg-stone-900/90 border border-amber-200/60 dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-indigo-900 dark:text-indigo-300">第二层：人物与场景层（缘起背景）</span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                说法者（佛、舍利弗、阿难、迦叶） · 听法根机 · 说法精舍园苑
              </p>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-100/80 dark:bg-stone-800 text-indigo-900 dark:text-indigo-300 font-semibold">
              {tags.filter((t) => t.category === '人物' || t.category === '地点').length}
            </span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-white/90 dark:bg-stone-900/90 border border-amber-200/60 dark:border-stone-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-emerald-900 dark:text-emerald-300">第三层：经号与巴利对读层（数据源）</span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                T99 全藏 1355 经区块直连 · 巴利《相应部》(SN) 跨文本对读
              </p>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-100/80 dark:bg-stone-800 text-emerald-900 dark:text-emerald-300 font-semibold">
              1355经
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CHART 1A: INTERACTIVE HORIZONTAL COLLAPSIBLE MINDMAP (matching screenshot)
         ===================================================================== */}
      {activeChart === 'mindmap' && (
        <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-11.5rem)] min-h-[560px] overflow-hidden relative">
          {/* Interactive Pan & Zoom Viewport */}
          <div
            ref={mindmapViewportRef}
            onPointerDown={handleMindmapPointerDown}
            onPointerMove={handleMindmapPointerMove}
            onPointerUp={handleMindmapPointerUp}
            onPointerCancel={handleMindmapPointerUp}
            onWheel={handleMindmapWheel}
            className={`flex-1 relative overflow-hidden bg-[#faf9f5] dark:bg-stone-950 select-none touch-none ${
              isDraggingMindmap ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Left Floating Controls (Expand/Collapse, Zoom +/-, Fit Panorama, and 4-Way Pan Pad) */}
            <div
              data-no-pan="true"
              className="absolute left-3 top-3 z-20 flex flex-col items-center gap-2"
            >
              {/* Expand / Collapse Level Button */}
              <button
                onClick={() => {
                  toggleExpandCollapseAll();
                  setTimeout(fitMindmapToScreen, 60);
                }}
                title={collapsedIds.size > 0 ? '展开全部三级节点' : '折叠至二级骨干'}
                className="w-10 h-10 rounded-full bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-700 shadow-md flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 transition"
              >
                <ChevronsUpDown className="w-4 h-4" />
              </button>

              {/* Zoom + / - / Fit All Pill */}
              <div className="flex flex-col rounded-2xl bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-700 shadow-md overflow-hidden">
                <button
                  onClick={() => setMindmapZoom((z) => Math.min(1.8, Number((z + 0.12).toFixed(2))))}
                  title="放大导图"
                  className="w-10 h-9 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 border-b border-stone-200 dark:border-stone-800 transition text-lg font-medium"
                >
                  +
                </button>
                <button
                  onClick={fitMindmapToScreen}
                  title="一键适应屏幕看全貌"
                  className="w-10 h-8 flex items-center justify-center text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-stone-800 border-b border-stone-200 dark:border-stone-800 transition"
                >
                  全貌
                </button>
                <button
                  onClick={() => setMindmapZoom((z) => Math.max(0.25, Number((z - 0.12).toFixed(2))))}
                  title="缩小导图"
                  className="w-10 h-9 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-stone-800 transition text-lg font-medium"
                >
                  −
                </button>
              </div>

              {/* 4-Way Directional Pan Pad (上下左右移动) */}
              <div className="grid grid-cols-3 gap-0.5 p-1 rounded-xl bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-700 shadow-md text-xs text-stone-700 dark:text-stone-200">
                <div />
                <button
                  onClick={() => setMindmapPan((p) => ({ ...p, y: p.y + 90 }))}
                  title="向上移动"
                  className="w-6 h-6 rounded hover:bg-amber-100 dark:hover:bg-stone-800 flex items-center justify-center font-bold"
                >
                  ↑
                </button>
                <div />
                <button
                  onClick={() => setMindmapPan((p) => ({ ...p, x: p.x + 110 }))}
                  title="向左移动"
                  className="w-6 h-6 rounded hover:bg-amber-100 dark:hover:bg-stone-800 flex items-center justify-center font-bold"
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    setMindmapZoom(1);
                    setMindmapPan({ x: 64, y: 24 });
                  }}
                  title="100% 原始比例"
                  className="w-6 h-6 rounded hover:bg-amber-100 dark:hover:bg-stone-800 flex items-center justify-center text-[9px] font-mono font-bold"
                >
                  1:1
                </button>
                <button
                  onClick={() => setMindmapPan((p) => ({ ...p, x: p.x - 110 }))}
                  title="向右移动"
                  className="w-6 h-6 rounded hover:bg-amber-100 dark:hover:bg-stone-800 flex items-center justify-center font-bold"
                >
                  →
                </button>
                <div />
                <button
                  onClick={() => setMindmapPan((p) => ({ ...p, y: p.y - 90 }))}
                  title="向下移动"
                  className="w-6 h-6 rounded hover:bg-amber-100 dark:hover:bg-stone-800 flex items-center justify-center font-bold"
                >
                  ↓
                </button>
                <div />
              </div>

              <div className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-[10px] font-mono text-stone-600 dark:text-stone-300 shadow-2xs">
                {Math.round(mindmapZoom * 100)}%
              </div>
            </div>

            {/* Top-Right Hint & Inspector Drawer Toggle */}
            <div
              data-no-pan="true"
              className="absolute right-3 top-3 z-20 flex items-center gap-2"
            >
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-white/90 dark:bg-stone-900/90 border border-amber-200/70 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-400 shadow-2xs">
                按住画布可上下左右自由拖动 · 点击节点查看经文
              </span>
              <button
                onClick={() => setShowMindmapInspector((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white/95 dark:bg-stone-900/95 border border-amber-300 dark:border-stone-700 text-xs font-medium text-amber-900 dark:text-amber-300 shadow-sm hover:bg-amber-50 transition"
              >
                {showMindmapInspector ? '收起侧栏 ▸' : '展开详情 ◂'}
              </button>
            </div>

            {/* Pan & Zoom Transformed Tree Layer */}
            <div
              ref={mindmapContentRef}
              className="inline-flex items-center min-w-max origin-top-left will-change-transform p-4"
              style={{
                transform: `translate3d(${mindmapPan.x}px, ${mindmapPan.y}px, 0) scale(${mindmapZoom})`,
              }}
            >
              {/* Root Node */}
              <div className="flex items-center">
                <div
                  onClick={() => {
                    if (!dragStartRef.current.moved) {
                      setSelectedMindmapNode(MINDMAP_TREE_DATA);
                      setShowMindmapInspector(true);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-lg font-sans font-bold text-sm cursor-pointer transition shadow-xs border ${
                    selectedMindmapNode.id === MINDMAP_TREE_DATA.id
                      ? 'bg-indigo-200 text-indigo-950 border-indigo-500 ring-2 ring-indigo-400/50 dark:bg-indigo-900 dark:text-indigo-100'
                      : 'bg-[#d6def8] text-[#1e293b] border-[#b4c4f4] hover:bg-[#c5d1f6] dark:bg-indigo-950/90 dark:text-indigo-100 dark:border-indigo-800'
                  }`}
                >
                  {MINDMAP_TREE_DATA.label}
                </div>

                {/* Root collapse indicator */}
                <button
                  data-no-pan="true"
                  onClick={toggleExpandCollapseAll}
                  className="ml-1.5 w-5 h-5 rounded-full bg-[#e0e7ff] dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-xs flex items-center justify-center font-bold border border-indigo-300 dark:border-indigo-700"
                >
                  {collapsedIds.size > 0 ? '>' : '<'}
                </button>
              </div>

              {/* Level 1 Branches Container */}
              <div className="flex flex-col justify-center space-y-5 ml-6 border-l-2 border-[#8b9cf6] dark:border-indigo-700 pl-6 py-2">
                {MINDMAP_TREE_DATA.children?.map((branch) => {
                  const isBranchCollapsed = collapsedIds.has(branch.id);
                  const isBranchSelected = selectedMindmapNode.id === branch.id;

                  return (
                    <div key={branch.id} className="flex items-center relative">
                      {/* Horizontal connector from vertical spine */}
                      <div className="w-6 h-0.5 bg-[#8b9cf6] dark:bg-indigo-700 -ml-6 mr-0 shrink-0" />

                      {/* Level 1 Branch Pill */}
                      <div className="flex items-center shrink-0">
                        <div
                          onClick={() => {
                            if (!dragStartRef.current.moved) {
                              setSelectedMindmapNode(branch);
                              setShowMindmapInspector(true);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-lg font-sans font-semibold text-xs sm:text-sm cursor-pointer transition shadow-2xs border ${
                            isBranchSelected
                              ? 'bg-indigo-200 text-indigo-950 border-indigo-500 ring-2 ring-indigo-400/50 dark:bg-indigo-900 dark:text-indigo-100'
                              : 'bg-[#d6def8] text-[#1e293b] border-[#b4c4f4] hover:bg-[#c5d1f6] dark:bg-indigo-950/80 dark:text-indigo-100 dark:border-indigo-800'
                          }`}
                        >
                          <div>{branch.label}</div>
                          {branch.attribute && (
                            <div className="text-[10px] font-normal text-indigo-800/80 dark:text-indigo-300 mt-0.5">
                              {branch.attribute}
                            </div>
                          )}
                        </div>

                        {branch.children && branch.children.length > 0 && (
                          <button
                            data-no-pan="true"
                            onClick={(e) => toggleMindmapNode(branch.id, e)}
                            className="ml-1.5 w-5 h-5 rounded-full bg-[#e0e7ff] dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[11px] flex items-center justify-center font-bold border border-indigo-300 dark:border-indigo-700 hover:scale-110 transition"
                            title={isBranchCollapsed ? '展开分支' : '折叠分支'}
                          >
                            {isBranchCollapsed ? '>' : '<'}
                          </button>
                        )}
                      </div>

                      {/* Level 2 Sub-branches */}
                      {!isBranchCollapsed && branch.children && (
                        <div className="flex flex-col justify-center space-y-3.5 ml-6 border-l-2 border-[#34d399] dark:border-emerald-700 pl-6 py-1">
                          {branch.children.map((sub) => {
                            const isSubCollapsed = collapsedIds.has(sub.id);
                            const isSubSelected = selectedMindmapNode.id === sub.id;

                            return (
                              <div key={sub.id} className="flex items-center">
                                <div className="w-6 h-0.5 bg-[#34d399] dark:bg-emerald-700 -ml-6 shrink-0" />

                                {/* Level 2 Sub-branch Pill (Teal/Mint) */}
                                <div className="flex items-center shrink-0">
                                  <div
                                    onClick={() => {
                                      if (!dragStartRef.current.moved) {
                                        setSelectedMindmapNode(sub);
                                        setShowMindmapInspector(true);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg font-sans font-semibold text-xs cursor-pointer transition shadow-2xs border ${
                                      isSubSelected
                                        ? 'bg-emerald-300 text-emerald-950 border-emerald-600 ring-2 ring-emerald-500/40 dark:bg-emerald-800 dark:text-emerald-50'
                                        : 'bg-[#99e6d8] text-[#0f2922] border-[#6bd6c4] hover:bg-[#7fdecb] dark:bg-teal-950 dark:text-teal-100 dark:border-teal-800'
                                    }`}
                                  >
                                    {sub.label}
                                  </div>

                                  {sub.children && sub.children.length > 0 && (
                                    <button
                                      data-no-pan="true"
                                      onClick={(e) => toggleMindmapNode(sub.id, e)}
                                      className="ml-1.5 w-5 h-5 rounded-full bg-[#b8f2e6] dark:bg-teal-900 text-teal-900 dark:text-teal-200 text-[11px] flex items-center justify-center font-bold border border-teal-400 dark:border-teal-700 hover:scale-110 transition"
                                      title={isSubCollapsed ? '展开细项' : '折叠细项'}
                                    >
                                      {isSubCollapsed ? '>' : '<'}
                                    </button>
                                  )}
                                </div>

                                {/* Level 3 Leaf Nodes (Emerald Green Pills as in screenshot) */}
                                {!isSubCollapsed && sub.children && (
                                  <div className="flex flex-col justify-center space-y-1.5 ml-6 border-l-2 border-[#4ade80] dark:border-emerald-700/80 pl-5 py-1">
                                    {sub.children.map((leaf) => {
                                      const isLeafSelected = selectedMindmapNode.id === leaf.id;
                                      return (
                                        <div key={leaf.id} className="flex items-center">
                                          <div className="w-5 h-0.5 bg-[#4ade80] dark:bg-emerald-700/80 -ml-5 shrink-0" />
                                          <div
                                            onClick={() => {
                                              if (!dragStartRef.current.moved) {
                                                setSelectedMindmapNode(leaf);
                                                setShowMindmapInspector(true);
                                              }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg font-sans text-xs cursor-pointer transition shadow-2xs border ${
                                              isLeafSelected
                                                ? 'bg-emerald-300 text-emerald-950 border-emerald-700 font-bold ring-2 ring-emerald-500/40 dark:bg-emerald-800 dark:text-emerald-50'
                                                : 'bg-[#9ae6b4] text-[#143321] border-[#68d391] hover:bg-[#81dca0] dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-800'
                                            }`}
                                          >
                                            {leaf.label}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Inspector Drawer for Selected Mindmap Node (Collapsible) */}
          {showMindmapInspector && (
            <div className="w-full lg:w-92 max-h-[42vh] lg:max-h-full border-t lg:border-t-0 lg:border-l border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 overflow-y-auto space-y-4 shrink-0">
              <div className="border-b border-amber-100 dark:border-stone-800 pb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    思维导图节点详情 · 经号溯源
                  </div>
                  <h3 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 mt-1">
                    {activeMindmapInspector.node.label}
                  </h3>
                </div>
                <button
                  onClick={() => setShowMindmapInspector(false)}
                  className="text-xs text-stone-400 hover:text-stone-600 p-1"
                  title="收起详情侧栏以放大导图视野"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 font-medium">
                  核心标签：{activeMindmapInspector.node.tagRef}
                </span>
                {(activeMindmapInspector.node.attribute || activeMindmapInspector.stat?.subCategory) && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
                    {activeMindmapInspector.node.attribute ||
                      `${activeMindmapInspector.stat?.subCategory}${
                        activeMindmapInspector.stat?.attribute
                          ? `【${activeMindmapInspector.stat.attribute}】`
                          : ''
                      }`}
                  </span>
                )}
              </div>
              {(activeMindmapInspector.node.pali || activeMindmapInspector.stat?.pali) && (
                <div className="text-xs italic text-stone-500 dark:text-stone-400">
                  巴利 / 相应部对读：{activeMindmapInspector.node.pali || activeMindmapInspector.stat?.pali}
                  {activeMindmapInspector.stat?.samyukta ? ` · ${activeMindmapInspector.stat.samyukta}` : ''}
                </div>
              )}

              {/* Doctrinal explanation */}
              <div className="space-y-2 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                {activeMindmapInspector.node.desc && (
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-stone-800/70 border border-amber-200/60 dark:border-stone-700">
                    <div className="font-semibold text-stone-900 dark:text-stone-100 mb-1">法义脉络说明：</div>
                    <p>{activeMindmapInspector.node.desc}</p>
                  </div>
                )}
                {activeMindmapInspector.stat?.definition && (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/70 dark:border-stone-800">
                    <div className="font-semibold text-stone-900 dark:text-stone-100 mb-1">原典词表定义：</div>
                    <p>{activeMindmapInspector.stat.definition}</p>
                  </div>
                )}
              </div>

              {/* Associated Sutra Pills */}
              <div className="space-y-2 pt-2 border-t border-amber-100 dark:border-stone-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">
                    关联《杂阿含经》经号（点击直达原文）：
                  </span>
                  <span className="font-mono text-stone-400">
                    共 {activeMindmapInspector.stat?.count || activeMindmapInspector.sutras.length} 经
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto p-1">
                  {activeMindmapInspector.sutras.map((sid) => (
                    <button
                      key={sid}
                      onClick={() => onSelectSutra(sid)}
                      className="font-mono text-xs px-2 py-1 rounded-md bg-amber-100/70 hover:bg-amber-800 hover:text-white dark:bg-stone-800 dark:text-amber-300 dark:hover:bg-amber-700 transition"
                    >
                      {sid}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter all sutras by this tag */}
              <button
                onClick={() => onSelectTagFilter(activeMindmapInspector.node.tagRef)}
                className="w-full py-2 px-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>在经文目录中检索「{activeMindmapInspector.node.tagRef}」全部经文</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          CHART 1B: CORE DHARMA FLOW & COUNTER-REMEDY CLOSED-LOOP DIAGRAM
         ===================================================================== */}
      {activeChart === 'flowchart' && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Axis Banner */}
          <div className="rounded-2xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                  1. 核心法义主轴：从「世间流转」到「还灭解脱」的修行闭环
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  点击图中任意名相节点，即可跳转检索《杂阿含经》对应原典经文
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 font-medium self-start">
                五蕴/六处 ➔ 十二缘起 ➔ 四圣谛 ➔ 八圣道 ➔ 涅槃
              </span>
            </div>

            {/* 5-Pillar Horizontal Main Axis */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
              {[
                {
                  step: '第一环 · 所观世间境',
                  title: '五蕴 · 六入处 · 十八界',
                  pali: 'Khandha · Āyatana · Dhātu',
                  color: 'border-amber-300 bg-amber-50/60 dark:bg-stone-800/60 dark:border-amber-800',
                  desc: '色受想行识五受阴、内外六入处、六识六触六受，一切世间所观所依之法。',
                  tags: ['五蕴', '五受阴', '六内入处', '六触入处', '十八界', '四大'],
                },
                {
                  step: '第二环 · 顺生流转门',
                  title: '十二缘起 · 集谛苦因',
                  pali: 'Paṭiccasamuppāda · Samudaya',
                  color: 'border-orange-300 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-800',
                  desc: '无明触生受、受缘爱、爱缘四取、取缘有、生老病死忧悲苦恼纯大苦聚集。',
                  tags: ['十二缘起', '无明', '无明触', '爱', '取', '四食', '五盖', '三使'],
                },
                {
                  step: '第三环 · 转依枢机',
                  title: '四圣谛 · 如实正观',
                  pali: 'Cattāri Ariyasaccāni',
                  color: 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-800',
                  desc: '知苦、断集、证灭、修道；于五蕴六处正观无常、苦、空、非我，彻知味患离。',
                  tags: ['四圣谛', '三转十二行', '无常', '苦', '非我', '味、患、离', '七处善', '法住智'],
                },
                {
                  step: '第四环 · 还灭修证门',
                  title: '三十七道品 · 八圣道',
                  pali: 'Bodhipakkhiyā · Ariyamagga',
                  color: 'border-sky-300 bg-sky-50/60 dark:bg-sky-950/20 dark:border-sky-800',
                  desc: '守护根门→安那般那念→四念处→五根五力→七觉支→八圣道分，止观俱行。',
                  tags: ['守护诸根', '安那般那念', '四念处', '五根', '七觉支', '八圣道分', '止、观', '四不坏净'],
                },
                {
                  step: '第五环 · 究竟解脱果',
                  title: '厌离 · 喜贪尽 · 涅槃',
                  pali: 'Virāga · Vimutti · Nibbāna',
                  color: 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800',
                  desc: '正观生厌→厌故离欲→喜贪尽→心解脱、慧解脱→四沙门果、见法涅槃。',
                  tags: ['厌离', '喜贪尽', '心解脱', '慧解脱', '须陀洹果', '阿罗汉', '见法涅槃', '涅槃'],
                },
              ].map((col, idx) => (
                <div key={col.title} className={`rounded-xl border p-3.5 flex flex-col justify-between ${col.color}`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                      <span>{col.step}</span>
                      {idx < 4 && <span className="hidden md:inline text-amber-700 font-bold">➔</span>}
                    </div>
                    <h4 className="font-serif-sc font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                      {col.title}
                    </h4>
                    <div className="text-[10px] italic text-stone-500">{col.pali}</div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed pt-1">{col.desc}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                    {col.tags.map((tName) => {
                      const cnt = tagMap.get(tName)?.count || 0;
                      return (
                        <button
                          key={tName}
                          onClick={() => onSelectTagFilter(tName)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-white/90 hover:bg-amber-800 hover:text-white dark:bg-stone-900 dark:hover:bg-amber-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition"
                        >
                          {tName} {cnt > 0 ? `(${cnt})` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two Key Progressive Chains: (A) Classic Liberation Chain & (B) 12-Link Dependent Origination */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif-sc font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  法义递进路径一：五蕴六处观行解脱定型链（T99-0001～0012）
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
                  修证次第
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                《杂阿含经》出现频率最高的核心修证公式：从如实正观「无常、苦、非我」直趣「厌离、喜贪尽、心解脱」。
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { label: '五受阴 / 六入处', tag: '五受阴' },
                  { label: '如实正观', tag: '正观' },
                  { label: '无常', tag: '无常' },
                  { label: '苦', tag: '苦' },
                  { label: '空 · 非我 · 非我所', tag: '非我' },
                  { label: '生厌（厌离）', tag: '厌离' },
                  { label: '离欲（喜贪尽/欲贪断）', tag: '喜贪尽' },
                  { label: '心解脱 · 慧解脱', tag: '心解脱' },
                  { label: '自知不受后有（阿罗汉）', tag: '阿罗汉' },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.label}>
                    <button
                      onClick={() => onSelectTagFilter(step.tag)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-800 hover:text-white dark:bg-stone-800 dark:hover:bg-amber-700 border border-amber-200 dark:border-stone-700 text-xs font-medium transition"
                    >
                      {step.label}
                    </button>
                    {i < arr.length - 1 && <span className="text-amber-700 dark:text-amber-400 font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif-sc font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  法义递进路径二：跨板块修证相润链（T99-0281、T99-0810）
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-medium">
                  跨板块串联
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                如何从「六入处防护」与「出入息念」逐层满足「四念处、七觉支」，最终达成「明与解脱」：
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { label: '亲近善知识', tag: '善知识' },
                  { label: '圣戒清净', tag: '圣戒' },
                  { label: '守护诸根（六触律仪）', tag: '守护诸根' },
                  { label: '三妙行清净', tag: '十善业道' },
                  { label: '安那般那十六胜行', tag: '安那般那念' },
                  { label: '满足四念处', tag: '四念处' },
                  { label: '满足七觉支', tag: '七觉支' },
                  { label: '八圣道分', tag: '八圣道分' },
                  { label: '满足明与解脱', tag: '解脱' },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.label}>
                    <button
                      onClick={() => onSelectTagFilter(step.tag)}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-50/70 hover:bg-amber-800 hover:text-white dark:bg-stone-800 dark:hover:bg-amber-700 border border-sky-200 dark:border-stone-700 text-xs font-medium transition"
                    >
                      {step.label}
                    </button>
                    {i < arr.length - 1 && <span className="text-sky-700 dark:text-sky-400 font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Concept Containment (包含 ⊂) & Counter-Remedies (对治药方 ⇄) */}
          <div className="rounded-2xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                2. 烦恼与法门对治矩阵（结构包含 `⊂` 与应病与药关系 `⇄`）
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                《杂阿含经》中成对出现的染净对立与对治药方，点击经号或标签即可对照原典
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                {
                  affliction: '五盖（贪欲、瞋恚、睡眠、掉悔、疑）',
                  affTag: '五盖',
                  remedy: '四念处 · 七觉支（念、择法、精进、喜、猗、定、舍）',
                  remTag: '七觉支',
                  sutra: 'T99-0611',
                  note: '纯一逸满不善法聚谓五盖，纯一满净善法聚谓四念处；七觉支令慧力增广向涅槃（T99-0611、0707）。',
                },
                {
                  affliction: '六根驰散外境 · 中间欲贪结系',
                  affTag: '结、系',
                  remedy: '守护根门律仪 · 身至念坚固大柱',
                  remTag: '守护诸根',
                  sutra: 'T99-1171',
                  note: '如六兽系于坚固大柱终伏柱下，以身念处防护眼等六根不驰散外境（T99-0250、1171）。',
                },
                {
                  affliction: '常见（有见）与断见（无见）二边戏论',
                  affTag: '常见',
                  remedy: '如实正观世间集与世间灭 · 十二缘起中道',
                  remTag: '中道',
                  sutra: 'T99-0262',
                  note: '正观世间集则不生无见（断见），正观世间灭则不生有见（常见），离二边说中道（T99-0262、0301）。',
                },
                {
                  affliction: '二十种身见 · 我、我所见、我慢使',
                  affTag: '身见',
                  remedy: '观五受阴非我、不异我、不相在 · 无常想建无我想',
                  remTag: '非我、不异我、不相在',
                  sutra: 'T99-0103',
                  note: '修无常想建立无我想，断三结得须陀洹，进观五阴生灭尽除微细我慢余气（T99-0103、0270）。',
                },
                {
                  affliction: '欲贪炽然 · 散乱粗思惟',
                  affTag: '贪欲',
                  remedy: '不净观 · 安那般那念（出入息念十六胜行）',
                  remTag: '安那般那念',
                  sutra: 'T99-0746',
                  note: '不净观对治欲贪，安那般那念止息身行口行粗思惟，如大雨弭平暴起尘土（T99-0746、0803）。',
                },
                {
                  affliction: '八邪道 · 十不善业道（此岸黑法）',
                  affTag: '十不善业道',
                  remedy: '八圣道分 · 十善业道（彼岸白法）',
                  remTag: '十善业道',
                  sutra: 'T99-1039',
                  note: '杀盗淫妄乃至邪见十恶为此岸黑法，不杀生乃至正见十善与八圣道为彼岸白法（T99-0751、1039）。',
                },
              ].map((pair) => (
                <div
                  key={pair.affliction}
                  className="p-3.5 rounded-xl border border-amber-200/70 dark:border-stone-800 bg-amber-50/20 dark:bg-stone-900/60 flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onSelectTagFilter(pair.affTag)}
                        className="text-left font-semibold text-rose-800 dark:text-rose-300 hover:underline"
                      >
                        【所治病症】{pair.affliction}
                      </button>
                      <button
                        onClick={() => onSelectSutra(pair.sutra)}
                        className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 shrink-0 hover:underline"
                      >
                        {pair.sutra}
                      </button>
                    </div>

                    <div className="text-center text-amber-700 dark:text-amber-400 font-bold text-xs">
                      ⇅ 对治药方
                    </div>

                    <button
                      onClick={() => onSelectTagFilter(pair.remTag)}
                      className="text-left font-semibold text-emerald-800 dark:text-emerald-300 hover:underline block"
                    >
                      【能治法药】{pair.remedy}
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed pt-2 border-t border-amber-100 dark:border-stone-800">
                    {pair.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          CHART 2: AUDIENCE & SPEAKER SANKEY / BIPARTITE MATRIX (观机逗教)
         ===================================================================== */}
      {activeChart === 'sankey' && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Header & Mode Switcher */}
          <div className="rounded-2xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                2. 根机与说法对象矩阵（应病与药 · 观机逗教桑基流向图）
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                左侧为不同听法根机或核心说法尊者，右侧为十大核心法义板块，中间连线粗细严格对应《杂阿含经》1355经中的真实共现频次
              </p>
            </div>

            <div className="flex items-center rounded-xl border border-amber-200 dark:border-stone-700 bg-amber-50/50 dark:bg-stone-800 p-1 text-xs shrink-0">
              <button
                onClick={() => {
                  setSankeyMode('audience');
                  setSelectedSankeyLeft(null);
                  setSelectedSankeyRight(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  sankeyMode === 'audience'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                按听众根机（7类对象）
              </button>
              <button
                onClick={() => {
                  setSankeyMode('speakers');
                  setSelectedSankeyLeft(null);
                  setSelectedSankeyRight(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  sankeyMode === 'speakers'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                按说法尊者（8大说法者）
              </button>
            </div>
          </div>

          {/* Interactive SVG Sankey / Bipartite Diagram + Detail Panel */}
          {graphData.sankey ? (
            <SankeyDiagramSection
              matrix={sankeyMode === 'audience' ? graphData.sankey.audience : graphData.sankey.speakers}
              mode={sankeyMode}
              selectedLeft={selectedSankeyLeft}
              selectedRight={selectedSankeyRight}
              onSelectLeft={setSelectedSankeyLeft}
              onSelectRight={setSelectedSankeyRight}
              onSelectSutra={onSelectSutra}
            />
          ) : (
            <div className="p-8 text-center text-sm text-stone-500">正在加载桑基矩阵数据...</div>
          )}
        </div>
      )}

      {/* =====================================================================
          CHART 3: CO-OCCURRENCE & 6-RELATION NETWORK GRAPH
         ===================================================================== */}
      {activeChart === 'network' && (
        <div className="flex-1 flex flex-col h-[calc(100vh-10rem)] min-h-[560px] overflow-hidden">
          {/* Network Filter Toolbar */}
          <div className="px-4 py-2.5 border-b border-amber-200/60 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Tier filter */}
              <div className="flex items-center gap-1">
                <span className="text-stone-500 font-medium">节点层级:</span>
                <select
                  value={networkTierFilter}
                  onChange={(e) => setNetworkTierFilter(e.target.value as any)}
                  className="px-2 py-1 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/40 dark:bg-stone-800"
                >
                  <option value="all">全部三层骨架 ({graphData.nodes.length})</option>
                  <option value="法义层">仅法义层（五阴/六处/杂因/道品）</option>
                  <option value="人物场景层">含人物与场景层</option>
                  <option value="pali">含巴利语/相应部(SN)对读节点</option>
                </select>
              </div>

              {/* Pillar filter */}
              <div className="flex items-center gap-1">
                <span className="text-stone-500 font-medium">板块:</span>
                <select
                  value={networkPillarFilter}
                  onChange={(e) => setNetworkPillarFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/40 dark:bg-stone-800"
                >
                  <option value="all">全部板块</option>
                  <option value="五阴（蕴处界）">五阴（蕴处界）</option>
                  <option value="六入处">六入处</option>
                  <option value="杂因（缘起·四谛）">杂因（缘起·四谛）</option>
                  <option value="道品（三十七道品）">道品（三十七道品）</option>
                  <option value="譬喻与法数">譬喻与法数</option>
                  <option value="人物与场景">人物与场景</option>
                </select>
              </div>

              {/* Relation type filter */}
              <div className="flex items-center gap-1">
                <span className="text-stone-500 font-medium">连线逻辑:</span>
                <select
                  value={relationTypeFilter}
                  onChange={(e) => setRelationTypeFilter(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/40 dark:bg-stone-800"
                >
                  <option value="all">全部关系 ({graphData.links.length})</option>
                  <option value="缘起序">因果递进：缘起序</option>
                  <option value="修证">修行次第：修证与对治</option>
                  <option value="开合">结构包含：开合（总摄别 ⊂）</option>
                  <option value="对立">染净辨析：对立与药方</option>
                  <option value="人物专精">人物画像：说法专精映射</option>
                  <option value="异译同实">文献对读：异译同实（虚线）</option>
                  <option value="共现">双向链接：同经核心共现</option>
                </select>
              </div>

              {/* Co-occurrence threshold */}
              <div className="flex items-center gap-1">
                <span className="text-stone-500 font-medium">共现阈值:</span>
                <select
                  value={minCooccurrence}
                  onChange={(e) => setMinCooccurrence(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/40 dark:bg-stone-800"
                >
                  <option value={1}>共现 ≥ 1 经（全量）</option>
                  <option value={2}>共现 ≥ 2 经（推荐）</option>
                  <option value={3}>共现 ≥ 3 经（高频骨干）</option>
                  <option value={5}>共现 ≥ 5 经（核心枢纽）</option>
                </select>
              </div>
            </div>

            {/* Search node input */}
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-stone-400" />
              <input
                type="text"
                value={networkSearch}
                onChange={(e) => setNetworkSearch(e.target.value)}
                placeholder="搜索定位图谱节点..."
                className="w-full pl-8 pr-6 py-1 rounded-lg border border-amber-200 dark:border-stone-700 bg-amber-50/30 dark:bg-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {networkSearch && (
                <button
                  onClick={() => setNetworkSearch('')}
                  className="absolute right-2 top-1.5 text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Interactive Network Canvas + Right Node Inspector */}
          <div className="flex-1 relative bg-[#fdfbf7] dark:bg-stone-950 flex overflow-hidden">
            <EnhancedNetworkCanvas
              data={graphData}
              tierFilter={networkTierFilter}
              pillarFilter={networkPillarFilter}
              relationFilter={relationTypeFilter}
              minCooccurrence={minCooccurrence}
              searchQuery={networkSearch}
              selectedNode={selectedGraphNode}
              onSelectNode={setSelectedGraphNode}
            />

            {/* Legend Overlay on Bottom-Left */}
            <div className="absolute left-3 bottom-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs rounded-xl border border-amber-200/70 dark:border-stone-800 px-3 py-2 text-[11px] flex flex-wrap items-center gap-3 shadow-sm pointer-events-none">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> 法义核心节点
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> 人物与场景节点
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-emerald-600 inline-block" /> 缘起序/因果
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-indigo-600 inline-block" /> 修证次第
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-amber-700 inline-block" /> 开合包含
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-rose-600 inline-block" /> 对立/对治
              </span>
              <span className="flex items-center gap-1">
                <span className="w-4 border-b border-dashed border-teal-600 inline-block" /> 异译/巴利对读
              </span>
            </div>

            {/* Selected Node Inspector Drawer */}
            {selectedGraphNode && (
              <div className="absolute right-3 top-3 w-80 sm:w-88 max-h-[calc(100%-1.5rem)] overflow-y-auto bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl border border-amber-200 dark:border-stone-800 p-4 shadow-xl space-y-3 z-20">
                <div className="flex items-start justify-between border-b border-amber-100 dark:border-stone-800 pb-2.5">
                  <div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-stone-800 text-amber-800 dark:text-amber-300 font-medium">
                      {selectedGraphNode.tier || '法义层'} · {selectedGraphNode.pillar || selectedGraphNode.category}
                    </span>
                    <h4 className="font-serif-sc font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 mt-1">
                      {selectedGraphNode.name}
                    </h4>
                    {selectedGraphNode.pali && (
                      <div className="text-[11px] italic text-stone-500 dark:text-stone-400">
                        {selectedGraphNode.pali}
                        {selectedGraphNode.samyukta ? ` · ${selectedGraphNode.samyukta}` : ''}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedGraphNode(null)}
                    className="text-xs text-stone-400 hover:text-stone-600 p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs space-y-1.5 text-stone-600 dark:text-stone-300">
                  <div className="flex items-center justify-between">
                    <span>细分归类：</span>
                    <strong>
                      {selectedGraphNode.subCategory || selectedGraphNode.category}
                      {selectedGraphNode.attribute ? `【${selectedGraphNode.attribute}】` : ''}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>出现经数 / 权重：</span>
                    <strong>{selectedGraphNode.sutras?.length || selectedGraphNode.value} 经</strong>
                  </div>
                  {selectedGraphNode.coreCount > 0 && (
                    <div className="text-amber-700 dark:text-amber-400 font-semibold">
                      ★ 标记为经文核心概念 {selectedGraphNode.coreCount} 次
                    </div>
                  )}
                  {selectedGraphNode.definition && (
                    <p className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 leading-relaxed mt-1">
                      {selectedGraphNode.definition}
                    </p>
                  )}
                </div>

                {/* Connected Edges */}
                <div className="space-y-1.5 pt-2 border-t border-amber-100 dark:border-stone-800">
                  <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                    直连义理与共现关系：
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 text-xs pr-1">
                    {graphData.links
                      .filter((l) => l.source === selectedGraphNode.id || l.target === selectedGraphNode.id)
                      .slice(0, 25)
                      .map((l, idx) => {
                        const otherName = l.source === selectedGraphNode.id ? l.target : l.source;
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              const targetNode = graphData.nodes.find((n) => n.id === otherName);
                              if (targetNode) setSelectedGraphNode(targetNode);
                            }}
                            className="p-2 rounded-lg bg-amber-50/60 hover:bg-amber-100/70 dark:bg-stone-800/60 dark:hover:bg-stone-800 cursor-pointer transition space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium text-stone-900 dark:text-stone-100">
                                {l.source} → {l.target}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-stone-700 text-amber-900 dark:text-amber-200 shrink-0">
                                {l.type}
                              </span>
                            </div>
                            {l.label && (
                              <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
                                {l.label}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Associated Sutras */}
                {selectedGraphNode.sutras && selectedGraphNode.sutras.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-amber-100 dark:border-stone-800">
                    <div className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                      关联经号（点击阅读）：
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                      {selectedGraphNode.sutras.slice(0, 18).map((sid) => (
                        <button
                          key={sid}
                          onClick={() => onSelectSutra(sid)}
                          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-100/70 hover:bg-amber-800 hover:text-white dark:bg-stone-800 dark:text-amber-300 transition"
                        >
                          {sid.replace('T99-', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onSelectTagFilter(selectedGraphNode.name)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium flex items-center justify-center gap-1 shadow-xs transition"
                >
                  <span>研读含「{selectedGraphNode.name}」的全部经文</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Subcomponent: Interactive SVG Sankey / Bipartite Flow Matrix
// ============================================================================
function SankeyDiagramSection({
  matrix,
  mode,
  selectedLeft,
  selectedRight,
  onSelectLeft,
  onSelectRight,
  onSelectSutra,
}: {
  matrix: SankeyMatrix;
  mode: 'audience' | 'speakers';
  selectedLeft: string | null;
  selectedRight: string | null;
  onSelectLeft: (id: string | null) => void;
  onSelectRight: (id: string | null) => void;
  onSelectSutra: (sutraId: string) => void;
}) {
  const svgWidth = 920;
  const svgHeight = 540;
  const leftX = 210;
  const rightX = 680;
  const nodeWidth = 18;

  const leftPositions = useMemo(() => {
    const count = matrix.leftNodes.length;
    const step = (svgHeight - 60) / Math.max(1, count);
    return matrix.leftNodes.map((n, i) => ({
      ...n,
      y: 35 + i * step,
      h: Math.max(24, step - 14),
    }));
  }, [matrix.leftNodes]);

  const rightPositions = useMemo(() => {
    const count = matrix.rightNodes.length;
    const step = (svgHeight - 60) / Math.max(1, count);
    return matrix.rightNodes.map((n, i) => ({
      ...n,
      y: 30 + i * step,
      h: Math.max(20, step - 10),
    }));
  }, [matrix.rightNodes]);

  const leftMap = useMemo(() => new Map(leftPositions.map((n) => [n.id, n])), [leftPositions]);
  const rightMap = useMemo(() => new Map(rightPositions.map((n) => [n.id, n])), [rightPositions]);

  const maxLinkCount = useMemo(
    () => Math.max(1, ...matrix.links.map((l) => l.count)),
    [matrix.links]
  );

  // Active filtered links for detail display
  const activeLinks = useMemo(() => {
    return matrix.links.filter((l) => {
      if (selectedLeft && l.source !== selectedLeft) return false;
      if (selectedRight && l.target !== selectedRight) return false;
      return true;
    });
  }, [matrix.links, selectedLeft, selectedRight]);

  const leftColors = [
    '#b45309',
    '#4338ca',
    '#047857',
    '#be123c',
    '#0369a1',
    '#7c3aed',
    '#a16207',
    '#0f766e',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      {/* Left 2 Columns: SVG Sankey Flow Chart */}
      <div className="lg:col-span-2 rounded-2xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 sm:p-4 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between text-xs text-stone-500 pb-2 border-b border-amber-100 dark:border-stone-800 mb-2">
          <span>
            点击左侧<strong>{mode === 'audience' ? '听众根机' : '说法尊者'}</strong>或右侧<strong>核心法义</strong>可高亮对应流向并筛选经文
          </span>
          {(selectedLeft || selectedRight) && (
            <button
              onClick={() => {
                onSelectLeft(null);
                onSelectRight(null);
              }}
              className="text-amber-700 dark:text-amber-400 hover:underline font-medium"
            >
              重置筛选 ✕
            </button>
          )}
        </div>

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[640px] select-none"
        >
          {/* Column Headers */}
          <text x={leftX} y={18} textAnchor="end" className="fill-stone-500 text-[12px] font-bold">
            {mode === 'audience' ? '◀ 听法对象（七类根机）' : '◀ 说法者（佛与核心弟子）'}
          </text>
          <text x={rightX + nodeWidth} y={18} textAnchor="start" className="fill-stone-500 text-[12px] font-bold">
            十大核心法门（应病与药） ▶
          </text>

          {/* Sankey Bezier Ribbons */}
          {matrix.links.map((link, idx) => {
            const s = leftMap.get(link.source);
            const t = rightMap.get(link.target);
            if (!s || !t) return null;

            const isMatched =
              (!selectedLeft || selectedLeft === link.source) &&
              (!selectedRight || selectedRight === link.target);

            const sIdx = matrix.leftNodes.findIndex((n) => n.id === link.source);
            const color = leftColors[sIdx % leftColors.length];

            const y1 = s.y + s.h / 2;
            const y2 = t.y + t.h / 2;
            const x1 = leftX + nodeWidth;
            const x2 = rightX;
            const cx1 = x1 + (x2 - x1) * 0.45;
            const cx2 = x1 + (x2 - x1) * 0.55;

            const strokeW = Math.max(2, Math.min(22, (link.count / maxLinkCount) * 22));

            return (
              <path
                key={`${link.source}-${link.target}-${idx}`}
                d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                strokeOpacity={isMatched ? 0.55 : 0.08}
                className="cursor-pointer transition-opacity duration-200 hover:stroke-opacity-85"
                onClick={() => {
                  onSelectLeft(link.source);
                  onSelectRight(link.target);
                }}
              >
                <title>{`${link.source} → ${link.target}：共 ${link.count} 经`}</title>
              </path>
            );
          })}

          {/* Left Nodes */}
          {leftPositions.map((node, idx) => {
            const active = !selectedLeft || selectedLeft === node.id;
            const color = leftColors[idx % leftColors.length];
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => onSelectLeft(selectedLeft === node.id ? null : node.id)}
              >
                <rect
                  x={leftX}
                  y={node.y}
                  width={nodeWidth}
                  height={node.h}
                  rx={4}
                  fill={color}
                  opacity={active ? 1 : 0.3}
                />
                <text
                  x={leftX - 8}
                  y={node.y + node.h / 2 - 2}
                  textAnchor="end"
                  className="fill-stone-800 dark:fill-stone-200 text-[12px] font-bold"
                  opacity={active ? 1 : 0.45}
                >
                  {node.short}
                </text>
                <text
                  x={leftX - 8}
                  y={node.y + node.h / 2 + 12}
                  textAnchor="end"
                  className="fill-stone-400 text-[10px] font-mono"
                  opacity={active ? 1 : 0.45}
                >
                  关联 {node.total} 经次
                </text>
              </g>
            );
          })}

          {/* Right Nodes */}
          {rightPositions.map((node) => {
            const active = !selectedRight || selectedRight === node.id;
            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => onSelectRight(selectedRight === node.id ? null : node.id)}
              >
                <rect
                  x={rightX}
                  y={node.y}
                  width={nodeWidth}
                  height={node.h}
                  rx={4}
                  fill="#0f766e"
                  opacity={active ? 0.9 : 0.3}
                />
                <text
                  x={rightX + nodeWidth + 8}
                  y={node.y + node.h / 2 - 1}
                  textAnchor="start"
                  className="fill-stone-800 dark:fill-stone-200 text-[12px] font-bold"
                  opacity={active ? 1 : 0.45}
                >
                  {node.id}
                </text>
                <text
                  x={rightX + nodeWidth + 8}
                  y={node.y + node.h / 2 + 12}
                  textAnchor="start"
                  className="fill-stone-400 text-[10px] font-mono"
                  opacity={active ? 1 : 0.45}
                >
                  共 {node.total} 经次
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Right Column: Pedagogical Strategy & Matching Sutras Inspector */}
      <div className="rounded-2xl border border-amber-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 space-y-4 max-h-[600px] overflow-y-auto">
        <div className="border-b border-amber-100 dark:border-stone-800 pb-2.5">
          <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            观机逗教 · 专精法门画像明细
          </div>
          <h4 className="font-serif-sc font-bold text-base text-stone-900 dark:text-stone-100 mt-0.5">
            {selectedLeft || (mode === 'audience' ? '全部听众根机' : '全部说法尊者')}
            {selectedRight ? ` → ${selectedRight}` : ''}
          </h4>
          {selectedLeft && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              {matrix.leftNodes.find((n) => n.id === selectedLeft)?.desc}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {activeLinks.slice(0, 12).map((link, idx) => (
            <div
              key={`${link.source}-${link.target}-${idx}`}
              className="p-3 rounded-xl border border-amber-100 dark:border-stone-800 bg-amber-50/40 dark:bg-stone-800/50 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {link.source.split('（')[0]} → {link.target}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-stone-700 text-amber-900 dark:text-amber-200 font-semibold shrink-0">
                  {link.count} 经
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {link.sutras.slice(0, 10).map((sid) => (
                  <button
                    key={sid}
                    onClick={() => onSelectSutra(sid)}
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white hover:bg-amber-800 hover:text-white dark:bg-stone-900 dark:text-amber-300 border border-amber-200/60 dark:border-stone-700 transition"
                  >
                    {sid.replace('T99-', '')}
                  </button>
                ))}
                {link.sutras.length > 10 && (
                  <span className="text-[10px] text-stone-400 self-center">
                    +{link.count - 10}经
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Enhanced 3-Tier Force & Radial Network Canvas
// ============================================================================
function EnhancedNetworkCanvas({
  data,
  tierFilter,
  pillarFilter,
  relationFilter,
  minCooccurrence,
  searchQuery,
  selectedNode,
  onSelectNode,
}: {
  data: GraphDataPayload;
  tierFilter: 'all' | '法义层' | '人物场景层' | 'pali';
  pillarFilter: string;
  relationFilter: string;
  minCooccurrence: number;
  searchQuery: string;
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const filteredLinks = useMemo(() => {
    return data.links.filter((l) => {
      if (relationFilter !== 'all' && l.type !== relationFilter) return false;
      if (l.type === '共现' && l.value < minCooccurrence) return false;
      return true;
    });
  }, [data.links, relationFilter, minCooccurrence]);

  const filteredNodes = useMemo(() => {
    const connectedIds = new Set<string>();
    for (const l of filteredLinks) {
      connectedIds.add(l.source);
      connectedIds.add(l.target);
    }

    let list = data.nodes.filter((n) => {
      if (!connectedIds.has(n.id)) return false;
      if (tierFilter === '法义层' && n.tier !== '法义层') return false;
      if (tierFilter === '人物场景层' && n.tier !== '人物场景层' && n.coreCount < 15) return false;
      if (tierFilter === 'pali' && !n.pali) return false;
      if (pillarFilter !== 'all' && n.pillar !== pillarFilter) return false;
      return true;
    });

    // Cap to top 110 nodes by importance so canvas never becomes an unreadable hairball
    list.sort((a, b) => b.coreCount * 3 + b.value - (a.coreCount * 3 + a.value));
    return list.slice(0, 110);
  }, [data.nodes, filteredLinks, tierFilter, pillarFilter]);

  const activeLinks = useMemo(() => {
    const nodeSet = new Set(filteredNodes.map((n) => n.id));
    return filteredLinks.filter((l) => nodeSet.has(l.source) && nodeSet.has(l.target));
  }, [filteredNodes, filteredLinks]);

  // Auto-select node when user searches
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const hit = filteredNodes.find(
      (n) => n.name.toLowerCase().includes(q) || (n.pali || '').toLowerCase().includes(q)
    );
    if (hit) {
      onSelectNode(hit);
    }
  }, [searchQuery, filteredNodes, onSelectNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const width = canvas.width;
    const height = canvas.height;

    const nodes = filteredNodes.map((n, i) => {
      const angle = (i / Math.max(1, filteredNodes.length)) * 2 * Math.PI;
      const ringRadius = n.tier === '人物场景层' ? 245 : 95 + (i % 4) * 42;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * ringRadius,
        y: height / 2 + Math.sin(angle) * ringRadius,
        vx: 0,
        vy: 0,
      };
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    let tickCount = 0;

    function step() {
      tickCount++;
      if (tickCount < 180) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const n1 = nodes[i];
            const n2 = nodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 115) {
              const force = ((115 - dist) / 115) * 1.3;
              n1.x -= (dx / dist) * force;
              n1.y -= (dy / dist) * force;
              n2.x += (dx / dist) * force;
              n2.y += (dy / dist) * force;
            }
          }
        }

        for (const l of activeLinks) {
          const s = nodeMap.get(l.source);
          const t = nodeMap.get(l.target);
          if (s && t) {
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 110;
            const force = (dist - targetDist) * 0.012;
            s.x += (dx / dist) * force;
            s.y += (dy / dist) * force;
            t.x -= (dx / dist) * force;
            t.y -= (dy / dist) * force;
          }
        }

        for (const n of nodes) {
          n.x += (width / 2 - n.x) * 0.01;
          n.y += (height / 2 - n.y) * 0.01;
          n.x = Math.max(55, Math.min(width - 55, n.x));
          n.y = Math.max(45, Math.min(height - 45, n.y));
        }
      }

      ctx.clearRect(0, 0, width, height);

      // Compute 1-hop neighborhood if a node is selected
      const neighborSet = new Set<string>();
      if (selectedNode) {
        neighborSet.add(selectedNode.id);
        for (const l of activeLinks) {
          if (l.source === selectedNode.id) neighborSet.add(l.target);
          if (l.target === selectedNode.id) neighborSet.add(l.source);
        }
      }

      // Draw edges
      for (const l of activeLinks) {
        const s = nodeMap.get(l.source);
        const t = nodeMap.get(l.target);
        if (!s || !t) continue;

        const isHighlight =
          selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id);
        const isDimmed = selectedNode && !isHighlight;

        ctx.save();
        ctx.beginPath();
        if (l.type === '异译同实') {
          ctx.setLineDash([5, 4]);
        }
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        const alpha = isDimmed ? 0.07 : isHighlight ? 0.9 : 0.35;
        if (l.type === '开合') {
          ctx.strokeStyle = `rgba(180, 83, 9, ${alpha})`;
        } else if (l.type === '缘起序') {
          ctx.strokeStyle = `rgba(4, 120, 87, ${alpha})`;
        } else if (l.type === '修证') {
          ctx.strokeStyle = `rgba(67, 56, 202, ${alpha})`;
        } else if (l.type === '对立') {
          ctx.strokeStyle = `rgba(225, 29, 72, ${alpha})`;
        } else if (l.type === '人物专精') {
          ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
        } else if (l.type === '异译同实') {
          ctx.strokeStyle = `rgba(13, 148, 136, ${alpha})`;
        } else {
          ctx.strokeStyle = `rgba(120, 113, 108, ${alpha * 0.85})`;
        }

        ctx.lineWidth = isHighlight
          ? Math.min(4, 1.8 + l.value * 0.25)
          : Math.min(2.5, 0.8 + l.value * 0.15);
        ctx.stroke();
        ctx.restore();
      }

      // Draw nodes
      for (const n of nodes) {
        const isSel = selectedNode?.id === n.id;
        const isDimmed = selectedNode && !neighborSet.has(n.id);
        const r = Math.min(Math.max(8, 6 + Math.sqrt(n.value) * 1.4), 22);

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.22 : 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);

        if (n.tier === '人物场景层') {
          ctx.fillStyle = isSel ? '#3730a3' : '#4f46e5';
        } else if (n.subCategory === '四谛·苦谛') {
          ctx.fillStyle = isSel ? '#9f1239' : '#e11d48';
        } else if (n.subCategory === '四谛·集谛') {
          ctx.fillStyle = isSel ? '#9a3412' : '#ea580c';
        } else if (n.subCategory === '四谛·灭谛') {
          ctx.fillStyle = isSel ? '#065f46' : '#059669';
        } else if (n.subCategory === '蕴、处、界') {
          ctx.fillStyle = isSel ? '#92400e' : '#d97706';
        } else {
          ctx.fillStyle = isSel ? '#075985' : '#0284c7';
        }
        ctx.fill();

        ctx.lineWidth = isSel ? 3 : 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.font = isSel ? 'bold 12px "Noto Serif SC", serif' : '11px "Noto Serif SC", serif';
        ctx.fillStyle = '#292524';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + r + 12);
        ctx.restore();
      }

      animId = requestAnimationFrame(step);
    }

    step();

    function handleClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      for (const n of nodes) {
        const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
        if (dist <= 24) {
          onSelectNode(n);
          return;
        }
      }
      onSelectNode(null);
    }

    canvas.addEventListener('click', handleClick);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleClick);
    };
  }, [filteredNodes, activeLinks, selectedNode, onSelectNode]);

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={1100}
        height={660}
        className="w-full h-full object-contain cursor-pointer"
      />
    </div>
  );
}
