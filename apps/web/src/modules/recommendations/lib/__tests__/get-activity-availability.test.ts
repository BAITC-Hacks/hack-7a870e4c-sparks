import { describe, expect, it } from "vitest";

import type { ProfileData } from "@/modules/career-profile";

import type { Recommendation } from "../../model/mappers/recommendations.mapper";
import { getActivityAvailability } from "../get-activity-availability";

const asOfDate = "2026-10-01";

function recommendation(): Recommendation {
  return {
    event: {
      event_id: "event-1",
      title: "Курс",
      description: "Практика",
      type: "course",
      format: "online",
      duration_hours: 2,
      mandatory: false,
      target_roles: ["Engineer"],
      target_grades: ["Junior"],
      develops_skills: [{ skill_id: "skill-1", gain: 1, max_level: 3 }],
      prerequisites: { "skill-1": 1 },
      upcoming_sessions: [asOfDate],
    },
    score: 1,
    factors: [],
    next_session: asOfDate,
    gains: [],
    in_progress: false,
    explanation: "Закрывает дефицит навыка.",
  };
}

function profile(): ProfileData {
  return {
    employee: {
      employee_id: "employee-1",
      full_name: "Сотрудник",
      department: "IT",
      role: "Engineer",
      grade: "Junior",
      manager_id: null,
      hire_date: "2025-01-01",
      tenure_months: 21,
      work_format: "office",
      preferred_language: "ru",
      career_goal: null,
      skills: { "skill-1": 0 },
      last_review_date: "2026-09-01",
    },
    effective_skills: { "skill-1": 1 },
    target: { target_role: "Engineer", target_grade: "Middle" },
    target_source: "next_grade",
    readiness: 50,
    gaps: [],
    history: [],
    warnings: [],
  };
}

function completion(eventId: string): ProfileData["history"][number] {
  return {
    record_id: "record-1",
    employee_id: "employee-1",
    event_id: eventId,
    date: "2026-09-01",
    due_date: null,
    status: "completed",
    completion_pct: 100,
    score: null,
    feedback_rating: null,
    assigned_by: "self",
    title: "Курс",
    mandatory: false,
  };
}

describe("getActivityAvailability", () => {
  it("uses effective skills and the API calculation date, including a session on that date", () => {
    expect(
      getActivityAvailability(recommendation(), profile(), asOfDate),
    ).toEqual([]);
    const activity = recommendation();
    activity.event.upcoming_sessions = ["2026-09-30"];
    expect(getActivityAvailability(activity, profile(), asOfDate)).toEqual([
      "session",
    ]);
    activity.event.format = "self_paced";
    expect(getActivityAvailability(activity, profile(), asOfDate)).toEqual([]);
  });

  it("uses the actual role and grade, and blocks mandatory or completed activities", () => {
    const activity = recommendation();
    activity.event.mandatory = true;
    activity.event.target_grades = ["Middle"];
    const data = profile();
    data.history = [completion(activity.event.event_id)];
    expect(getActivityAvailability(activity, data, asOfDate)).toEqual([
      "mandatory",
      "audience",
      "completed",
    ]);
  });

  it.each([undefined, "5", Number.NaN, Number.POSITIVE_INFINITY, null, 0])(
    "does not satisfy a prerequisite using %s as the current skill",
    (current) => {
      const data = profile();
      data.effective_skills["skill-1"] = current;
      expect(getActivityAvailability(recommendation(), data, asOfDate)).toEqual(
        ["prerequisites"],
      );
    },
  );

  it("treats a missing skill as zero", () => {
    const activity = recommendation();
    activity.event.prerequisites = { "missing-skill": 0 };
    expect(getActivityAvailability(activity, profile(), asOfDate)).toEqual([]);
  });

  it("allows EV_036 repeats from a prior date and blocks a repeat on the API calculation date", () => {
    const activity = recommendation();
    activity.event.event_id = "EV_036";
    const data = profile();
    const record = completion("EV_036");
    data.history = [record];
    expect(getActivityAvailability(activity, data, asOfDate)).toEqual([]);

    record.completed_at = `${asOfDate}T12:00:00.000Z`;
    expect(getActivityAvailability(activity, data, asOfDate)).toEqual([
      "completed",
    ]);

    record.completed_at = null;
    record.date = asOfDate;
    expect(getActivityAvailability(activity, data, asOfDate)).toEqual([
      "completed",
    ]);

    // The completion endpoint treats either date as a same-day completion,
    // even when imported history has a different explicit timestamp.
    record.completed_at = "2026-09-30T12:00:00.000Z";
    expect(getActivityAvailability(activity, data, asOfDate)).toEqual([
      "completed",
    ]);
  });
});
