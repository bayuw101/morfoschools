export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "invited";

export type UserDirectoryItem = {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastSeen: string;
};

export type UserMetrics = {
  total: number;
  active: number;
  invited: number;
  admins: number;
  teachers: number;
  students: number;
  tenants: number;
};

export type TenantOption = {
  label: string;
  value: string;
};

export type UserFormDefaults = {
  name: string;
  email: string;
  tenantId: string;
  role: UserRole;
};

export function getRoleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "teacher") return "Guru";
  return "Murid";
}

export function getDefaultUserFormValues(tenantOptions: TenantOption[]): UserFormDefaults {
  return {
    name: "",
    email: "",
    tenantId: tenantOptions[0]?.value ?? "",
    role: "teacher",
  };
}

export function filterUsers(users: UserDirectoryItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) => {
    const searchableText = [
      user.name,
      user.email,
      user.tenantName,
      user.role,
      getRoleLabel(user.role),
      user.status,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export function calculateUserMetrics(users: UserDirectoryItem[]): UserMetrics {
  return {
    total: users.length,
    active: users.filter((user) => user.status === "active").length,
    invited: users.filter((user) => user.status === "invited").length,
    admins: users.filter((user) => user.role === "admin").length,
    teachers: users.filter((user) => user.role === "teacher").length,
    students: users.filter((user) => user.role === "student").length,
    tenants: new Set(users.map((user) => user.tenantId)).size,
  };
}
