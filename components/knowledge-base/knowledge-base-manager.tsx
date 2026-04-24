"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddTextForm } from "./add-text-form"
import { PdfUploadForm } from "./pdf-upload-form"
import { DocumentList, type KnowledgeBaseDocumentRow } from "./document-list"

interface KnowledgeBaseManagerProps {
    documents: KnowledgeBaseDocumentRow[]
}

/**
 * Top-level Knowledge Base dashboard UI. Tabbed layout keeps the page
 * small and the three actions (upload PDF, paste text, manage existing)
 * visually distinct.
 */
export function KnowledgeBaseManager({ documents }: KnowledgeBaseManagerProps) {
    return (
        <Tabs defaultValue="documents" className="w-full">
            <TabsList>
                <TabsTrigger value="documents">
                    Documents ({documents.length})
                </TabsTrigger>
                <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
                <TabsTrigger value="text">Add text / FAQs</TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-6">
                <DocumentList documents={documents} />
            </TabsContent>

            <TabsContent value="pdf" className="mt-6">
                <div className="max-w-xl rounded-md border p-6">
                    <h3 className="mb-4 text-base font-medium">Upload a PDF</h3>
                    <PdfUploadForm />
                </div>
            </TabsContent>

            <TabsContent value="text" className="mt-6">
                <div className="max-w-2xl rounded-md border p-6">
                    <h3 className="mb-4 text-base font-medium">Add raw text or FAQs</h3>
                    <AddTextForm />
                </div>
            </TabsContent>
        </Tabs>
    )
}
