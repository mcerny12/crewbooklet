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
    @State private var showSearchResults = false
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
            case .people: return "People"
            case .organizations: return "Organizations"
            case .projects: return "Projects"
            case .calendar: return "Calendar"
            case .advancedSearch: return "Advanced Search"
            }
        }
    }
    
    var body: some View {
        NavigationSplitView {
            // Native macOS Sidebar with system materials
            sidebarView
        } detail: {
            ZStack {
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
                                        isPresented: $showPersonDetailPane,
                                        onProjectSelected: { project in
                                            editableProject = project
                                            currentSelectedItem = .project(project)
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                showProjectDetailOverlay = true
                                            }
                                        },
                                        onOrganizationSelected: { organization in
                                            // Switch to organizations view
                                            selectedView = .organizations
                                            // Close person detail pane
                                            showPersonDetailPane = false
                                            // Set and open organization detail
                                            editableOrganization = organization
                                            currentSelectedItem = .organization(organization)
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                showOrganizationDetailPane = true
                                            }
                                        }
                                    )
                                }

                                // Organization detail pane
                                if showOrganizationDetailPane, let organization = editableOrganization {
                                    OrganizationDetailBottomPane(
                                        organization: Binding(
                                            get: { organization },
                                            set: { editableOrganization = $0 }
                                        ),
                                        isPresented: $showOrganizationDetailPane,
                                        onPersonSelected: { person in
                                            selectedView = .people
                                            // Close organization detail pane
                                            showOrganizationDetailPane = false
                                            // Set and open person detail
                                            editablePerson = person
                                            currentSelectedItem = .person(person)
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                showPersonDetailPane = true
                                            }
                                        },
                                        onProjectSelected: { project in
                                            selectedView = .projects
                                            // Close organization detail pane
                                            showOrganizationDetailPane = false
                                            // Set and open project detail
                                            editableProject = project
                                            currentSelectedItem = .project(project)
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                showProjectDetailOverlay = true
                                            }
                                        }
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

                // Search results overlay - positioned below search field
                if searchViewModel.showResults && !searchViewModel.searchResults.isEmpty {
                    searchResultsOverlay
                }
            }
        }
        .navigationTitle("")
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
            }
        }
        .onChange(of: selectedView) { oldView, newView in
            // Clear selected item when changing views
            if oldView != newView {
                currentSelectedItem = nil

                // CRITICAL FIX: Clear detail view flags when switching navigation sections
                // BUT preserve detail panes if we're navigating TO that specific view
                // (This allows cross-navigation between views while maintaining detail state)
                withAnimation(.easeInOut(duration: 0.3)) {
                    // Only clear person detail if NOT navigating to people view
                    if newView != .people {
                        showPersonDetailPane = false
                        editablePerson = nil
                    }

                    // Only clear project detail if NOT navigating to projects view
                    if newView != .projects {
                        showProjectDetailOverlay = false
                        editableProject = nil
                    }

                    // Only clear organization detail if NOT navigating to organizations view
                    if newView != .organizations {
                        showOrganizationDetailPane = false
                        editableOrganization = nil
                    }
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
            AddPersonSheet(organizationViewModel: organizationViewModel)
        }
        .sheet(isPresented: $showAddProjectSheet) {
            AddProjectSheet(organizationViewModel: organizationViewModel)
        }
        .sheet(isPresented: $showAddOrganizationSheet) {
            AddOrganizationSheet(organizationViewModel: organizationViewModel)
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

                        // Calendar and Recent Projects side by side
                        HStack(alignment: .top, spacing: 16) {
                            // Project Calendar Widget
                            projectCalendarWidget

                            // Recent Projects
                            recentProjectsSection
                        }
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
    
    // MARK: - Birthday Calendar Widget
    private var projectCalendarWidget: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Birthdays")
                .font(.title2)
                .fontWeight(.semibold)

            // Simple month view
            VStack(spacing: 8) {
                // Month header
                HStack {
                    Text(currentMonthYear())
                        .font(.headline)
                    Spacer()
                }

                // Weekday headers
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 4) {
                    ForEach(Array(["S", "M", "T", "W", "T", "F", "S"].enumerated()), id: \.offset) { index, day in
                        Text(day)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                    }
                }

                // Calendar days
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 4) {
                    ForEach(Array(calendarDays().enumerated()), id: \.offset) { index, day in
                        if day == 0 {
                            Text("")
                                .frame(height: 24)
                        } else {
                            let hasBirthday = hasBirthdayOnDay(day)
                            VStack(spacing: 0) {
                                Text("\(day)")
                                    .font(.caption)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: hasBirthday ? 18 : 24)
                                    .background(isToday(day) ? Color.accentColor.opacity(0.2) : Color.clear)
                                    .foregroundStyle(isToday(day) ? .primary : .secondary)

                                if hasBirthday {
                                    Text("🎂")
                                        .font(.system(size: 8))
                                }
                            }
                            .frame(height: 24)
                            .cornerRadius(4)
                        }
                    }
                }
            }

            Divider()

            // Show upcoming birthdays
            if upcomingBirthdays().isEmpty {
                Text("No birthdays this month")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(upcomingBirthdays().prefix(3), id: \.person.id) { birthday in
                        HStack(spacing: 4) {
                            Text("🎂")
                                .font(.caption2)
                            Text(birthday.person.name)
                                .font(.caption)
                                .foregroundStyle(.primary)
                            Text("•")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                            Text(formatBirthdayDate(birthday.date))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .frame(width: 280)
        .padding()
        .background(.background)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(.separator.opacity(0.5), lineWidth: 1)
        )
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
        .frame(maxWidth: .infinity)
        .padding()
        .background(.background)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(.separator.opacity(0.5), lineWidth: 1)
        )
    }
    

    
    // MARK: - People View
    private var peopleView: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(spacing: 0) {
                if peopleViewModel.isLoading {
                    ProgressView("Loading people...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if peopleViewModel.people.isEmpty {
                    ContentUnavailableView(
                        "No People",
                        systemImage: "person.slash",
                        description: Text("Add your first person")
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 4) {
                            ForEach(peopleViewModel.filteredPeople) { person in
                                MacOSPersonRow(
                                    person: person,
                                    onTap: {
                                        // If clicking the same person, close the detail view
                                        if selectedPerson?.id == person.id && showPersonDetailPane {
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                showPersonDetailPane = false
                                            }
                                            selectedPerson = nil
                                            editablePerson = nil
                                            currentSelectedItem = nil
                                        } else {
                                            // Otherwise, open detail view for new person
                                            selectedPerson = person
                                            editablePerson = person
                                            currentSelectedItem = .person(person)
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                showPersonDetailPane = true
                                            }
                                        }
                                    },
                                    onDelete: {
                                        Task {
                                            await peopleViewModel.deletePerson(person)
                                        }
                                    }
                                )
                            }
                        }
                        .padding()
                        .padding(.bottom, 80) // Extra padding for floating button
                    }
                }
            }
            .background(.background)
            
            // Floating Action Button for New Person
            FloatingActionButton(
                icon: "plus",
                label: "New Person",
                action: { showAddPersonSheet = true }
            )
            .padding(.bottom, 20)
            .padding(.trailing, 20)
        }
    }
    
    // MARK: - Organizations View
    private var organizationsView: some View {
        ZStack(alignment: .bottomTrailing) {
            VStack(spacing: 0) {
                // Organizations List
                OrganizationsListView(
                    organizationViewModel: organizationViewModel,
                    showAddOrganizationSheet: $showAddOrganizationSheet,
                    onOrganizationSelected: { organization in
                        // If clicking the same organization, close the detail view
                        if selectedOrganization?.id == organization.id && showOrganizationDetailPane {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                showOrganizationDetailPane = false
                            }
                            selectedOrganization = nil
                            editableOrganization = nil
                            currentSelectedItem = nil
                        } else {
                            // Otherwise, open detail view for new organization
                            selectedOrganization = organization
                            editableOrganization = organization
                            currentSelectedItem = .organization(organization)
                            withAnimation(.easeInOut(duration: 0.3)) {
                                showOrganizationDetailPane = true
                            }
                        }
                    }
                )
            }
            .background(.background)
            
            // Floating Action Button for New Organization
            FloatingActionButton(
                icon: "plus",
                label: "New Organization",
                action: { showAddOrganizationSheet = true }
            )
            .padding(.bottom, 20)
            .padding(.trailing, 20)
        }
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

    // MARK: - Search Results Overlay
    private var searchResultsOverlay: some View {
        VStack(spacing: 0) {
            // Position at the very top, right below toolbar
            HStack {
                Spacer()

                SearchResultsView(
                    searchResults: searchViewModel.searchResults,
                    onSelectResult: {
                        searchViewModel.selectResult()
                    },
                    visualDebugActive: visualDebugActive
                )
                .frame(width: 320)
                .padding(.top, 8) // Small gap from toolbar

                Spacer()
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .transition(.opacity.combined(with: .move(edge: .top)))
        .zIndex(100)
        .allowsHitTesting(true)
        .background(
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture {
                    searchViewModel.showResults = false
                }
        )
    }

    // MARK: - Helper Methods
    private func performSearch() {
        // Implement search functionality
        print("Performing search for: \(searchViewModel.searchText)")
    }

    // Calendar helper methods
    private func currentMonthYear() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: Date())
    }

    private func calendarDays() -> [Int] {
        let calendar = Calendar.current
        let now = Date()

        guard let range = calendar.range(of: .day, in: .month, for: now),
              let firstDay = calendar.date(from: calendar.dateComponents([.year, .month], from: now)) else {
            return []
        }

        let firstWeekday = calendar.component(.weekday, from: firstDay)
        let paddingDays = Array(repeating: 0, count: firstWeekday - 1)
        let monthDays = Array(range)

        return paddingDays + monthDays
    }

    private func isToday(_ day: Int) -> Bool {
        let calendar = Calendar.current
        let today = calendar.component(.day, from: Date())
        return day == today
    }

    // Birthday helper methods
    private func hasBirthdayOnDay(_ day: Int) -> Bool {
        let calendar = Calendar.current
        let now = Date()
        let currentMonth = calendar.component(.month, from: now)

        return peopleViewModel.people.contains { person in
            guard let dob = person.dateOfBirth else { return false }
            let birthMonth = calendar.component(.month, from: dob)
            let birthDay = calendar.component(.day, from: dob)
            return birthMonth == currentMonth && birthDay == day
        }
    }

    private func upcomingBirthdays() -> [(person: Person, date: Date)] {
        let calendar = Calendar.current
        let now = Date()
        let currentMonth = calendar.component(.month, from: now)
        let currentYear = calendar.component(.year, from: now)

        var birthdays: [(person: Person, date: Date)] = []

        for person in peopleViewModel.people {
            guard let dob = person.dateOfBirth else { continue }
            let birthMonth = calendar.component(.month, from: dob)
            let birthDay = calendar.component(.day, from: dob)

            if birthMonth == currentMonth {
                // Create this year's birthday date
                var components = DateComponents()
                components.year = currentYear
                components.month = birthMonth
                components.day = birthDay

                if let birthdayThisYear = calendar.date(from: components) {
                    birthdays.append((person: person, date: birthdayThisYear))
                }
            }
        }

        // Sort by date
        return birthdays.sorted { $0.date < $1.date }
    }

    private func formatBirthdayDate(_ date: Date) -> String {
        let calendar = Calendar.current
        let day = calendar.component(.day, from: date)
        let today = calendar.component(.day, from: Date())

        if day == today {
            return "Today"
        } else if day == today + 1 {
            return "Tomorrow"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
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

// MARK: - MacOS Person Row Component (Clean, minimal design)
struct MacOSPersonRow: View {
    let person: Person
    let onTap: () -> Void
    let onDelete: (() -> Void)?

    init(person: Person, onTap: @escaping () -> Void, onDelete: (() -> Void)? = nil) {
        self.person = person
        self.onTap = onTap
        self.onDelete = onDelete
    }

    private var displayRole: String {
        if person.jobs.isEmpty {
            return "No role"
        } else if person.jobs.count == 1 {
            return person.jobs.first!.displayName
        } else {
            return "\(person.jobs.first!.displayName) +\(person.jobs.count - 1) more"
        }
    }

    private func formatPhoneForDisplay(_ phone: String) -> String {
        // Remove all non-digit characters except +
        let digitsOnly = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)

        if digitsOnly.isEmpty { return phone }

        // Always add + if not present
        var workingString = digitsOnly
        if !workingString.hasPrefix("+") && !workingString.isEmpty {
            workingString = "+" + workingString
        }

        // Extract and format based on country code
        if workingString.hasPrefix("+") {
            let digits = String(workingString.dropFirst())

            // European countries
            if digits.hasPrefix("49") { // Germany
                return formatWithPattern("+49", String(digits.dropFirst(2)), pattern: [3, 3, 3, 2])
            } else if digits.hasPrefix("43") { // Austria
                return formatWithPattern("+43", String(digits.dropFirst(2)), pattern: [3, 3, 3, 2])
            } else if digits.hasPrefix("41") { // Switzerland
                return formatWithPattern("+41", String(digits.dropFirst(2)), pattern: [2, 3, 2, 2])
            } else if digits.hasPrefix("44") { // UK
                return formatWithPattern("+44", String(digits.dropFirst(2)), pattern: [4, 3, 4])
            } else if digits.hasPrefix("33") { // France
                return formatWithPattern("+33", String(digits.dropFirst(2)), pattern: [1, 2, 2, 2, 2])
            } else if digits.hasPrefix("1") { // US/Canada
                return formatWithPattern("+1", String(digits.dropFirst(1)), pattern: [3, 3, 4])
            } else {
                return "+" + digits
            }
        }

        return workingString
    }

    private func formatWithPattern(_ countryCode: String, _ number: String, pattern: [Int]) -> String {
        let cleaned = number.filter { $0.isNumber }
        var formatted = countryCode
        var position = 0

        for groupSize in pattern {
            if position >= cleaned.count { break }
            let endPos = min(position + groupSize, cleaned.count)
            let start = cleaned.index(cleaned.startIndex, offsetBy: position)
            let end = cleaned.index(cleaned.startIndex, offsetBy: endPos)
            formatted += " \(String(cleaned[start..<end]))"
            position = endPos
        }

        if position < cleaned.count {
            let start = cleaned.index(cleaned.startIndex, offsetBy: position)
            formatted += " \(String(cleaned[start...]))"
        }

        return formatted
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 40) {
                // Left side: Name and role stacked
                VStack(alignment: .leading, spacing: 2) {
                    Text(person.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Text(displayRole)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .frame(width: 220, alignment: .leading)

                // Middle: Email and phone with buttons stacked
                VStack(alignment: .leading, spacing: 2) {
                    // Email with button
                    HStack(spacing: 4) {
                        if let email = person.email, !email.isEmpty {
                            Text(email)
                                .font(.caption)
                                .foregroundStyle(.primary)
                                .lineLimit(1)

                            Button(action: {
                                if let url = URL(string: "mailto:\(email)") {
                                    NSWorkspace.shared.open(url)
                                }
                            }) {
                                Image(systemName: "envelope.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.blue)
                                    .frame(width: 16, height: 16)
                            }
                            .buttonStyle(.plain)
                        } else {
                            Text("No email")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(height: 16)

                    // Phone with button
                    HStack(spacing: 4) {
                        if let phone = person.mobilePhone, !phone.isEmpty {
                            Text(formatPhoneForDisplay(phone))
                                .font(.caption)
                                .foregroundStyle(.primary)
                                .lineLimit(1)

                            Button(action: {
                                if let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                                    NSWorkspace.shared.open(url)
                                }
                            }) {
                                Image(systemName: "phone.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.blue)
                                    .frame(width: 16, height: 16)
                            }
                            .buttonStyle(.plain)
                        } else {
                            Text("No phone")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(height: 16)
                }
                .frame(width: 280, alignment: .leading)

                Spacer()

                // Right side: Icons
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
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(.background)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(.separator.opacity(0.3), lineWidth: 0.5)
            )
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


