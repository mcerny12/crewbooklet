import SwiftUI

// MARK: - Advanced Search View (Vertical Split Layout like ProjectDetailView)
struct AdvancedSearchView: View {
    @StateObject private var searchViewModel = AdvancedSearchViewModel()
    @StateObject private var organizationViewModel = OrganizationViewModel()
    @State private var searchCriteria = AdvancedSearchCriteria()
    @State private var isSearching = false
    @State private var searchResults = AdvancedSearchResults()
    
    var visualDebugActive: Bool = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Top Pane: Search Criteria Form
            VStack(spacing: 0) {
                // Header with optional close button and search title
                HStack {
                    Spacer()
                    
                    Text("Advanced Search")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)
                    
                    Spacer()
                    
                    Button("Clear All") {
                        searchViewModel.clearSearch()
                    }
                    .buttonStyle(.bordered)
                    .foregroundStyle(.red)
                }
                .padding()
                
                // Search Criteria Form
                AdvancedSearchCriteriaPane(
                    searchCriteria: $searchCriteria,
                    organizationViewModel: organizationViewModel,
                    visualDebugActive: visualDebugActive,
                    onSearch: {
                        Task {
                            await searchViewModel.performAdvancedSearch()
                        }
                    },
                    isSearching: searchViewModel.isSearching
                )
            }
            .background(.regularMaterial)
            
            // Horizontal Divider
            Divider()
                .background(.separator)
            
            // Bottom Pane: Search Results
            AdvancedSearchResultsPane(
                searchResults: searchViewModel.searchResults,
                isSearching: searchViewModel.isSearching,
                hasPerformedSearch: searchViewModel.hasPerformedSearch,
                errorMessage: searchViewModel.errorMessage,
                searchCriteria: searchCriteria,
                visualDebugActive: visualDebugActive
            )
            .background(.background)
        }
        .task {
            await organizationViewModel.loadOrganizations()
        }
    }
}

// MARK: - Advanced Search Criteria Pane
struct AdvancedSearchCriteriaPane: View {
    @Binding var searchCriteria: AdvancedSearchCriteria
    @ObservedObject var organizationViewModel: OrganizationViewModel
    let visualDebugActive: Bool
    let onSearch: () -> Void
    let isSearching: Bool
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Search Logic Toggle
                searchLogicSection
                
                // Search Categories Toggle
                searchCategoriesSection
                
                // General Search
                generalSearchSection
                
                // Three-column layout for specific criteria
                HStack(alignment: .top, spacing: 12) {
                    personCriteriaSection
                    projectCriteriaSection
                    organizationCriteriaSection
                }
                
                // Search Action Button
                searchButtonSection
            }
            .padding()
        }
    }
    
    private var searchLogicSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Search Logic")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            HStack {
                Picker("Search Logic", selection: $searchCriteria.useAndLogic) {
                    Text("AND (All criteria must match)").tag(true)
                    Text("OR (Any criteria can match)").tag(false)
                }
                .pickerStyle(.segmented)
                
                Spacer()
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
    
    private var searchCategoriesSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Search Categories")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            HStack(spacing: 16) {
                Toggle("People", isOn: $searchCriteria.searchPeople)
                    .toggleStyle(.checkbox)
                
                Toggle("Projects", isOn: $searchCriteria.searchProjects)
                    .toggleStyle(.checkbox)
                
                Toggle("Organizations", isOn: $searchCriteria.searchOrganizations)
                    .toggleStyle(.checkbox)
                
                Spacer()
            }
            .font(.caption)
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
    
    private var generalSearchSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("General Search")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            TextField("Search across all fields...", text: $searchCriteria.generalText)
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
    
    private var personCriteriaSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Person Criteria")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            VStack(spacing: 4) {
                TextField("Name", text: $searchCriteria.personName)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                TextField("Email", text: $searchCriteria.personEmail)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                TextField("City", text: $searchCriteria.personCity)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                // Jobs multi-select
                JobsSelectionView(selectedJobs: $searchCriteria.personJobs)
                
                // Languages multi-select
                LanguagesSelectionView(selectedLanguages: $searchCriteria.personLanguages)
                
                // Organization dropdown
                OrganizationSelectionView(
                    selectedOrganization: $searchCriteria.personOrganization,
                    organizations: organizationViewModel.organizations,
                    label: "Organization"
                )
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 260)
    }
    
    private var projectCriteriaSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Project Criteria")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            VStack(spacing: 4) {
                TextField("Project Name", text: $searchCriteria.projectName)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                TextField("Project Number", text: $searchCriteria.projectNumber)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                TextField("Inquiry Country", text: $searchCriteria.projectInquiryCountry)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                TextField("Shooting Location", text: $searchCriteria.projectShootingLocation)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                // Project Status multi-select
                ProjectStatusSelectionView(selectedStatuses: $searchCriteria.projectStatus)
                
                // Client Organization dropdown
                OrganizationSelectionView(
                    selectedOrganization: $searchCriteria.projectClientOrganization,
                    organizations: organizationViewModel.organizations,
                    label: "Client Org"
                )
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 260)
    }
    
    private var organizationCriteriaSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Organization Criteria")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            VStack(spacing: 4) {
                TextField("Organization Name", text: $searchCriteria.organizationName)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
                
                // Spacer to align with other sections
                Spacer()
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 260)
    }
    
    private var searchButtonSection: some View {
        HStack {
            Spacer()
            
            Button("Search") {
                onSearch()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(isSearching || searchCriteria.isEmpty)
            .keyboardShortcut(.return, modifiers: [])
            
            if isSearching {
                ProgressView()
                    .controlSize(.small)
                    .padding(.leading, 8)
            }
            
            Spacer()
        }
    }
}

