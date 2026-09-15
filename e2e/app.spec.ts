import { expect, test } from '@playwright/test';

const BADGE = '[data-testid="status-badge"]';
const INPUT = '[data-testid="pages-input"]';

async function enterPages(page: import('@playwright/test').Page, value: string) {
  await page.locator(INPUT).fill(value);
}

test.describe('输入校验与清空', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('初始为 IDLE 且没有纸张', async ({ page }) => {
    await expect(page.locator(BADGE)).toHaveText('IDLE');
    await expect(page.locator('[data-testid="highlight-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="print-area"]')).toHaveCount(0);
  });

  test('非法输入显示 INVALID 并清空全部纸张', async ({ page }) => {
    // 先输入合法值产生纸张
    await enterPages(page, '8');
    await expect(page.locator(BADGE)).toHaveText('PASS');
    await expect(page.locator('[data-testid="summary-list"] li')).toHaveCount(2);
    await expect(page.locator('[data-testid="print-area"]')).toHaveCount(1);

    // 改成不能被 4 整除：INVALID + 纸张全部消失
    await enterPages(page, '6');
    await expect(page.locator(BADGE)).toHaveText('INVALID');
    await expect(page.locator('[data-testid="sheets-cleared"]')).toBeVisible();
    await expect(page.locator('[data-testid="highlight-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="summary-list"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="print-area"]')).toHaveCount(0);
  });

  test('越界与非整数输入均为 INVALID，且错误原因来自实际输入', async ({ page }) => {
    for (const value of ['3', '68', 'abc', '12.0', '-8']) {
      await enterPages(page, value);
      await expect(page.locator(BADGE)).toHaveText('INVALID');
      await expect(page.locator('[data-testid="status-hint"] .error-text')).toContainText(
        'INVALID',
      );
    }

    // “最接近的合法值”由 6 真实推算为 4（或 8），而非固定文案
    await enterPages(page, '6');
    await expect(page.locator('[data-testid="status-hint"]')).toContainText('合法值为 4');

    await enterPages(page, '62');
    await expect(page.locator('[data-testid="status-hint"]')).toContainText('合法值为 60');
  });
});

test.describe('合法拼版与纸张切换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('P=8：两张纸，正背面切换显示真实计算页码', async ({ page }) => {
    await enterPages(page, '8');
    await expect(page.locator(BADGE)).toHaveText('PASS');
    await expect(page.locator('[data-testid="integrity-badge"]')).toHaveText('PASS');
    await expect(page.locator('[data-testid="active-sheet-number"]')).toHaveText('1');

    // 最外张 i=0 正面：8 · 1
    await expect(page.locator('[data-testid="page-left"] .page-number')).toHaveText('8');
    await expect(page.locator('[data-testid="page-right"] .page-number')).toHaveText('1');

    // 切到背面：2 · 7（左右不镜像）
    await page.locator('[data-testid="side-back"]').click();
    await expect(page.locator('[data-testid="page-left"] .page-number')).toHaveText('2');
    await expect(page.locator('[data-testid="page-right"] .page-number')).toHaveText('7');
    await expect(page.locator('[data-testid="formula-line"]')).toContainText('2+2i');

    // 回到正面后切换到内张 i=1：6 · 3
    await page.locator('[data-testid="side-front"]').click();
    await page.locator('[data-testid="next-sheet"]').click();
    await expect(page.locator('[data-testid="active-sheet-number"]')).toHaveText('2');
    await expect(page.locator('[data-testid="page-left"] .page-number')).toHaveText('6');
    await expect(page.locator('[data-testid="page-right"] .page-number')).toHaveText('3');

    // 内张背面：4 · 5
    await page.locator('[data-testid="side-back"]').click();
    await expect(page.locator('[data-testid="page-left"] .page-number')).toHaveText('4');
    await expect(page.locator('[data-testid="page-right"] .page-number')).toHaveText('5');

    // 上一张回到最外张，页码随之还原
    await page.locator('[data-testid="prev-sheet"]').click();
    await expect(page.locator('[data-testid="active-sheet-number"]')).toHaveText('1');
    await expect(page.locator('[data-testid="page-left"] .page-number')).toHaveText('2');
    await expect(page.locator('[data-testid="page-right"] .page-number')).toHaveText('7');
  });

  test('P=16：生成 4 张纸，点击摘要可跳转，最内张公式正确', async ({ page }) => {
    await enterPages(page, '16');
    const rows = page.locator('[data-testid="summary-list"] li');
    await expect(rows).toHaveCount(4);

    await page.locator('[data-testid="sheet-tab-3"]').click();
    await expect(page.locator('[data-testid="active-sheet-number"]')).toHaveText('4');
    // i=3 正面：16−6=10，1+6=7
    await expect(page.locator('[data-testid="page-left"] .page-number')).toHaveText('10');
    await expect(page.locator('[data-testid="page-right"] .page-number')).toHaveText('7');

    // i=3 背面：2+6=8，16−1−6=9
    await page.locator('[data-testid="side-back"]').click();
    await expect(page.locator('[data-testid="page-left"] .page-number')).toHaveText('8');
    await expect(page.locator('[data-testid="page-right"] .page-number')).toHaveText('9');
  });

  test('摘要中全部页码恰好为 1…P 各一次（P=20）', async ({ page }) => {
    await enterPages(page, '20');
    await expect(page.locator(BADGE)).toHaveText('PASS');
    const values = await page.locator('[data-testid="summary-list"] b').allInnerTexts();
    const pages = values.map((v) => Number(v.trim())).sort((a, b) => a - b);
    expect(pages).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

test.describe('打印稿', () => {
  test('打印媒体下仅显示按由外到内排列、保持左右分栏的拼版', async ({ page }) => {
    await page.goto('/');
    await enterPages(page, '8');

    const printArea = page.locator('[data-testid="print-area"]');
    await expect(printArea).toHaveCount(1);

    // DOM 顺序 = 由外到内：先 i=0（8,1 / 2,7）再 i=1（6,3 / 4,5）
    const ordered = await printArea.locator('.print-cell').allInnerTexts();
    expect(ordered.map((s) => s.trim())).toEqual(['8', '1', '2', '7', '6', '3', '4', '5']);

    await page.emulateMedia({ media: 'print' });
    await expect(printArea).toBeVisible();
    await expect(page.locator('.screen')).toBeHidden();

    // 打印布局保持左右两个等宽分栏，且顺序为行内左→右
    const flexDirection = await printArea
      .locator('.print-columns')
      .first()
      .evaluate((el) => getComputedStyle(el).flexDirection);
    expect(flexDirection).toBe('row');

    await page.emulateMedia({ media: 'screen' });
    await expect(printArea).toBeHidden();
  });

  test('非法时不存在可打印拼版节点', async ({ page }) => {
    await page.goto('/');
    await enterPages(page, '10');
    await expect(page.locator(BADGE)).toHaveText('INVALID');
    await expect(page.locator('[data-testid="print-area"]')).toHaveCount(0);
  });
});
