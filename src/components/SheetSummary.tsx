import type { Sheet } from '../lib/imposition';

interface Props {
  sheets: Sheet[];
  selected: number;
  onSelect: (index: number) => void;
}

export function SheetSummary({ sheets, selected, onSelect }: Props) {
  return (
    <section className="summary-card" aria-labelledby="summary-title">
      <h2 id="summary-title">全部纸张摘要（由外到内）</h2>
      <ol className="summary-list" data-testid="summary-list">
        {sheets.map((sheet) => (
          <li key={sheet.index}>
            <button
              type="button"
              className="summary-row"
              data-testid={`sheet-tab-${sheet.index}`}
              aria-current={sheet.index === selected ? 'true' : undefined}
              onClick={() => onSelect(sheet.index)}
            >
              <span className="summary-index">
                第 {sheet.index + 1}/{sheets.length} 张
              </span>
              <span className="summary-side">
                <em>正</em>
                <b>{sheet.front.left}</b>
                <i>·</i>
                <b>{sheet.front.right}</b>
              </span>
              <span className="summary-side">
                <em>背</em>
                <b>{sheet.back.left}</b>
                <i>·</i>
                <b>{sheet.back.right}</b>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
