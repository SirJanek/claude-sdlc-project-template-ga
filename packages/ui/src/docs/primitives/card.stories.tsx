import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Narrow, StateMatrix } from '../../../.storybook/blocks/StateMatrix';

const meta = {
  title: 'Primitives/Card and panel',
  component: Card,
  args: { className: 'max-w-sm' },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Booking DM-4821</CardTitle>
        <CardDescription>Tuesday 3 November, 09:00–09:25 (Warsaw)</CardDescription>
      </CardHeader>
      <CardContent className="text-base">Why does my ingress return 404 after the Helm upgrade?</CardContent>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithActionAndFooter: Story = {
  name: 'With action and footer: booking summary',
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Marta Kowalczyk</CardTitle>
        <CardDescription>Platform engineer · Kubernetes, Helm, Terraform</CardDescription>
        <CardAction>
          <Badge variant="neutral">In catalogue</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-inline text-base">
          <dt className="text-muted-foreground">25 minutes</dt>
          <dd className="tabular-nums">45 USD</dd>
          <dt className="text-muted-foreground">50 minutes</dt>
          <dd className="tabular-nums">80 USD</dd>
          <dt className="text-muted-foreground">Earliest start</dt>
          <dd>Tue 3 Nov, 09:00</dd>
        </dl>
      </CardContent>
      <CardFooter>
        <Button>Book session</Button>
      </CardFooter>
    </Card>
  ),
};

export const GroupsInsideOneCard: Story = {
  name: 'Groups inside one card (lines, not nested cards)',
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Payouts</CardTitle>
        <CardDescription>Paid weekly after held sessions.</CardDescription>
      </CardHeader>
      <CardContent className="grid">
        {[
          ['Week of 26 Oct', '3 sessions', '171 USD'],
          ['Week of 19 Oct', '1 session', '45 USD'],
        ].map(([w, n, a]) => (
          <div key={w} className="flex h-control items-center justify-between border-t border-border text-base">
            <span>{w}</span>
            <span className="text-muted-foreground">{n}</span>
            <span className="tabular-nums">{a}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  ),
};

export const StateMatrixStory: Story = {
  name: 'State matrix',
  render: () => (
    <StateMatrix
      caption="A card is not interactive: no hover, focus, pressed or selected state. Data states belong to product components (stage 3)."
      columns={['Title only', 'Title + description', 'With action']}
      rows={[
        {
          label: 'Default',
          cells: [
            <Card key="a">
              <CardHeader>
                <CardTitle as="h3">Database</CardTitle>
              </CardHeader>
            </Card>,
            <Card key="b">
              <CardHeader>
                <CardTitle as="h3">Database</CardTitle>
                <CardDescription>Whether the app can reach PostgreSQL.</CardDescription>
              </CardHeader>
            </Card>,
            <Card key="c">
              <CardHeader>
                <CardTitle as="h3">Database</CardTitle>
                <CardDescription>Whether the app can reach PostgreSQL.</CardDescription>
                <CardAction>
                  <Badge variant="success">Connected</Badge>
                </CardAction>
              </CardHeader>
            </Card>,
          ],
        },
      ]}
    />
  ),
};

export const LongTextNarrowScreen: Story = {
  name: 'Long text and narrow screen (320 px)',
  render: () => (
    <Narrow>
      <Card>
        <CardHeader>
          <CardTitle>Question from Tomasz Nowak about a failing GitHub Actions cache</CardTitle>
          <CardDescription>Wednesday 4 November, 18:30–19:20 (Warsaw) · 50 minutes</CardDescription>
          <CardAction>
            <Badge variant="warning">Awaiting payment</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="text-base wrap-break-word">
          The cache key uses <code>hashFiles(&apos;**/pnpm-lock.yaml&apos;)</code> but every run misses it.
        </CardContent>
      </Card>
    </Narrow>
  ),
};

export const NoShadowNoNesting: Story = {
  name: 'Check: line, no shadow, 16 px padding',
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-slot="card"]') as HTMLElement;
    const s = getComputedStyle(card);
    await expect(s.boxShadow).toBe('none');
    await expect(s.paddingTop).toBe('16px');
    await expect(s.borderTopRightRadius).toBe('6px');
    await expect(within(card).getByRole('heading', { level: 2, name: 'Booking DM-4821' })).toBeVisible();
    await expect(card.querySelector('[data-slot="card"]')).toBeNull();
  },
};
