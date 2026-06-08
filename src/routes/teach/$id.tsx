import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/biva/icon'
import { learningItemQuery } from '@/features/learn/api'
import { TeachView } from '@/features/learn/components/teach-view'

/**
 * Trang chia sẻ công khai để dạy bot — đích của link `biva.ai/teach/:id`.
 * Render độc lập (không sidebar, xem __root.tsx) cho chuyên viên không có tài khoản.
 */
export const Route = createFileRoute('/teach/$id')({
  component: PublicTeachPage,
})

function PublicTeachPage() {
  const { id } = Route.useParams()
  const { data: item, isLoading } = useQuery(learningItemQuery(id))

  if (!item) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        {isLoading ? (
          'Đang tải…'
        ) : (
          <>
            <Icon name="graduation-cap" size={32} className="text-border" />
            <div className="text-sm">Phiếu học không tồn tại hoặc đã bị xoá.</div>
          </>
        )}
      </div>
    )
  }
  return <TeachView item={item} variant="public" />
}
