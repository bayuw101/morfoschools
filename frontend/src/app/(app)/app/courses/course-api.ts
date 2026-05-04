import { fetchApi } from "@/lib/api-client";
import { mapBackendCourseToDirectory, mapBackendModuleToCourseModule, mapCourseOfferingToOption, type BackendCourse, type BackendCourseModule, type BackendCourseOffering, type BackendCourseResource, type BackendTeachingAssignment, type CourseDirectoryRecord, type CourseStatus } from "./course-domain";

type DataEnvelope<T> = { data: T };

export async function listCourseReferenceOptions() {
  const offeringsResponse = await fetchApi<DataEnvelope<BackendCourseOffering[]>>("/api/v1/academic/course-offerings");
  return {
    courseOfferings: offeringsResponse.data.map(mapCourseOfferingToOption),
  };
}

export async function listCoursesFromApi(): Promise<CourseDirectoryRecord[]> {
  const [coursesResponse, offeringsResponse, assignmentsResponse] = await Promise.all([
    fetchApi<DataEnvelope<BackendCourse[]>>("/api/v1/courses"),
    fetchApi<DataEnvelope<BackendCourseOffering[]>>("/api/v1/academic/course-offerings"),
    fetchApi<DataEnvelope<BackendTeachingAssignment[]>>("/api/v1/academic/teaching-assignments"),
  ]);

  const courseModules = await Promise.all(
    coursesResponse.data.map(async (course) => {
      const modulesResponse = await fetchApi<DataEnvelope<BackendCourseModule[]>>(
        `/api/v1/courses/${course.id}/modules`,
      );
      const modules = await Promise.all(
        modulesResponse.data.map(async (module) => {
          const resourcesResponse = await fetchApi<DataEnvelope<BackendCourseResource[]>>(
            `/api/v1/course-modules/${module.id}/resources`,
          );
          return mapBackendModuleToCourseModule(module, resourcesResponse.data);
        }),
      );
      return [course.id, modules] as const;
    }),
  );

  const modulesByCourseId = new Map(courseModules);
  return coursesResponse.data.map((course) =>
    mapBackendCourseToDirectory(
      course,
      modulesByCourseId.get(course.id) ?? [],
      offeringsResponse.data,
      assignmentsResponse.data,
    ),
  );
}

export type CourseWriteParams = {
  courseOfferingId: string;
  title: string;
  description: string;
  status: CourseStatus;
};

export async function createCourseInApi(params: CourseWriteParams) {
  return fetchApi<BackendCourse>("/api/v1/courses", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateCourseInApi(courseId: string, params: CourseWriteParams) {
  return fetchApi<BackendCourse>(`/api/v1/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}

export async function deleteCourseInApi(courseId: string) {
  return fetchApi<void>(`/api/v1/courses/${courseId}`, {
    method: "DELETE",
  });
}

export async function createModuleInApi(courseId: string, params: { title: string; position: number; status: string }) {
  return fetchApi<BackendCourseModule>(`/api/v1/courses/${courseId}/modules`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function createResourceInApi(moduleId: string, params: {
  title: string;
  resourceType: string;
  externalUrl: string;
  provider: string;
  position: number;
}) {
  return fetchApi<BackendCourseResource>(`/api/v1/course-modules/${moduleId}/resources`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}
