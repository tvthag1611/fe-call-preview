# fe-biva-preview

Frontend của hệ thống quản lý & theo dõi realtime cuộc gọi bot AI. Hiển thị lịch sử
các cuộc hội thoại và theo dõi **realtime** diễn biến của một cuộc gọi đang diễn ra
(khách nói, bot suy nghĩ, bot phản hồi, gọi tool, điều phối, hold, transfer, kết thúc,
kèm summary & nội dung "bot cần học").

> Bối cảnh tổng thể & quan hệ với backend: xem [../CLAUDE.md](../CLAUDE.md).

## Tech stack

- **React 19** + **Vite 8** + **TypeScript** (strict, `erasableSyntaxOnly` — không
  dùng parameter properties hay enum trong code app; xem lưu ý bên dưới).
- **Tailwind CSS v4** (qua plugin `@tailwindcss/vite`, cấu hình trong `src/index.css`,
  KHÔNG có `tailwind.config.js`).
- **shadcn/ui** (base: radix) — components trong `src/components/ui`, cấu hình ở
  `components.json`.
- **Zustand** — quản lý state client.
- **React Hook Form** + **Zod** (`@hookform/resolvers`) — form & validate.
- **TanStack Query** — data fetching/cache REST.
- **TanStack Router** — routing dạng **file-based** (`src/routes`), route tree tự sinh
  ra `src/routeTree.gen.ts` (đã gitignore, đừng sửa tay).
- **@microsoft/fetch-event-source** — client SSE (thay `EventSource` để gửi được header).

## Lệnh thường dùng

```bash
pnpm install      # cài deps
pnpm dev          # dev server tại http://localhost:5173 (proxy /api -> :3000)
pnpm build        # tsc -b && vite build (type-check + build production)
pnpm lint         # eslint
pnpm preview      # xem thử bản build
```

> Cần BE chạy ở cổng 3000 để gọi `/api` (đã cấu hình proxy trong `vite.config.ts`).

## Cấu trúc thư mục

```
src/
  main.tsx              # entry: QueryClientProvider + RouterProvider
  index.css            # Tailwind v4 + theme shadcn
  routeTree.gen.ts     # TỰ SINH, không sửa tay (gitignored)
  routes/              # file-based routes của TanStack Router
    __root.tsx         # layout gốc
    index.tsx          # trang chủ (lịch sử cuộc gọi)
  components/ui/        # shadcn components
  lib/
    utils.ts           # cn() của shadcn
    api-client.ts      # fetch wrapper REST (base url VITE_API_BASE_URL)
    query-client.ts    # cấu hình QueryClient
  features/
    calls/
      api/
        conversations.ts     # queryOptions cho list/detail/events
        use-call-stream.ts   # hook SSE realtime cho 1 conversation
      components/            # (sẽ thêm) UI timeline, item event, ...
  stores/                # zustand stores (vd ui-store.ts)
  types/
    call-events.ts       # types/enum loại event — ĐỒNG BỘ với BE
```

## Quy ước

- **Import alias:** dùng `@/` trỏ tới `src/` (vd `@/lib/api-client`). Không dùng
  đường dẫn tương đối dài.
- **`erasableSyntaxOnly` đang bật:** không dùng `enum` hay parameter properties trong
  constructor ở code app. Với "enum" hãy dùng object `as const` + union type (xem
  `src/types/call-events.ts` làm mẫu).
- **Loại event realtime:** mọi type/loại event định nghĩa ở `src/types/call-events.ts`
  và phải khớp với BE (`be-biva-preview/src/common/call-events.ts`).
- **Realtime:** chỉ NHẬN qua SSE (`use-call-stream.ts`), không gửi ngược realtime.
  Dữ liệu lịch sử lấy qua REST + TanStack Query.
- **Thêm shadcn component:** `pnpm dlx shadcn@latest add <tên>`.
- **Thêm route:** tạo file trong `src/routes/`; route tree tự sinh khi chạy `pnpm dev`
  hoặc `pnpm build`.

## Biến môi trường

`.env` (mẫu ở `.env.example`):

- `VITE_API_BASE_URL` — base URL REST/SSE của BE (mặc định `/api`, đi qua proxy dev).
