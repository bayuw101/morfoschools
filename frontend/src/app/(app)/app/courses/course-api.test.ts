import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchApi = vi.fn();
vi.mock("@/lib/api-client", () => ({ fetchApi }));

const api = await import("./course-api");

describe("course API adapter", () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it("sends create course payload to the collection endpoint", async () => {
    fetchApi.mockResolvedValueOnce({ id: "course-1" });

    await api.createCourseInApi({
      courseOfferingId: "offering-1",
      title: "Aljabar Dasar",
      description: "Materi awal",
      status: "draft",
    });

    expect(fetchApi).toHaveBeenCalledWith("/api/v1/courses", {
      method: "POST",
      body: JSON.stringify({
        courseOfferingId: "offering-1",
        title: "Aljabar Dasar",
        description: "Materi awal",
        status: "draft",
      }),
    });
  });

  it("uses item endpoints for update and delete", async () => {
    fetchApi.mockResolvedValue({ id: "course-1" });

    await api.updateCourseInApi("course-1", {
      courseOfferingId: "offering-1",
      title: "Aljabar Updated",
      description: "Materi updated",
      status: "published",
    });
    await api.deleteCourseInApi("course-1");

    expect(fetchApi).toHaveBeenNthCalledWith(1, "/api/v1/courses/course-1", {
      method: "PATCH",
      body: JSON.stringify({
        courseOfferingId: "offering-1",
        title: "Aljabar Updated",
        description: "Materi updated",
        status: "published",
      }),
    });
    expect(fetchApi).toHaveBeenNthCalledWith(2, "/api/v1/courses/course-1", {
      method: "DELETE",
    });
  });

  it("loads courses with modules and resources from real API endpoints", async () => {
    fetchApi
      .mockResolvedValueOnce({ data: [{ id: "course-1", courseOfferingId: "offering-1", title: "Aljabar", description: "Desc", status: "published", moduleCount: 1 }] })
      .mockResolvedValueOnce({ data: [{ id: "offering-1", subjectName: "Matematika", className: "10-A" }] })
      .mockResolvedValueOnce({ data: [{ courseOfferingId: "offering-1", teacherName: "Guru Matematika", status: "active" }] })
      .mockResolvedValueOnce({ data: [{ id: "module-1", courseId: "course-1", title: "Bab 1", position: 1, status: "published" }] })
      .mockResolvedValueOnce({ data: [{ id: "res-1", moduleId: "module-1", resourceType: "video", title: "Video Bab 1", externalUrl: "https://youtube.com/watch?v=abc", provider: "youtube", position: 1, status: "active" }] });

    const courses = await api.listCoursesFromApi();

    expect(fetchApi).toHaveBeenCalledWith("/api/v1/courses");
    expect(fetchApi).toHaveBeenCalledWith("/api/v1/courses/course-1/modules");
    expect(fetchApi).toHaveBeenCalledWith("/api/v1/course-modules/module-1/resources");
    expect(courses[0]).toMatchObject({
      id: "course-1",
      subjectGroup: "Matematika - 10-A",
      teacher: "Guru Matematika",
      modules: [{ id: "module-1", title: "Video Bab 1", type: "youtube_upload" }],
    });
  });
});
