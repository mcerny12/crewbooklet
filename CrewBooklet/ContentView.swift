//
//  ContentView.swift
//  CrewBooklet
//
//  Native macOS interface following strict Human Interface Guidelines
//

import SwiftUI

struct ContentView: View {
    @State private var selectedView: MainView? = .dashboard
    
    // ViewModels for data management
    @StateObject private var peopleViewModel = PeopleViewModel()
    @StateObject private var projectViewModel = ProjectViewModel()
    @StateObject private var organizationViewModel = OrganizationViewModel()
    @StateObject private var searchViewModel = SearchViewModel()

    
    // Sheet presentation states
    @State private var showAddPersonSheet = false
    @State private var showAddProjectSheet = false
    @State private var showAddOrganizationSheet = false
    
    @State private var searchFieldFrame: CGRect = .zero
    @State private var currentSelectedItem: SelectedItem? = nil
    @Binding var visualDebugActive: Bool
    var currentUser: String
    
    @State private var showOrganizationDetail = false
    @State private var showProjectDetail = false
    @State private var selectedOrganization: Organization? = nil
    @State private var selectedProject: Project? = nil
    @State private var editableOrganization: Organization? = nil
    @State private var editableProject: Project? = nil
    
    enum MainView: String, CaseIterable, Identifiable {
        case dashboard = "Dashboard"
        case people = "People"
        case organizations = "Organizations"
        case projects = "Projects"
        case calendar = "Calendar"
        case advancedSearch = "AdvancedSearch"
        
        var id: String { rawValue }
        var icon: String {
            switch self {
            case .dashboard: return "sidebar.leading"
            case .people: return "person.2.fill"
            case .organizations: return "building.2"
            case .projects: return "folder.fill"
            case .calendar: return "calendar"
            case .advancedSearch: return "magnifyingglass.circle"
            }
        }
        
        var localizedTitle: String {
            switch self {
            case .dashboard: return "Dashboard"
            case .people: return "Personen"
            case .organizations: return "Organisationen"
            case .projects: return "Projekte"
            case .calendar: return "Kalender"
            case .advancedSearch: return "Erweiterte Suche"
            }
        }
    }
    
    var body: some View {
        NavigationSplitView {
            // Native macOS Sidebar with system materials
            sidebarView
        } detail: {
            VStack(spacing: 0) {
                // Main content with system adaptive materials
                detailView
                
                // Path Bar at the bottom of detail view only
                PathBarView(
                    selectedView: selectedView, 
                    selectedItem: currentSelectedItem,
                    currentUser: currentUser
                )
            }
        }
        .onChange(of: selectedView) { _, newView in
            // Clear selected item when changing views
            if newView != selectedView {
                currentSelectedItem = nil
                
                // CRITICAL FIX: Clear all detail view flags when switching navigation sections
                // This ensures detail views don't persist across different sections
                withAnimation(.easeInOut(duration: 0.3)) {
                    showOrganizationDetail = false
                    showProjectDetail = false
                    editableOrganization = nil
                    editableProject = nil
                }
            }
        }
        .onChange(of: showProjectDetail) { _, isShowing in
            if !isShowing {
                editableProject = nil
            }
        }
        .onChange(of: showOrganizationDetail) { _, isShowing in
            if !isShowing {
                editableOrganization = nil
            }
        }
        .sheet(isPresented: $showAddPersonSheet) {
            AddPersonSheet()
        }
        .sheet(isPresented: $showAddProjectSheet) {
            AddProjectSheet()
        }
        .sheet(isPresented: $showAddOrganizationSheet) {
            AddOrganizationSheet()
        }
        .task {
            await peopleViewModel.loadPeople()
            await projectViewModel.loadProjects()
            await organizationViewModel.loadOrganizations()
        }
    }
    
