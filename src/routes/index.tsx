import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CallList } from '@/features/calls/components/call-table'
import { DetailSheet } from '@/features/calls/components/detail-sheet'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { call?: string } => ({
    call: typeof search.call === 'string' ? search.call : undefined,
  }),
  component: InboundPage,
})

function InboundPage() {
  const navigate = useNavigate()
  const { call } = Route.useSearch()

  const open = (id: string) => navigate({ to: '/', search: { call: id } })
  const close = () => navigate({ to: '/', search: {} })
  const openLearn = () => navigate({ to: '/learn' })

  return (
    <>
      <CallList onOpen={open} />
      {call && <DetailSheet conversationId={call} onClose={close} onOpenLearn={openLearn} />}
    </>
  )
}
