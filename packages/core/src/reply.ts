/**
 * The reply protocol: what an agent says to the user after a roll, and again once the compare page
 * exists. One header line, one line per direction, one line asking for a choice. Each direction line
 * is read off the mapped numbers (display / body face, paper polarity and hue, grid columns, anchor,
 * format for non-web scenarios, short ref), so the agent has nothing to embellish.
 */
import { getScenario } from './data/scenarios.js';
import type { Roll, RollJson } from './brief.js';
import type { Language } from './derive.js';
import type { Bilingual, ScenarioId } from './types.js';

export type ReplyStage = 'rolled' | 'compared';

export interface ReplyOptions {
  /** `rolled` (default): right after roll_designs. `compared`: after build_compare_page. */
  stage?: ReplyStage;
  /** Path to compare.html, shown in the `compared` header. */
  comparePath?: string;
}

/** What the final artifact is called in the closing question. */
const NOUN: Record<ScenarioId, Bilingual> = {
  web: { zh: '页面', en: 'page' },
  deck: { zh: '幻灯片', en: 'deck' },
  app: { zh: 'App 界面', en: 'app screens' },
  dashboard: { zh: '看板', en: 'dashboard' },
  poster: { zh: '海报', en: 'poster' },
  email: { zh: '邮件', en: 'email' },
};

/** The fields a reply line reads; both a Roll's designs and roll.json's designs have them. */
interface ReplyDesign {
  short: string;
  palette: { polarity: string; hue: number };
  type: { display: { family: string }; body: { family: string } };
  layout: { columns: number };
  anchor: { subject: { id: string } };
  scenario?: { format: { name: Bilingual } } | undefined;
}

/** One direction in one line: `**Display** / Body — paper, hue · grid · anchor[ · format] · \`ref\``. */
export function replyLine(d: ReplyDesign, lang: Language): string {
  const hue = Math.round(d.palette.hue);
  const dark = d.palette.polarity === 'dark';
  const parts =
    lang === 'zh'
      ? [
          `${dark ? '深色' : '浅色'}纸，色相 ${hue}°`,
          `${d.layout.columns} 栏网格`,
          `首屏锚点 ${d.anchor.subject.id}`,
        ]
      : [
          `${dark ? 'dark' : 'light'} paper, hue ${hue}°`,
          `${d.layout.columns}-column grid`,
          `anchor: ${d.anchor.subject.id}`,
        ];
  if (d.scenario) parts.push(d.scenario.format.name[lang]);
  return `**${d.type.display.family}** / ${d.type.body.family} — ${parts.join(' · ')} · \`${d.short}\``;
}

function sourceLabel(source: string, lang: Language): string {
  if (source === 'system-random') return lang === 'zh' ? '真随机' : 'true-random';
  if (source.startsWith('seed:')) return `seed ${source.slice(5)}`;
  return lang === 'zh' ? '指定哈希' : 'provided hashes';
}

/** The short reply an agent sends the user after a roll (or after the compare page). */
export function renderReply(r: Roll | RollJson, opts: ReplyOptions = {}): string {
  const lang: Language = r.content.language === 'en' ? 'en' : 'zh';
  const stage = opts.stage ?? 'rolled';
  const scenarioId: ScenarioId = r.constraints.scenario ?? 'web';
  const scenarioName = getScenario(scenarioId)?.name[lang] ?? scenarioId;
  // Chinese text puts a space before a Latin word ("正式 App 界面").
  const noun = lang === 'zh' ? NOUN[scenarioId].zh.replace(/^(?=[A-Za-z])/, ' ') : NOUN[scenarioId].en;
  const n = r.designs.length;
  const lines = (r.designs as ReplyDesign[]).map((d, i) => `${i + 1}. ${replyLine(d, lang)}`);

  let header: string;
  let ask: string;
  if (stage === 'compared') {
    const where = opts.comparePath ?? 'compare.html';
    header =
      lang === 'zh'
        ? `**hash-design** · ${n} 个预览已并排：${where}`
        : `**hash-design** · ${n} ${n === 1 ? 'preview' : 'previews'} side by side: ${where}`;
    ask =
      lang === 'zh'
        ? `回复编号，按该方向做正式${noun}。`
        : `Reply with a number to build that direction as the final ${noun}.`;
  } else {
    header =
      lang === 'zh'
        ? `**hash-design** · 为「${r.content.subject}」掷出 ${n} 个方向 · ${scenarioName} · ${sourceLabel(r.source, lang)}`
        : `**hash-design** · ${n} ${n === 1 ? 'direction' : 'directions'} for “${r.content.subject}” · ${scenarioName} · ${sourceLabel(r.source, lang)}`;
    const preview =
      lang === 'zh'
        ? n === 1
          ? '回复「预览」先做成预览看看'
          : `回复「预览」先把 ${n} 个方向都做成预览并排对比`
        : n === 1
          ? '**render** to see it as a preview first'
          : `**render** to see all ${n} as previews side by side first`;
    ask =
      lang === 'zh'
        ? `回复编号，直接按该方向做正式${noun}；${preview}；回复「重掷」换一批。`
        : `Reply with a number to build that direction as the final ${noun}, ${preview}, or **reroll** for a new set.`;
  }
  return [header, '', ...lines, '', ask].join('\n');
}
