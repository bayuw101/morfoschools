import { fetchApi } from "@/lib/api-client";
import type { SubjectGroupRecord, SubjectGroupStatus } from "./subject-group-domain";

type DataEnvelope<T> = { data: T };

export type ApiSubject = {
  id: string;
  code: string;
  name: string;
  groupName: string;
  status: string;
};

export type SubjectOption = {
  label: string;
  value: string;
};

export type ApiSubjectGroup = {
  id: string;
  subjectId: string;
  subjectName?: string;
  name: string;
  academicYear: string;
  term: string;
  status: string;
  memberCount?: number;
};

export type SubjectGroupPayload = {
  subjectId: string;
  name: string;
  academicYear: string;
  term: string;
};

export function mapApiSubjectGroup(group: ApiSubjectGroup): SubjectGroupRecord {
  const memberCount = Math.max(0, Number(group.memberCount ?? 0));

  return {
    id: group.id,
    name: group.name,
    subjectId: group.subjectId,
    subject: group.subjectName || `Subject ${group.subjectId}`,
    teacher: "Belum ditugaskan",
    academicYear: group.academicYear,
    term: group.term,
    status: normalizeStatus(group.status),
    studentIds: Array.from({ length: memberCount }, (_, index) => `${group.id}-member-${index}`),
  };
}

export function mapApiSubjectToOption(subject: ApiSubject): SubjectOption {
  return {
    label: subject.code ? `${subject.name} (${subject.code})` : subject.name,
    value: subject.id,
  };
}

export function normalizeStatus(status: string): SubjectGroupStatus {
  return status === "draft" ? "draft" : "active";
}

export async function listSubjectOptions() {
  const response = await fetchApi<DataEnvelope<ApiSubject[]>>("/api/v1/academic/subjects");
  return response.data.map(mapApiSubjectToOption);
}

export async function listSubjectGroups() {
  const response = await fetchApi<DataEnvelope<ApiSubjectGroup[]>>("/api/v1/academic/subject-groups");
  return response.data.map(mapApiSubjectGroup);
}

export async function createSubjectGroup(payload: SubjectGroupPayload) {
  const response = await fetchApi<ApiSubjectGroup>("/api/v1/academic/subject-groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapApiSubjectGroup(response);
}

export async function updateSubjectGroup(id: string, payload: SubjectGroupPayload) {
  const response = await fetchApi<ApiSubjectGroup>(`/api/v1/academic/subject-groups/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapApiSubjectGroup(response);
}

export async function deleteSubjectGroup(id: string) {
  await fetchApi<void>(`/api/v1/academic/subject-groups/${id}`, { method: "DELETE" });
}
