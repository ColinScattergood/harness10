# Product Specification: MarkdownNotes

## Overview

MarkdownNotes is a clean, fast notes application with first-class markdown support and a polished dark mode experience. Users can create, organize, and search through notes written in markdown, with a live preview that renders headings, code blocks, lists, links, and more. The app targets developers, writers, and knowledge workers who think in markdown and want a distraction-free environment across web and mobile.

The product emphasizes speed, simplicity, and beautiful typography. Notes sync across devices via a shared API backend, with offline support on iOS. The design defaults to dark mode with an optional light theme toggle.

## User Stories

- **US-001**: As a user, I want to create a new note with a title and markdown body so that I can capture my thoughts quickly.
- **US-002**: As a user, I want to see a live preview of my markdown as I type so that I can verify formatting without switching views.
- **US-003**: As a user, I want to organize my notes into folders so that I can group related content together.
- **US-004**: As a user, I want to search across all my notes by title and content so that I can find information quickly.
- **US-005**: As a user, I want to toggle between dark mode and light mode so that I can use the app comfortably in any lighting.
- **US-006**: As a user, I want to pin important notes to the top of my list so that I can access them instantly.
- **US-007**: As a user, I want to see a word count and reading time estimate for each note so that I can gauge content length.
- **US-008**: As a user, I want to delete notes and recover them from a trash folder within 30 days so that I don't lose content accidentally.
- **US-009**: As a user, I want to sign up and log in so that my notes are tied to my account and sync across devices.
- **US-010**: As a user, I want to favorite notes so that I can quickly filter to my most important content.
- **US-011**: As a user, I want to sort my notes by date modified, date created, or title so that I can browse them in a useful order.
- **US-012**: As a user, I want to use keyboard shortcuts (web) or swipe gestures (iOS) for common actions like creating, deleting, and saving notes so that my workflow stays fast.
- **US-013**: As a user, I want to export a note as a plain `.md` file so that I can use it outside the app.
- **US-014**: As a user, I want to see a markdown toolbar with formatting buttons so that I don't have to memorize markdown syntax.

## Screen Inventory

### Web (Next.js)

| Screen | Route | Purpose | Key Elements |
|--------|-------|---------|-------------|
| Landing / Marketing | `/` | Introduce the app and prompt sign-up | Hero section, feature highlights, CTA buttons |
| Sign In | `/sign-in` | Authenticate existing users | Email/password form, OAuth buttons |
| Sign Up | `/sign-up` | Register new users | Email/password form, OAuth buttons |
| Notes Dashboard | `/notes` | Browse, search, and manage all notes | Sidebar with folders, note list, search bar, sort controls, new note button |
| Note Editor | `/notes/[id]` | Create or edit a single note | Split-pane editor (markdown + preview), title field, markdown toolbar, word count, pin/favorite toggles, export button |
| Trash | `/notes/trash` | View and restore deleted notes | List of soft-deleted notes, restore and permanent delete actions |
| Settings | `/settings` | Manage account and preferences | Theme toggle (dark/light), account info, sign out |

### iOS (SwiftUI)

| Screen | View Name | Purpose | Key Elements |
|--------|-----------|---------|-------------|
| Sign In | `SignInView` | Authenticate existing users | Email/password fields, OAuth buttons |
| Sign Up | `SignUpView` | Register new users | Email/password fields, OAuth buttons |
| Notes List | `NotesListView` | Browse and manage notes | List with folder sidebar (iPad) / sheet (iPhone), search bar, sort menu, swipe actions (pin, delete, favorite) |
| Note Editor | `NoteEditorView` | Create or edit a single note | Tab toggle between Edit and Preview, title field, markdown toolbar, word count, share/export sheet |
| Trash | `TrashView` | View and restore deleted notes | List of deleted notes, swipe to restore, button to empty trash |
| Folders | `FoldersView` | Manage folders | List of folders, add/rename/delete actions |
| Settings | `SettingsView` | Manage account and preferences | Theme toggle, account info, sign out |

## Data Model

