# Product Specification: {{APP_NAME}}

## Overview
{{1-2 paragraph description of the product, its purpose, and target users}}

## User Stories
{{List user stories as US-001, US-002, etc.}}

- **US-001**: As a [user type], I want to [action] so that [benefit].
- **US-002**: ...

## Screen Inventory

### Web (Next.js)
| Screen | Route | Purpose | Key Elements |
|--------|-------|---------|-------------|
| ... | /... | ... | ... |

### iOS (SwiftUI)
| Screen | View Name | Purpose | Key Elements |
|--------|-----------|---------|-------------|
| ... | ...View | ... | ... |

## Data Model
{{Entity definitions with fields, types, and relationships}}

## API Endpoints
{{REST endpoints shared between web and iOS}}

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|-------------|----------|
| ... | /api/... | ... | ... | ... |

## Design Direction
- **Color Palette**: {{primary, secondary, accent, background, surface colors}}
- **Typography**: {{font choices, size scale}}
- **Spacing System**: {{base unit, scale}}
- **Visual Style**: {{e.g., minimal, playful, corporate}}

## Platform-Specific Notes

### Web
{{Any web-specific considerations: responsive breakpoints, SEO, etc.}}

### iOS
{{Any iOS-specific considerations: navigation style, haptics, native features}}

## Complexity Assessment
- **Rating**: {{1-5}}
- **Justification**: {{why this complexity level}}

## Sprint Plan
{{Only if complexity >= 3}}

### Sprint 1: {{title}}
- Scope: {{what gets built}}
- Done conditions: {{testable criteria}}

### Sprint 2: {{title}}
- Scope: ...
- Done conditions: ...

---

## Metadata (JSON)
```json
{
  "complexity": N,
  "sprints": [
    {
      "number": 1,
      "title": "...",
      "scope": "...",
      "done_conditions": ["DC-001: ...", "DC-002: ..."]
    }
  ],
  "shared_backend": true/false
}
```
