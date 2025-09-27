//
//  ProjectDetailBottomPane.swift
//  CrewBooklet
//
//  Project detail view for bottom navigation pane with Information, Crew, Financial tabs
//  Dense, minimalistic design matching People and Organization detail views
//

import SwiftUI

struct ProjectDetailBottomPane: View {
    @Binding var project: Project
    @Binding var isPresented: Bool
    @State private var selectedTab: DetailTab = .information
    @StateObject private var supabaseService = SupabaseService.shared
    @StateObject private var organizationViewModel = OrganizationViewModel()
    @StateObject private var peopleViewModel = PeopleViewModel()
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var saveTimer: Timer?
    @State private var assignments: [(ProjectAssignment, Person)] = []
    @State private var showAddCrewSheet = false
    
    enum DetailTab: String, CaseIterable {
        case information = "Information"
        case crew = "Crew"
        case financial = "Financial"
        
        var icon: String {
            switch self {
            case .information: return "folder.fill"
            case .crew: return "person.2"
            case .financial: return "banknote"
            }
        }
    }
    
    // MARK: - Uniform Field Helper
    @ViewBuilder
    private func uniformField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField(label, text: text)
                .font(.caption)
                .textFieldStyle(.plain)
                .frame(height: 24)
                .padding(.horizontal, 8)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
        }
    }
    
    var body: some View {
        BottomNavigationPane(isPresented: $isPresented) {
            VStack(spacing: 0) {
                // Tab Picker
                tabPicker
                
                // Tab Content
                Group {
                    switch selectedTab {
                    case .information:
                        informationTabContent
                    case .crew:
                        crewTabContent
                    case .financial:
                        financialTabContent
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            await organizationViewModel.loadOrganizations()
            await peopleViewModel.loadPeople()
            await loadAssignments()
        }
        .sheet(isPresented: $showAddCrewSheet) {
            AddCrewMemberSheet(
                project: project,
                availablePeople: peopleViewModel.people.filter { person in
                    !assignments.contains { $0.1.id == person.id }
                }
            ) {
                Task { await loadAssignments() }
            }
        }
    }
    
    private var tabPicker: some View {
        Picker("Detail Tab", selection: $selectedTab) {
            ForEach(DetailTab.allCases, id: \.self) { tab in
                Label(tab.rawValue, systemImage: tab.icon)
                    .tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
    
    private var informationTabContent: some View {
        ScrollView {
            informationGrid
        }
        .onChange(of: project.name) { _, _ in scheduleAutoSave() }
        .onChange(of: project.clientOrganizationId) { _, _ in scheduleAutoSave() }
        .onChange(of: project.description) { _, _ in scheduleAutoSave() }
        .onChange(of: project.notes) { _, _ in scheduleAutoSave() }
        .onChange(of: project.status) { _, _ in scheduleAutoSave() }
        .onChange(of: project.inquiryCountry) { _, _ in scheduleAutoSave() }
        .onChange(of: project.shootingLocation) { _, _ in scheduleAutoSave() }
    }
    
    private var informationGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8)
        ]
        
        return LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
            // Project Name
            uniformField("Project Name", text: $project.name)
            
            // Project Number (read-only)
            VStack(alignment: .leading, spacing: 2) {
                Text("Project Number")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(project.projectNumber)
                    .font(.caption)
                    .frame(height: 24)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 8)
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
            }
            
            // Project Status
            VStack(alignment: .leading, spacing: 2) {
                Text("Status")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Picker("Status", selection: $project.status) {
                    ForEach(ProjectStatus.allCases, id: \.self) { status in
                        Text(status.rawValue).tag(status)
                    }
                }
                .pickerStyle(.menu)
                .font(.caption)
                .frame(height: 24)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
            }
            
            // Client Organization
            VStack(alignment: .leading, spacing: 2) {
                Text("Client Organization")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                SearchableDropdown(
                    title: "Select Organization",
                    options: organizationViewModel.organizations,
                    displayText: { $0.name },
                    searchText: { $0.name },
                    selection: Binding(
                        get: { 
                            organizationViewModel.organizations.first { $0.id == project.clientOrganizationId }
                        },
                        set: { organization in
                            project.clientOrganizationId = organization?.id
                        }
                    ),
                    allowCustomText: false,
                    customText: .constant("")
                )
                .frame(height: 24)
            }
            .gridCellColumns(2)
            
            // Inquiry Country
            uniformField("Inquiry Country", text: Binding(
                get: { project.inquiryCountry ?? "" },
                set: { project.inquiryCountry = $0.isEmpty ? nil : $0 }
            ))
            
            // Shooting Location
            uniformField("Shooting Location", text: Binding(
                get: { project.shootingLocation ?? "" },
                set: { project.shootingLocation = $0.isEmpty ? nil : $0 }
            ))
            
            // Description
            VStack(alignment: .leading, spacing: 2) {
                Text("Description")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextEditor(text: Binding(
                    get: { project.description ?? "" },
                    set: { project.description = $0.isEmpty ? nil : $0 }
                ))
                .font(.caption)
                .frame(height: 60)
                .padding(8)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
            }
            .gridCellColumns(3)
            
            // Notes
            VStack(alignment: .leading, spacing: 2) {
                Text("Notes")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextEditor(text: Binding(
                    get: { project.notes ?? "" },
                    set: { project.notes = $0.isEmpty ? nil : $0 }
                ))
                .font(.caption)
                .frame(height: 60)
                .padding(8)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
            }
            .gridCellColumns(3)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
    
    private var crewTabContent: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Crew Members")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                Button("Add Member") {
                    showAddCrewSheet = true
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            
            // Crew List
            ScrollView {
                if assignments.isEmpty {
                    Text("No crew members assigned")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .padding(.horizontal, 12)
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(assignments, id: \.0.id) { assignment, person in
                            CrewMemberRow(
                                assignment: Binding(
                                    get: { assignment },
                                    set: { newAssignment in
                                        if let index = assignments.firstIndex(where: { $0.0.id == assignment.id }) {
                                            assignments[index] = (newAssignment, person)
                                        }
                                    }
                                ),
                                person: person,
                                onRemove: {
                                    assignments.removeAll { $0.0.id == assignment.id }
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 12)
                }
            }
        }
    }
    
    private var financialTabContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Financial Information")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Text("Financial details for projects coming soon")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - Data Loading
    private func loadAssignments() async {
        do {
            assignments = try await supabaseService.fetchProjectAssignmentsWithPeople(projectId: project.id)
        } catch {
            print("Error loading assignments: \(error)")
            await MainActor.run {
                assignments = []
            }
        }
    }
    
    // MARK: - Auto Save
    private func scheduleAutoSave() {
        saveTimer?.invalidate()
        saveTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
            Task {
                await saveProject()
            }
        }
    }
    
    private func saveProject() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updateProject(project)
            await MainActor.run {
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}

#Preview {
    @Previewable @State var project = Project(name: "Example Project", status: .inquiry)
    @Previewable @State var isPresented = true
    
    ProjectDetailBottomPane(project: $project, isPresented: $isPresented)
}
