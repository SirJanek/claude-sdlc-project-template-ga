import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Shell } from './Shell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { EmptyState } from '../../backend/feedback/EmptyState';

// E05 First-release measures (D10, Q01: thresholds not set). PROPOSED screen; numbers are placeholders for the layout.
const meta = { title: 'Design system/Epics/E05 First-release measures', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Measures({ empty }: { empty?: boolean }) {
  return (
    <Shell role="admin" current="Measures">
      <h1 className="text-2xl font-semibold">Measures</h1>
      <div className="grid w-field-sm gap-inline">
        <label id="period" className="font-medium">Period</label>
        <Select defaultValue="oct"><SelectTrigger aria-labelledby="period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="oct">October 2026</SelectItem><SelectItem value="sep">September 2026</SelectItem></SelectContent></Select>
      </div>
      {empty ? <EmptyState title="No data for October 2026" description="No mentor has published slots in this period yet." /> : (
        <Table>
          <TableHeader><TableRow><TableHead>Measure (D10)</TableHead><TableHead className="text-right">Count</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>Mentors with published slots</TableCell><TableCell className="text-right tabular-nums">3</TableCell></TableRow>
            <TableRow><TableCell>Mentors with a first booking</TableCell><TableCell className="text-right tabular-nums">1</TableCell></TableRow>
            <TableRow><TableCell>Paid sessions held</TableCell><TableCell className="text-right tabular-nums">2</TableCell></TableRow>
          </TableBody>
        </Table>
      )}
    </Shell>
  );
}
export const Default: Story = { name: 'Admin · measures for a period', render: () => <Measures /> };
export const Empty: Story = { name: 'Admin · measures — no data', render: () => <Measures empty /> };