    // MARK: - Sidebar View
    private var sidebarView: some View {
        List(MainView.allCases, id: \.self, selection: $selectedView) { view in
            NavigationLink(value: view) {
                Label(view.localizedTitle, systemImage: view.icon)
            }
        }
        .navigationTitle("CrewBooklet")
        .listStyle(.sidebar)
    }
    
    // MARK: - Detail View
    @ViewBuilder
    private var detailView: some View {
        if let selectedView = selectedView {
            switch selectedView {
            case .dashboard:
                dashboardView
            case .people:
                peopleView
            case .organizations:
                organizationsView
            case .projects:
                projectsView
            case .calendar:
                calendarView
            case .advancedSearch:
                advancedSearchView
            }
        } else {
            dashboardView
        }
    }
    
    // MARK: - Dashboard View
    private var dashboardView: some View {
        VStack(spacing: 16) {
            // Title Bar with Search
            TitleBarSearchField()
            
            // Dashboard Content
            ScrollView {
                VStack(spacing: 20) {
                    // Quick Stats
                    quickStatsSection
                    
                    // Recent Projects
                    recentProjectsSection
                    
                    // Recent People
                    recentPeopleSection
                }
                .padding()
            }
        }
        .background(.background)
    }
    
    // MARK: - Quick Stats Section
    private var quickStatsSection: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            StatCard(
                title: "Total People",
                value: "\(peopleViewModel.people.count)",
                icon: "person.2.fill",
                color: .blue
            )
            
            StatCard(
                title: "Active Projects",
                value: "\(projectViewModel.currentProjects.count)",
                icon: "folder.fill",
                color: .green
            )
            
            StatCard(
                title: "Organizations",
                value: "\(organizationViewModel.organizations.count)",
                icon: "building.2",
                color: .orange
            )
        }
    }
    
    // MARK: - Recent Projects Section
    private var recentProjectsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Projects")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("View All") {
                    selectedView = .projects
                }
                .buttonStyle(.bordered)
            }
            
            if projectViewModel.currentProjects.isEmpty {
                ContentUnavailableView(
                    "No Projects",
                    systemImage: "folder",
                    description: Text("Create your first project to get started")
                )
            } else {
                VStack(spacing: 8) {
                    ForEach(projectViewModel.currentProjects.prefix(5)) { project in
                        MacOSProjectListRow(project: project) {
                            selectedProject = project
                            editableProject = project
                            showProjectDetail = true
                        }
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(12)
    }
    
    // MARK: - Recent People Section
    private var recentPeopleSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent People")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("View All") {
                    selectedView = .people
                }
                .buttonStyle(.bordered)
            }
            
            if peopleViewModel.people.isEmpty {
                ContentUnavailableView(
                    "No People",
                    systemImage: "person.slash",
                    description: Text("Add people to your crew to get started")
                )
            } else {
                VStack(spacing: 8) {
                    ForEach(peopleViewModel.people.prefix(5)) { person in
                        PersonRow(person: person) {
                            currentSelectedItem = .person(person)
                        }
                    }
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(12)
    }
    
    // MARK: - People View
    private var peopleView: some View {
        VStack(spacing: 0) {
            // Title Bar with Search
            TitleBarSearchField()
            
            // People List
            VStack {
                Text("People List")
                    .font(.title)
                    .padding()
                
                if peopleViewModel.people.isEmpty {
                    ContentUnavailableView(
                        "No People",
                        systemImage: "person.slash",
                        description: Text("Add people to your crew")
                    )
                } else {
                    List(peopleViewModel.people) { person in
                        PersonRow(person: person) {
                            currentSelectedItem = .person(person)
                        }
                    }
                }
            }
        }
        .background(.background)
    }
    
    // MARK: - Organizations View
    private var organizationsView: some View {
        VStack(spacing: 0) {
            // Title Bar with Search
            TitleBarSearchField()
            
            // Organizations List
            OrganizationsListView(
                organizationViewModel: organizationViewModel,
                showAddOrganizationSheet: $showAddOrganizationSheet,
                onOrganizationSelected: { organization in
                    selectedOrganization = organization
                    editableOrganization = organization
                    showOrganizationDetail = true
                }
            )
        }
        .background(.background)
        .sheet(isPresented: $showOrganizationDetail) {
            if let organization = editableOrganization {
                OrganizationDetailSheet(
                    organization: Binding(
                        get: { organization },
                        set: { editableOrganization = $0 }
                    ),
                    isPresented: $showOrganizationDetail,
                    onSave: {
                        Task {
                            await organizationViewModel.loadOrganizations()
                        }
                    }
                )
            }
        }
    }
    
    // MARK: - Projects View
    private var projectsView: some View {
        VStack(spacing: 0) {
            // Title Bar with Search
            TitleBarSearchField()
            
            // Projects List
            ProjectsListView(
                projectViewModel: projectViewModel,
                showAddProjectSheet: $showAddProjectSheet,
                onProjectSelected: { project in
                    selectedProject = project
                    editableProject = project
                    showProjectDetail = true
                }
            )
        }
        .background(.background)
        .sheet(isPresented: $showProjectDetail) {
            if let project = editableProject {
                ProjectDetailView(
                    project: project,
                    projectViewModel: projectViewModel
                ) {
                    showProjectDetail = false
                }
            }
        }
    }
    
    // MARK: - Calendar View
    private var calendarView: some View {
        VStack {
            Text("Calendar")
                .font(.title)
                .padding()
            
            ContentUnavailableView(
                "Calendar Coming Soon",
                systemImage: "calendar",
                description: Text("Calendar functionality will be implemented soon")
            )
        }
    }
    
    // MARK: - Advanced Search View
    private var advancedSearchView: some View {
        AdvancedSearchView()
    }
    
    // MARK: - Helper Methods
    private func performSearch() {
        // Implement search functionality
        print("Performing search for: \(searchViewModel.searchText)")
    }
}

