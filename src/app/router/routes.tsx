import { Authenticated, CanAccess } from "@refinedev/core";
import { Navigate, Outlet, Route, Routes } from "react-router";

import {
  BlogPostList,
  BlogPostCreate,
  BlogPostEdit,
  BlogPostShow,
} from "@/features/blog-posts";
import {
  CategoryList,
  CategoryCreate,
  CategoryEdit,
  CategoryShow,
} from "@/features/categories";
import { Dashboard } from "@/features/dashboard";
import { TaskList, TaskCreate, TaskEdit, TaskShow } from "@/features/tasks";
import {
  OrganizationList,
  OrganizationCreate,
  OrganizationEdit,
  OrganizationShow,
} from "@/features/organizations";
import {
  DepartmentList,
  DepartmentCreate,
  DepartmentEdit,
  DepartmentShow,
} from "@/features/departments";
import { NotificationList } from "@/features/notifications";
import {
  UserList,
  UserCreate,
  UserEdit,
  UserShow,
  RoleList,
  RoleCreate,
  RoleEdit,
  RoleShow,
  PermissionList,
  PermissionShow,
  RowLevelPolicyList,
  RowLevelPolicyCreate,
  RowLevelPolicyEdit,
  RowLevelPolicyShow,
} from "@/features/administration";
import { Login, Profile, Register } from "@/features/identity";
import {
  AppointmentCreate,
  AppointmentList,
  AppointmentShow,
  ClinicList,
  ClinicShow,
  CustomerEdit,
  CustomerList,
  CustomerShow,
  MyAppointmentCreate,
  MyAppointmentList,
  MyAppointmentShow,
  QuickCheckIn,
} from "@/features/clinic";
import { ErrorComponent } from "@/shared/components/layout/error-component";
import { Forbidden } from "@/shared/components/layout/forbidden";
import { Layout } from "@/shared/components/layout/layout";

