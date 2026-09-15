import { useEffect, useMemo, useState } from 'react';
import {
  buildBook,
  checkIntegrity,
  validateDetailed,
  type IntegrityReport,
  type Sheet,
} from './lib/imposition';
import { HighlightSheet } from './components/HighlightSheet';
import { SheetSummary } from './components/SheetSummary';
import { IntegrityPanel } from './components/IntegrityPanel';
import { PrintLayout } from './components/PrintLayout';

type Side = 'front' | 'back';

interface ComputedBook {
  pages: number;
  sheets: Sheet[];
  integrity: IntegrityReport | null;
  fatal: string | null;
}

export default function App() {
  const [raw, setRaw] = useState('');
  const [selected, setSelected] = useState(0);
  const [side, setSide] = useState<Side>('front');

  const validation = useMemo(() => validateDetailed(raw), [raw]);

  const computed = useMemo<ComputedBook | null>(() => {
    if (validation.kind !== 'valid') return null;
    try {
      const sheets = buildBook(validation.pages);
      const integrity = checkIntegrity(validation.pages, sheets);
      return { pages: validation.pages, sheets, integrity, fatal: null };
    } catch (err) {
      // 真实计算抛错时绝不降级为固定结果。
      return {
        pages: validation.pages,
        sheets: [],
        integrity: null,
        fatal: err instanceof Error ? err.message : String(err),
      };
    }
  }, [validation]);

  const pages = computed?.pages ?? null;

  // 合法页数变化后回到最外张正面；非法时纸张区域已整体清空。
  useEffect(() => {
    setSelected(0);
    setSide('front');
  }, [pages]);

  useEffect(() => {
    if (computed && selected > computed.sheets.length - 1) {
      setSelected(0);
    }
  }, [computed, selected]);

  const isInvalid = validation.kind === 'invalid';
  const integrityOk = computed?.integrity?.ok === true;
  const internalError =
    validation.kind === 'valid' && computed !== null && !integrityOk;

  const activeSheet =
    computed && integrityOk ? computed.sheets[selected] ?? null : null;

  let status: 'IDLE' | 'INVALID' | 'PASS' | 'INTERNAL ERROR';
  if (validation.kind === 'idle') status = 'IDLE';
  else if (validation.kind === 'invalid') status = 'INVALID';
  else if (integrityOk) status = 'PASS';
  else status = 'INTERNAL ERROR';

  return (
    <div className="app">
      <main className="screen no-print">
        <header className="masthead">
          <h1>骑马钉拼版推演台</h1>
          <p className="subtitle">
            纯前端实时拼版 · 设备约定：观察者始终站在纸张同一侧，左右不镜像
          </p>
        </header>

        <section className="input-card" aria-labelledby="input-title">
          <h2 id="input-title">成品总页数 P</h2>
          <div className="input-row">
            <input
              id="pages-input"
              data-testid="pages-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="例如 8、16、32"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              aria-invalid={isInvalid || internalError}
              aria-describedby="status-badge status-hint"
            />
            <span
              id="status-badge"
              data-testid="status-badge"
              data-status={status.replaceAll(' ', '-')}
              className={`badge badge-${status.replaceAll(' ', '-').toLowerCase()}`}
              role="status"
            >
              {status}
            </span>
          </div>
          <p id="status-hint" data-testid="status-hint" className="status-hint">
            {validation.kind === 'idle' &&
              '只接受 4–64 之间、能被 4 整除的整数（每张对折纸出 4 个成品页）。'}
            {validation.kind === 'invalid' && (
              <span className="error-text">INVALID：{validation.reason}</span>
            )}
            {validation.kind === 'valid' && integrityOk && (
              <>
                PASS：共 {computed!.sheets.length} 张纸（P/4），页码 1…{computed!.pages}
                各出现一次，可照屏装版。
              </>
            )}
            {internalError && (
              <span className="error-text">
                INTERNAL ERROR：页码完整性检查未通过，已阻止输出可打印拼版。
                {computed!.fatal ? ` 计算异常：${computed!.fatal}` : ''}
              </span>
            )}
          </p>
        </section>

        {activeSheet && computed && computed.integrity && (
          <>
            <HighlightSheet
              sheet={activeSheet}
              side={side}
              total={computed.sheets.length}
              onSideChange={setSide}
              onPrev={() =>
                setSelected((value) => (value - 1 + computed.sheets.length) % computed.sheets.length)
              }
              onNext={() => setSelected((value) => (value + 1) % computed.sheets.length)}
            />
            <SheetSummary
              sheets={computed.sheets}
              selected={selected}
              onSelect={setSelected}
            />
          </>
        )}

        {computed && computed.integrity && (
          <IntegrityPanel pages={computed.pages} report={computed.integrity} />
        )}

        {(isInvalid || internalError) && (
          <section className="cleared-note" data-testid="sheets-cleared" aria-live="polite">
            全部纸张已清空，未生成任何拼版结果。
          </section>
        )}

        <footer className="conventions no-print">
          <h2>印刷约定</h2>
          <ul>
            <li>纸张按装订后由外到内编号 i = 0 … P/4−1。</li>
            <li>正面（从左至右）：P−2i ｜ 1+2i；背面（从左至右）：2+2i ｜ P−1−2i。</li>
            <li>正背面均按“站在纸张同一侧观察”的设备方向呈现，左右位置不镜像。</li>
            <li>仅当 1…P 每个页码恰好出现一次时显示 PASS，照屏装版；否则 INTERNAL ERROR 且不输出打印稿。</li>
          </ul>
        </footer>
      </main>

      {/* 打印稿：仅在完整性 PASS 时生成；打印样式保持纸张由外到内次序与左右分栏。 */}
      {computed && integrityOk && (
        <PrintLayout pages={computed.pages} sheets={computed.sheets} />
      )}
    </div>
  );
}
