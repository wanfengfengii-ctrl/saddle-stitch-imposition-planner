import type { Sheet } from '../lib/imposition';

interface Props {
  pages: number;
  sheets: Sheet[];
}

/**
 * 打印稿：屏幕上隐藏，仅在 @media print 出现。
 * 纸张按由外到内次序逐张输出，正背面均保持左右两栏，不做镜像。
 */
export function PrintLayout({ pages, sheets }: Props) {
  return (
    <div className="print-area" data-testid="print-area" aria-hidden="true">
      <div className="print-masthead">
        骑马钉拼版稿 ｜ 成品 {pages} 页 ｜ 用纸 {sheets.length} 张 ｜ 次序：由外到内
      </div>
      {sheets.map((sheet) => (
        <section className="print-sheet" key={sheet.index} data-sheet={sheet.index}>
          <h3>
            第 {sheet.index + 1}/{sheets.length} 张（i = {sheet.index}）
          </h3>
          <div className="print-side">
            <div className="print-side-label">正面（左 → 右）</div>
            <div className="print-columns">
              <div className="print-cell">{sheet.front.left}</div>
              <div className="print-cell">{sheet.front.right}</div>
            </div>
          </div>
          <div className="print-side">
            <div className="print-side-label">背面（左 → 右）</div>
            <div className="print-columns">
              <div className="print-cell">{sheet.back.left}</div>
              <div className="print-cell">{sheet.back.right}</div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
