//
//  ViewEditingGuidelines.swift
//  CrewBooklet
//
//  IMPORTANT GUIDELINES FOR EDITABLE VIEWS
//  ========================================
//
//  This file documents critical patterns to prevent data loss when editing entities.
//
//  PROBLEM:
//  --------
//  SwiftUI @Binding updates happen locally in the view but don't automatically
//  persist to the database. Without explicit onChange handlers or save calls,
//  user edits are lost when the view is dismissed.
//
//  SOLUTION PATTERN:
//  -----------------
//  Any view with editable @Binding to a database entity MUST call the appropriate
//  update function when the binding changes.
//
//  EXAMPLES:
//
//  ✅ CORRECT - Detail Sheet with onChange:
//  ```swift
//  struct PersonDetailSheet: View {
//      @Binding var person: Person
//      @StateObject private var viewModel = PersonDetailViewModel()
//
//      var body: some View {
//          VStack {
//              TextField("Name", text: $person.name)
//              // ... other fields
//          }
//          .onChange(of: person) { _, newValue in
//              viewModel.savePerson(newValue)
//          }
//      }
//  }
//  ```
//
//  ✅ CORRECT - Detail View with individual field onChange:
//  ```swift
//  struct ProjectDetailOverlay: View {
//      @Binding var project: Project
//      private let supabaseService = SupabaseService.shared
//
//      var body: some View {
//          VStack {
//              Picker("Status", selection: $project.status) { ... }
//                  .onChange(of: project.status) { _, newValue in
//                      Task { await saveProject() }
//                  }
//          }
//      }
//
//      private func saveProject() async {
//          try? await supabaseService.updateProject(project)
//      }
//  }
//  ```
//
//  ✅ CORRECT - Bottom Pane with debounced auto-save:
//  ```swift
//  struct PersonDetailBottomPane: View {
//      @Binding var person: Person
//      @State private var saveTimer: Timer?
//
//      var body: some View {
//          TextField("Name", text: $person.name)
//              .onChange(of: person.name) { _, _ in scheduleAutoSave() }
//      }
//
//      private func scheduleAutoSave() {
//          saveTimer?.invalidate()
//          saveTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { _ in
//              Task { await savePerson() }
//          }
//      }
//  }
//  ```
//
//  ❌ INCORRECT - NO onChange handler:
//  ```swift
//  struct ProjectDetailOverlay: View {
//      @Binding var project: Project
//
//      var body: some View {
//          // ⚠️ DANGER: Changes to status won't be saved!
//          Picker("Status", selection: $project.status) { ... }
//      }
//  }
//  ```
//
//  AFFECTED ENTITIES:
//  ------------------
//  - Person (SupabaseService.updatePerson)
//  - Organization (SupabaseService.updateOrganization)
//  - Project (SupabaseService.updateProject)
//  - ProjectAssignment (SupabaseService.updateProjectAssignment)
//
//  CURRENT STATUS:
//  ---------------
//  ✅ ProjectDetailOverlay - onChange for each field
//  ✅ PersonDetailSheet - onChange for entire person binding
//  ✅ OrganizationDetailSheet - onChange for entire organization binding
//  ✅ PersonDetailBottomPane - onChange with debounced auto-save
//  ✅ OrganizationDetailBottomPane - onChange with debounced auto-save
//
//  CHECKLIST FOR NEW EDITABLE VIEWS:
//  ----------------------------------
//  1. Does the view have @Binding to a database entity?
//  2. Does it have TextField, TextEditor, Picker, DatePicker, or other editable components?
//  3. Does it have .onChange(of: binding) that calls an update function?
//  4. Does the update function call SupabaseService.update___() ?
//
//  If you answered YES to 1-2 but NO to 3-4, you MUST add onChange handlers!
//
//  DEBUGGING:
//  ----------
//  If user reports "changes don't save", check:
//  1. Console for "🔄 Updating [entity]:" messages when editing
//  2. If missing, the view lacks onChange handlers
//  3. Add onChange that calls the appropriate update function
//

import Foundation

// MARK: - Auto-Save Protocol (Optional Best Practice)

/// Protocol for views that auto-save entity changes
@MainActor
protocol AutoSavingView {
    associatedtype Entity
    var entity: Entity { get set }
    func saveEntity() async throws
}

/// Extension to provide default debounced auto-save implementation
extension AutoSavingView {
    /// Schedule a debounced save operation
    /// Call this from onChange handlers to batch rapid changes
    func scheduleSave(timer: inout Timer?, delay: TimeInterval = 0.5) {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak timer] _ in
            Task {
                try? await self.saveEntity()
                timer?.invalidate()
            }
        }
    }
}
