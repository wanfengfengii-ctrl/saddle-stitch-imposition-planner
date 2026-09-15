import type { Sheet } from '../lib/imposition';

interface Props {
  sheet: Sheet;
  side: 'front' | 'back';
  total: number;
  onSideChange: (side: 'front' | 'back') => void;
  onPrev: () => void;
  onNext: () => void;
}

export function HighlightSheet({ sheet, side, total, onSideChange, onPrev, onNext }: Props) {
  const current = side === 'front' ? sheet.front : sheet.back;
  return (
    <section className="highlight-card" aria-labelledby="highlight-title" data-testid="highlight-card">
      <div className="highlight-head">
        <h2 id="highlight-title">
          第 <span data-testid="active-sheet-number">{sheet.index + 1}</span> / {total} 张
          <span className="dim">（由外到内，i = {sheet.index}）</span>
        </h2>
        <div className="side-toggle" role="tablist" aria-label="正背面切换">
          <button
            type="button"
            role="tab"
            aria-selected={side === 'front'}
            data-testid="side-front"
            className={side === 'front' ? 'active' : ''}
            onClick={() => onSideChange('front')}
          >
            正面
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={side === 'back'}
            data-testid="side-back"
            className={side === 'back' ? 'active' : ''}
            onClick={() => onSideChange('back')}
          >
            背面
          </button>
        </div>
      </div>

      <div className="sheet-stage" data-side={side} data-testid="sheet-stage">
        <div className="page-box page-left" data-testid="page-left">
          <span className="page-label">左</span>
          <span className="page-number">{current.left}</span>
        </div>
        <div className="fold-line" aria-hidden="true">
          <span>折线 / 书脊</span>
        </div>
        <div className="page-box page-right" data-testid="page-right">
          <span className="page-label">右</span>
          <span className="page-number">{current.right}</span>
        </div>
      </div>

      <p className="formula-line" data-testid="formula-line">
        {side === 'front'
          ? `正面（左→右）：P−2i = ${current.left} ｜ 1+2i = ${current.right}`
          : `背面（左→右）：2+2i = ${current.left} ｜ P−1−2i = ${current.right}`}
      </p>

      <div className="stage-nav">
        <button type="button" data-testid="prev-sheet" onClick={onPrev}>
          ← 上一张（更靠外）
        </button>
        <span className="dim">一次突出一张纸</span>
        <button type="button" data-testid="next-sheet" onClick={onNext}>
          下一张（更靠内）→
        </button>
      </div>
    </section>
  );
}