### User
| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` (PK) | Unique user identifier |
| `email` | `string` | User email address |
| `name` | `string` | Display name |
| `theme` | `enum('dark','light')` | Preferred theme, default `dark` |
| `createdAt` | `timestamp` | Account creation time |

### Folder
| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` (PK) | Unique folder identifier |
| `userId` | `uuid` (FK → User) | Owner |
| `name` | `string` | Folder display name |
| `position` | `integer` | Sort order among folders |
| `createdAt` | `timestamp` | Creation time |
| `updatedAt` | `timestamp` | Last update time |

### Note
| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` (PK) | Unique note identifier |
| `userId` | `uuid` (FK → User) | Owner |
| `folderId` | `uuid?` (FK → Folder) | Optional parent folder |
| `title` | `string` | Note title |
| `body` | `text` | Markdown content |
| `isPinned` | `boolean` | Whether the note is pinned |
| `isFavorite` | `boolean` | Whether the note is favorited |
| `wordCount` | `integer` | Computed word count |
| `trashedAt` | `timestamp?` | When moved to trash (null if active) |
| `createdAt` | `timestamp` | Creation time |
| `updatedAt` | `timestamp` | Last update time |

### Relationships
- A **User** has many **Folders** and many **Notes**
- A **Folder** has many **Notes**
- A **Note** belongs to one **User** and optionally one **Folder**
- Notes with a non-null `trashedAt` are in the trash; permanently deleted after 30 days

## API Endpoints

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|-------------|----------|
| POST | `/api/auth/signup` | Register a new user | `{ email, password, name }` | `{ user, token }` |
| POST | `/api/auth/signin` | Sign in | `{ email, password }` | `{ user, token }` |
| POST | `/api/auth/signout` | Sign out | — | `{ success }` |
| GET | `/api/notes` | List all active notes | Query: `?folderId=&sort=&search=&favorites=` | `{ notes: Note[] }` |
| POST | `/api/notes` | Create a note | `{ title, body, folderId? }` | `{ note: Note }` |
| GET | `/api/notes/:id` | Get a single note | — | `{ note: Note }` |
| PATCH | `/api/notes/:id` | Update a note | `{ title?, body?, folderId?, isPinned?, isFavorite? }` | `{ note: Note }` |
| DELETE | `/api/notes/:id` | Soft-delete (move to trash) | — | `{ success }` |
| POST | `/api/notes/:id/restore` | Restore from trash | — | `{ note: Note }` |
| DELETE | `/api/notes/:id/permanent` | Permanently delete | — | `{ success }` |
| GET | `/api/notes/trash` | List trashed notes | — | `{ notes: Note[] }` |
| GET | `/api/folders` | List all folders | — | `{ folders: Folder[] }` |
| POST | `/api/folders` | Create a folder | `{ name }` | `{ folder: Folder }` |
| PATCH | `/api/folders/:id` | Update a folder | `{ name?, position? }` | `{ folder: Folder }` |
| DELETE | `/api/folders/:id` | Delete a folder (notes move to root) | — | `{ success }` |
| GET | `/api/user/settings` | Get user settings | — | `{ theme }` |
| PATCH | `/api/user/settings` | Update user settings | `{ theme? }` | `{ theme }` |

## Design Direction

### Color Palette

**Dark Mode (default)**
- Background: `#09090b` (zinc-950)
- Surface: `#18181b` (zinc-900)
- Surface elevated: `#27272a` (zinc-800)
- Border: `#3f3f46` (zinc-700)
- Text primary: `#fafafa` (zinc-50)
- Text secondary: `#a1a1aa` (zinc-400)
- Accent: `#3b82f6` (blue-500)
- Accent hover: `#2563eb` (blue-600)
- Destructive: `#ef4444` (red-500)
- Success: `#22c55e` (green-500)

**Light Mode**
- Background: `#ffffff`
- Surface: `#f4f4f5` (zinc-100)
- Surface elevated: `#ffffff`
- Border: `#e4e4e7` (zinc-200)
- Text primary: `#09090b` (zinc-950)
- Text secondary: `#71717a` (zinc-500)
- Accent: `#2563eb` (blue-600)
- Accent hover: `#1d4ed8` (blue-700)