// MARK: - Stat Card Component
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                    .font(.title2)
                
                Spacer()
            }
            
            Text(value)
                .font(.title)
                .fontWeight(.bold)
                .foregroundStyle(.primary)
            
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(.regularMaterial)
        .cornerRadius(12)
    }
}

// MARK: - Person Row Component
struct PersonRow: View {
    let person: Person
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(person.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                    
                    if let email = person.email {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.clear)
            .cornerRadius(6)
        }
        .buttonStyle(.plain)
    }
}



// MARK: - Project Detail View
struct ProjectDetailView: View {
    let project: Project
    @ObservedObject var projectViewModel: ProjectViewModel
    let onBack: () -> Void
    @StateObject private var organizationViewModel = OrganizationViewModel()
    @StateObject private var peopleViewModel = PeopleViewModel()
    @State private var editableProject: Project
    @State private var assignments: [(ProjectAssignment, Person)] = []
    @State private var showAddCrewSheet = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    private let supabaseService = SupabaseService.shared
    
    init(project: Project, projectViewModel: ProjectViewModel, onBack: @escaping () -> Void) {
        self.project = project
        self.projectViewModel = projectViewModel
        self.onBack = onBack
        self._editableProject = State(initialValue: project)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Top Pane: Project Title + Information
            VStack(spacing: 0) {
                // Project Title Row (positioned exactly like in list view)
                VStack(spacing: 4) {
                    MacOSProjectRow(
                        project: editableProject,
                        onBack: onBack,
                        organizationName: {
                            if let orgId = editableProject.clientOrganizationId {
                                return organizationViewModel.organizations.first { $0.id == orgId }?.name
                            }
                            return nil
                        }()
                    )
                }
                .padding()
                
                // Project Information Form
                ProjectInfoPane(
                    project: $editableProject,
                    organizationViewModel: organizationViewModel,
                    onSave: saveProject,
                    isLoading: isLoading,
                    errorMessage: errorMessage
                )
            }
            .background(.regularMaterial)
            
            // Horizontal Divider
            Divider()
                .background(.separator)
            
            // Bottom Pane: Crew List
            CrewListPane(
                project: editableProject,
                assignments: $assignments,
                peopleViewModel: peopleViewModel,
                showAddCrewSheet: $showAddCrewSheet,
                onUpdate: loadAssignments
            )
            .background(.background)
        }
        .task {
            await organizationViewModel.loadOrganizations()
            await peopleViewModel.loadPeople()
            await loadAssignments()
        }
        .sheet(isPresented: $showAddCrewSheet) {
            AddCrewMemberSheet(
                project: editableProject,
                availablePeople: peopleViewModel.people.filter { person in
                    !assignments.contains { $0.1.id == person.id }
                }
            ) {
                Task { await loadAssignments() }
            }
        }
    }

    
    private func loadAssignments() async {
        do {
            assignments = try await supabaseService.fetchProjectAssignmentsWithPeople(projectId: project.id)
        } catch {
            print("Error loading assignments: \(error)")
        }
    }
    
    private func saveProject() async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updateProject(editableProject)
            await MainActor.run {
                isLoading = false
            }
            await projectViewModel.loadProjects()
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = "Failed to save project: \(error.localizedDescription)"
            }
        }
    }
}

