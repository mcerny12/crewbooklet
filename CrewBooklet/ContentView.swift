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
    
    // Bottom pane states
    @State private var showPersonDetailPane = false
    @State private var showOrganizationDetailPane = false
    @State private var selectedPerson: Person? = nil
    @State private var selectedOrganization: Organization? = nil
    @State private var editablePerson: Person? = nil
    @State private var editableOrganization: Organization? = nil
    
    // Project detail states (using full overlay)
    @State private var showProjectDetailOverlay = false
    @State private var selectedProject: Project? = nil
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
                ZStack {
                    detailView
                    
                    // Full overlay for project detail (at main content level)
                    if showProjectDetailOverlay, let project = editableProject {
                        ProjectDetailOverlay(
                            project: Binding(
                                get: { project },
                                set: { editableProject = $0 }
                            ),
                            isPresented: $showProjectDetailOverlay
                        )
                        .transition(.opacity)
                        .zIndex(2) // Above bottom panes
                    }
                    
                    // Bottom navigation panes (only in main content area)
                    VStack {
                        Spacer()
                        ZStack {
                            // Person detail pane
                            if showPersonDetailPane, let person = editablePerson {
                                PersonDetailBottomPane(
                                    person: Binding(
                                        get: { person },
                                        set: { editablePerson = $0 }
                                    ),
                                    isPresented: $showPersonDetailPane
                                )
                            }
                            
                            // Organization detail pane
                            if showOrganizationDetailPane, let organization = editableOrganization {
                                OrganizationDetailBottomPane(
                                    organization: Binding(
                                        get: { organization },
                                        set: { editableOrganization = $0 }
                                    ),
                                    isPresented: $showOrganizationDetailPane
                                )
                            }
                            
                        }
                    }
                }
                
                // Path Bar at the bottom of detail view only
                PathBarView(
                    selectedView: selectedView, 
                    selectedItem: currentSelectedItem,
                    currentUser: currentUser
                )
            }
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                TitleBarSearchField()
            }
        }
        .onChange(of: selectedView) { _, newView in
            // Clear selected item when changing views
            if newView != selectedView {
                currentSelectedItem = nil
                
                // CRITICAL FIX: Clear all detail view flags when switching navigation sections
                // This ensures detail views don't persist across different sections
                withAnimation(.easeInOut(duration: 0.3)) {
                    showPersonDetailPane = false
                    showOrganizationDetailPane = false
                    showProjectDetailOverlay = false
                    editablePerson = nil
                    editableOrganization = nil
                    editableProject = nil
                }
            }
        }
        .onChange(of: showPersonDetailPane) { _, isShowing in
            if !isShowing {
                editablePerson = nil
            }
        }
        .onChange(of: showOrganizationDetailPane) { _, isShowing in
            if !isShowing {
                editableOrganization = nil
            }
        }
        .onChange(of: showProjectDetailOverlay) { _, isShowing in
            if !isShowing {
                editableProject = nil
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
        .environmentObject(searchViewModel)

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
        ZStack(alignment: .bottomTrailing) {
            VStack(spacing: 16) {
                // Dashboard Content
                ScrollView {
                    VStack(spacing: 20) {
                        // Quick Stats
                        quickStatsSection
                        
                        // Recent Projects
                        recentProjectsSection
                    }
                    .padding()
                }
            }
            .background(.background)
            
            // Floating Action Button for New Project
            FloatingActionButton(
                icon: "plus",
                label: "New Project",
                action: { showAddProjectSheet = true }
            )
            .padding(.bottom, 20)
            .padding(.trailing, 20)
        }
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
                VStack(spacing: 16) {
                    ContentUnavailableView(
                        "No Projects",
                        systemImage: "folder",
                        description: Text("Create your first project to get started")
                    )
                    
                    Button("Create First Project") {
                        showAddProjectSheet = true
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
            } else {
                VStack(spacing: 8) {
                    ForEach(projectViewModel.currentProjects.prefix(5)) { project in
                        MacOSProjectListRow(project: project) {
                            selectedProject = project
                            editableProject = project
                            currentSelectedItem = .project(project)
                            withAnimation(.easeInOut(duration: 0.3)) {
                                showProjectDetailOverlay = true
                            }
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
            if peopleViewModel.isLoading {
                ProgressView("Loading people...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if peopleViewModel.people.isEmpty {
                ContentUnavailableView(
                    "Keine Personen",
                    systemImage: "person.slash",
                    description: Text("Fügen Sie Ihre erste Person hinzu")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 4) {
                        ForEach(peopleViewModel.people) { person in
                            MacOSPersonRow(person: person) {
                                selectedPerson = person
                                editablePerson = person
                                currentSelectedItem = .person(person)
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    showPersonDetailPane = true
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .background(.background)
    }
    
    // MARK: - Organizations View
    private var organizationsView: some View {
        VStack(spacing: 0) {
            // Organizations List
            OrganizationsListView(
                organizationViewModel: organizationViewModel,
                showAddOrganizationSheet: $showAddOrganizationSheet,
                onOrganizationSelected: { organization in
                    selectedOrganization = organization
                    editableOrganization = organization
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showOrganizationDetailPane = true
                    }
                }
            )
        }
        .background(.background)
    }
    
    // MARK: - Projects View
    private var projectsView: some View {
        VStack(spacing: 0) {
            // Projects List
            ProjectsListView(
                projectViewModel: projectViewModel,
                showAddProjectSheet: $showAddProjectSheet,
                onProjectSelected: { project in
                    selectedProject = project
                    editableProject = project
                    currentSelectedItem = .project(project)
                    withAnimation(.easeInOut(duration: 0.3)) {
                        showProjectDetailOverlay = true
                    }
                }
            )
        }
        .background(.background)
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

// MARK: - Floating Action Button Component
struct FloatingActionButton: View {
    let icon: String
    let label: String
    let action: () -> Void
    @State private var isHovered = false
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                
                if isHovered {
                    Text(label)
                        .font(.system(size: 14, weight: .medium))
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .leading)),
                            removal: .opacity.combined(with: .move(edge: .trailing))
                        ))
                }
            }
            .foregroundColor(.white)
            .padding(.horizontal, isHovered ? 16 : 12)
            .padding(.vertical, 12)
            .background(.blue.gradient, in: RoundedRectangle(cornerRadius: isHovered ? 25 : 22))
            .shadow(color: .blue.opacity(0.3), radius: isHovered ? 12 : 8, x: 0, y: 4)
            .scaleEffect(isHovered ? 1.05 : 1.0)
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                isHovered = hovering
            }
        }
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

// MARK: - MacOS Person Row Component (matching Organizations style)
struct MacOSPersonRow: View {
    let person: Person
    let onTap: () -> Void
    
    private var displayRole: String {
        if person.jobs.isEmpty {
            return "No role"
        } else if person.jobs.count == 1 {
            return person.jobs.first!.displayName
        } else {
            return "\(person.jobs.first!.displayName) +\(person.jobs.count - 1) more"
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Name, role all in one line (matches Organizations row pattern exactly)
                HStack(spacing: 8) {
                    Text(person.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    
                    Text("•")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    Text(displayRole)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Email and icons all in one line (matches Organizations row pattern exactly)
                HStack(spacing: 8) {
                    Text(person.email ?? "No email")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    
                    HStack(spacing: 4) {
                        if !(person.notes?.isEmpty ?? true) {
                            Image(systemName: "note.text")
                                .font(.caption2)
                                .foregroundStyle(.blue)
                        }
                        
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(person.name)
    }
}

// MARK: - Person Row Component (legacy)
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


