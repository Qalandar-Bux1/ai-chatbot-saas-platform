"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { toast } from "@/components/ui/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface KnowledgeBaseDocumentRow {
    id: string
    name: string
    source: "pdf" | "text"
    blobUrl: string | null
    charCount: number
    createdAt: string | Date
    chunkCount: number
}

interface DocumentListProps {
    documents: KnowledgeBaseDocumentRow[]
}

export function DocumentList({ documents }: DocumentListProps) {
    const router = useRouter()
    const [pendingId, setPendingId] = React.useState<string | null>(null)
    const [confirmId, setConfirmId] = React.useState<string | null>(null)

    async function deleteDoc(id: string) {
        setPendingId(id)
        try {
            const res = await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" })
            if (!res.ok && res.status !== 204) {
                throw new Error("Delete failed.")
            }
            toast({ title: "Document removed" })
            router.refresh()
        } catch (err: any) {
            toast({
                title: "Could not delete",
                description: err?.message ?? "Please try again.",
                variant: "destructive",
            })
        } finally {
            setPendingId(null)
            setConfirmId(null)
        }
    }

    if (documents.length === 0) {
        return (
            <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
                Your knowledge base is empty. Upload a PDF or paste some text to get started.
            </div>
        )
    }

    return (
        <>
            <div className="divide-y divide-border rounded-md border">
                {documents.map((doc) => {
                    const created =
                        typeof doc.createdAt === "string" ? new Date(doc.createdAt) : doc.createdAt
                    return (
                        <div
                            key={doc.id}
                            className="flex items-center justify-between gap-4 p-4"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted">
                                    {doc.source === "pdf" ? (
                                        <Icons.document className="h-4 w-4" />
                                    ) : (
                                        <Icons.knowledgeBase className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">{doc.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {doc.source.toUpperCase()} · {doc.chunkCount} chunks ·{" "}
                                        {doc.charCount.toLocaleString()} chars ·{" "}
                                        {formatDistanceToNow(created, { addSuffix: true })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {doc.blobUrl && (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={doc.blobUrl} target="_blank" rel="noreferrer">
                                            Download
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setConfirmId(doc.id)}
                                    disabled={pendingId === doc.id}
                                >
                                    {pendingId === doc.id ? (
                                        <Icons.spinner className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Icons.trash className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <AlertDialog
                open={confirmId !== null}
                onOpenChange={(open) => !open && setConfirmId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the document and every chunk indexed
                            from it. Your chatbot will no longer be able to reference it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 focus:ring-red-600"
                            onClick={(e) => {
                                e.preventDefault()
                                if (confirmId) deleteDoc(confirmId)
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
