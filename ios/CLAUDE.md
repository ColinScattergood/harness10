# iOS Application — SwiftUI

## Stack
- Swift 6, SwiftUI, targeting iOS 17+
- MVVM architecture
- Swift Package Manager for dependencies
- URLSession + async/await for networking
- SwiftData for local persistence (if needed)

## Conventions
- Views in `Sources/Views/`
- ViewModels in `Sources/ViewModels/`
- Models in `Sources/Models/`
- Services in `Sources/Services/` (networking, persistence)
- Use `@Observable` (iOS 17+), NOT `ObservableObject`
- Use `@Environment` for dependency injection
- NavigationStack for navigation (not NavigationView)
- Use `.task {}` modifier for async data loading
- Prefer `AsyncImage` for remote images

## Project Initialization
If the `ios/` directory is empty, create an Xcode project:
```bash
mkdir -p ios/Sources/{Views,ViewModels,Models,Services}
mkdir -p ios/Resources
# Create Package.swift for SPM-based project structure
# Or use xcodegen/tuist if available
```

## Before Handoff Checklist
- [ ] `xcodebuild -scheme {AppScheme} -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build` succeeds
- [ ] No compiler warnings (treat warnings as errors)
- [ ] All views have SwiftUI previews
- [ ] All user stories for this sprint are implemented
- [ ] Handoff JSON written to `../artifacts/handoffs/ios-handoff-{sprint}.json`
- [ ] Git committed with descriptive message