### Typography
- **UI text**: Geist Sans (system fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI'`)
- **Editor & code blocks**: Geist Mono (system fallback: `'SF Mono', 'Fira Code', 'Cascadia Code', monospace`)
- **Scale**: 12px / 14px / 16px / 18px / 24px / 30px / 36px

### Spacing System
- Base unit: `4px`
- Common values: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`
- Border radius: `6px` (small), `8px` (medium), `12px` (large)

### Visual Style
- Minimal, content-focused design inspired by iA Writer and Bear
- Clear visual hierarchy through typography weight and size (not color overuse)
- Subtle borders, no heavy shadows
- Smooth transitions for theme switching (200ms ease)
- Editor has generous line height (1.7) for comfortable reading
- Markdown preview matches a clean document style

## Platform-Specific Notes

### Web
- **Responsive breakpoints**: Mobile (<640px): single-column, notes list only → tap to edit. Tablet (640–1024px): collapsible sidebar. Desktop (>1024px): persistent sidebar + split-pane editor.
- **SEO**: Landing page (`/`) is statically generated for search indexing. All `/notes/*` routes are behind auth and not indexed.
- **Keyboard shortcuts**: `Cmd/Ctrl+N` (new note), `Cmd/Ctrl+S` (save), `Cmd/Ctrl+Shift+P` (toggle preview), `Cmd/Ctrl+Shift+D` (toggle dark mode), `Cmd/Ctrl+Backspace` (delete note).
- **Server-side**: Notes list and folder list fetched as Server Components for fast initial load. Editor is a Client Component for real-time editing.
- **Auto-save**: Debounced (1 second) auto-save on edit. No manual save required, but `Cmd+S` forces immediate save.

### iOS
- **Navigation**: `NavigationSplitView` on iPad (sidebar + detail). `NavigationStack` on iPhone with push navigation.
- **Haptics**: Light impact on pin/favorite toggle. Medium impact on delete. Success notification on restore from trash.
- **Swipe actions**: Leading swipe → pin/unpin. Trailing swipe → delete. Long press → context menu (favorite, move to folder, export, delete).
- **Share sheet**: Native `UIActivityViewController` for exporting notes as `.md` files.
- **Offline support**: Core Data local cache. Sync on connectivity restore.
- **Dark mode**: Respects system appearance by default, with manual override in Settings.
- **Pull to refresh**: On notes list to sync with server.

## Complexity Assessment

- **Rating**: 3
- **Justification**: The app has 7 screens per platform, 3 data models with relationships, authentication, CRUD with soft-delete, search/sort/filter functionality, folder organization, and theme management. It's a well-scoped multi-model app with auth but no real-time features or complex integrations.

## Sprint Plan

### Sprint 1: Foundation — Auth, Layout, and Core Navigation
- **Scope**: Project scaffolding, authentication (sign up, sign in, sign out), main layout with sidebar/navigation, theme toggle (dark/light mode), empty states for notes list.
- **Done conditions**:
  - DC-001: User can sign up with email and password and is redirected to the notes dashboard
  - DC-002: User can sign in with existing credentials and see the notes dashboard
  - DC-003: User can sign out and is redirected to the sign-in page
  - DC-004: Unauthenticated users are redirected to sign-in when accessing `/notes`
  - DC-005: User can toggle between dark mode and light mode, and the preference persists across sessions
  - DC-006: The app shell renders with a sidebar (web) or tab/navigation structure (iOS) showing "All Notes", "Favorites", and "Trash" sections

### Sprint 2: Notes CRUD and Markdown
- **Scope**: Create, read, update, and delete notes. Markdown editor with live preview. Auto-save. Word count and reading time. Pin and favorite functionality. Search and sort.
- **Done conditions**:
  - DC-007: User can create a new note with a title and markdown body
  - DC-008: User can edit an existing note and see changes auto-saved
  - DC-009: Markdown preview renders headings, bold, italic, code blocks, links, lists, and images correctly
  - DC-010: User can delete a note (soft-delete) and see it appear in the Trash view
  - DC-011: User can restore a note from Trash
  - DC-012: User can permanently delete a note from Trash
  - DC-013: User can pin a note and it appears at the top of the notes list
  - DC-014: User can favorite a note and filter to show only favorites
  - DC-015: User can search notes by title or content and see matching results
  - DC-016: User can sort notes by date modified, date created, or title
  - DC-017: Word count and reading time are displayed for the current note

### Sprint 3: Folders, Export, and Polish
- **Scope**: Folder management (create, rename, delete, move notes into folders). Export notes as `.md` files. Markdown formatting toolbar. Keyboard shortcuts (web) and swipe gestures (iOS). Empty state illustrations. Final UI polish.
- **Done conditions**:
  - DC-018: User can create a new folder and see it in the sidebar
  - DC-019: User can rename and delete a folder
  - DC-020: User can move a note into a folder and see it listed under that folder
  - DC-021: Deleting a folder moves its notes to the root level (not to trash)
  - DC-022: User can export a note as a `.md` file
  - DC-023: Markdown toolbar buttons insert correct formatting syntax (bold, italic, heading, link, code, list)
  - DC-024: Web keyboard shortcuts work: Cmd/Ctrl+N creates a new note, Cmd/Ctrl+Shift+P toggles preview
  - DC-025: iOS swipe gestures work: swipe to pin, swipe to delete

---

## Metadata (JSON)
```json
{
  "appName": "MarkdownNotes",
  "complexity": 3,
  "sprints": [
    {
      "number": 1,
      "title": "Foundation — Auth, Layout, and Core Navigation",
      "scope": "Project scaffolding, authentication, main layout with sidebar/navigation, theme toggle, empty states",
      "done_conditions": [
        "DC-001: User can sign up with email and password and is redirected to the notes dashboard",
        "DC-002: User can sign in with existing credentials and see the notes dashboard",
        "DC-003: User can sign out and is redirected to the sign-in page",
        "DC-004: Unauthenticated users are redirected to sign-in when accessing /notes",
        "DC-005: User can toggle between dark mode and light mode, and the preference persists across sessions",
        "DC-006: The app shell renders with a sidebar (web) or tab/navigation structure (iOS) showing All Notes, Favorites, and Trash sections"
      ]
    },
    {
      "number": 2,
      "title": "Notes CRUD and Markdown",
      "scope": "Create, read, update, delete notes with markdown editor, live preview, auto-save, word count, pin/favorite, search, sort",
      "done_conditions": [
        "DC-007: User can create a new note with a title and markdown body",
        "DC-008: User can edit an existing note and see changes auto-saved",
        "DC-009: Markdown preview renders headings, bold, italic, code blocks, links, lists, and images correctly",
        "DC-010: User can delete a note (soft-delete) and see it appear in the Trash view",
        "DC-011: User can restore a note from Trash",
        "DC-012: User can permanently delete a note from Trash",
        "DC-013: User can pin a note and it appears at the top of the notes list",
        "DC-014: User can favorite a note and filter to show only favorites",
        "DC-015: User can search notes by title or content and see matching results",
        "DC-016: User can sort notes by date modified, date created, or title",
        "DC-017: Word count and reading time are displayed for the current note"
      ]
    },
    {
      "number": 3,
      "title": "Folders, Export, and Polish",
      "scope": "Folder management, markdown export, formatting toolbar, keyboard shortcuts, swipe gestures, UI polish",
      "done_conditions": [
        "DC-018: User can create a new folder and see it in the sidebar",
        "DC-019: User can rename and delete a folder",
        "DC-020: User can move a note into a folder and see it listed under that folder",
        "DC-021: Deleting a folder moves its notes to the root level (not to trash)",
        "DC-022: User can export a note as a .md file",
        "DC-023: Markdown toolbar buttons insert correct formatting syntax (bold, italic, heading, link, code, list)",
        "DC-024: Web keyboard shortcuts work: Cmd/Ctrl+N creates a new note, Cmd/Ctrl+Shift+P toggles preview",
        "DC-025: iOS swipe gestures work: swipe to pin, swipe to delete"
      ]
    }
  ],
  "shared_backend": true,
  "platforms": ["web", "ios"],
  "userStoryCount": 14,
  "screenCount": {
    "web": 7,
    "ios": 7
  },
  "dataModels": ["User", "Folder", "Note"],
  "authRequired": true
}
```
