import { describe, expect, it } from "vitest";
import {
  calculateCourseMonitoringMetrics,
  filterCourseHealth,
  filterStudentActivities,
  getCourseRiskAlert,
  type CourseHealthRecord,
  type StudentActivityRecord,
} from "./course-monitoring-domain";

const health: CourseHealthRecord[] = [
  { title: "Aljabar Linear Dasar", audience: "10-A + Matematika X - Pagi", teacher: "Guru Matematika", students: 38, viewed: 34, downloaded: 21, completed: 26, videoWatch: 78, lastActivity: "5 menit lalu", risk: "low" },
  { title: "Kinematika Olimpiade", audience: "11-B, 12-C + Olimpiade Fisika", teacher: "Guru Fisika", students: 24, viewed: 17, downloaded: 9, completed: 8, videoWatch: 46, lastActivity: "28 menit lalu", risk: "medium" },
];

const activities: StudentActivityRecord[] = [
  { name: "Alya Putri", classSection: "10-A", course: "Aljabar Linear Dasar", status: "completed", video: "92% watched", downloads: "2 files", lastSeen: "Baru saja" },
  { name: "Citra Maharani", classSection: "11-B", course: "Kinematika Olimpiade", status: "blocked", video: "0% watched", downloads: "0 files", lastSeen: "Belum aktif" },
];

describe("course monitoring domain", () => {
  it("calculates engagement completion and at-risk metrics", () => {
    expect(calculateCourseMonitoringMetrics(health, 152)).toEqual({
      totalStudents: 62,
      totalViewed: 51,
      totalDownloaded: 30,
      totalCompleted: 34,
      viewRate: 82,
      completionRate: 55,
      atRisk: 1,
      trackedEvents: 152,
    });
  });

  it("maps course risk to alert label and tone", () => {
    expect(getCourseRiskAlert("low")).toEqual({ label: "Healthy", tone: "success" });
    expect(getCourseRiskAlert("medium")).toEqual({ label: "Needs follow-up", tone: "warning" });
    expect(getCourseRiskAlert("high")).toEqual({ label: "At risk", tone: "danger" });
  });

  it("filters course health rows by course audience teacher and risk", () => {
    expect(filterCourseHealth(health, "fisika").map((item) => item.title)).toEqual(["Kinematika Olimpiade"]);
    expect(filterCourseHealth(health, "10-a").map((item) => item.title)).toEqual(["Aljabar Linear Dasar"]);
    expect(filterCourseHealth(health, "medium").map((item) => item.title)).toEqual(["Kinematika Olimpiade"]);
  });

  it("filters student activity rows by student class course and status", () => {
    expect(filterStudentActivities(activities, "citra").map((item) => item.name)).toEqual(["Citra Maharani"]);
    expect(filterStudentActivities(activities, "completed").map((item) => item.name)).toEqual(["Alya Putri"]);
    expect(filterStudentActivities(activities, "11-b").map((item) => item.name)).toEqual(["Citra Maharani"]);
  });
});
