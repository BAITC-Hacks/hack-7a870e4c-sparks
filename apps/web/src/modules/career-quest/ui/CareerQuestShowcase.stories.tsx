import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  CareerQuestShowcase,
  CareerTrajectory,
  HRMetrics,
  RecommendationCard,
  SkillGapCard,
} from "./CareerQuestShowcase";

const meta = {
  title: "Career Quest/UX Showcase",
  component: CareerQuestShowcase,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Визуальные примеры UX-системы Career Quest: спокойный корпоративный стиль, акцент на следующем шаге и объяснимом прогрессе.",
      },
    },
  },
} satisfies Meta<typeof CareerQuestShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmployeeDashboard: Story = {};

export const Recommendation: Story = {
  render: () => (
    <div className="min-h-screen bg-[#F6F8FB] p-8">
      <div className="mx-auto max-w-3xl">
        <RecommendationCard />
      </div>
    </div>
  ),
};

export const SkillGaps: Story = {
  render: () => (
    <div className="min-h-screen bg-[#F6F8FB] p-8">
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
        <SkillGapCard
          skill={{
            name: "System Design",
            current: 2,
            required: 4,
            critical: true,
          }}
        />
        <SkillGapCard
          skill={{ name: "Communication", current: 3, required: 4 }}
        />
        <SkillGapCard skill={{ name: "Mentoring", current: 1, required: 3 }} />
      </div>
    </div>
  ),
};

export const HRDashboardMetrics: Story = {
  render: () => (
    <div className="min-h-screen bg-[#F6F8FB] p-8">
      <div className="mx-auto max-w-5xl">
        <HRMetrics />
      </div>
    </div>
  ),
};

export const CareerPath: Story = {
  render: () => (
    <div className="min-h-screen bg-[#F6F8FB] p-8">
      <div className="mx-auto max-w-2xl">
        <CareerTrajectory />
      </div>
    </div>
  ),
};
