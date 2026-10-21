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
  subtitle?: string;
  tagRef: string;
  attribute?: string;
  pali?: string;
  sutraExamples: string[];
  desc?: string;
  children?: MindmapNodeData[];
}

interface MindmapChartDef {
  key: string;
  shortTitle: string;
  fullTitle: string;
  subtitle: string;
  root: MindmapNodeData;
}

// 5 Authentic Samyukta-agama Mindmaps strictly grounded in CBETA T99 original texts & user's annotated tags
const MINDMAP_GALLERY: MindmapChartDef[] = [
  {
    key: 'overview',
    shortTitle: '一、全藏四诵总纲',
    fullTitle: '《杂阿含经》修多罗四诵与三层义理总纲',
    subtitle: '五阴诵 · 六入处诵 · 杂因诵 · 道品诵（对应巴利《相应部》五大犍度）',
    root: {
      id: 'ov-root',
      label: '杂阿含经四诵总纲',
      subtitle: '法义相从 · 事类相聚',
      tagRef: '四圣谛',
      pali: 'Saṃyuktāgama / Saṃyutta Nikāya',
      sutraExamples: ['T99-0001', 'T99-0189', 'T99-0296', 'T99-0379', 'T99-0607'],
      desc: '《杂阿含经》以「五阴、六入处、杂因（缘起·四谛）、道品」四诵为修多罗主干，统摄世间流转与还灭解脱。',
      children: [
        {
          id: 'ov-skandha',
          label: '五阴诵（蕴相应）',
          subtitle: '所观五受阴境 · SN 22',
          tagRef: '五受阴',
          attribute: '苦谛·果 / 所观境',
          pali: 'Khandha-saṃyutta (SN 22)',
          sutraExamples: ['T99-0001', 'T99-0033', 'T99-0042', 'T99-0058', 'T99-0265'],
          desc: '卷一至卷五、卷十：观察色受想行识五阴与五受阴之无常、苦、非我，破二十种身见与我慢使。',
          children: [
            {
              id: 'ov-sk-1',
              label: '五蕴开合与十一分别',
              tagRef: '五蕴',
              sutraExamples: ['T99-0023', 'T99-0046', 'T99-0058', 'T99-0073'],
              desc: '色、受、想、行、识五蕴，遍历过去未来现在、内外、麁细、好丑、远近十一分别。',
              children: [
                {
                  id: 'ov-sk-1a',
                  label: '色蕴（四大及所造色）与名蕴（受、想、行、识）',
                  tagRef: '色蕴',
                  sutraExamples: ['T99-0046', 'T99-0058', 'T99-0061'],
                  desc: '色以四大造作，受想行以六触为缘，识以名色为缘。',
                },
                {
                  id: 'ov-sk-1b',
                  label: '五阴（通无漏）与五受阴（有漏取著）之抉择',
                  tagRef: '五受阴',
                  sutraExamples: ['T99-0058', 'T99-0073'],
                  desc: '色受想行识若有漏有取、生起系著，名为五受阴（五取蕴）。',
                },
              ],
            },
            {
              id: 'ov-sk-2',
              label: '三法印与五相如实知',
              tagRef: '无常、苦、变易法',
              sutraExamples: ['T99-0001', 'T99-0013', 'T99-0033', 'T99-0042'],
              desc: '观五蕴无常、苦、非我，知集、灭、味、患、离与七处善。',
              children: [
                {
                  id: 'ov-sk-2a',
                  label: '三法印：无常 ➔ 苦 ➔ 不是我、不异我、不相在',
                  tagRef: '不是我、不异我、不相在',
                  sutraExamples: ['T99-0001', 'T99-0033', 'T99-0034'],
                  desc: '由无常故苦，无常苦变易法故非我、非我所、不相在。',
                },
                {
                  id: 'ov-sk-2b',
                  label: '五相与七处善：集、灭、道迹、味、患、离',
                  tagRef: '集、灭、味、患、离',
                  sutraExamples: ['T99-0013', 'T99-0014', 'T99-0042'],
                  desc: '如实知五蕴之爱味、过患、出离，成就七处善与三观义。',
                },
              ],
            },
          ],
        },
        {
          id: 'ov-ayatana',
          label: '六入处诵（处相应）',
          subtitle: '根尘识触枢纽 · SN 35',
          tagRef: '六内入处',
          attribute: '流转门 / 防护门',
          pali: 'Saḷāyatana-saṃyutta (SN 35)',
          sutraExamples: ['T99-0189', 'T99-0250', 'T99-0276', 'T99-0319', 'T99-1171'],
          desc: '卷八、卷九、卷十一、卷十三、卷四十三：明十二入处即是一切，辨析根境识三事和合触及守护根门。',
          children: [
            {
              id: 'ov-ay-1',
              label: '十二入处与六六法门',
              tagRef: '一切',
              sutraExamples: ['T99-0189', 'T99-0304', 'T99-0319'],
              desc: '眼色、耳声、鼻香、舌味、身触、意法十二入处摄尽一切法。',
              children: [
                {
                  id: 'ov-ay-1a',
                  label: '六内入处 × 六外入处 × 六识身 ➔ 三事和合六触身',
                  tagRef: '六触身',
                  sutraExamples: ['T99-0214', 'T99-0273', 'T99-0304'],
                  desc: '根境识三事和合生触，触俱生受、想、思。',
                },
                {
                  id: 'ov-ay-1b',
                  label: '六受身与六爱身：中间欲贪是其结系（黑白二牛共轭喻）',
                  tagRef: '结、系',
                  sutraExamples: ['T99-0250', 'T99-0566'],
                  desc: '非眼系色、非色系眼，中间所起欲贪是其结系。',
                },
              ],
            },
            {
              id: 'ov-ay-2',
              label: '律仪防护与譬喻开示',
              tagRef: '守护根门',
              sutraExamples: ['T99-0276', 'T99-1169', 'T99-1171', 'T99-1172'],
              desc: '于六根门不取总相、不取别相，系心身念处。',
              children: [
                {
                  id: 'ov-ay-2a',
                  label: '守护根门：眼见色不取相、不味著，防恶不善法漏',
                  tagRef: '守护根门',
                  sutraExamples: ['T99-0255', 'T99-0275', 'T99-1260'],
                  desc: '修习根律仪，不令贪忧恶不善法随心漏入。',
                },
                {
                  id: 'ov-ay-2b',
                  label: '四大毒蛇、五拔刀怨贼、空聚落、六兽系柱、破琴寻声喻',
                  tagRef: '四毒蛇喻',
                  sutraExamples: ['T99-1171', 'T99-1172', 'T99-1173'],
                  desc: '以鲜明譬喻破斥六入处与五受阴之实我执。',
                },
              ],
            },
          ],
        },
        {
          id: 'ov-nidana',
          label: '杂因诵（缘起·界·受·四谛）',
          subtitle: '缘起中道与四谛 · SN 12/14/36/56',
          tagRef: '缘起',
          attribute: '集苦流转 · 灭道还灭',
          pali: 'Nidāna & Sacca (SN 12 / SN 56)',
          sutraExamples: ['T99-0288', 'T99-0296', 'T99-0298', 'T99-0301', 'T99-0379'],
          desc: '卷十二、十四至十七：阐明此有故彼有、十二缘起离二边中道、四食、十八界、三受及四圣谛三转法轮。',
          children: [
            {
              id: 'ov-ni-1',
              label: '十二缘起与离二边中道',
              tagRef: '离有无二边之中道',
              sutraExamples: ['T99-0288', 'T99-0296', 'T99-0298', 'T99-0301', 'T99-0347'],
              desc: '无明缘行乃至生缘老死忧悲苦恼，观世间集灭离有无常见断见。',
              children: [
                {
                  id: 'ov-ni-1a',
                  label: '顺逆十二缘起与芦束喻（识与名色展转相依）',
                  tagRef: '识、名色互缘',
                  sutraExamples: ['T99-0288', 'T99-0296', 'T99-0298'],
                  desc: '逆推老死至齐识而还，识缘名色、名色缘识如三芦立空地。',
                },
                {
                  id: 'ov-ni-1b',
                  label: '迦旃延氏经中道正见 & 须深经先法住智后涅槃智',
                  tagRef: '离有无二边之中道',
                  sutraExamples: ['T99-0301', 'T99-0302', 'T99-0347'],
                  desc: '世间集正知故不起无见，世间灭正知故不起有见。',
                },
              ],
            },
            {
              id: 'ov-ni-2',
              label: '四食、三受与四圣谛法轮',
              tagRef: '四圣谛',
              sutraExamples: ['T99-0371', 'T99-0379', 'T99-0444', 'T99-0470'],
              desc: '知四食苦患，于三受断三使，转四圣谛三转十二行法轮。',
              children: [
                {
                  id: 'ov-ni-2a',
                  label: '四食四喻（食子肉等） & 箭经二箭喻（唯受身苦不受心苦）',
                  tagRef: '二箭喻',
                  sutraExamples: ['T99-0373', 'T99-0468', 'T99-0470'],
                  desc: '圣弟子触苦受唯受身一箭，不生瞋使心忧第二箭。',
                },
                {
                  id: 'ov-ni-2b',
                  label: '鹿野苑初转四圣谛：苦应知、集应断、灭应证、道应修',
                  tagRef: '三转十二行法轮',
                  sutraExamples: ['T99-0379', 'T99-0382', 'T99-0404'],
                  desc: '示转、劝转、证转十二行相，生眼、智、明、觉。',
                },
              ],
            },
          ],
        },
        {
          id: 'ov-magga',
          label: '道品诵（三十七道品·四果）',
          subtitle: '修证体系与圣果 · SN 45–55',
          tagRef: '八圣道分',
          attribute: '道谛·因 ➔ 灭谛·果',
          pali: 'Magga-vagga (SN 45–55)',
          sutraExamples: ['T99-0607', 'T99-0642', 'T99-0714', 'T99-0785', 'T99-0810', 'T99-0843'],
          desc: '卷二十四至三十一：四念处、四正断、四如意足、五根、五力、七觉支、八圣道分、安那般那念、三学与四不坏净。',
          children: [
            {
              id: 'ov-mg-1',
              label: '三十七道品与十三法相润',
              tagRef: '四念处',
              sutraExamples: ['T99-0607', 'T99-0714', 'T99-0785', 'T99-0803', 'T99-0810'],
              desc: '安那般那念满足四念处，四念处满足七觉支，七觉支满足明与解脱。',
              children: [
                {
                  id: 'ov-mg-1a',
                  label: '安那般那十六胜行 ➔ 身受心法四念处（一乘道、自洲自依）',
                  tagRef: '安那般那念十六胜行',
                  sutraExamples: ['T99-0607', 'T99-0638', 'T99-0803', 'T99-0810'],
                  desc: '专念出入息十六阶，成就净众生、灭忧悲之一乘道。',
                },
                {
                  id: 'ov-mg-1b',
                  label: '五根五力 · 七觉支止掉调适 · 八圣道分（世俗与第一义正见）',
                  tagRef: '八圣道分',
                  sutraExamples: ['T99-0642', 'T99-0714', 'T99-0750', 'T99-0785'],
                  desc: '以依远离、依无欲、依灭、向于舍修七觉支与八圣道分。',
                },
              ],
            },
            {
              id: 'ov-mg-2',
              label: '增上三学、四不坏净与四沙门果',
              tagRef: '三学',
              sutraExamples: ['T99-0817', 'T99-0821', 'T99-0843', 'T99-0851', 'T99-0936'],
              desc: '依四预流支入流，修戒定慧三学，历须陀洹、斯陀含、阿那含、阿罗汉四果。',
              children: [
                {
                  id: 'ov-mg-2a',
                  label: '四预流支（亲近善士等）与四不坏净（佛法僧圣戒法镜）',
                  tagRef: '四不坏净',
                  sutraExamples: ['T99-0843', 'T99-0851'],
                  desc: '断身见、戒取、疑三结，永脱三恶道，得须陀洹不退堕法。',
                },
                {
                  id: 'ov-mg-2b',
                  label: '三学圆证与七圣人：生已尽、梵行已立、所作已作、自知不受后有',
                  tagRef: '不受后有',
                  sutraExamples: ['T99-0817', 'T99-0884', 'T99-0936'],
                  desc: '断尽贪恚痴三漏与五上分结，证俱解脱或慧解脱阿罗汉。',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'skandha',
    shortTitle: '二、五阴诵专图',
    fullTitle: '五阴诵 · 五受阴结构、三法印正观与断结解脱图',
    subtitle: '对应《相应部·蕴相应》(SN 22) · 大正藏 T99 第 1–187、256–272 经',
    root: {
      id: 'sk-root',
      label: '五阴诵：五受阴与无我解脱',
      subtitle: 'Khandha-saṃyutta (SN 22)',
      tagRef: '五受阴',
      pali: 'pañcupādānakkhandhā',
      sutraExamples: ['T99-0001', 'T99-0033', 'T99-0042', 'T99-0058', 'T99-0265'],
      desc: '《杂阿含经》首诵：彻观色、受、想、行、识五受阴之体相、因缘、三法印与五喻，破除二十种身见与我慢。',
      children: [
        {
          id: 'skm-1',
          label: '五蕴开合与因缘集灭',
          subtitle: '体相 · 集因 · 灭果',
          tagRef: '五蕴',
          pali: 'pañcakkhandhā',
          sutraExamples: ['T99-0046', 'T99-0053', 'T99-0058', 'T99-0064', 'T99-0073'],
          desc: '辨明五阴与五受阴之界限，及色、受、想、行、识各自生起与息灭之因缘。',
          children: [
            {
              id: 'skm-1-1',
              label: '色阴：四大及四大所造色',
              tagRef: '色蕴',
              sutraExamples: ['T99-0046', 'T99-0053', 'T99-0058'],
              desc: '地水火风四大及所造色；爱喜集、段食集是色集，爱喜灭、食灭是色灭。',
              children: [
                {
                  id: 'skm-1-1a',
                  label: '体相：地、水、火、风四大及四大所造色（眼色乃至身触）',
                  tagRef: '色蕴',
                  sutraExamples: ['T99-0046', 'T99-0058', 'T99-0061'],
                  desc: '有漏有取之色名为色受阴，可恼坏相名之为色。',
                },
                {
                  id: 'skm-1-1b',
                  label: '集灭：爱喜集、段食集则色集；爱喜灭、段食灭则色灭',
                  tagRef: '五受阴',
                  sutraExamples: ['T99-0053', 'T99-0064'],
                  desc: '如实知色集、色灭、色灭道迹。',
                },
              ],
            },
            {
              id: 'skm-1-2',
              label: '受、想、行三阴：以六触为集因',
              tagRef: '受蕴',
              sutraExamples: ['T99-0046', 'T99-0053', 'T99-0058'],
              desc: '眼耳鼻舌身意六触因缘生六受身、六想身、六思身（行阴）。',
              children: [
                {
                  id: 'skm-1-2a',
                  label: '受阴（苦乐舍三受）· 想阴（取相认知）· 行阴（六思身造作）',
                  tagRef: '行蕴',
                  sutraExamples: ['T99-0046', 'T99-0055', 'T99-0058'],
                  desc: '为作相是行阴，别知相是识阴。',
                },
                {
                  id: 'skm-1-2b',
                  label: '集灭：触集故受、想、行集；触灭故受、想、行灭',
                  tagRef: '触',
                  sutraExamples: ['T99-0053', 'T99-0064', 'T99-0273'],
                  desc: '根境识三事和合触为受想行生起之近因。',
                },
              ],
            },
            {
              id: 'skm-1-3',
              label: '识阴与四识住：以名色为集因',
              tagRef: '识蕴',
              sutraExamples: ['T99-0036', 'T99-0039', 'T99-0053', 'T99-0064'],
              desc: '取阴俱识攀缘色、受、想、行四识住而生长增广。',
              children: [
                {
                  id: 'skm-1-3a',
                  label: '四识住：色识住、受识住、想识住、行识住（识不离四处独住）',
                  tagRef: '识蕴',
                  sutraExamples: ['T99-0036', 'T99-0039', 'T99-0064'],
                  desc: '如五种子封植于地界得水界润泽而生的譬喻（T99-0039）。',
                },
                {
                  id: 'skm-1-3b',
                  label: '名色集是识集，名色灭则识灭；于四识住离贪则识无所住',
                  tagRef: '识、名色互缘',
                  sutraExamples: ['T99-0039', 'T99-0053', 'T99-0064'],
                  desc: '封植断、攀缘断，彼识不复住、不复生长增广。',
                },
              ],
            },
          ],
        },
        {
          id: 'skm-2',
          label: '凡夫系缚：身见与我慢使',
          subtitle: '二十种身见 · 我慢未尽',
          tagRef: '身见',
          pali: 'sakkāyadiṭṭhi & asmimāna',
          sutraExamples: ['T99-0045', 'T99-0058', 'T99-0103', 'T99-0104', 'T99-0109'],
          desc: '愚痴无闻凡夫于五受阴起即蕴、离蕴等二十种我见，或虽断身见犹余微细我慢。',
          children: [
            {
              id: 'skm-2-1',
              label: '二十种有身见（萨迦耶见）',
              tagRef: '二十种身见',
              sutraExamples: ['T99-0045', 'T99-0058', 'T99-0109'],
              desc: '于五受阴各作四句妄计（5×4＝20），为一切烦恼三结之首。',
              children: [
                {
                  id: 'skm-2-1a',
                  label: '四句计我：色是我（即蕴）、色异我（离蕴）、我在色、色在我（相在）',
                  tagRef: '是我、异我、相在',
                  sutraExamples: ['T99-0045', 'T99-0058', 'T99-0109'],
                  desc: '如明镜照面，依五受阴有故起我慢、我欲、我使（T99-0045）。',
                },
                {
                  id: 'skm-2-1b',
                  label: '焰摩迦断灭邪见之破斥：五受阴生灭非如来，死后亦非断灭',
                  tagRef: '身见',
                  sutraExamples: ['T99-0104'],
                  desc: '尊者舍利弗以五蕴无常苦非我破斥焰摩迦比丘之阿罗汉断灭见。',
                },
              ],
            },
            {
              id: 'skm-2-2',
              label: '差摩迦经：五下分结已断而余我慢',
              tagRef: '我慢',
              sutraExamples: ['T99-0103'],
              desc: '有学圣者虽于五受阴不计是我，然于五受阴犹有微细我慢、我欲、我使未断。',
              children: [
                {
                  id: 'skm-2-2a',
                  label: '花香与洗衣余香喻：如优钵罗花香遍体，非根香非叶香而是花合香',
                  tagRef: '我慢',
                  sutraExamples: ['T99-0103'],
                  desc: '于五受阴总聚有微细「我是」之慢，如灰水浣衣犹余灰气。',
                },
                {
                  id: 'skm-2-2b',
                  label: '继续观察五受阴生灭无常，方能彻底拔除我慢证阿罗汉',
                  tagRef: '无常、苦、变易法',
                  sutraExamples: ['T99-0103'],
                  desc: '诸上座比丘闻差摩迦说此深义，六十比丘俱得漏尽解脱。',
                },
              ],
            },
          ],
        },
        {
          id: 'skm-3',
          label: '圣弟子正观：三法印、五喻与解脱',
          subtitle: '聚沫五喻 · 厌离欲灭尽',
          tagRef: '生厌、离欲、灭尽、寂静法',
          pali: 'anicca → dukkha → anattā → nibbidā',
          sutraExamples: ['T99-0001', 'T99-0033', 'T99-0042', 'T99-0265', 'T99-1024'],
          desc: '多闻圣弟子以十一分别、五喻、七处善如实观察五受阴，次第生厌、离欲、解脱。',
          children: [
            {
              id: 'skm-3-1',
              label: '泡沫喻经（五蕴五喻）与身苦心不苦',
              tagRef: '身苦心不苦',
              sutraExamples: ['T99-0107', 'T99-0265', 'T99-1024'],
              desc: '昼夜正念熟观五蕴虚幻无实，纵四大衰老病苦而内心不忧。',
              children: [
                {
                  id: 'skm-3-1a',
                  label: '五喻：观色如聚沫、受如水泡、想如野马（阳燄）、行如芭蕉、识如幻法',
                  tagRef: '无常、苦、变易法',
                  sutraExamples: ['T99-0265'],
                  desc: '谛观思惟分别，无一坚实、无我体相（T99-0265）。',
                },
                {
                  id: 'skm-3-1b',
                  label: '那拘罗长者经：于五受阴不计我我所，故唯身苦而心不苦',
                  tagRef: '身苦心不苦',
                  sutraExamples: ['T99-0107', 'T99-1024'],
                  desc: '衰老病患唯损色身，不能摇动圣弟子无我解脱之心。',
                },
              ],
            },
            {
              id: 'skm-3-2',
              label: '解脱次第：无常 ➔ 苦 ➔ 非我 ➔ 厌 ➔ 离欲 ➔ 解脱',
              tagRef: '生厌、离欲、灭尽、寂静法',
              sutraExamples: ['T99-0001', 'T99-0033', 'T99-0034'],
              desc: '《五阴诵》贯串全卷之核心修证次第。',
              children: [
                {
                  id: 'skm-3-2a',
                  label: '正观十一分别五蕴「不是我、不异我、不相在」➔ 于五受阴生厌',
                  tagRef: '不是我、不异我、不相在',
                  sutraExamples: ['T99-0033', 'T99-0034'],
                  desc: '厌故不乐，不乐故离欲，离欲故解脱。',
                },
                {
                  id: 'skm-3-2b',
                  label: '解脱知见：我生已尽、梵行已立、所作已作、自知不受后有',
                  tagRef: '不受后有',
                  sutraExamples: ['T99-0001', 'T99-0033', 'T99-0034'],
                  desc: '喜贪尽故心解脱，成就阿罗汉无生智。',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'ayatana',
    shortTitle: '三、六入处诵专图',
    fullTitle: '六入处诵 · 六根触受爱流转与根门防护图',
    subtitle: '对应《相应部·六处相应》(SN 35) · 大正藏 T99 第 188–255、273–282、304–342、1164–1176 经',
    root: {
      id: 'ay-root',
      label: '六入处诵：根境识触与护根',
      subtitle: 'Saḷāyatana-saṃyutta (SN 35)',
      tagRef: '六内入处',
      pali: 'cha ajjhattikāni āyatanāni',
      sutraExamples: ['T99-0189', 'T99-0250', 'T99-0276', 'T99-0319', 'T99-1171', 'T99-1172'],
      desc: '以眼耳鼻舌身意六内入处与色声香味触法六外入处为枢纽，剖析感官接触如何引生生死系缚，及如何守护根门得解脱。',
      children: [
        {
          id: 'aym-1',
          label: '十二入处与六六法门结构',
          subtitle: '一切法即十二入处',
          tagRef: '一切',
          pali: 'sabba = dvādasāyatanāni',
          sutraExamples: ['T99-0189', 'T99-0214', 'T99-0304', 'T99-0319', 'T99-0322'],
          desc: '佛告生闻婆罗门：一切者谓十二入处；离十二入处说别有一切者，但有言说，问已不知。',
          children: [
            {
              id: 'aym-1-1',
              label: '内六入处 × 外六入处 × 六识身',
              tagRef: '六内入处',
              sutraExamples: ['T99-0189', 'T99-0304', 'T99-0319'],
              desc: '眼色眼识、耳声耳识、鼻香鼻识、舌味舌识、身触身识、意法意识。',
              children: [
                {
                  id: 'aym-1-1a',
                  label: '六内入处：眼、耳、鼻、舌、身、意六根（无常、苦、非我、空聚落）',
                  tagRef: '六内入处',
                  sutraExamples: ['T99-0189', 'T99-0276', 'T99-1172'],
                  desc: '观察内六入处无人无作无受，如无人空聚落（T99-0276）。',
                },
                {
                  id: 'aym-1-1b',
                  label: '六外入处：色、声、香、味、触、法六境（如群贼劫掠境界）',
                  tagRef: '六外入处',
                  sutraExamples: ['T99-0190', 'T99-0276'],
                  desc: '于六外入处若不知味患离，则为群贼劫夺善法家财。',
                },
              ],
            },
            {
              id: 'aym-1-2',
              label: '三事和合触与六受、六想、六思、六爱身',
              tagRef: '六触身',
              sutraExamples: ['T99-0273', 'T99-0304', 'T99-0305'],
              desc: '由根境识三事和合生六触身，次第引生六受身、六想身、六思身、六爱身。',
              children: [
                {
                  id: 'aym-1-2a',
                  label: '三事和合触：眼色缘生眼识，三事和合触，触俱生受、想、思',
                  tagRef: '六触身',
                  sutraExamples: ['T99-0273', 'T99-0304'],
                  desc: '如两木相钻生火，根境识和合生触，离散则触灭。',
                },
                {
                  id: 'aym-1-2b',
                  label: '六受身 ➔ 六爱身：于乐受贪使、苦受瞋使、舍受无明使随眠',
                  tagRef: '六爱身',
                  sutraExamples: ['T99-0304', 'T99-0468', 'T99-0470'],
                  desc: '不受二箭喻：圣弟子唯有身一受，不生心忧悲第二受（T99-0470）。',
                },
              ],
            },
          ],
        },
        {
          id: 'aym-2',
          label: '结缚症结与根门防护',
          subtitle: '黑白牛轭 · 守护六根',
          tagRef: '守护根门',
          pali: 'saṃyojana & indriyasaṃvara',
          sutraExamples: ['T99-0250', 'T99-0255', 'T99-0275', 'T99-0566', 'T99-1260'],
          desc: '结系不在外境本身，而在根境相触时内心生起之欲贪；故修行关键在守护根门。',
          children: [
            {
              id: 'aym-2-1',
              label: '黑白二牛共一轭绳喻（拘絺罗经 / 质多罗经）',
              tagRef: '结、系',
              sutraExamples: ['T99-0250', 'T99-0566'],
              desc: '非黑牛系白牛，亦非白牛系黑牛，乃中间一轭一绳缚系二牛。',
              children: [
                {
                  id: 'aym-2-1a',
                  label: '非眼系色、非色系眼，中间欲贪是其系（若眼色自体是结则佛亦应有结）',
                  tagRef: '结、系',
                  sutraExamples: ['T99-0250', 'T99-0566'],
                  desc: '佛陀同样以眼见色，然无欲贪结系故心善解脱。',
                },
                {
                  id: 'aym-2-1b',
                  label: '非世间众事是欲，心法驰觉想名士夫欲',
                  tagRef: '非世间众事是欲，心法驰觉想名士夫欲',
                  sutraExamples: ['T99-1286'],
                  desc: '外境五尘常住世间非欲，内心分别贪著方名士夫欲。',
                },
              ],
            },
            {
              id: 'aym-2-2',
              label: '守护根门（善护诸根 / 律仪断）',
              tagRef: '守护根门',
              sutraExamples: ['T99-0255', 'T99-0275', 'T99-0875', 'T99-1260'],
              desc: '眼见色、耳闻声乃至意知法，不取总相、不取形貌别相。',
              children: [
                {
                  id: 'aym-2-2a',
                  label: '不取相不味著：防护眼根不令贪忧恶不善法漏入，如覆屋不漏雨',
                  tagRef: '守护根门',
                  sutraExamples: ['T99-0255', 'T99-0275'],
                  desc: '猫狸吞活鼠喻：不护根门取女色相，如活吞鼠反食内脏（T99-1260）。',
                },
                {
                  id: 'aym-2-2b',
                  label: '修身至念（身念处）：如六众生系于坚固大柱，终疲极伏柱',
                  tagRef: '六众生系一绳喻',
                  sutraExamples: ['T99-1171'],
                  desc: '狗、鸟、毒蛇、野干、鳄鱼、猕猴六兽喻六根各奔本境，系于身念处则止息。',
                },
              ],
            },
          ],
        },
        {
          id: 'aym-3',
          label: '譬喻相应：毒蛇、木流与破琴喻',
          subtitle: '卷四十三核心法喻',
          tagRef: '四毒蛇喻',
          pali: 'Āsīvisopama & Vīṇopama (SN 35.238–247)',
          sutraExamples: ['T99-1169', 'T99-1170', 'T99-1171', 'T99-1172', 'T99-1173'],
          desc: '卷四十三集中以大型譬喻统摄五受阴、十二入处、四大与涅槃解脱道。',
          children: [
            {
              id: 'aym-3-1',
              label: '《毒蛇经》七重譬喻（T99-1172 / SN 35.238）',
              tagRef: '四毒蛇喻',
              sutraExamples: ['T99-1172'],
              desc: '一经总括四大、五受阴、内六入、外六入、贪爱与涅槃。',
              children: [
                {
                  id: 'aym-3-1a',
                  label: '四毒蛇（四大）· 五拔刀怨贼（五受阴）· 空聚落（内六入）· 群贼（外六入）',
                  tagRef: '五拔刀怨贼喻',
                  sutraExamples: ['T99-1172'],
                  desc: '第六重爱喜为内贼首，唯有结草筏度生死大河趣彼岸涅槃。',
                },
              ],
            },
            {
              id: 'aym-3-2',
              label: '恒河大木流八难喻 & 破琴寻声不见我喻',
              tagRef: '琴声喻',
              sutraExamples: ['T99-1169', 'T99-1173'],
              desc: '离内外八种障难顺流至海；破琴寸寸推求琴声本体不可得。',
              children: [
                {
                  id: 'aym-3-2a',
                  label: '大木流喻：不著此岸（内六入）、不著彼岸（外六尘）、不沉没（贪欲）必入涅槃海',
                  tagRef: '大木聚随水漂流喻',
                  sutraExamples: ['T99-1169'],
                  desc: '离此岸彼岸沉没洲渚人取非人取洄洑腐败八障（T99-1169）。',
                },
                {
                  id: 'aym-3-2b',
                  label: '琴声喻：众缘和合有妙琴声，于五蕴六处中推求实我了不可得',
                  tagRef: '琴声喻',
                  sutraExamples: ['T99-1173'],
                  desc: '破斥即蕴、离蕴实有神我之妄执（T99-1173）。',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'nidana',
    shortTitle: '四、杂因诵专图（缘起·四谛）',
    fullTitle: '杂因诵 · 十二缘起中道与四圣谛三转法轮图',
    subtitle: '对应《相应部·因缘相应 & 谛相应》(SN 12 & SN 56) · 大正藏 T99 第 283–303、343–443 经',
    root: {
      id: 'ni-root',
      label: '杂因诵：十二缘起与四圣谛',
      subtitle: 'Nidāna & Sacca (SN 12 / SN 56)',
      tagRef: '缘起',
      pali: 'paṭiccasamuppāda & cattāri ariyasaccāni',
      sutraExamples: ['T99-0288', 'T99-0296', 'T99-0298', 'T99-0301', 'T99-0379'],
      desc: '揭示「此有故彼有、此无故彼无」之缘起法则，破除常见断见有无二边，并以四圣谛三转法轮总摄世出世间因果。',
      children: [
        {
          id: 'nim-1',
          label: '十二缘起顺逆流转与还灭',
          subtitle: '缘起法与缘生法 · SN 12',
          tagRef: '缘起',
          pali: 'paṭiccasamuppāda',
          sutraExamples: ['T99-0287', 'T99-0288', 'T99-0296', 'T99-0298'],
          desc: '若佛出世、若未出世，此法常住、法住法界；流转门生纯大苦聚，还灭门令纯大苦聚灭。',
          children: [
            {
              id: 'nim-1-1',
              label: '前际与名色支：无明 ➔ 行 ➔ 识 ⇄ 名色 ➔ 六入处',
              tagRef: '识、名色互缘',
              sutraExamples: ['T99-0288', 'T99-0298'],
              desc: '不知前际后际四谛名无明，造作身口意三行，识与名色如芦束相依。',
              children: [
                {
                  id: 'nim-1-1a',
                  label: '无明缘行（身口意三行），行缘识（六识身）',
                  tagRef: '无明',
                  sutraExamples: ['T99-0298'],
                  desc: '以无知故造作福行、非福行、不动行。',
                },
                {
                  id: 'nim-1-1b',
                  label: '芦束喻：识缘名色、名色缘识，齐识而还不能过彼（T99-0288）',
                  tagRef: '识、名色互缘',
                  sutraExamples: ['T99-0288'],
                  desc: '三芦立于空地展转相依，去一则二倒；识与名色互为依止。',
                },
              ],
            },
            {
              id: 'nim-1-2',
              label: '现前与后际支：触 ➔ 受 ➔ 爱 ➔ 取 ➔ 有 ➔ 生 ➔ 老死',
              tagRef: '老死',
              sutraExamples: ['T99-0296', 'T99-0298', 'T99-0371'],
              desc: '六触入处生三受，由受生三爱、四取、三有，招感未来生老病死忧悲苦恼。',
              children: [
                {
                  id: 'nim-1-2a',
                  label: '触缘受、受缘爱（欲爱/色爱/无色爱）、爱缘取（欲/见/戒盗/我语四取）',
                  tagRef: '爱',
                  sutraExamples: ['T99-0298'],
                  desc: '受与爱之间是凡圣分水岭：圣弟子于受知味患离故不起爱取。',
                },
                {
                  id: 'nim-1-2b',
                  label: '取缘有（三有）、有缘生、生缘老病死忧悲苦恼纯大苦聚集',
                  tagRef: '老死',
                  sutraExamples: ['T99-0296', 'T99-0298'],
                  desc: '无明灭则行灭，乃至生灭则老病死忧悲苦恼灭。',
                },
              ],
            },
          ],
        },
        {
          id: 'nim-2',
          label: '正见中道与二智次第',
          subtitle: '离二边 · 法住智与涅槃智',
          tagRef: '离有无二边之中道',
          pali: 'majjhimā paṭipadā (SN 12.15)',
          sutraExamples: ['T99-0262', 'T99-0300', 'T99-0301', 'T99-0302', 'T99-0335', 'T99-0347'],
          desc: '世间依有、无二边，多闻圣弟子如实正观世间集与世间灭，离二边说于中道。',
          children: [
            {
              id: 'nim-2-1',
              label: '《删陀迦旃延经》与《第一义空经》中道义',
              tagRef: '离有无二边之中道',
              sutraExamples: ['T99-0262', 'T99-0300', 'T99-0301', 'T99-0302', 'T99-0335'],
              desc: '破斥有见/无见、常见/断见、自作/他作/俱作/无因作。',
              children: [
                {
                  id: 'nim-2-1a',
                  label: '世间集如实正知故不起无见（断见），世间灭如实正知故不起有见（常见）',
                  tagRef: '离有无二边之中道',
                  sutraExamples: ['T99-0262', 'T99-0301'],
                  desc: '阿难为阐陀重宣此经，阐陀即断我见得法眼净（T99-0262）。',
                },
                {
                  id: 'nim-2-1b',
                  label: '第一义空经：有业报而无作者，此阴灭已异阴相续，除俗数法',
                  tagRef: '大空法经',
                  sutraExamples: ['T99-0335'],
                  desc: '眼生时无有来处，灭时无有去处，唯假号法、因缘法（T99-0335）。',
                },
              ],
            },
            {
              id: 'nim-2-2',
              label: '《须深经》：先得法住智，后得涅槃智',
              tagRef: '心解脱、慧解脱',
              sutraExamples: ['T99-0293', 'T99-0347'],
              desc: '外道须深盗法出家，怪诸阿罗汉不得四无色定神通而称漏尽，佛为其开示二智次第。',
              children: [
                {
                  id: 'nim-2-2a',
                  label: '不问汝知不知，且自先知法住（缘起因果必然法则），后知涅槃',
                  tagRef: '缘起',
                  sutraExamples: ['T99-0347'],
                  desc: '确立以缘起智慧（而非神通禅定）为断惑证真之根本。',
                },
              ],
            },
          ],
        },
        {
          id: 'nim-3',
          label: '四圣谛与三转十二行法轮',
          subtitle: '世出世间因果总纲 · SN 56',
          tagRef: '四圣谛',
          pali: 'cattāri ariyasaccāni (SN 56.11)',
          sutraExamples: ['T99-0379', 'T99-0382', 'T99-0404', 'T99-0435'],
          desc: '佛陀成道于鹿野苑为五比丘初转法轮，一切佛法皆摄入苦、集、灭、道四圣谛。',
          children: [
            {
              id: 'nim-3-1',
              label: '流转因果（世间）：苦圣谛【果】与苦集圣谛【因】',
              tagRef: '四圣谛',
              sutraExamples: ['T99-0379', 'T99-0382'],
              desc: '如良医先诊病相（苦谛）、次明病因（集谛）。',
              children: [
                {
                  id: 'nim-3-1a',
                  label: '苦圣谛【果】：生苦、老苦、病苦、死苦、怨憎会、爱别离、所求不得、五受阴苦',
                  tagRef: '苦',
                  sutraExamples: ['T99-0379'],
                  desc: '示转：此是苦；劝转：此苦应知；证转：此苦我已知。',
                },
                {
                  id: 'nim-3-1b',
                  label: '苦集圣谛【因】：当来有爱、喜贪俱行、彼彼集著',
                  tagRef: '爱',
                  sutraExamples: ['T99-0379'],
                  desc: '示转：此是苦集；劝转：此苦集应断；证转：此苦集我已断。',
                },
              ],
            },
            {
              id: 'nim-3-2',
              label: '还灭因果（出世间）：苦灭圣谛【果】与道圣谛【因】',
              tagRef: '三转十二行法轮',
              sutraExamples: ['T99-0379', 'T99-0404', 'T99-0435'],
              desc: '如良医指明病愈安隐（灭谛）、开具良药方剂（道谛）。',
              children: [
                {
                  id: 'nim-3-2a',
                  label: '苦灭圣谛【果】：爱欲永尽、离欲、灭尽、涅槃（应证 / 已作证）',
                  tagRef: '四圣谛',
                  sutraExamples: ['T99-0379', 'T99-0890'],
                  desc: '贪欲永尽、瞋恚永尽、愚痴永尽，名无为法涅槃。',
                },
                {
                  id: 'nim-3-2b',
                  label: '苦灭道迹圣谛【因】：八圣道分正见乃至正定（应修 / 已修习）',
                  tagRef: '八圣道分',
                  sutraExamples: ['T99-0379', 'T99-0785'],
                  desc: '手把申恕林叶喻：诸佛所知法如林中叶，唯说四圣谛能饶益涅槃（T99-0404）。',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    key: 'magga',
    shortTitle: '五、道品诵专图（道品·四果）',
    fullTitle: '道品诵 · 三十七道品相润、三学与四沙门果证图',
    subtitle: '对应《相应部·大品》(SN 45–55) · 大正藏 T99 第 605–904 经',
    root: {
      id: 'mg-root',
      label: '道品诵：三十七道品与四果',
      subtitle: 'Magga-vagga (SN 45–55)',
      tagRef: '八圣道分',
      pali: 'bodhipakkhiyā dhammā',
      sutraExamples: ['T99-0607', 'T99-0642', 'T99-0714', 'T99-0785', 'T99-0810', 'T99-0843'],
      desc: '展现从亲近善知识、修安那般那与四念处，展转满足七觉支、八圣道分、戒定慧三学，直至证得四沙门果之完整阶次。',
      children: [
        {
          id: 'mgm-1',
          label: '入道前导与十三法次第相润',
          subtitle: '善知识 · 出入息念 · 四念处',
          tagRef: '四念处',
          pali: 'ānāpānassati → satipaṭṭhāna (SN 54 / SN 47)',
          sutraExamples: ['T99-0607', 'T99-0619', 'T99-0638', 'T99-0749', 'T99-0803', 'T99-0810'],
          desc: '以善知识为全梵行，从安那般那念十六胜行入身受心法四念处一乘道。',
          children: [
            {
              id: 'mgm-1-1',
              label: '道之前导：善知识全梵行与四预流支',
              tagRef: '善知识',
              sutraExamples: ['T99-0719', 'T99-0749', 'T99-0843'],
              desc: '如东方日出先有赤明之相，善知识与戒清净、正见为八圣道之先导。',
              children: [
                {
                  id: 'mgm-1-1a',
                  label: '善知识是全梵行（非半梵行）：依善知识故生未生八圣道、满未满七觉支',
                  tagRef: '善知识',
                  sutraExamples: ['T99-0719', 'T99-0749'],
                  desc: '佛正阿难「善知识是半梵行」之语，明言善知识是全梵行（T99-0749）。',
                },
                {
                  id: 'mgm-1-1b',
                  label: '四预流支（入流分）：亲近善男子、听闻正法、内正思惟、法次法向',
                  tagRef: '四种入流分',
                  sutraExamples: ['T99-0843'],
                  desc: '趣入圣道法流、断三结得须陀洹之四项必要条件。',
                },
              ],
            },
            {
              id: 'mgm-1-2',
              label: '安那般那十六胜行 ➔ 四念处一乘道',
              tagRef: '四念处',
              sutraExamples: ['T99-0607', 'T99-0609', 'T99-0638', 'T99-0803', 'T99-0810'],
              desc: '修安那般那念（一法）满足四念处（四法），自洲以自依、法洲以法依。',
              children: [
                {
                  id: 'mgm-1-2a',
                  label: '安那般那十六胜行：历身（息长短/身行息）、受（喜乐）、心（悦/定/解脱）、法（无常/断/离/灭）',
                  tagRef: '安那般那念十六胜行',
                  sutraExamples: ['T99-0803', 'T99-0810'],
                  desc: '圣住、天住、梵住、学住、无学住、如来住（T99-0807）。',
                },
                {
                  id: 'mgm-1-2b',
                  label: '四念处一乘道：身身观念处、受受观念处、心心观念处、法法观念处',
                  tagRef: '四念处',
                  sutraExamples: ['T99-0607', 'T99-0609', 'T99-0619', 'T99-0638'],
                  desc: '精勤方便、正智正念、调伏世间贪忧；护己则护他（竹竿伎喻 T99-0619）。',
                },
              ],
            },
          ],
        },
        {
          id: 'mgm-2',
          label: '中枢道品：根、力、觉支与八圣道',
          subtitle: '三十七道品核心 · SN 45/46/48/50',
          tagRef: '七觉支',
          pali: 'indriya · bala · bojjhaṅga · magga',
          sutraExamples: ['T99-0642', 'T99-0658', 'T99-0707', 'T99-0714', 'T99-0750', 'T99-0785'],
          desc: '以信、精进、念、定、慧五根五力为基，善调七觉支止掉二相，行于出世间八圣道。',
          children: [
            {
              id: 'mgm-2-1',
              label: '五根、五力与三无漏根',
              tagRef: '五根',
              sutraExamples: ['T99-0642', 'T99-0658', 'T99-0661'],
              desc: '信根（四不坏净）、精进根（四正断）、念根（四念处）、定根（四禅）、慧根（知四谛）。',
              children: [
                {
                  id: 'mgm-2-1a',
                  label: '慧根为首如堂阁之栋：一切诸根皆由慧根摄持坚固（T99-0658）',
                  tagRef: '慧根',
                  sutraExamples: ['T99-0658'],
                  desc: '如实知苦集灭道四圣谛故，其余信、进、念、定四根得成无漏。',
                },
                {
                  id: 'mgm-2-1b',
                  label: '三无漏根：未知当知根（见道）、知根（修道）、无知根（无学阿罗汉）',
                  tagRef: '三无漏根',
                  sutraExamples: ['T99-0642'],
                  desc: '贯穿见道、修道、无学道三阶位之无漏善根。',
                },
              ],
            },
            {
              id: 'mgm-2-2',
              label: '七觉支止掉调适与八圣道分',
              tagRef: '八圣道分',
              sutraExamples: ['T99-0707', 'T99-0714', 'T99-0718', 'T99-0785'],
              desc: '四念处满足七觉支，以八圣道分统摄戒、定、慧。',
              children: [
                {
                  id: 'mgm-2-2a',
                  label: '七觉支对治五盖：心微劣修择法/精进/喜以策发，心掉举修猗/定/舍以摄止，念觉支常修',
                  tagRef: '七觉支',
                  sutraExamples: ['T99-0707', 'T99-0714', 'T99-0718'],
                  desc: '如小火加干薪则炽、大火洒水则息，尊者舍利弗于十四心自在如更衣。',
                },
                {
                  id: 'mgm-2-2b',
                  label: '八圣道分：第一义正见为首，正志、正语、正业、正命、正方便、正念资成正定',
                  tagRef: '第一义正见',
                  sutraExamples: ['T99-0750', 'T99-0754', 'T99-0785'],
                  desc: '区分有漏有取之世俗八道与圣出世间无漏无取之第一义八圣道（T99-0785）。',
                },
              ],
            },
          ],
        },
        {
          id: 'mgm-3',
          label: '三学圆证与四沙门果阶位',
          subtitle: '增上三学 · 四不坏净 · 七圣人',
          tagRef: '沙门法、沙门果',
          pali: 'tisso sikkhā & cattāri sāmaññaphalāni',
          sutraExamples: ['T99-0797', 'T99-0817', 'T99-0821', 'T99-0843', 'T99-0851', 'T99-0936'],
          desc: '依戒、定、慧三学圆满程度，次第断三结、五下分结、五上分结，证得四果七圣人。',
          children: [
            {
              id: 'mgm-3-1',
              label: '增上戒学 · 增上意学 · 增上慧学配四果',
              tagRef: '三学',
              sutraExamples: ['T99-0817', 'T99-0820', 'T99-0821', 'T99-0823'],
              desc: '三学摄尽过二百五十戒及一切出世间法。',
              children: [
                {
                  id: 'mgm-3-1a',
                  label: '戒学满足少定慧：断身见、戒取、疑三结，证须陀洹（极七有）或斯陀含（一来）',
                  tagRef: '增上戒学',
                  sutraExamples: ['T99-0817', 'T99-0821', 'T99-0851'],
                  desc: '成就佛法僧圣戒四不坏净，以法镜自照知已脱三恶道。',
                },
                {
                  id: 'mgm-3-1b',
                  label: '戒定满足少慧：断五下分结（加贪欲、瞋恚），证五种阿那含（不还果）',
                  tagRef: '增上意学',
                  sutraExamples: ['T99-0817', 'T99-0821'],
                  desc: '中般涅槃、生般涅槃、无行般涅槃、有行般涅槃、上流色究竟。',
                },
              ],
            },
            {
              id: 'mgm-3-2',
              label: '增上慧学俱足：阿罗汉果与无学三明',
              tagRef: '无学三明',
              sutraExamples: ['T99-0817', 'T99-0884', 'T99-0890', 'T99-0936'],
              desc: '戒定慧全分满足，断色贪、无色贪、掉举、慢、无明五上分结。',
              children: [
                {
                  id: 'mgm-3-2a',
                  label: '俱解脱与慧解脱阿罗汉：成就宿命智证通、生死智证通、漏尽智证通',
                  tagRef: '心解脱、慧解脱',
                  sutraExamples: ['T99-0710', 'T99-0884', 'T99-0936'],
                  desc: '离贪故心解脱，离无明故慧解脱，成就无为法涅槃。',
                },
              ],
            },
          ],
        },
      ],
    },
  },
];

// Deterministic 2D Mindmap Layout Engine for pixel-perfect cubic Bézier connectors (zero boundary overhang)
interface LayoutNode {
  data: MindmapNodeData;
  depth: number;
  x: number;
  y: number; // top
  cy: number; // vertical center
  width: number;
  height: number;
  hasChildren: boolean;
  isCollapsed: boolean;
}

interface LayoutEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
}

function computeMindmapLayout(root: MindmapNodeData, collapsedIds: Set<string>): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
} {
  const COL_X = [28, 294, 578, 868];
  const COL_W = [208, 226, 232, 392];
  const NODE_H = [56, 54, 46, 44];
  const LEAF_GAP_Y = 58;
  const TOP_PAD = 32;

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let leafIndex = 0;

  function traverse(node: MindmapNodeData, depth: number): LayoutNode {
    const d = Math.min(depth, 3);
    const hasChildren = Boolean(node.children && node.children.length > 0);
    const isCollapsed = collapsedIds.has(node.id);
    const width = COL_W[d];
    const height = node.subtitle ? NODE_H[d] + 8 : NODE_H[d];
    const x = COL_X[d];

    let cy: number;
    const childLayouts: LayoutNode[] = [];

    if (!hasChildren || isCollapsed) {
      cy = TOP_PAD + leafIndex * LEAF_GAP_Y + height / 2;
      leafIndex += 1;
    } else {
      for (const ch of node.children!) {
        childLayouts.push(traverse(ch, depth + 1));
      }
      // Parent vertical center is strictly the midpoint between first and last child centers
      cy = (childLayouts[0].cy + childLayouts[childLayouts.length - 1].cy) / 2;
    }

    const layoutNode: LayoutNode = {
      data: node,
      depth: d,
      x,
      y: cy - height / 2,
      cy,
      width,
      height,
      hasChildren,
      isCollapsed,
    };
    nodes.push(layoutNode);

    // Connect parent right anchor (after toggle button) to each child left anchor
    const x1 = x + width + (hasChildren ? 24 : 0);
    const y1 = cy;
    for (const chLayout of childLayouts) {
      edges.push({
        id: `${node.id}->${chLayout.data.id}`,
        x1,
        y1,
        x2: chLayout.x,
        y2: chLayout.cy,
        depth: d,
      });
    }

    return layoutNode;
  }

  traverse(root, 0);

  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    if (n.x + n.width + 48 > maxX) maxX = n.x + n.width + 48;
    if (n.y + n.height + 36 > maxY) maxY = n.y + n.height + 36;
  }

  return {
    nodes,
    edges,
    totalWidth: Math.max(960, maxX),
    totalHeight: Math.max(480, maxY),
  };
}

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

  // Mindmap state: multiple diagrams, zoom, 2D pan offset, multi-touch pinch-to-zoom & drag tracking
  const [activeMindmapKey, setActiveMindmapKey] = useState<string>(MINDMAP_GALLERY[0].key);
  const currentMindmapDef = useMemo(
    () => MINDMAP_GALLERY.find((m) => m.key === activeMindmapKey) || MINDMAP_GALLERY[0],
    [activeMindmapKey]
  );

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [mindmapZoom, setMindmapZoom] = useState<number>(0.78);
  const [mindmapPan, setMindmapPan] = useState<{ x: number; y: number }>({ x: 64, y: 20 });
  const [isDraggingMindmap, setIsDraggingMindmap] = useState<boolean>(false);
  const [showMindmapInspector, setShowMindmapInspector] = useState<boolean>(true);
  const mindmapViewportRef = useRef<HTMLDivElement | null>(null);

  // Track active pointers for single-finger drag AND two-finger pinch-to-zoom
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    moved: false,
  });
  const pinchStartRef = useRef<{
    dist: number;
    zoom: number;
    panX: number;
    panY: number;
    midX: number;
    midY: number;
  } | null>(null);

  const [selectedMindmapNode, setSelectedMindmapNode] = useState<MindmapNodeData>(
    MINDMAP_GALLERY[0].root
  );

  // Compute deterministic layout and smooth cubic Bézier curves for current mindmap
  const mindmapLayout = useMemo(
    () => computeMindmapLayout(currentMindmapDef.root, collapsedIds),
    [currentMindmapDef, collapsedIds]
  );

  // Fit entire mindmap tree into current viewport so user sees full panorama
  const fitMindmapToScreen = (customW?: number, customH?: number) => {
    const vp = mindmapViewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const cw = customW || mindmapLayout.totalWidth;
    const ch = customH || mindmapLayout.totalHeight;
    const padX = 72;
    const padY = 44;
    const scaleX = (vw - padX) / cw;
    const scaleY = (vh - padY) / ch;
    const bestScale = Math.max(0.28, Math.min(1.08, Number(Math.min(scaleX, scaleY).toFixed(2))));
    const centeredX = Math.max(56, Math.round((vw - cw * bestScale) / 2));
    const centeredY = Math.max(18, Math.round((vh - ch * bestScale) / 2));
    setMindmapZoom(bestScale);
    setMindmapPan({ x: centeredX, y: centeredY });
  };

  // Auto-fit when switching mindmap sub-chart, chart tab, or inspector visibility
  useEffect(() => {
    if (activeChart !== 'mindmap') return;
    const timer = setTimeout(() => {
      fitMindmapToScreen(mindmapLayout.totalWidth, mindmapLayout.totalHeight);
    }, 45);
    return () => clearTimeout(timer);
  }, [activeChart, activeMindmapKey, showMindmapInspector]);

  const handleMindmapPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-pan="true"]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      setIsDraggingMindmap(true);
      pinchStartRef.current = null;
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: mindmapPan.x,
        panY: mindmapPan.y,
        moved: false,
      };
    } else if (activePointersRef.current.size === 2) {
      // Initialize two-finger pinch-to-zoom + pan
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
      const rect = e.currentTarget.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
      pinchStartRef.current = {
        dist,
        zoom: mindmapZoom,
        panX: mindmapPan.x,
        panY: mindmapPan.y,
        midX,
        midY,
      };
      dragStartRef.current.moved = true;
    }
  };

  const handleMindmapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
      const rect = e.currentTarget.getBoundingClientRect();
      const newMidX = (pts[0].x + pts[1].x) / 2 - rect.left;
      const newMidY = (pts[0].y + pts[1].y) / 2 - rect.top;

      const ps = pinchStartRef.current;
      const scaleRatio = newDist / ps.dist;
      const nextZoom = Math.max(0.25, Math.min(2.2, Number((ps.zoom * scaleRatio).toFixed(3))));
      // Keep the canvas point under the initial two-finger midpoint anchored while also following finger translation
      const worldX = (ps.midX - ps.panX) / ps.zoom;
      const worldY = (ps.midY - ps.panY) / ps.zoom;
      const nextPanX = newMidX - worldX * nextZoom;
      const nextPanY = newMidY - worldY * nextZoom;

      setMindmapZoom(nextZoom);
      setMindmapPan({ x: Math.round(nextPanX), y: Math.round(nextPanY) });
      return;
    }

    if (activePointersRef.current.size === 1 && isDraggingMindmap && !pinchStartRef.current) {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragStartRef.current.moved = true;
      }
      setMindmapPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    }
  };

  const handleMindmapPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (activePointersRef.current.size === 1) {
      // Transition smoothly from 2 fingers back to 1 finger without jumping
      const remaining = Array.from(activePointersRef.current.values())[0];
      pinchStartRef.current = null;
      dragStartRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        panX: mindmapPan.x,
        panY: mindmapPan.y,
        moved: true,
      };
    } else if (activePointersRef.current.size === 0) {
      setIsDraggingMindmap(false);
      pinchStartRef.current = null;
    }
  };

  const handleMindmapWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.09 : 0.92;
      const nextZoom = Math.max(0.25, Math.min(2.2, Number((mindmapZoom * factor).toFixed(3))));
      const worldX = (cursorX - mindmapPan.x) / mindmapZoom;
      const worldY = (cursorY - mindmapPan.y) / mindmapZoom;
      setMindmapZoom(nextZoom);
      setMindmapPan({
        x: Math.round(cursorX - worldX * nextZoom),
        y: Math.round(cursorY - worldY * nextZoom),
      });
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
      const toCollapse = new Set<string>();
      for (const b of currentMindmapDef.root.children || []) {
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
          CHART 1A: MULTI-DIAGRAM SAMYUKTA-AGAMA MINDMAPS WITH SMOOTH BEZIER CURVES
         ===================================================================== */}
      {activeChart === 'mindmap' && (
        <div className="flex-1 flex flex-col h-[calc(100vh-11.5rem)] min-h-[580px] overflow-hidden">
          {/* Sub-Chart Selector Bar (5 Authentic Samyukta-agama Mindmaps) */}
          <div className="px-3 sm:px-6 py-2 bg-white dark:bg-stone-900 border-b border-amber-200/70 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 mr-1">
                选择专题导图（共 5 图）：
              </span>
              {MINDMAP_GALLERY.map((item) => {
                const isActive = item.key === activeMindmapKey;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveMindmapKey(item.key);
                      setCollapsedIds(new Set());
                      setSelectedMindmapNode(item.root);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-700 text-white shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-indigo-50 dark:hover:bg-stone-700'
                    }`}
                  >
                    {item.shortTitle}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 hidden xl:block">
              {currentMindmapDef.subtitle}
            </div>
          </div>

          {/* Main Split Area: Canvas + Collapsible Right Inspector */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Interactive Multi-Touch Pinch-to-Zoom & Drag-to-Pan Viewport */}
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
              {/* Left Floating Minimal Controls (Expand/Collapse + Zoom + / 全貌 / -) — No directional buttons */}
              <div
                data-no-pan="true"
                className="absolute left-3.5 top-3.5 z-20 flex flex-col items-center gap-2"
              >
                <button
                  onClick={() => {
                    toggleExpandCollapseAll();
                  }}
                  title={collapsedIds.size > 0 ? '展开全部节点' : '折叠三级细项'}
                  className="w-10 h-10 rounded-full bg-white/95 dark:bg-stone-900/95 border border-stone-200/90 dark:border-stone-700 shadow-md flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-indigo-50 dark:hover:bg-stone-800 transition"
                >
                  <ChevronsUpDown className="w-4 h-4" />
                </button>

                <div className="flex flex-col rounded-2xl bg-white/95 dark:bg-stone-900/95 border border-stone-200/90 dark:border-stone-700 shadow-md overflow-hidden">
                  <button
                    onClick={() => setMindmapZoom((z) => Math.min(2.2, Number((z + 0.14).toFixed(2))))}
                    title="放大导图"
                    className="w-10 h-9 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-indigo-50 dark:hover:bg-stone-800 border-b border-stone-200 dark:border-stone-800 transition text-lg font-medium"
                  >
                    +
                  </button>
                  <button
                    onClick={() => fitMindmapToScreen()}
                    title="适应窗口看全貌"
                    className="w-10 h-8 flex items-center justify-center text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-stone-800 border-b border-stone-200 dark:border-stone-800 transition"
                  >
                    全貌
                  </button>
                  <button
                    onClick={() => setMindmapZoom((z) => Math.max(0.25, Number((z - 0.14).toFixed(2))))}
                    title="缩小导图"
                    className="w-10 h-9 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-indigo-50 dark:hover:bg-stone-800 transition text-lg font-medium"
                  >
                    −
                  </button>
                </div>

                <div className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-[10px] font-mono text-stone-600 dark:text-stone-300 shadow-2xs">
                  {Math.round(mindmapZoom * 100)}%
                </div>
              </div>

              {/* Top-Right Hint & Inspector Drawer Toggle */}
              <div
                data-no-pan="true"
                className="absolute right-3.5 top-3.5 z-20 flex items-center gap-2"
              >
                <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/90 dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-400 shadow-2xs">
                  支持单指/鼠标自由拖动 · 双指捏合缩放 · 点击节点看经文
                </span>
                <button
                  onClick={() => setShowMindmapInspector((v) => !v)}
                  className="px-2.5 py-1 rounded-lg bg-white/95 dark:bg-stone-900/95 border border-amber-300 dark:border-stone-700 text-xs font-medium text-amber-900 dark:text-amber-300 shadow-sm hover:bg-amber-50 transition"
                >
                  {showMindmapInspector ? '收起侧栏 ▸' : '展开详情 ◂'}
                </button>
              </div>

              {/* Transformed Canvas Layer with Exact SVG Bézier Curves & Positioned Nodes */}
              <div
                className="origin-top-left will-change-transform relative"
                style={{
                  width: mindmapLayout.totalWidth,
                  height: mindmapLayout.totalHeight,
                  transform: `translate3d(${mindmapPan.x}px, ${mindmapPan.y}px, 0) scale(${mindmapZoom})`,
                }}
              >
                {/* SVG Smooth Cubic Bézier Connector Layer (Zero boundary overhang) */}
                <svg
                  width={mindmapLayout.totalWidth}
                  height={mindmapLayout.totalHeight}
                  className="absolute inset-0 pointer-events-none overflow-visible"
                >
                  {mindmapLayout.edges.map((edge) => {
                    const dx = (edge.x2 - edge.x1) * 0.52;
                    const d = `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx} ${edge.y1}, ${edge.x2 - dx} ${edge.y2}, ${edge.x2} ${edge.y2}`;
                    const strokeColor =
                      edge.depth === 0
                        ? '#818cf8' // indigo-400
                        : edge.depth === 1
                        ? '#2dd4bf' // teal-400
                        : '#4ade80'; // emerald-400
                    return (
                      <path
                        key={edge.id}
                        d={d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={edge.depth === 0 ? 2.4 : 2}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>

                {/* Positioned Mindmap Node Cards */}
                {mindmapLayout.nodes.map((ln) => {
                  const isSelected = selectedMindmapNode.id === ln.data.id;

                  // Distinct harmonious palette by depth matching the screenshot style
                  let cardCls = '';
                  let subCls = '';
                  let toggleCls = '';
                  if (ln.depth === 0) {
                    cardCls = isSelected
                      ? 'bg-[#c7d2fe] text-[#1e1b4b] border-[#6366f1] ring-2 ring-indigo-400/60 dark:bg-indigo-900 dark:text-indigo-50'
                      : 'bg-[#dbe4ff] text-[#1e293b] border-[#a5b4fc] hover:bg-[#c7d2fe] dark:bg-indigo-950/90 dark:text-indigo-100 dark:border-indigo-700';
                    subCls = 'text-indigo-900/75 dark:text-indigo-300';
                    toggleCls =
                      'bg-[#e0e7ff] text-indigo-800 border-indigo-400 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-600';
                  } else if (ln.depth === 1) {
                    cardCls = isSelected
                      ? 'bg-[#c7d2fe] text-[#1e1b4b] border-[#6366f1] ring-2 ring-indigo-400/60 dark:bg-indigo-900 dark:text-indigo-50'
                      : 'bg-[#dce5ff] text-[#1e293b] border-[#b4c6fc] hover:bg-[#cddaff] dark:bg-indigo-950/80 dark:text-indigo-100 dark:border-indigo-800';
                    subCls = 'text-indigo-900/75 dark:text-indigo-300';
                    toggleCls =
                      'bg-[#e0e7ff] text-indigo-800 border-indigo-400 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-600';
                  } else if (ln.depth === 2) {
                    cardCls = isSelected
                      ? 'bg-[#6ee7b7] text-[#064e3b] border-[#059669] ring-2 ring-emerald-400/60 dark:bg-teal-800 dark:text-teal-50'
                      : 'bg-[#a5f3df] text-[#0f2922] border-[#5eead4] hover:bg-[#86efac] dark:bg-teal-950 dark:text-teal-100 dark:border-teal-700';
                    subCls = 'text-teal-900/75 dark:text-teal-300';
                    toggleCls =
                      'bg-[#ccfbf1] text-teal-900 border-teal-500 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-600';
                  } else {
                    cardCls = isSelected
                      ? 'bg-[#86efac] text-[#064e3b] border-[#16a34a] font-bold ring-2 ring-emerald-400/60 dark:bg-emerald-800 dark:text-emerald-50'
                      : 'bg-[#b2f2bb] text-[#143321] border-[#69db7c] hover:bg-[#96f2a4] dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-800';
                    subCls = 'text-emerald-900/75 dark:text-emerald-300';
                    toggleCls =
                      'bg-[#d3f9d8] text-emerald-900 border-emerald-500 dark:bg-emerald-900 dark:text-emerald-200';
                  }

                  return (
                    <React.Fragment key={ln.data.id}>
                      <div
                        onClick={() => {
                          if (!dragStartRef.current.moved) {
                            setSelectedMindmapNode(ln.data);
                            setShowMindmapInspector(true);
                          }
                        }}
                        style={{
                          left: ln.x,
                          top: ln.y,
                          width: ln.width,
                          height: ln.height,
                        }}
                        className={`absolute px-3 rounded-xl border shadow-2xs flex flex-col justify-center cursor-pointer transition-colors ${cardCls}`}
                      >
                        <div
                          className={`font-sans leading-snug truncate ${
                            ln.depth <= 1 ? 'font-bold text-xs sm:text-[13px]' : 'font-semibold text-xs'
                          }`}
                          title={ln.data.label}
                        >
                          {ln.data.label}
                        </div>
                        {ln.data.subtitle && (
                          <div className={`text-[10px] truncate mt-0.5 ${subCls}`}>{ln.data.subtitle}</div>
                        )}
                      </div>

                      {/* Expand / Collapse Circle Button anchored exactly at (ln.x + ln.width + 4, ln.cy - 10) */}
                      {ln.hasChildren && (
                        <button
                          data-no-pan="true"
                          onClick={(e) => toggleMindmapNode(ln.data.id, e)}
                          style={{
                            left: ln.x + ln.width + 4,
                            top: ln.cy - 10,
                            width: 20,
                            height: 20,
                          }}
                          title={ln.isCollapsed ? '展开子节点' : '折叠子节点'}
                          className={`absolute rounded-full border text-[11px] font-bold flex items-center justify-center shadow-2xs hover:scale-110 transition ${toggleCls}`}
                        >
                          {ln.isCollapsed ? '>' : '<'}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
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