/**
 * Route tree rendered inside `<Refine>`. Every path here must line up with the
 * action routes declared in `app/resources/index.tsx`.
 *
 * The tree has two halves. Everything under `<Authenticated>` requires a
 * session and renders inside the shell; the login screen sits outside it and
 * renders bare. `<Authenticated>` calls the auth provider's `check`, which is
 * what turns an expired access token into a silent refresh rather than a
 * bounce to the login form.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <Authenticated key="authenticated-routes" redirectOnFail="/login">
            <Layout>
              <Outlet />
            </Layout>
          </Authenticated>
        }
      >
        {/*
          The application opens on the dashboard rather than on a resource's
          table. `Navigate` rather than `NavigateToResource`, because the
          dashboard is a screen and not a resource: there is no `list` action to
          resolve a path from beyond the one declared above.
        */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/*
          Blog posts render their create / edit / show / clone actions as
          dialogs on top of the list. Nesting them under the list route keeps
          `<BlogPostList />` mounted (and its filters, sorting and pagination
          intact) while `<Outlet />` inside it renders the open dialog. The URLs
          are unchanged, so the list action buttons and deep links still work.
        */}
        <Route path="/blog-posts" element={<BlogPostList />}>
          <Route path="create" element={<BlogPostCreate />} />
          <Route path="edit/:id" element={<BlogPostEdit />} />
          <Route path="show/:id" element={<BlogPostShow />} />
          <Route path="clone/:id" element={<BlogPostCreate />} />
        </Route>
        <Route path="/categories">
          <Route index element={<CategoryList />} />
          <Route path="create" element={<CategoryCreate />} />
          <Route path="edit/:id" element={<CategoryEdit />} />
          <Route path="show/:id" element={<CategoryShow />} />
          <Route path="clone/:id" element={<CategoryCreate />} />
        </Route>

        {/*
          Tasks — plain full-page routes, guarded like the rest. Not a dialog
          pattern despite being the busiest screen here: a task's description is
          long-form and its edit form carries two lookups, which is more than a
          dialog over a list has room for.
        */}
        <Route
          path="/tasks"
          element={
            <CanAccess
              resource="tasks"
              action="list"
              fallback={<Forbidden resource="tasks" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<TaskList />} />
          <Route path="create" element={<TaskCreate />} />
          <Route path="edit/:id" element={<TaskEdit />} />
          <Route path="show/:id" element={<TaskShow />} />
        </Route>

        {/*
          Organization structure — plain full-page routes, like categories, and
          guarded like the administration ones below: the sidebar hides them,
          but a typed or bookmarked URL would otherwise render a screen whose
          list request 403s.
        */}
        <Route
          path="/organizations"
          element={
            <CanAccess
              resource="organizations"
              action="list"
              fallback={<Forbidden resource="organizations" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<OrganizationList />} />
          <Route path="create" element={<OrganizationCreate />} />
          <Route path="edit/:id" element={<OrganizationEdit />} />
          <Route path="show/:id" element={<OrganizationShow />} />
        </Route>
        <Route
          path="/departments"
          element={
            <CanAccess
              resource="departments"
              action="list"
              fallback={<Forbidden resource="departments" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<DepartmentList />} />
          <Route path="create" element={<DepartmentCreate />} />
          <Route path="edit/:id" element={<DepartmentEdit />} />
          <Route path="show/:id" element={<DepartmentShow />} />
        </Route>

        {/*
          Administration — plain full-page routes, like categories, each wrapped
          in `<CanAccess>`. The sidebar already hides these, so the guard only
          matters for a typed or bookmarked URL: without it the screen would
          render and the list request would 403, leaving an empty table and a
          toast instead of an explanation.

          This is a courtesy, not the boundary. The API checks the same
          permission on every request regardless of what renders here.
        */}
        <Route
          path="/users"
          element={
            <CanAccess
              resource="users"
              action="list"
              fallback={<Forbidden resource="users" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<UserList />} />
          <Route path="create" element={<UserCreate />} />
          <Route path="edit/:id" element={<UserEdit />} />
          <Route path="show/:id" element={<UserShow />} />
        </Route>
        <Route
          path="/roles"
          element={
            <CanAccess
              resource="roles"
              action="list"
              fallback={<Forbidden resource="roles" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<RoleList />} />
          <Route path="create" element={<RoleCreate />} />
          <Route path="edit/:id" element={<RoleEdit />} />
          <Route path="show/:id" element={<RoleShow />} />
        </Route>
        <Route
          path="/row-level-policies"
          element={
            <CanAccess
              resource="row_level_policies"
              action="list"
              fallback={<Forbidden resource="row_level_policies" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<RowLevelPolicyList />} />
          <Route path="create" element={<RowLevelPolicyCreate />} />
          <Route path="edit/:id" element={<RowLevelPolicyEdit />} />
          <Route path="show/:id" element={<RowLevelPolicyShow />} />
        </Route>
        <Route
          path="/permissions"
          element={
            <CanAccess
              resource="permissions"
              action="list"
              fallback={<Forbidden resource="permissions" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<PermissionList />} />
          <Route path="show/:id" element={<PermissionShow />} />
        </Route>

        {/*
          The clinic. Guarded like the administration routes: the sidebar hides
          what an account may not open, and these stop a typed URL rendering a
          screen whose first request would 403.
        */}
        <Route
          path="/appointments"
          element={
            <CanAccess
              resource="appointments"
              action="list"
              fallback={<Forbidden resource="appointments" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<AppointmentList />} />
          <Route path="create" element={<AppointmentCreate />} />
          <Route path="show/:id" element={<AppointmentShow />} />
          <Route
            path="check-in"
            element={
              <CanAccess
                resource="appointments"
                action="check_in"
                fallback={<Forbidden resource="appointments" />}
              >
                <QuickCheckIn />
              </CanAccess>
            }
          />
        </Route>
        <Route
          path="/clinics"
          element={
            <CanAccess
              resource="clinics"
              action="list"
              fallback={<Forbidden resource="clinics" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<ClinicList />} />
          <Route path="show/:id" element={<ClinicShow />} />
        </Route>
        <Route
          path="/customers"
          element={
            <CanAccess
              resource="customers"
              action="list"
              fallback={<Forbidden resource="customers" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<CustomerList />} />
          <Route path="edit/:id" element={<CustomerEdit />} />
          <Route path="show/:id" element={<CustomerShow />} />
        </Route>
        <Route
          path="/my-appointments"
          element={
            <CanAccess
              resource="my_appointments"
              action="list"
              fallback={<Forbidden resource="my_appointments" />}
            >
              <Outlet />
            </CanAccess>
          }
        >
          <Route index element={<MyAppointmentList />} />
          <Route path="create" element={<MyAppointmentCreate />} />
          <Route path="show/:id" element={<MyAppointmentShow />} />
        </Route>

        {/*
          Notifications have a list and nothing else. No create screen, because
          the application raises a notification rather than a person writing
          one; no edit screen, because the only change a recipient may make is
          marking one read. No <CanAccess> wrapper either: every system role is
          granted notifications:read, and the rows are the caller's own, so
          there is no URL to guard against.
        */}
        <Route path="/notifications" element={<NotificationList />} />

        {/* Not a resource: no list of "my accounts", no id in the URL. */}
        <Route path="/profile" element={<Profile />} />

        <Route path="*" element={<ErrorComponent />} />
      </Route>

      {/*
        The unauthenticated half. `fallback` is what renders when there is no
        session; a signed-in visitor is sent to the dashboard instead, so the
        login and registration URLs never show a form to someone who is already
        past it.
      */}
      <Route
        element={
          <Authenticated key="unauthenticated-routes" fallback={<Outlet />}>
            <Navigate to="/" replace />
          </Authenticated>
        }
      >
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
    </Routes>
  );
}