// MARK: - Advanced Search Results Pane
struct AdvancedSearchResultsPane: View {
    let searchResults: AdvancedSearchResults
    let isSearching: Bool
    let hasPerformedSearch: Bool
    let errorMessage: String?
    let searchCriteria: AdvancedSearchCriteria
    var visualDebugActive: Bool = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Results Header
            HStack {
                Text("Search Results")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                if hasPerformedSearch {
                    Text("(\(searchResults.totalCount) results in \(String(format: "%.0f", searchResults.executionTimeMs))ms)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
                
                if searchCriteria.hasMultipleCriteria {
                    Text(searchCriteria.useAndLogic ? "AND Logic" : "OR Logic")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(searchCriteria.useAndLogic ? .blue.opacity(0.2) : .orange.opacity(0.2))
                        .foregroundStyle(searchCriteria.useAndLogic ? .blue : .orange)
                        .clipShape(Capsule())
                }
            }
            .padding()
            
            // Results Content
            if isSearching {
                VStack {
                    ProgressView("Searching...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            } else if let errorMessage = errorMessage {
                ContentUnavailableView(
                    "Search Error",
                    systemImage: "exclamationmark.triangle",
                    description: Text(errorMessage)
                )
                .foregroundStyle(.red)
            } else if !hasPerformedSearch {
                ContentUnavailableView(
                    "Ready to Search",
                    systemImage: "magnifyingglass",
                    description: Text("Configure your search criteria above and click Search")
                )
            } else if searchResults.isEmpty {
                ContentUnavailableView(
                    "No Results Found",
                    systemImage: "magnifyingglass",
                    description: Text("Try adjusting your search criteria or using OR logic")
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        // People section
                        if !searchResults.people.isEmpty {
                            AdvancedSearchSection(title: "People (\(searchResults.people.count))") {
                                ForEach(searchResults.people) { result in
                                    AdvancedSearchResultRow(
                                        title: result.displayName,
                                        subtitle: result.displaySubtitle,
                                        icon: "person.fill",
                                        iconColor: .blue
                                    )
                                }
                            }
                        }
                        
                        // Projects section
                        if !searchResults.projects.isEmpty {
                            if !searchResults.people.isEmpty {
                                Divider().padding(.horizontal, 4)
                            }
                            
                            AdvancedSearchSection(title: "Projects (\(searchResults.projects.count))") {
                                ForEach(searchResults.projects) { result in
                                    AdvancedSearchResultRow(
                                        title: result.displayName,
                                        subtitle: result.displaySubtitle,
                                        icon: "folder.fill",
                                        iconColor: .blue
                                    )
                                }
                            }
                        }
                        
                        // Organizations section
                        if !searchResults.organizations.isEmpty {
                            if !searchResults.people.isEmpty || !searchResults.projects.isEmpty {
                                Divider().padding(.horizontal, 4)
                            }
                            
                            AdvancedSearchSection(title: "Organizations (\(searchResults.organizations.count))") {
                                ForEach(searchResults.organizations) { result in
                                    AdvancedSearchResultRow(
                                        title: result.displayName,
                                        subtitle: result.displaySubtitle,
                                        icon: "building.2.fill",
                                        iconColor: .orange
                                    )
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
    }
}

// MARK: - Supporting Components for Multi-Select Fields

struct JobsSelectionView: View {
    @Binding var selectedJobs: [JobType]
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    Text(selectedJobs.isEmpty ? "Select Jobs" : "\(selectedJobs.count) job(s)")
                        .foregroundStyle(selectedJobs.isEmpty ? .secondary : .primary)
                        .font(.caption)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(.separator, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .frame(height: 26)
            
            if isExpanded {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 2) {
                        ForEach(JobType.allCases, id: \.self) { job in
                            Toggle(job.displayName, isOn: Binding(
                                get: { selectedJobs.contains(job) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedJobs.append(job)
                                    } else {
                                        selectedJobs.removeAll { $0 == job }
                                    }
                                }
                            ))
                            .toggleStyle(.checkbox)
                            .font(.caption)
                        }
                    }
                    .padding(6)
                }
                .frame(maxHeight: 120)
                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(.separator, lineWidth: 1)
                )
            }
        }
    }
}

struct LanguagesSelectionView: View {
    @Binding var selectedLanguages: [Language]
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    Text(selectedLanguages.isEmpty ? "Select Languages" : "\(selectedLanguages.count) language(s)")
                        .foregroundStyle(selectedLanguages.isEmpty ? .secondary : .primary)
                        .font(.caption)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(.separator, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .frame(height: 26)
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Language.allCases, id: \.self) { language in
                        Toggle(language.displayName, isOn: Binding(
                            get: { selectedLanguages.contains(language) },
                            set: { isSelected in
                                if isSelected {
                                    selectedLanguages.append(language)
                                } else {
                                    selectedLanguages.removeAll { $0 == language }
                                }
                            }
                        ))
                        .toggleStyle(.checkbox)
                        .font(.caption)
                    }
                }
                .padding(6)
                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(.separator, lineWidth: 1)
                )
            }
        }
    }
}

