import { describe, expect, it } from 'vitest';
import {
  buildBook,
  buildSheet,
  checkIntegrity,
  MAX_PAGES,
  MIN_PAGES,
  parseInput,
  SLOTS_PER_SHEET,
  type Sheet,
} from './imposition';

describe('parseInput / isValidPageCount', () => {
  it.each([4, 8, 12, 16, 32, 60, 64])('接受合法页数 %s', (p) => {
    expect(parseInput(String(p))).toEqual({ kind: 'valid', pages: p });
  });

  it('边界值 4 与 64 合法', () => {
    expect(parseInput('4')).toEqual({ kind: 'valid', pages: 4 });
    expect(parseInput('64')).toEqual({ kind: 'valid', pages: 64 });
  });

  it.each(['6', '5', '7', '10', '30', '62'])('不被 4 整除判非法：%s', (raw) => {
    expect(parseInput(raw)).toEqual({ kind: 'invalid' });
  });

  it.each(['0', '2', '-4', '+4', '68', '72', '100', '3.5', '8.0', 'abc', '12px', '0x10'])
    ('非法输入：%j', (raw) => {
      expect(parseInput(raw)).toEqual({ kind: 'invalid' });
    });

  it('首尾空白会被裁掉，" 8 " 视为合法 8', () => {
    expect(parseInput(' 8 ')).toEqual({ kind: 'valid', pages: 8 });
  });

  it('纯空白视为尚未输入', () => {
    expect(parseInput('   ')).toEqual({ kind: 'idle' });
  });

  it('常量边界自洽', () => {
    expect(MIN_PAGES).toBe(4);
    expect(MAX_PAGES).toBe(64);
    expect(SLOTS_PER_SHEET).toBe(4);
  });
});

describe('buildSheet 排列公式', () => {
  it('P=4 唯一一张纸：正 4·1，背 2·3', () => {
    expect(buildSheet(4, 0)).toEqual({
      index: 0,
      front: { left: 4, right: 1 },
      back: { left: 2, right: 3 },
    });
  });

  it('P=8 最外张 i=0：正 8·1，背 2·7', () => {
    expect(buildSheet(8, 0)).toEqual({
      index: 0,
      front: { left: 8, right: 1 },
      back: { left: 2, right: 7 },
    });
  });

  it('P=8 最内张 i=1：正 6·3，背 4·5', () => {
    expect(buildSheet(8, 1)).toEqual({
      index: 1,
      front: { left: 6, right: 3 },
      back: { left: 4, right: 5 },
    });
  });

  it('P=16 四张纸逐张符合公式', () => {
    const expected: Array<[number, number, number, number]> = [
      [16, 1, 2, 15],
      [14, 3, 4, 13],
      [12, 5, 6, 11],
      [10, 7, 8, 9],
    ];
    expected.forEach(([fl, fr, bl, br], i) => {
      expect(buildSheet(16, i)).toEqual({
        index: i,
        front: { left: fl, right: fr },
        back: { left: bl, right: br },
      });
    });
  });

  it('公式恒等式：正面左右之和为 P+1，背面左右之和也为 P+1', () => {
    for (let p = 4; p <= 64; p += 4) {
      for (let i = 0; i < p / 4; i += 1) {
        const s = buildSheet(p, i);
        expect(s.front.left + s.front.right).toBe(p + 1);
        expect(s.back.left + s.back.right).toBe(p + 1);
      }
    }
  });

  it('相邻页码落在同一张纸的正右/背左（书芯顺序）', () => {
    for (let p = 4; p <= 64; p += 4) {
      for (let i = 0; i < p / 4; i += 1) {
        const s = buildSheet(p, i);
        expect(s.back.left).toBe(s.front.right + 1);
        expect(s.front.left).toBe(s.back.right + 1);
      }
    }
  });
});

describe('buildBook + checkIntegrity 全量排列', () => {
  it.each(Array.from({ length: (64 - 4) / 4 + 1 }, (_, k) => 4 + k * 4))(
    'P=%s：纸张数为 P/4，且 1…P 每个页码恰好出现一次',
    (p) => {
      const book = buildBook(p);
      expect(book).toHaveLength(p / 4);
      expect(book.map((s) => s.index)).toEqual(book.map((_, i) => i));

      const report = checkIntegrity(p, book);
      expect(report.ok).toBe(true);
      expect(report.slotCount).toBe(p);
      expect(report.missing).toEqual([]);
      expect(report.duplicates).toEqual([]);
      expect(report.outOfRange).toEqual([]);

      const values = book.flatMap((s) => [
        s.front.left,
        s.front.right,
        s.back.left,
        s.back.right,
      ]);
      expect(values).toHaveLength(p);
      expect([...values].sort((a, b) => a - b)).toEqual(
        Array.from({ length: p }, (_, i) => i + 1),
      );
    },
  );

  it('缺失页码能被真实统计发现', () => {
    const tampered: Sheet[] = [
      { index: 0, front: { left: 8, right: 1 }, back: { left: 2, right: 7 } },
      // 把 6 抄成 8：缺 6，重复 8
      { index: 1, front: { left: 8, right: 3 }, back: { left: 4, right: 5 } },
    ];
    const report = checkIntegrity(8, tampered);
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual([6]);
    expect(report.duplicates).toEqual([8]);
  });

  it('越界页码能被真实统计发现', () => {
    const tampered: Sheet[] = [
      { index: 0, front: { left: 9, right: 1 }, back: { left: 2, right: 7 } },
      { index: 1, front: { left: 6, right: 3 }, back: { left: 4, right: 5 } },
    ];
    const report = checkIntegrity(8, tampered);
    expect(report.ok).toBe(false);
    expect(report.missing).toEqual([8]);
    expect(report.outOfRange).toEqual([9]);
  });

  it('槽位总数不符也判失败', () => {
    const book = buildBook(8).slice(0, 1);
    const report = checkIntegrity(8, book);
    expect(report.ok).toBe(false);
    expect(report.slotCount).toBe(4);
    expect(report.missing).toEqual([3, 4, 5, 6]);
  });

  it('buildBook 对非法页数抛错而不是返回固定结果', () => {
    expect(() => buildBook(6)).toThrow(/INVALID_PAGE_COUNT/);
    expect(() => buildBook(66)).toThrow(/INVALID_PAGE_COUNT/);
  });
});
