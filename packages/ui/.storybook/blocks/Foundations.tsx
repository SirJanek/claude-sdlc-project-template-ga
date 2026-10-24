import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { contrast, readVar, toHex, toRgb } from './color';

// Documentation helpers only (prompt rule 5: allowed in the Storybook folder, never exported from the package).
// Styles here use the semantic tokens through CSS variables so the pages obey the same rules as components.

const cell: CSSProperties = {
  padding: 'var(--space-inline) var(--space-stack)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  verticalAlign: 'top',
};
const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-base)',
  lineHeight: 'var(--text-base--line-height)',
  color: 'var(--foreground)',
};
const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' };

export function DocTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table style={table}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} style={{ ...cell, background: 'var(--muted)', fontWeight: 600 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Td({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <td style={{ ...cell, ...style }}>{children}</td>;
}

function useResolved(vars: string[]) {
  const [values, setValues] = useState<Record<string, { raw: string; hex: string }>>({});
  // The list comes from MDX props as a fresh array on every render; a string key keeps the effect stable.
  const key = vars.join('|');
  useEffect(() => {
    const next: Record<string, { raw: string; hex: string }> = {};
    for (const v of key.split('|')) {
      const raw = readVar(v);
      const rgb = toRgb(raw);
      next[v] = { raw, hex: rgb ? toHex(rgb) : '—' };
    }
    setValues(next);
  }, [key]);
  return values;
}

export interface ColorRole {
  token: string;
  role: string;
  source: string;
  useFor: string;
  notFor: string;
}

/** Colour roles with a live swatch, the resolved hex and the source reference of each token. */
export function ColorRoles({ roles }: { roles: ColorRole[] }) {
  const values = useResolved(roles.map((r) => r.token));
  return (
    <DocTable head={['Swatch', 'Token', 'Resolved', 'Role', 'Use for', 'Not for', 'Source']}>
      {roles.map((r) => (
        <tr key={r.token}>
          <Td>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 32,
                height: 32,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: `var(${r.token})`,
              }}
            />
          </Td>
          <Td style={mono}>{r.token}</Td>
          <Td style={mono}>
            {values[r.token]?.hex ?? '…'}
            <br />
            <span style={{ color: 'var(--muted-foreground)' }}>{values[r.token]?.raw}</span>
          </Td>
          <Td>{r.role}</Td>
          <Td>{r.useFor}</Td>
          <Td>{r.notFor}</Td>
          <Td style={mono}>{r.source}</Td>
        </tr>
      ))}
    </DocTable>
  );
}

export interface ContrastPair {
  fg: string;
  bg: string;
  label: string;
  kind: 'text' | 'large' | 'ui' | 'decorative';
}

const threshold = (kind: ContrastPair['kind']) => (kind === 'text' ? 4.5 : kind === 'decorative' ? 0 : 3);

/** Measured contrast of every text/background pair the system uses; failures are marked, not hidden. */
export function ContrastTable({ pairs }: { pairs: ContrastPair[] }) {
  const [rows, setRows] = useState<{ pair: ContrastPair; ratio: number | null }[]>([]);
  const key = JSON.stringify(pairs);
  useEffect(() => {
    const list = JSON.parse(key) as ContrastPair[];
    setRows(list.map((pair) => ({ pair, ratio: contrast(readVar(pair.fg), readVar(pair.bg)) })));
  }, [key]);
  return (
    <DocTable head={['Sample', 'Foreground', 'Background', 'Ratio', 'Needs', 'Result']}>
      {rows.map(({ pair, ratio }) => {
        const need = threshold(pair.kind);
        const ok = ratio !== null && (need === 0 || ratio >= need);
        return (
          <tr key={pair.label}>
            <Td>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius)',
                  color: `var(${pair.fg})`,
                  background: `var(${pair.bg})`,
                  border: '1px solid var(--border)',
                  fontSize: pair.kind === 'large' ? 'var(--text-2xl)' : 'var(--text-base)',
                  fontWeight: pair.kind === 'large' ? 700 : 400,
                }}
              >
                {pair.kind === 'ui' ? '■ ' : ''}
                {pair.label}
              </span>
            </Td>
            <Td style={mono}>{pair.fg}</Td>
            <Td style={mono}>{pair.bg}</Td>
            <Td style={mono}>{ratio === null ? '—' : ratio.toFixed(2) + ' : 1'}</Td>
            <Td>
              {need === 0
                ? 'decorative, no requirement'
                : `${need} : 1 (${pair.kind === 'ui' ? 'WCAG 1.4.11' : 'WCAG 1.4.3'})`}
            </Td>
            <Td style={{ fontWeight: 600 }}>{ratio === null ? 'not measured' : ok ? 'Pass' : 'FAIL'}</Td>
          </tr>
        );
      })}
    </DocTable>
  );
}

export interface TypeRole {
  role: string;
  size: string;
  weight: number;
  family: 'sans' | 'mono';
  sample: string;
  source: string;
  useFor: string;
}

