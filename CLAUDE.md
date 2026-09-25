# FRONTEND ARCHITECTURE RULES

## 1. Mục tiêu

Frontend sử dụng:

```text
React
TypeScript
Vite
```

Kiến trúc:

```text
Domain / Feature First
Technology Second
```

Mục tiêu:

```text
Clear Feature Boundaries
Predictable State
Minimal Re-render
Minimal Network Traffic
Reusable UI
Easy Maintenance
Safe Input Handling
```

---

# PROJECT STRUCTURE

## 2. Domain First

Không tổ chức app lớn thành:

```text
components/
pages/
services/
hooks/
stores/
types/
```

với toàn bộ business trộn chung.

Ưu tiên:

```text
modules/
├── patient/
├── appointment/
├── billing/
├── inventory/
└── reporting/
```

---

## 3. Cấu trúc tổng

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   ├── query/
│   └── store/
│
├── modules/
│   ├── patient/
│   ├── appointment/
│   ├── billing/
│   └── reporting/
│
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types/
│
└── main.tsx
```

---

## 4. Feature Structure

Ví dụ:

```text
patient/
├── api/
├── components/
├── hooks/
├── pages/
├── queries/
├── schemas/
├── store/
└── types/
```

Domain nhỏ không bắt buộc có tất cả folder.

---

## 5. Mirror Backend Domain

Khi hợp lý:

```text
Frontend             Backend

patient      ←→      patient
appointment  ←→      appointment
billing      ←→      billing
reporting    ←→      reporting
```

---

# FUNCTION DESIGN

## 6. Một function - Một nhiệm vụ

Function frontend cũng tuân thủ:

```text
Explicit Input
      ↓
One Responsibility
      ↓
Explicit Output
```

Không viết function vừa:

```text
fetch
transform
update store
show notification
redirect
validate
```

nếu có thể tách trách nhiệm rõ ràng hơn.

---

## 7. Pure Function khi phù hợp

Logic transform/calculation nên ưu tiên pure function.

Ví dụ:

```ts
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((total, item) => total + item.total, 0)
}
```

Cùng input nên cho cùng output nếu business logic cho phép.

---

## 8. Không mutate dữ liệu ngoài ý muốn

Ưu tiên immutable updates.

Không thay đổi object từ query cache hoặc props trực tiếp.

---

# EARLY RETURN

## 9. Guard Clause

Component/function nên loại invalid state sớm.

Ví dụ:

```tsx
if (isLoading) {
  return <LoadingState />
}

if (isError) {
  return <ErrorState />
}

if (!patient) {
  return <EmptyState />
}

return <PatientDetail patient={patient} />
```

Ưu tiên hơn deep nested conditional.

---

## 10. Happy Path phẳng

Component chính nên đọc theo:

```text
Guard States
    ↓
Prepare Data
    ↓
Render Happy Path
```

Không nhét quá nhiều ternary lồng nhau.

---

# STATE MANAGEMENT

## 11. Stack mặc định

```text
TanStack Query
+
Zustand
+
React Hook Form
+
Zod
+
React Local State
+
React Router Search Params
```

Không dùng Redux mặc định.

---

## 12. Phân loại State

```text
Server State
→ TanStack Query

Global Client State
→ Zustand

Feature Client State
→ Zustand / useReducer

Local UI State
→ useState

Form State
→ React Hook Form

Validation
→ Zod

URL State
→ React Router Search Params
```

---

## 13. Server State

Dữ liệu từ backend:

```text
Patient
Appointment
Invoice
Report
User
Inventory
```

phải ưu tiên TanStack Query.

Không cache lại server data bằng Zustand.

---

## 14. Backend Data != Zustand

Hard rule:

```text
Backend Data
≠
Zustand State
```

Ví dụ không lưu:

```text
patients[]
appointments[]
invoices[]
```

vào global Zustand chỉ vì nhiều component cần chúng.

---

## 15. Query chia theo Domain

```text
patient/
├── api/
│   └── patient.api.ts
└── queries/
    ├── patient.keys.ts
    ├── use-patient.ts
    ├── use-patients.ts
    └── use-update-patient.ts
