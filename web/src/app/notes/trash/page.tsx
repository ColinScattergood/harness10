import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Trash - MarkdownNotes",
};

export default function TrashPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <Card className="flex max-w-md flex-col items-center gap-4 border-dashed p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Trash is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleted notes will appear here for 30 days before being permanently
            removed.
          </p>
        </div>
      </Card>
    </div>
  );
}
