import Link from "next/link";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
};

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: PaginationProps) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function href(nextPage: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    params.set("page", String(nextPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm" disabled={page <= 1}>
          <Link href={href(Math.max(page - 1, 1))}>Previous</Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
          <Link href={href(Math.min(page + 1, totalPages))}>Next</Link>
        </Button>
      </div>
    </div>
  );
}