```

---

## 16. Query Key có cấu trúc

```ts
export const patientKeys = {
  all: ['patients'] as const,

  lists: () =>
    [...patientKeys.all, 'list'] as const,

  list: (params: PatientSearchParams) =>
    [...patientKeys.lists(), params] as const,

  detail: (id: string) =>
    [...patientKeys.all, 'detail', id] as const,
}
```

Không viết query key ngẫu nhiên khắp component.

---

## 17. Mutation

Mutation phải đồng bộ cache phù hợp:

```text
setQueryData
invalidateQueries
removeQueries
```

tùy use case.

Không refetch toàn bộ app sau mỗi mutation.

---

# ZUSTAND

## 18. Zustand cho Client State

Phù hợp:

```text
sidebarOpen
theme
selectedWorkspace
selectedClinic
layoutPreference
feature UI state
```

Không dùng làm database phía frontend.

---

## 19. Store Scope

Global:

```text
app/store/
```

Feature:

```text
modules/patient/store/
```

Không tạo một `globalStore.ts` chứa toàn bộ state.

---

# LOCAL STATE

## 20. useState

State chỉ một component dùng:

```text
useState
```

Không đưa mọi modal, tab, dropdown vào Zustand.

---

## 21. useReducer

Dùng khi local state transition phức tạp.

Không dùng useReducer chỉ để thay useState một cách máy móc.

---

# FORM

## 22. React Hook Form + Zod

Form mặc định:

```text
React Hook Form
+
Zod
```

Không lưu form state vào Zustand nếu không có lý do.

---

## 23. Wizard

Wizard nhiều route/step có thể dùng feature store nếu thực sự cần giữ state qua navigation.

---

# URL STATE

## 24. URL cho State cần Share/Refresh

Ví dụ:

```text
page
sort
filter
search
tab
view mode
```

nên ưu tiên:

```text
URL Search Params
```

nếu user cần:

```text
refresh
bookmark
share
back/forward
```

---

# NETWORK OPTIMIZATION

## 25. Không request dữ liệu không cần

Frontend chỉ request dữ liệu khi màn hình thực sự cần.

Không preload toàn bộ hệ thống ngay khi app start.

---

## 26. Lazy Loading Route

Domain/page lớn nên lazy load khi phù hợp.

Ví dụ:

```text
Reporting
Admin
Heavy Dashboard
```

không nhất thiết phải nằm trong initial bundle.

---

## 27. Debounce Search

Không gọi API mỗi lần user gõ một ký tự tức thời nếu use case không cần.

Có thể:

```text
Debounce
+
Query Cancellation
```

cho search.

---

## 28. Không request trùng lặp

TanStack Query phải được cấu hình để tận dụng cache/deduplication.

Không tự `fetch()` lại cùng resource trong nhiều component nếu query cache đã quản lý.

---

## 29. Không Poll quá nhanh

Polling phải có interval hợp lý.

Nếu cần realtime thực sự:

```text
SSE
WebSocket
```

có thể phù hợp hơn polling vài trăm ms.

---

## 30. Abort request không còn cần

Search/navigation thay đổi nhanh phải tránh để request cũ tiếp tục chiếm tài nguyên nếu có thể cancel.

---

# API DESIGN USAGE

## 31. API Layer riêng

Không gọi HTTP trực tiếp khắp component.

Dùng:

```text
patient/api/patient.api.ts
billing/api/billing.api.ts
```

---

## 32. Minimal Response Awareness

Frontend không nên yêu cầu Detail API nếu List API đã đủ.

Ví dụ:

```text
Patient table
→ PatientList endpoint

