# Changelog

All notable changes to CrewBooklet will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Project Detail View**: Fixed crew section to display project-specific crew members instead of hardcoded dummy data
- **Navigation**: Fixed project detail view not disappearing when switching to other menu items (People, Organizations, etc.)
- **Compilation**: Resolved missing enum cases in ProjectStatus and AssignmentStatus switch statements
- **Data Loading**: Implemented proper async loading of project assignments with associated person data

### Added
- **Dynamic Crew Display**: Project detail view now loads and displays actual crew members assigned to each specific project
- **Loading States**: Added loading indicators and empty states for crew data in project detail view
- **Error Handling**: Added proper error handling for crew data loading operations
- **CrewMemberRowView Component**: New reusable component for displaying individual crew member information with status colors

### Changed
- **Project Detail Navigation**: Improved navigation state management to properly clear detail views when switching sections
- **Data Architecture**: Enhanced project detail view to use real database queries instead of placeholder data
- **UI Components**: Refactored crew display to use dynamic data binding with proper SwiftUI state management

### Technical
- Added `loadProjectCrew()` function to fetch project-specific assignments from Supabase
- Implemented `CrewMemberRowView` with comprehensive assignment status display
- Fixed `onChange(of: selectedView)` logic in ContentView for proper navigation state clearing
- Added proper async/await patterns for crew data loading with MainActor updates

---

## [Previous Versions]

*Previous changelog entries would go here as the project evolves*
