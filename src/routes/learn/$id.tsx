import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { learningItemQuery } from '@/features/learn/api'
import { TeachView } from '@/features/learn/components/teach-view'

export const Route = createFileRoute('/learn/$id')({
  component: TeachPage,
})

function TeachPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: item, isLoading } = useQuery(learningItemQuery(id))

  const back = () => navigate({ to: '/learn' })

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {isLoading ? 'Đang tải…' : 'Không tìm thấy phiếu học.'}
      </div>
    )
  }
  return <TeachView item={item} onBack={back} />
}