Patient detail
→ PatientDetail endpoint
```

---

## 33. Tránh Client-side N+1

Không:

```text
GET /patients
→ loop
→ GET /patients/{id}/appointments
→ N requests
```

nếu backend có thể cung cấp batch/aggregate endpoint hợp lý.

Frontend cũng phải nghĩ theo batch/set thay vì loop request.

---

# IDEMPOTENCY

## 34. Chống Double Submit

Create/payment/booking quan trọng phải chống double-click.

Frontend có thể:

```text
disable button while mutation pending
```

nhưng đây chỉ là UX protection.

Không coi nó là concurrency guarantee.

---

## 35. Idempotency Key

Với API hỗ trợ idempotency:

```text
Một business operation
→ một Idempotency-Key
```

Retry cùng operation phải reuse cùng key.

Không tạo key mới cho mỗi retry của cùng một hành động.

---

# ERROR HANDLING

## 36. Phân biệt loại lỗi

Frontend phải phân biệt:

```text
Validation Error
Authentication Error
Authorization Error
Conflict
Rate Limit
Network Error
Server Error
```

Không hiển thị tất cả thành:

```text
Something went wrong
```

nếu có thể đưa feedback hữu ích.

---

## 37. 429 Handling

Nếu server trả:

```text
429 Too Many Requests
```

frontend không được retry vô hạn.

Có thể:

```text
show message
respect Retry-After
backoff
```

---

## 38. Retry có chọn lọc

Không retry tự động mutation nhạy cảm nếu chưa đảm bảo idempotency.

Query read-only có thể retry giới hạn tùy loại lỗi.

---

# VALIDATION AND SECURITY

## 39. Zod chỉ là UX Validation

Frontend validation không phải security boundary.

Backend luôn phải validate lại.

---

## 40. Không tin dữ liệu Client

Frontend không được giả định việc ẩn button là authorization.

Backend mới là authority.

---

## 41. Auth Token

Ưu tiên kiến trúc dùng:

```text
HttpOnly Secure Cookie
```

nếu phù hợp.

Không lưu sensitive token vào Zustand chỉ để tiện dùng.

---

## 42. Không render unsafe HTML

Không dùng:

```text
dangerouslySetInnerHTML
```

với user-generated content nếu chưa sanitize đúng cách.

---

# COMPONENT DESIGN

## 43. Component một trách nhiệm

Component nên tập trung:

```text
Render
Interaction
Composition
```

Không để một component vài trăm dòng vừa fetch, validate, transform, render và quản lý nhiều workflow.

---

## 44. Business Component thuộc Domain

Ví dụ:

```text
PatientCard
AppointmentStatusBadge
InvoiceSummary
```

thuộc domain.

Không đưa vào `shared` chỉ vì được dùng ở hai màn hình.

---

## 45. Shared Component phải Generic

Phù hợp:

```text
Button
DataTable
ConfirmDialog
PageHeader
EmptyState
LoadingState
```

---

# RENDER PERFORMANCE

## 46. Không tối ưu render mù quáng

Không dùng:

```text
useMemo
useCallback
memo
```

mọi nơi chỉ vì nghĩ rằng nhanh hơn.

Chỉ dùng khi:

```text
measured benefit
stable callback required
expensive calculation
large child tree
```

---

## 47. Derived State

Không lưu state nếu có thể tính từ state hiện tại.

Tránh:

```text
firstName
lastName
fullName state riêng
```

nếu:

```text
fullName = firstName + lastName
```

có thể derive trực tiếp.

---

## 48. Large List

Danh sách cực lớn cân nhắc virtualization.

Không render hàng chục nghìn DOM node một lúc nếu không cần.

---

# TYPESCRIPT

## 49. Tránh any

Ưu tiên type rõ:

```text
Request
Response
Form
Query Params
Store
Props
Domain Types
```

---

## 50. Không duplicate type vô nghĩa

Type frontend phải phản ánh API contract nhưng không copy/paste hàng chục loại giống nhau nếu có thể tổ chức tốt hơn.

---

# DEFAULT STACK

## 51. Stack chuẩn

```text
React
TypeScript
Vite

React Router

TanStack Query
Zustand

React Hook Form
Zod

Tailwind CSS
shadcn/ui

TanStack Table
```

---

# FINAL RULES

## 52. Function

```text
One Function
→ One Clear Responsibility

Explicit Input
→ Explicit Output

Guard Clause
→ Flat Happy Path

Do Not Process Unnecessary Data
```

---

## 53. State

```text
Server
→ TanStack Query

Global Client
→ Zustand

Local
→ React

Form
→ React Hook Form

Validation
→ Zod

URL
→ Router
```

---

## 54. Network

```text
No Duplicate Requests

No Client-side N+1

No Infinite Polling

No Infinite Retry

Request Only Required Data

Reuse Query Cache
```

---

## 55. Architecture

```text
Domain First
Feature First
Clear Ownership
Minimal Shared State
Minimal Network Waste
Predictable Data Flow
```

Tối ưu frontend cho:

```text
Large Production React Application
```

không tối ưu cho abstraction hoặc library complexity không cần thiết.
