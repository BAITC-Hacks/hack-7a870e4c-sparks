import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/shared/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/shared/components/ui/empty";
import { ChooseGoal } from "./ChooseGoal";

const meta = {
  title: "Career Quest/ChooseGoal",
  component: ChooseGoal,
  tags: ["autodocs"],
  args: { animated: true },
  argTypes: {
    animated: {
      control: "boolean",
      description:
        "Проиграть один раз. Системный reduced motion имеет приоритет.",
    },
    className: { control: false },
  },
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Карьерный маршрут с двумя ответвлениями, тремя ориентирами и целью из двух дуг: 2 секунды, без повторения. Для повторного просмотра используйте Remount component в панели Storybook. При reduced motion показывается SVG.",
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
} satisfies Meta<typeof ChooseGoal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Animated: Story = { name: "Анимация" };
export const Static: Story = {
  name: "Статичная замена",
  args: { animated: false },
};

export const InContext: Story = {
  name: "Без карьерной цели",
  render: (args) => (
    <Empty className="border bg-card">
      <ChooseGoal {...args} />
      <EmptyHeader>
        <EmptyTitle>Укажите карьерную цель</EmptyTitle>
        <EmptyDescription>
          Выберите роль и грейд, к которым хотите двигаться.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          onClick={() => window.alert("Демо: переход к форме карьерной цели")}
        >
          Выбрать цель
        </Button>
      </EmptyContent>
    </Empty>
  ),
};
