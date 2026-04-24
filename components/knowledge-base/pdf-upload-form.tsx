"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { toast } from "@/components/ui/use-toast"

/**
 * Client form that uploads a PDF to /api/knowledge-base/upload-pdf
 * using multipart/form-data so the server can read the file directly.
 * Processing is async on the server; we just show a spinner while
 * waiting for the JSON response with the new document id + chunk count.
 */
export function PdfUploadForm() {
    const router = useRouter()
    const [file, setFile] = React.useState<File | null>(null)
    const [isUploading, setIsUploading] = React.useState(false)

    const MAX_BYTES = 25 * 1024 * 1024

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!file) return

        if (file.size > MAX_BYTES) {
            toast({
                title: "File too large",
                description: "Maximum PDF size is 25MB.",
                variant: "destructive",
            })
            return
        }

        setIsUploading(true)

        try {
            const form = new FormData()
            form.append("file", file)

            const res = await fetch("/api/knowledge-base/upload-pdf", {
                method: "POST",
                body: form,
            })

            if (!res.ok) {
                const message = await res.text().catch(() => "")
                throw new Error(message || "Upload failed.")
            }

            const data = await res.json()
            toast({
                title: "PDF ingested",
                description: `${data.chunkCount} chunks indexed (${data.charCount.toLocaleString()} chars).`,
            })
            setFile(null)
            ;(e.target as HTMLFormElement).reset()
            router.refresh()
        } catch (err: any) {
            toast({
                title: "Upload failed",
                description: err?.message ?? "Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="kb-pdf">PDF file</Label>
                <Input
                    id="kb-pdf"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={isUploading}
                />
                <p className="text-xs text-muted-foreground">
                    Up to 25MB. Text is extracted, chunked (500–1000 chars), embedded,
                    and indexed for retrieval.
                </p>
            </div>

            <Button type="submit" disabled={!file || isUploading}>
                {isUploading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? "Ingesting…" : "Upload & ingest"}
            </Button>
        </form>
    )
}
