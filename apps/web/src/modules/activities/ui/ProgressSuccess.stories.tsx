import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressSuccess } from "./ProgressSuccess";

const meta = {
  title: "Career Quest/ProgressSuccess",
  component: ProgressSuccess,
  tags: ["autodocs"],
  args: { animated: true },
  argTypes: {
    animated: {
      control: "boolean",
      description:
        "Однократное подтверждение; reduced motion отключает движение.",
    },
    className: { control: false },
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Три сегмента собираются в кольцо, затем прорисовывается галочка. 1,5 секунды, без повторения. Для повтора используйте Remount component. Показывать после успешного API-ответа; already_completed=true не запускает новое подтверждение.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[min(420px,calc(100vw-32px))]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressSuccess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Animated: Story = { name: "Анимация" };
export const Static: Story = {
  name: "Статичная замена",
  args: { animated: false },
};
export const InContext: Story = {
  name: "Прогресс обновлён",
  render: (args) => (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <ProgressSuccess {...args} />
        <div>
          <h2 className="font-semibold">Прогресс обновлён</h2>
          <p className="text-sm text-muted-foreground">Активность завершена</p>
        </div>
      </div>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Анализ данных</dt>
          <dd>2 → 3</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Готовность к цели</dt>
          <dd>45% → 52%</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Демонстрационные значения Storybook. В продукте — данные ответа API.
      </p>
    </section>
  ),
};
export const AlreadyCompleted: Story = {
  name: "Уже завершено — без повторной анимации",
  args: { animated: false },
  render: (args) => (
    <div className="flex items-center gap-3">
      <ProgressSuccess {...args} animated={false} />
      <p>Активность уже завершена. Повторного прироста навыков нет.</p>
    </div>
  ),
};
