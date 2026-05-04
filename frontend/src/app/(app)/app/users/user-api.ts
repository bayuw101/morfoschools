import { fetchApi } from "@/lib/api-client";

export async function updatePasswordInApi(userId: string, payload: any) {
  return fetchApi(`/api/v1/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
