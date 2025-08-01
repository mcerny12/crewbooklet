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
    
    @State private var showPersonDetail = false
    @State private var showOrganizationDetail = false
    @State private var showProjectDetail = false
    @State private var selectedPerson: Person? = nil
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
            // Sidebar
            sidebarView
                .frame(minWidth: 200, maxWidth: 250)
        } detail: {
            // Main content area
            mainContentView
        }
        .navigationSplitViewStyle(.balanced)
        .toolbar {
            ToolbarItem(placement: .principal) {
                TitleBarSearchField(
                    onFrameChange: { frame in
                        searchFieldFrame = frame
                    },
                    visualDebugActive: visualDebugActive,
                    onAdvancedSearch: {
                        selectedView = .advancedSearch
                    }
                )
                .environmentObject(searchViewModel)
            }
        }
        .overlay(alignment: .topTrailing) {
            // Search results overlay positioned below search field
            if !searchViewModel.searchText.isEmpty && searchFieldFrame.size.width > 0 {
                SearchResultsView(
                    searchResults: searchViewModel.searchResults,
                    onSelectResult: {
                        // Clear search when result is selected
                        searchViewModel.searchText = ""
                    }
                )
                .frame(width: 300)
                .background(Material.regular)
                .cornerRadius(8)
                .shadow(radius: 10)
                .offset(x: -(searchFieldFrame.width / 2 - 150), y: searchFieldFrame.maxY + 10)
                    .transition(.asymmetric(
                        insertion: .opacity.combined(with: .scale(scale: 0.95, anchor: .top)),
                        removal: .opacity
                    ))
                    .animation(.easeInOut(duration: 0.2), value: searchViewModel.searchText)
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
    
    // MARK: - Main Content View
    @ViewBuilder
    private var mainContentView: some View {
        if let selectedView = selectedView {
            switch selectedView {
            case .dashboard:
                dashboardView
            case .people:
                peopleMainView
            case .organizations:
                organizationsMainView
            case .projects:
                projectsMainView
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
    
    // MARK: - People Main View
    private var peopleMainView: some View {
        ZStack {
            VStack(spacing: 0) {
                HStack {
                    Text("People")
                        .font(.title)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    Button("Add Person") {
                        showAddPersonSheet = true
                    }
                    .buttonStyle(.borderedProminent)
                }
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
                            selectedPerson = person
                            showPersonDetail = true
                        }
                    }
                    .listStyle(.plain) // Remove dividers
                }
                
                // Path Bar at the bottom
                PathBarView(
                    selectedView: selectedView,
                    selectedItem: currentSelectedItem,
                    currentUser: currentUser
                )
            }
            .background(.background)
            
            // Bottom Navigation Pane for Person Detail
            if showPersonDetail, let person = selectedPerson {
                BottomNavigationPane(
                    isPresented: $showPersonDetail,
                    content: {
                        PersonDetailSheet(
                            person: Binding(
                                get: { person },
                                set: { updatedPerson in
                                    if let index = peopleViewModel.people.firstIndex(where: { $0.id == person.id }) {
                                        peopleViewModel.people[index] = updatedPerson
                                    }
                                }
                            ),
                            isPresented: $showPersonDetail
                        )
                    }
                )
            }
        }
    }
    
    // MARK: - People View (Legacy - for dashboard)
    private var peopleView: some View {
        VStack(spacing: 0) {
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
    
    // MARK: - Organizations Main View
    private var organizationsMainView: some View {
        ZStack {
            VStack(spacing: 0) {
                HStack {
                    Text("Organizations")
                        .font(.title)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    Button("Add Organization") {
                        showAddOrganizationSheet = true
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                
                if organizationViewModel.organizations.isEmpty {
                    ContentUnavailableView(
                        "No Organizations",
                        systemImage: "building.2",
                        description: Text("Add your first organization")
                    )
                } else {
                    List(organizationViewModel.organizations) { organization in
                        MacOSOrganizationRow(organization: organization) {
                            selectedOrganization = organization
                            editableOrganization = organization
                            showOrganizationDetail = true
                        }
                    }
                    .listStyle(.plain) // Remove dividers
                }
                
                // Path Bar at the bottom
                PathBarView(
                    selectedView: selectedView,
                    selectedItem: currentSelectedItem,
                    currentUser: currentUser
                )
            }
            .background(.background)
            
            // Bottom Navigation Pane for Organization Detail
            if showOrganizationDetail, let organization = editableOrganization {
                BottomNavigationPane(
                    isPresented: $showOrganizationDetail,
                    content: {
                        OrganizationDetailSheet(
                            organization: Binding(
                                get: { editableOrganization ?? organization },
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
                )
            }
        }
    }
    
    // MARK: - Organizations View (Legacy - for dashboard)
    private var organizationsView: some View {
        VStack(spacing: 0) {
            // Organizations List
            OrganizationsListView(
                organizationViewModel: organizationViewModel,
                searchText: searchViewModel.searchText,
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
                        get: { editableOrganization ?? organization },
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
    
    // MARK: - Projects Main View
    private var projectsMainView: some View {
        Group {
            if showProjectDetail, let project = editableProject {
                // Project Detail View - starts directly with project row (NO TITLE!)
                VStack(spacing: 0) {
                    // Selected project row - EXACTLY like in project list
                    VStack(spacing: 0) {
                        List {
                            // Selected project (looks exactly like in project list)
                            MacOSProjectListRow(project: project) {
                                // Clicking goes back to list
                                showProjectDetail = false
                                editableProject = nil
                            }
                            .listRowBackground(Color.clear)
                        }
                        .listStyle(.plain)
                        .frame(height: 60) // Just enough for one row
                        
                        Divider()
                    }
                    
                    // Project Detail Content (without top title - that's shown in the list above)
                    ProjectDetailContentView(
                        project: project,
                        projectViewModel: projectViewModel
                    )
                }
            } else {
                // Project List View (normal state)
                VStack(spacing: 0) {
                    HStack {
                        Text("Projects")
                            .font(.title)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        Button("Add Project") {
                            showAddProjectSheet = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    
                    if projectViewModel.projects.isEmpty {
                        ContentUnavailableView(
                            "No Projects",
                            systemImage: "folder.badge.plus",
                            description: Text("Add your first project")
                        )
                    } else {
                        List(projectViewModel.projects) { project in
                            MacOSProjectListRow(project: project) {
                                selectedProject = project
                                editableProject = project
                                showProjectDetail = true
                            }
                        }
                        .listStyle(.plain) // Remove dividers
                    }
                    
                    // Path Bar at the bottom
                    PathBarView(
                        selectedView: selectedView,
                        selectedItem: currentSelectedItem,
                        currentUser: currentUser
                    )
                }
                .background(.background)
            }
        }
    }
    
    // MARK: - Projects View (Legacy - for dashboard)
    private var projectsView: some View {
        VStack(spacing: 0) {
            // Projects List
            ProjectsListView(
                projectViewModel: projectViewModel,
                searchText: searchViewModel.searchText,
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

// MARK: - Bottom Navigation Pane Component
struct BottomNavigationPane<Content: View>: View {
    @Binding var isPresented: Bool
    @State private var currentHeight: CGFloat = 500
    private let minHeight: CGFloat = 300
    private let maxHeight: CGFloat = 700
    let content: () -> Content
    
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                // Drag handle
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.secondary)
                    .frame(width: 40, height: 6)
                    .padding(.vertical, 8)
                
                // Content
                content()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(height: currentHeight)
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.1), radius: 20, y: -5)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .offset(y: isPresented ? 0 : currentHeight)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        let newHeight = currentHeight - CGFloat(value.translation.height)
                        currentHeight = min(max(newHeight, minHeight), maxHeight)
                    }
                    .onEnded { value in
                        // Snap to close if dragged down significantly
                        if value.translation.height > 100 {
                            isPresented = false
                        }
                    }
            )
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: isPresented)
        }
        .ignoresSafeArea(.container, edges: .bottom)
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



// MARK: - Project Detail Content View (without title)
struct ProjectDetailContentView: View {
    let project: Project
    @ObservedObject var projectViewModel: ProjectViewModel
    @StateObject private var organizationViewModel = OrganizationViewModel()
    @StateObject private var peopleViewModel = PeopleViewModel()
    @State private var editableProject: Project
    @State private var assignments: [(ProjectAssignment, Person)] = []
    @State private var showAddCrewSheet = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    private let supabaseService = SupabaseService.shared
    
    init(project: Project, projectViewModel: ProjectViewModel) {
        self.project = project
        self.projectViewModel = projectViewModel
        self._editableProject = State(initialValue: project)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Project Information Form
            ProjectInfoPane(
                project: $editableProject,
                organizationViewModel: organizationViewModel,
                onSave: saveProject,
                isLoading: isLoading,
                errorMessage: errorMessage
            )
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
                    MacOSProjectRow(project: editableProject) {
                        onBack()
                    }
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
        HStack(alignment: .top, spacing: 20) {
            // COLUMN 1: Basic Information
            VStack(alignment: .leading, spacing: 6) {
                Text("Basic Information")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                // Project Number
                VStack(alignment: .leading, spacing: 2) {
                    Text("Project Number:")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(project.projectNumber)
                        .font(.body)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color(NSColor.controlBackgroundColor))
                        .cornerRadius(4)
                }
                
                // Project Name (dropdown style)
                VStack(alignment: .leading, spacing: 4) {
                    Menu {
                        TextField("Project Name", text: $project.name)
                    } label: {
                        HStack {
                            Text(project.name.isEmpty ? "Project Name" : project.name)
                                .foregroundStyle(.primary)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(NSColor.controlBackgroundColor))
                        .cornerRadius(6)
                    }
                }
                
                // Empty dropdown placeholder
                VStack(alignment: .leading, spacing: 4) {
                    Menu {
                        Text("Empty")
                    } label: {
                        HStack {
                            Text("")
                            Spacer()
                            Image(systemName: "chevron.down")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(NSColor.controlBackgroundColor))
                        .cornerRadius(6)
                        .frame(height: 32)
                    }
                }
                

                
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // RIGHT COLUMN: Status Information  
            VStack(alignment: .leading, spacing: 16) {
                Text("Status Information")
                    .font(.headline)
                    .foregroundStyle(.secondary)
                
                // Status Dropdown
                VStack(alignment: .leading, spacing: 4) {
                    Picker("Status", selection: $project.status) {
                        ForEach(ProjectStatus.allCases, id: \.self) { status in
                            Text(status.rawValue).tag(status)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: 200)
                }
                
                // Created Date (read-only)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Created:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                    
                    Text("30.06.25")
                        .font(.body)
                        .foregroundStyle(.primary)
                }
                
                // Start Date
                VStack(alignment: .leading, spacing: 4) {
                    Text("Start:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                    
                    DatePicker("", selection: Binding(
                        get: { project.startDate ?? Date() },
                        set: { project.startDate = $0 }
                    ), displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .frame(maxWidth: 150)
                }
                
                // End Date
                VStack(alignment: .leading, spacing: 4) {
                    Text("End:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                    
                    DatePicker("", selection: Binding(
                        get: { project.endDate ?? Date() },
                        set: { project.endDate = $0 }
                    ), displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .frame(maxWidth: 150)
                }
                
                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        
        // Error Message
        if let errorMessage = errorMessage {
            Text(errorMessage)
                .foregroundStyle(.red)
                .font(.caption)
                .padding(.horizontal)
        }
        
        // Save Button
        Button("Save Changes") {
            Task {
                await onSave()
            }
        }
        .buttonStyle(.borderedProminent)
        .disabled(isLoading)
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
    
    private let supabaseService = SupabaseService.shared
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Crew Members")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)
                
                Spacer()
                
                Button("+ Add Person") {
                    showAddCrewSheet = true
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
                .cornerRadius(4)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)
            
            // Crew List
            if assignments.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "person.2")
                        .font(.system(size: 40))
                        .foregroundStyle(.tertiary)
                    
                    Text("No crew members assigned")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    
                    Text("Add people to your project crew")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(assignments, id: \.0.id) { assignment, person in
                            CrewMemberCardRow(
                                assignment: assignment,
                                person: person,
                                onDelete: {
                                    Task {
                                        await deleteAssignment(assignment)
                                    }
                                }
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
        }
        .frame(minHeight: 400) // Make it much more prominent
    }
    
    private func deleteAssignment(_ assignment: ProjectAssignment) async {
        // For now, just call the onUpdate to refresh - you'll need to implement the delete function in SupabaseService
        await onUpdate()
    }
}

// MARK: - Crew Member Card Row
struct CrewMemberCardRow: View {
    let assignment: ProjectAssignment
    let person: Person
    let onDelete: () -> Void
    
    var body: some View {
        HStack(spacing: 16) {
            // Left section: Name and Role
            VStack(alignment: .leading, spacing: 6) {
                // Name (bold white text)
                Text(person.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)
                
                // Role pill (gray pill-shaped label)
                if let role = assignment.role, !role.isEmpty {
                    Text(role)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.2))
                        .foregroundStyle(.secondary)
                        .cornerRadius(12)
                }
            }
            
            // Middle section: Status and Rate
            HStack(spacing: 12) {
                // Booking Status pill (green for "Gebucht")
                Text(assignment.availability.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(statusColor(for: assignment.availability.rawValue))
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                
                // Rate pill (dark gray with white text)
                if let dailyPay = assignment.dailyPay {
                    Text("\(String(format: "%.2f", NSDecimalNumber(decimal: dailyPay).doubleValue)) €")
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.primary.opacity(0.8))
                        .foregroundStyle(.white)
                        .cornerRadius(12)
                }
            }
            
            // Right section: Contact and Notes
            VStack(alignment: .leading, spacing: 4) {
                // Email (truncated, clickable)
                if let email = person.email, !email.isEmpty {
                    Text(email.count > 20 ? String(email.prefix(20)) + "..." : email)
                        .font(.caption)
                        .foregroundStyle(.blue)
                        .onTapGesture {
                            if let url = URL(string: "mailto:\(email)") {
                                NSWorkspace.shared.open(url)
                            }
                        }
                }
                
                // Phone number
                if let phone = person.mobilePhone, !phone.isEmpty {
                    Text(phone)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                // Notes field
                if let notes = assignment.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Delete button (red trash icon)
            Button {
                onDelete()
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(.red)
                    .font(.system(size: 16))
            }
            .buttonStyle(.plain)
            .help("Remove from project")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color(NSColor.controlBackgroundColor).opacity(0.3))
        .cornerRadius(6)
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.gray.opacity(0.2), lineWidth: 0.5)
        )
    }
    
    private func statusColor(for availability: String) -> Color {
        switch availability.lowercased() {
        case "gebucht":
            return .green
        case "verfügbar":
            return .blue
        case "nicht verfügbar", "abgesagt":
            return .red
        case "angefragt", "anfragen":
            return .orange
        case "1. option", "2. option":
            return .purple
        default:
            return .gray
        }
    }
}

// MARK: - MacOS Project Row
struct MacOSProjectRow: View {
    let project: Project
    let onBack: () -> Void
    
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
                
                if let organizationId = project.clientOrganizationId {
                    Text("Organization: \(organizationId)")
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