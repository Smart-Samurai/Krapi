"use client";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 w-full min-w-0">
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold truncate">{title}</h1>
        {description && (
          <p className="text-muted-foreground line-clamp-2">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
}
