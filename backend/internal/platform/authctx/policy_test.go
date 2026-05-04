package authctx

import "testing"

func TestCanAllowsRolePermissions(t *testing.T) {
	cases := []struct {
		role string
		perm Permission
		want bool
	}{
		{"owner", ManageTenants, true},
		{"admin", ManageTenants, false},
		{"admin", ManageUsers, true},
		{"teacher", ManageUsers, false},
		{"student", ManageClasses, false},
		{"owner", ManageSubjectGroups, true},
		{"admin", ManageSubjectGroups, true},
		{"owner", ManageCourses, true},
		{"admin", ManageCourses, true},
		{"teacher", ManageCourses, true},
		{"student", ManageCourses, false},
		{"owner", ManageExams, true},
		{"admin", ManageExams, true},
		{"teacher", ManageExams, true},
		{"student", ManageExams, false},
		{"owner", TakeExams, false},
		{"student", TakeExams, true},
		{"teacher", ViewExamResults, true},
		{"student", ViewExamResults, true},
	}
	for _, tt := range cases {
		if got := Can(tt.role, tt.perm); got != tt.want {
			t.Fatalf("Can(%q,%q)=%v want %v", tt.role, tt.perm, got, tt.want)
		}
	}
}
