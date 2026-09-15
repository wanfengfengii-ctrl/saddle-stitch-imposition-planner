import type { IntegrityReport } from '../lib/imposition';

interface Props {
  pages: number;
  report: IntegrityReport;
}

function formatPages(values: number[]): string {
  return values.length === 0 ? '无' : values.join(', ');
}

export function IntegrityPanel({ pages, report }: Props) {
  return (
    <section
      className={`integrity-card ${report.ok ? 'ok' : 'bad'}`}
      aria-labelledby="integrity-title"
      data-testid="integrity-panel"
      data-ok={String(report.ok)}
    >
      <h2 id="integrity-title">
        页码完整性检查{' '}
        <span className="badge" data-testid="integrity-badge">
          {report.ok ? 'PASS' : 'INTERNAL ERROR'}
        </span>
      </h2>
      <ul className="integrity-detail" data-testid="integrity-detail">
        <li>槽位总数：{report.slotCount}（应为 {pages} = {pages / 4} 张 × 4）</li>
        <li>缺失页码：{formatPages(report.missing)}</li>
        <li>重复页码：{formatPages(report.duplicates)}</li>
        <li>越界页码（不在 1…{pages}）：{formatPages(report.outOfRange)}</li>
      </ul>
      <p className="integrity-rule">
        规则：1…{pages} 每个页码恰好出现一次才显示 PASS；失败时不输出可打印拼版。
      </p>
    </section>
  );
}
