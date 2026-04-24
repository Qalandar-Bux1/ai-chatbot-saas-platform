import { notFound } from "next/navigation"
import { dashboardConfig } from "@/config/dashboard"
import { getCurrentUser } from "@/lib/session"
import { MainNav } from "@/components/main-nav"
import { DashboardNav } from "@/components/nav"
import { SiteFooter } from "@/components/site-footer"
import { UserAccountNav } from "@/components/user-account-nav"
import { db } from "@/lib/db"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OpenAIForm } from "@/components/openai-config-form"
import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
    children?: React.ReactNode
}

export default async function DashboardLayout({
    children,
}: DashboardLayoutProps) {
    const user = await getCurrentUser()

    if (!user) {
        return notFound()
    }

    const openAIKey = await db.openAIConfig.findFirst({
        where: {
            userId: user.id,
        },
    })

    return (
        <div className="flex min-h-screen flex-col space-y-6">
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
                <div className="container flex h-16 items-center justify-between py-4">
                    <MainNav items={dashboardConfig.mainNav} />
                    <UserAccountNav
                        user={{
                            name: user.name,
                            image: user.image,
                            email: user.email,
                        }}
                    />
                </div>
            </header>
            <div className="container grid flex-1 gap-6 md:grid-cols-[220px_1fr]">
                <aside className="hidden w-[200px] flex-col md:flex">
                    <DashboardNav items={dashboardConfig.sidebarNav} />
                </aside>
                <main className="flex w-full flex-1 flex-col overflow-hidden">
                    {!openAIKey ? (
                        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300/70 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm">
                                <p className="font-semibold">OpenAI key required for chatbot responses</p>
                                <p className="text-amber-800/90 dark:text-amber-200/80">
                                    Add your global key to enable message generation, knowledge base ingestion, and model calls.
                                </p>
                            </div>
                            <Link href="/dashboard/settings" className={cn(buttonVariants({ size: "sm" }))}>
                                Open Settings
                            </Link>
                        </div>
                    ) : null}
                    <Dialog defaultOpen={!openAIKey}>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    <div className="flex justify-center">
                                        <Image src="/openai-logo.svg" alt="OpenAI logo" width={120} height={120} />
                                    </div>
                                    <div className="flex justify-center pt-4">
                                        Before we start, let&apos;s configure OpenAI! 🚀
                                    </div>
                                </DialogTitle>
                                <div className="">
                                    <OpenAIForm className="border-0 shadow-none" user={user} />
                                </div>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                    {children}
                </main>
            </div>
            <SiteFooter simpleFooter={true} />
        </div>
    )
}