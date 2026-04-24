import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"
import { CardSkeleton } from "@/components/card-skeleton"

export default function KnowledgeBaseLoading() {
    return (
        <DashboardShell>
            <DashboardHeader
                heading="Knowledge Base"
                text="Upload PDFs or paste text to ground your chatbot in your own business data."
            />
            <div className="grid gap-4">
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </DashboardShell>
    )
}
