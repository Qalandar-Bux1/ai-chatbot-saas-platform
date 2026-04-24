import { redirect } from "next/navigation"

import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"
import { KnowledgeBaseManager } from "@/components/knowledge-base/knowledge-base-manager"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { siteConfig } from "@/config/site"

export const metadata = {
    title: `${siteConfig.name} - Knowledge Base`,
}

export default async function KnowledgeBasePage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect(authOptions?.pages?.signIn || "/login")
    }

    const documents = await db.knowledgeBaseDocument.findMany({
        where: { userId: user.id },
        select: {
            id: true,
            name: true,
            source: true,
            blobUrl: true,
            charCount: true,
            createdAt: true,
            _count: { select: { chunks: true } },
        },
        orderBy: { createdAt: "desc" },
    })

    const rows = documents.map((d) => ({
        id: d.id,
        name: d.name,
        source: d.source as "pdf" | "text",
        blobUrl: d.blobUrl,
        charCount: d.charCount,
        createdAt: d.createdAt,
        chunkCount: d._count.chunks,
    }))

    return (
        <DashboardShell>
            <DashboardHeader
                heading="Knowledge Base"
                text="Upload PDFs or paste text to ground your chatbot in your own business data."
            />
            <KnowledgeBaseManager documents={rows} />
        </DashboardShell>
    )
}
