/**
 * 骑马钉拼版核心计算（纯函数，无 DOM 依赖，可单测）。
 *
 * 约定：
 * - 成品总页数 P：4 ≤ P ≤ 64 的整数，且必须被 4 整除。
 * - 每张纸对折后成为一个书帖，提供 4 个成品页，共 P/4 张纸。
 * - i 为装订后由外到内的纸张序号，i = 0 … P/4−1。
 * - 设备约定：观察者始终站在纸张同一侧，左右位置不做镜像翻转：
 *     正面从左至右：P−2i，1+2i
 *     背面从左至右：2+2i，P−1−2i
 */

export const MIN_PAGES = 4;
export const MAX_PAGES = 64;
/** 一张对折纸承载的成品页数。 */
export const SLOTS_PER_SHEET = 4;

export interface SheetSide {
  /** 从左至右的两个页码。 */
  left: number;
  right: number;
}

export interface Sheet {
  /** 由外到内的 0 基序号。 */
  index: number;
  front: SheetSide;
  back: SheetSide;
}

export type InputState =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'valid'; pages: number };

export type ValidationResult =
  | { kind: 'idle' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'valid'; pages: number };

export interface IntegrityReport {
  /** 仅当 1…P 每个页码恰好出现一次时为 true。 */
  ok: boolean;
  /** 实际页码槽位总数（纸张数 × 4）。 */
  slotCount: number;
  /** 1…P 中一次都没有出现的页码。 */
  missing: number[];
  /** 1…P 中出现超过一次的页码。 */
  duplicates: number[];
  /** 落在 1…P 范围之外的页码值。 */
  outOfRange: number[];
}

export function isValidPageCount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_PAGES &&
    value <= MAX_PAGES &&
    value % SLOTS_PER_SHEET === 0
  );
}

/**
 * 解析操作员输入的原文。
 * 空白视为尚未输入（idle）；其余任何不满足约定的输入一律 invalid。
 */
export function parseInput(raw: string): InputState {
  const result = validateDetailed(raw);
  if (result.kind === 'valid') return { kind: 'valid', pages: result.pages };
  if (result.kind === 'invalid') return { kind: 'invalid' };
  return { kind: 'idle' };
}

/** 对给定页数给出“最接近的合法页数”，供错误文案实时推算，禁止固定文案结果。 */
export function nearestValidPages(value: number): number {
  if (!Number.isFinite(value)) return MIN_PAGES;
  const clamped = Math.min(MAX_PAGES, Math.max(MIN_PAGES, Math.round(value)));
  const lower = clamped - (((clamped - MIN_PAGES) % SLOTS_PER_SHEET) + SLOTS_PER_SHEET) % SLOTS_PER_SHEET;
  const upper = lower + SLOTS_PER_SHEET;
  if (upper > MAX_PAGES) return lower;
  if (lower < MIN_PAGES) return upper;
  return Math.abs(value - lower) <= Math.abs(upper - value) ? lower : upper;
}

/** 与 parseInput 同规则，但返回由真实输入推算出的错误原因。 */
export function validateDetailed(raw: string): ValidationResult {
  const text = raw.trim();
  if (text === '') return { kind: 'idle' };
  // 只接受十进制整数写法：不接受小数、负号、科学计数法、十六进制等。
  if (!/^\d+$/.test(text)) {
    return { kind: 'invalid', reason: '请输入十进制整数（不含负号、小数点或其它字符）' };
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value)) {
    return { kind: 'invalid', reason: '数值过大，超出安全整数范围' };
  }
  if (value < MIN_PAGES || value > MAX_PAGES) {
    const near = nearestValidPages(value);
    return {
      kind: 'invalid',
      reason: `页数须在 ${MIN_PAGES}–${MAX_PAGES} 之间；按当前输入推算，最接近的合法值为 ${near}`,
    };
  }
  if (value % SLOTS_PER_SHEET !== 0) {
    const near = nearestValidPages(value);
    return {
      kind: 'invalid',
      reason: `页数必须被 ${SLOTS_PER_SHEET} 整除（一张对折纸出 4 页）；最接近的合法值为 ${near}`,
    };
  }
  return { kind: 'valid', pages: value };
}

/** 按设备约定计算第 index 张纸正/背面的左右页码。 */
export function buildSheet(pages: number, index: number): Sheet {
  return {
    index,
    front: { left: pages - 2 * index, right: 1 + 2 * index },
    back: { left: 2 + 2 * index, right: pages - 1 - 2 * index },
  };
}

/** 生成由外到内排序的全部纸张；非法页数直接抛错，绝不静默产出。 */
export function buildBook(pages: number): Sheet[] {
  if (!isValidPageCount(pages)) {
    throw new Error(`INVALID_PAGE_COUNT:${String(pages)}`);
  }
  const sheetCount = pages / SLOTS_PER_SHEET;
  return Array.from({ length: sheetCount }, (_, index) => buildSheet(pages, index));
}

function sheetValues(sheet: Sheet): number[] {
  return [sheet.front.left, sheet.front.right, sheet.back.left, sheet.back.right];
}

/**
 * 页码完整性检查：逐槽位统计出现次数，绝不假定公式必然正确。
 * 错误信息（缺失/重复/越界/槽位不符）全部由真实统计得出。
 */
export function checkIntegrity(pages: number, sheets: Sheet[]): IntegrityReport {
  const counts = new Map<number, number>();
  for (const sheet of sheets) {
    for (const value of sheetValues(sheet)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  const missing: number[] = [];
  const duplicates: number[] = [];
  for (let page = 1; page <= pages; page += 1) {
    const count = counts.get(page) ?? 0;
    if (count === 0) missing.push(page);
    else if (count > 1) duplicates.push(page);
  }

  const outOfRange: number[] = [];
  for (const value of counts.keys()) {
    if (value < 1 || value > pages) outOfRange.push(value);
  }
  outOfRange.sort((a, b) => a - b);

  const slotCount = sheets.length * SLOTS_PER_SHEET;
  const ok =
    slotCount === pages &&
    missing.length === 0 &&
    duplicates.length === 0 &&
    outOfRange.length === 0;

  return { ok, slotCount, missing, duplicates, outOfRange };
}
