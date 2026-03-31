import { Card } from "@/components/ui/card";

export default function NotesPage() {
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
            <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
            <path d="M15 3v4a2 2 0 0 0 2 2h4" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">No notes yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first note to get started. Your markdown notes will
            appear here.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Notes with markdown support, live preview, folders, and more &mdash;
          coming in Sprint 2.
        </p>
      </Card>
    </div>
  );
}
