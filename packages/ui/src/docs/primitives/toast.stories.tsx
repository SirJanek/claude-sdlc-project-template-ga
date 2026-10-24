import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from '../../components/ui/button';
import { Toast, ToastProvider, ToastViewport, useSavedToast } from '../../components/ui/toast';
import { Toast as ToastPrimitive } from 'radix-ui';

const meta = { title: 'Primitives/Toast', component: ToastProvider, args: { children: null } } satisfies Meta<typeof ToastProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

function SaveButton() {
  const showSaved = useSavedToast();
  return <Button onClick={() => showSaved('Availability saved')}>Save availability</Button>;
}

export const OnSave: Story = { name: 'After saving', render: () => <ToastProvider><SaveButton /></ToastProvider> };
export const Visible: Story = {
  render: () => (
    <ToastPrimitive.Provider duration={1000000}>
      <Toast>Profile saved</Toast>
      <ToastViewport />
    </ToastPrimitive.Provider>
  ),
};
