import { fetchApi } from "@/lib/api-client";
import { type StudentDomainRecord } from "./student-domain";

export interface ApiStudent {
  id: string;
  userId?: string;
  nisn: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "graduated";
  guardianName: string;
  guardianPhone: string;
  classSectionId?: string;
  classSection?: string;
}

export interface StudentPayload {
  nisn: string;
  name: string;
  email: string;
  status: string;
  guardianName: string;
  guardianPhone: string;
  classSectionId: string;
}

export async function listStudents(): Promise<ApiStudent[]> {
  const res = await fetchApi<{ data: ApiStudent[] }>("/api/v1/students");
  return res.data || [];
}

export async function createStudent(payload: StudentPayload): Promise<ApiStudent> {
  return fetchApi<ApiStudent>("/api/v1/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStudent(id: string, payload: StudentPayload): Promise<ApiStudent> {
  return fetchApi<ApiStudent>(`/api/v1/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await fetchApi(`/api/v1/students/${id}`, {
    method: "DELETE",
  });
}

export interface ClassOption {
  label: string;
  value: string;
}

export async function listClassOptions(): Promise<ClassOption[]> {
  const res = await fetchApi<{ data: { id: string; name: string }[] }>("/api/v1/classes");
  return (res.data || []).map((c) => ({
    label: c.name,
    value: c.id,
  }));
}
