/**
 * Page Header Component
 * 
 * Reusable page header component with title, description, and optional action button.
 * 
 * @module components/common/PageHeader
 * @example
 * <PageHeader
 *   title="Projects"
 *   description="Manage your projects"
 *   action={<Button>Create Project</Button>}
 * />
 */
"use client";

/**
 * Page Header Props
 * 
 * @interface PageHeaderProps
 * @property {string} title - Page title
 * @property {string} [description] - Optional page description
 * @property {React.ReactNode} [action] - Optional action button/content
 * @property {string} [data-testid] - Optional test ID for the page header
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  "data-testid"?: string;
}

/**
 * Page Header Component
 * 
 * Displays a page header with title, optional description, and optional action area.
 * 
 * @param {PageHeaderProps} props - Component props
 * @returns {JSX.Element} Page header component
 * 
 * @example
 * <PageHeader
 *   title="Projects"
 *   description="Manage your projects"
 *   action={<Button>Create</Button>}
 * />
 */
export function PageHeader({
  title,
  description,
  action,
  "data-testid": dataTestId,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 w-full min-w-0" data-testid={dataTestId}>
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
