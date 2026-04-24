"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Icons } from "@/components/icons"
import { toast } from "@/components/ui/use-toast"

/**
 * Client form for pasting raw text or FAQs. Sends JSON to
 * /api/knowledge-base/add-text which handles chunking + embedding.
 */
export function AddTextForm() {
    const router = useRouter()
    const [name, setName] = React.useState("")
    const [content, setContent] = React.useState("")
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !content.trim()) return

        setIsSubmitting(true)

        try {
            const res = await fetch("/api/knowledge-base/add-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), content: content.trim() }),
            })

            if (!res.ok) {
                const message = await res.text().catch(() => "")
                throw new Error(message || "Failed to save text.")
            }

            const data = await res.json()
            toast({
                title: "Text ingested",
                description: `${data.chunkCount} chunks indexed.`,
            })
            setName("")
            setContent("")
            router.refresh()
        } catch (err: any) {
            toast({
                title: "Save failed",
                description: err?.message ?? "Please try again.",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="kb-text-name">Title</Label>
                <Input
                    id="kb-text-name"
                    type="text"
                    placeholder="e.g. Pricing FAQ"
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="kb-text-content">Content</Label>
                <Textarea
                    id="kb-text-content"
                    placeholder="Paste your FAQs or any long-form text here…"
                    className="min-h-[220px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                    {content.length.toLocaleString()} / 200,000 chars
                </p>
            </div>

            <Button type="submit" disabled={!name.trim() || !content.trim() || isSubmitting}>
                {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Saving…" : "Add to knowledge base"}
            </Button>
        </form>
    )
}
