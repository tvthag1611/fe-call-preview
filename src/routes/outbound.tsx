import { createFileRoute } from '@tanstack/react-router'
import { Icon } from '@/components/biva/icon'

export const Route = createFileRoute('/outbound')({
  component: OutboundPage,
})

function OutboundPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-7 pt-7 pb-10">
        <div className="mb-5">
          <h1 className="text-[26px] font-bold tracking-tight">Outbound</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Chiến dịch gọi ra do bot thực hiện — nhắc lịch, xác nhận vé, chăm sóc khách.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-[72px] text-center">
          <span className="inline-flex size-[46px] items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon name="phone-outgoing" size={22} />
          </span>
          <div className="mt-4 text-base font-semibold">Chưa có chiến dịch nào</div>
          <div className="mt-1.5 max-w-[360px] text-[13.5px] leading-relaxed text-muted-foreground">
            Tính năng gọi ra đang được thiết lập. Khi sẵn sàng, các cuộc gọi outbound sẽ hiển thị ở đây.
          </div>
        </div>
      </div>
    </div>
  )
}