// MARK: - Project Info Pane
struct ProjectInfoPane: View {
    @Binding var project: Project
    @ObservedObject var organizationViewModel: OrganizationViewModel
    let onSave: () async -> Void
    let isLoading: Bool
    let errorMessage: String?
    
    var body: some View {
        VStack(spacing: 16) {
            // Project Name
            VStack(alignment: .leading, spacing: 4) {
                Text("Project Name")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter project name", text: $project.name)
                    .textFieldStyle(.roundedBorder)
            }
            
            // Organization
            VStack(alignment: .leading, spacing: 4) {
                Text("Organization")
                    .font(.subheadline)
                    .fontWeight(.medium)
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
            }
            
            // Description
            VStack(alignment: .leading, spacing: 4) {
                Text("Description")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter project description", text: Binding(
                    get: { project.description ?? "" },
                    set: { project.description = $0.isEmpty ? nil : $0 }
                ), axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(3...6)
            }
            
            // Notes
            VStack(alignment: .leading, spacing: 4) {
                Text("Notes")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter project notes", text: Binding(
                    get: { project.notes ?? "" },
                    set: { project.notes = $0.isEmpty ? nil : $0 }
                ), axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(3...6)
            }
            
            // Error Message
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
                    .font(.caption)
            }
            
            // Save Button
            Button("Save Changes") {
                Task {
                    await onSave()
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
        }
        .padding()
    }
}

// MARK: - Crew List Pane
struct CrewListPane: View {
    let project: Project
    @Binding var assignments: [(ProjectAssignment, Person)]
    @ObservedObject var peopleViewModel: PeopleViewModel
    @Binding var showAddCrewSheet: Bool
    let onUpdate: () async -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text("Crew Members")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("Add Member") {
                    showAddCrewSheet = true
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal)
            
            // Crew List
            if assignments.isEmpty {
                ContentUnavailableView(
                    "No Crew Members",
                    systemImage: "person.slash",
                    description: Text("Add crew members to this project")
                )
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
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
                                    // Remove assignment
                                    assignments.removeAll { $0.0.id == assignment.id }
                                }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}

// MARK: - MacOS Project Row
struct MacOSProjectRow: View {
    let project: Project
    let onBack: () -> Void
    let organizationName: String?
    
    var body: some View {
        HStack {
            Button("← Back") {
                onBack()
            }
            .buttonStyle(.bordered)
            
            Spacer()
            
            VStack(alignment: .center, spacing: 4) {
                Text(project.name)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                if let organizationName = organizationName {
                    Text("Organization: \(organizationName)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            // Placeholder for balance
            Color.clear
                .frame(width: 60)
        }
        .padding(.horizontal)
    }
} 