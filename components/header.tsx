interface DashboardHeaderProps {
    heading: string
    text?: string
    children?: React.ReactNode
}

export function DashboardHeader({
    heading,
    text,
    children,
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-card/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-1">
                <h1 className="font-heading text-2xl md:text-3xl">{heading}</h1>
                {text && <p className="text-sm text-muted-foreground md:text-base">{text}</p>}
            </div>
            {children}
        </div>
    )
}