struct ProjectStatusSelectionView: View {
    @Binding var selectedStatuses: [ProjectStatus]
    @State private var isExpanded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Button(action: { isExpanded.toggle() }) {
                HStack {
                    Text(selectedStatuses.isEmpty ? "Select Status" : "\(selectedStatuses.count) status(es)")
                        .foregroundStyle(selectedStatuses.isEmpty ? .secondary : .primary)
                        .font(.caption)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(.separator, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .frame(height: 26)
            
            if isExpanded {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(ProjectStatus.allCases, id: \.self) { status in
                        Toggle(status.rawValue, isOn: Binding(
                            get: { selectedStatuses.contains(status) },
                            set: { isSelected in
                                if isSelected {
                                    selectedStatuses.append(status)
                                } else {
                                    selectedStatuses.removeAll { $0 == status }
                                }
                            }
                        ))
                        .toggleStyle(.checkbox)
                        .font(.caption)
                    }
                }
                .padding(6)
                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(.separator, lineWidth: 1)
                )
            }
        }
    }
}

struct OrganizationSelectionView: View {
    @Binding var selectedOrganization: UUID?
    let organizations: [Organization]
    let label: String
    
    var body: some View {
        Menu {
            Button("No \(label)") {
                selectedOrganization = nil
            }
            
            if !organizations.isEmpty {
                Divider()
                
                ForEach(organizations) { organization in
                    Button(organization.name) {
                        selectedOrganization = organization.id
                    }
                }
            }
        } label: {
            HStack {
                Text(selectedOrganizationName)
                    .foregroundStyle(selectedOrganization == nil ? .secondary : .primary)
                    .font(.caption)
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(.background, in: RoundedRectangle(cornerRadius: 4))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(.separator, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .frame(height: 26)
    }
    
    private var selectedOrganizationName: String {
        if let selectedId = selectedOrganization,
           let organization = organizations.first(where: { $0.id == selectedId }) {
            return organization.name
        }
        return "Select \(label)"
    }
}

// MARK: - Search Section and Result Row Components
struct AdvancedSearchSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 8)
            
            content()
        }
    }
}

struct AdvancedSearchResultRow: View {
    let title: String
    let subtitle: String
    let icon: String
    let iconColor: Color
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(iconColor)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            
            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(.background, in: RoundedRectangle(cornerRadius: 4))
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(.separator, lineWidth: 0.5)
        )
    }
} 