/** Type roles rendered with the real tokens, not described. */
export function TypeScale({ roles }: { roles: TypeRole[] }) {
  return (
    <DocTable head={['Role', 'Sample', 'Tokens', 'Use for', 'Source']}>
      {roles.map((r) => (
        <tr key={r.role}>
          <Td>{r.role}</Td>
          <Td>
            <span
              style={{
                fontFamily: `var(--font-${r.family})`,
                fontSize: `var(${r.size})`,
                lineHeight: `var(${r.size}--line-height)`,
                fontWeight: r.weight,
              }}
            >
              {r.sample}
            </span>
          </Td>
          <Td style={mono}>
            {r.size} · {r.weight} · --font-{r.family}
          </Td>
          <Td>{r.useFor}</Td>
          <Td style={mono}>{r.source}</Td>
        </tr>
      ))}
    </DocTable>
  );
}

export interface SpaceRow {
  token: string;
  relation: string;
  example: string;
  source: string;
}

/** Spacing relations drawn at true size. */
export function SpaceScale({ rows }: { rows: SpaceRow[] }) {
  const values = useResolvedText(rows.map((r) => r.token));
  return (
    <DocTable head={['Token', 'Value', 'Relation', 'Example', 'Source']}>
      {rows.map((r) => (
        <tr key={r.token}>
          <Td style={mono}>{r.token}</Td>
          <Td>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                height: 12,
                width: `var(${r.token})`,
                background: 'var(--primary)',
                verticalAlign: 'middle',
                marginRight: 8,
              }}
            />
            <span style={mono}>{values[r.token]}</span>
          </Td>
          <Td>{r.relation}</Td>
          <Td>{r.example}</Td>
          <Td style={mono}>{r.source}</Td>
        </tr>
      ))}
    </DocTable>
  );
}

function useResolvedText(vars: string[]) {
  const [values, setValues] = useState<Record<string, string>>({});
  const key = vars.join('|');
  useEffect(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const next: Record<string, string> = {};
    for (const v of key.split('|')) {
      el.style.width = `var(${v})`;
      next[v] = getComputedStyle(el).width;
    }
    el.remove();
    setValues(next);
  }, [key]);
  return values;
}

/** One token value shown inline (e.g. --radius, --motion-fast). */
export function TokenValue({ token }: { token: string }) {
  const [v, setV] = useState('…');
  useEffect(() => setV(readVar(token) || '(unset)'), [token]);
  return (
    <code style={mono}>
      {token}: {v}
    </code>
  );
}

/** Shape samples: radius and border variants at true size. */
export function ShapeSamples() {
  const box = (style: CSSProperties, label: string) => (
    <div key={label} style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
      <div style={{ width: 96, height: 56, background: 'var(--card)', ...style }} />
      <span style={{ ...mono, color: 'var(--muted-foreground)' }}>{label}</span>
    </div>
  );
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-section)',
        flexWrap: 'wrap',
        padding: 'var(--space-panel)',
        background: 'var(--background)',
      }}
    >
      {box({ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }, 'radius-sm · border')}
      {box({ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }, 'radius · border')}
      {box({ borderRadius: 'var(--radius)', border: '1px solid var(--border-strong)' }, 'radius · border-strong')}
      {box(
        {
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border)',
          width: 120,
          height: 24,
          background: 'var(--status-success-bg)',
        },
        'radius-full · badge only',
      )}
      {box(
        { borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' },
        'shadow-card = none',
      )}
    </div>
  );
}

/** Motion sample honouring prefers-reduced-motion through the global stylesheet. */
export function MotionSample() {
  const [on, setOn] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 'var(--space-stack)', alignItems: 'center', padding: 'var(--space-panel)' }}>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)',
          padding: '8px 12px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-strong)',
          background: 'var(--card)',
          color: 'var(--foreground)',
          cursor: 'pointer',
        }}
      >
        Toggle
      </button>
      <div
        aria-hidden="true"
        style={{
          width: 24,
          height: 24,
          borderRadius: 'var(--radius)',
          background: on ? 'var(--primary)' : 'var(--muted)',
          transform: on ? 'translateX(48px)' : 'none',
          transition: 'transform var(--motion-fast) ease-out, background-color var(--motion-fast) ease-out',
        }}
      />
      <TokenValue token="--motion-fast" />
    </div>
  );
}

/** Icon sizes from lucide-react at the three sizes the system allows. */
export function IconSizes({
  icons,
}: {
  icons: { name: string; Icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }[];
}) {
  return (
    <DocTable head={['Icon', '16 px (inline, badges)', '20 px (buttons, fields)', '24 px (empty states, headers)']}>
      {icons.map(({ name, Icon }) => (
        <tr key={name}>
          <Td style={mono}>{name}</Td>
          <Td>
            <Icon size={16} aria-hidden />
          </Td>
          <Td>
            <Icon size={20} aria-hidden />
          </Td>
          <Td>
            <Icon size={24} aria-hidden />
          </Td>
        </tr>
      ))}
    </DocTable>
  );
}

/** Layout frame at a given width, so breakpoints can be seen instead of imagined. */
export function LayoutFrame({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div
      style={{
        width,
        maxWidth: '100%',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: 'var(--background)',
      }}
    >
      <div
        style={{
          ...mono,
          padding: '4px 8px',
          borderBottom: '1px solid var(--border)',
          color: 'var(--muted-foreground)',
        }}
      >
        {width} px
      </div>
      <div style={{ padding: 'var(--space-panel)' }}>{children}</div>
    </div>
  );
}
