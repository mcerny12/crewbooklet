//
//  ProjectDetailOverlay.swift
//  CrewBooklet
//
//  Full overlay project detail view that positions the title in the exact same location
//  as the first row in the project list for seamless transition
//

import SwiftUI

struct ProjectDetailOverlay: View {
    @Binding var project: Project
    @Binding var isPresented: Bool
    @State private var selectedTab: ProjectDetailTab = .information
    
    // Crew data loading
    @State private var projectAssignments: [(ProjectAssignment, Person)] = []
    @State private var isLoadingCrew = false
    private let supabaseService = SupabaseService.shared
    
    enum ProjectDetailTab: String, CaseIterable {
        case information = "Information"
        case crew = "Crew" 
        case financial = "Financial"
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background overlay - covers entire window
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .ignoresSafeArea(.all)
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            isPresented = false
                        }
                    }
                
                // Main content overlay - covers entire content area
                VStack(spacing: 0) {
                    // Project title header - positioned exactly where first list row would be
                    projectTitleHeader
                    
                    // Tab navigation - compact and responsive
                    tabNavigationView
                    
                    // Main content area
                    ScrollView {
                        switch selectedTab {
                        case .information:
                            informationContentView
                        case .crew:
                            crewContentView  
                        case .financial:
                            financialContentView
                        }
                    }
                    .background(.background)
                }
                .background(.background)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .task {
                    await loadProjectCrew()
                }
                .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 2)
                .padding(.horizontal, 16)
                .padding(.top, calculateProjectListTopOffset(geometry: geometry))
            }
        }
    }
    
    // MARK: - Project Title Header (exact position as first list row)
    private var projectTitleHeader: some View {
        HStack(spacing: 12) {
            // Project name and number - IDENTICAL to MacOSProjectListRow
            HStack(spacing: 8) {
                Text(project.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                Text("•")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Text(project.projectNumber)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Status and date - IDENTICAL to MacOSProjectListRow 
            HStack(spacing: 8) {
                // Status pill
                Text(project.status.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusColor(for: project.status))
                    .foregroundStyle(.white)
                    .cornerRadius(10)
                
                // Created date
                Text(formatDate(project.createdAt))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                // Back arrow 
                Image(systemName: "chevron.left")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 12) // Match MacOSProjectListRow exactly
        .padding(.vertical, 9)    // Match MacOSProjectListRow exactly
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.3)) {
                isPresented = false
            }
        }
    }
    
    // MARK: - Tab Navigation - Compact & Responsive
    private var tabNavigationView: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(ProjectDetailTab.allCases, id: \.self) { tab in
                    Button(action: {
                        selectedTab = tab // Remove animation for instant response
                    }) {
                        Text(tab.rawValue)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8) // Smaller padding
                            .background(selectedTab == tab ? Color.accentColor.opacity(0.15) : Color.clear)
                            .contentShape(Rectangle()) // Better hit target
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(.thinMaterial)
            
            Divider()
                .opacity(0.3)
        }
    }
    
    // MARK: - Content Views
    private var informationContentView: some View {
        HStack(alignment: .top, spacing: 24) {
            // Left Column - Basic Info & Status
            VStack(alignment: .leading, spacing: 20) {
                // Basic Information
                VStack(alignment: .leading, spacing: 16) {
                    Text("Basic Information")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    VStack(spacing: 12) {
                        InfoField(label: "Project Number", value: project.projectNumber)
                        
                        InfoEditableField(
                            label: "Project Name", 
                            text: Binding(
                                get: { project.name },
                                set: { value in
                                    var updatedProject = project
                                    updatedProject.name = value
                                    self.project = updatedProject
                                }
                            )
                        )
                        
                        InfoField(
                            label: "Client Organization", 
                            value: "No client organization" // TODO: Load organization name from clientOrganizationId
                        )
                    }
                }
                
                // Status Information  
                VStack(alignment: .leading, spacing: 16) {
                    Text("Status Information")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    VStack(spacing: 12) {
                        InfoDropdownField(
                            label: "Status",
                            selection: Binding(
                                get: { project.status },
                                set: { value in
                                    var updatedProject = project
                                    updatedProject.status = value
                                    self.project = updatedProject
                                }
                            ),
                            options: ProjectStatus.allCases,
                            displayText: { $0.rawValue.uppercased() }
                        )
                        
                        InfoField(label: "Created", value: "30.06.25")
                        
                        InfoDateField(
                            label: "Start",
                            date: Binding(
                                get: { project.startDate ?? Date() },
                                set: { value in
                                    var updatedProject = project
                                    updatedProject.startDate = value
                                    self.project = updatedProject
                                }
                            )
                        )
                        
                        InfoDateField(
                            label: "End", 
                            date: Binding(
                                get: { project.endDate ?? Date() },
                                set: { value in
                                    var updatedProject = project
                                    updatedProject.endDate = value
                                    self.project = updatedProject
                                }
                            )
                        )
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
            
            // Right Column - Description & Crew
            VStack(alignment: .leading, spacing: 20) {
                // Description - Full width for information tab
                VStack(alignment: .leading, spacing: 16) {
                    Text("Description")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    TextEditor(text: Binding(
                        get: { project.description ?? "" },
                        set: { value in
                            var updatedProject = project
                            updatedProject.description = value.isEmpty ? nil : value
                            self.project = updatedProject
                        }
                    ))
                    .frame(minHeight: 200)
                    .scrollContentBackground(.hidden)
                    .background(.background)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(.quaternary, lineWidth: 1)
                    )
                }
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
    }
    
    // MARK: - Crew Members Section
    @State private var crewSortOption: CrewSortOption = .name
    
    enum CrewSortOption: String, CaseIterable {
        case name = "Name"
        case role = "Role" 
        case organization = "Organization"
        case status = "Status"
    }
    
    private var crewMembersSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with sort options
            HStack {
                Text("Crew & Organizations")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                // Sort picker
                Menu {
                    ForEach(CrewSortOption.allCases, id: \.self) { option in
                        Button(option.rawValue) {
                            crewSortOption = option
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.caption)
                        Text("Sort")
                            .font(.caption)
                    }
                }
                .buttonStyle(.bordered)
                
                Button(action: {
                    // Add crew member action
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.caption)
                        Text("Add Person")
                            .font(.caption)
                    }
                }
                .buttonStyle(.bordered)
            }
            
            // Crew member and organization list
            VStack(spacing: 0) {
                // Header row
                HStack(spacing: 12) {
                    Button(action: { crewSortOption = .name }) {
                        HStack(spacing: 2) {
                            Text("Name")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.secondary)
                            if crewSortOption == .name {
                                Image(systemName: "chevron.up")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .frame(width: 120, alignment: .leading)
                    
                    Button(action: { crewSortOption = .status }) {
                        HStack(spacing: 2) {
                            Text("Status")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.secondary)
                            if crewSortOption == .status {
                                Image(systemName: "chevron.up")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .frame(width: 80, alignment: .leading)
                    
                    Text("Rate")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .frame(width: 80, alignment: .trailing)
                    
                    Text("Contact")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .frame(width: 150, alignment: .leading)
                    
                    Text("Notes")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    
                    Text("")
                        .frame(width: 24) // Delete button space
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.quaternary.opacity(0.3))
                
                Divider()
                
                // Crew members and organizations
                if isLoadingCrew {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("Loading crew...")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 20)
                } else if projectAssignments.isEmpty {
                    VStack(spacing: 8) {
                        Text("No crew members assigned")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Button("Add First Crew Member") {
                            // TODO: Add crew member action
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                    .padding(.vertical, 20)
                } else {
                    ForEach(Array(projectAssignments.enumerated()), id: \.offset) { index, assignmentData in
                        let (assignment, person) = assignmentData
                        
                        CrewMemberRowView(
                            assignment: assignment,
                            person: person,
                            onRemove: {
                                Task {
                                    await removeCrewMember(assignment)
                                }
                            }
                        )
                        
                        if index < projectAssignments.count - 1 {
                            Divider()
                                .opacity(0.5)
                        }
                    }
                }
            }
            .background(.regularMaterial)
            .cornerRadius(8)
        }
    }
    
    
    // MARK: - Data Loading Functions
    private func loadProjectCrew() async {
        isLoadingCrew = true
        do {
            let assignments = try await supabaseService.fetchProjectAssignmentsWithPeople(projectId: project.id)
            await MainActor.run {
                self.projectAssignments = assignments
                self.isLoadingCrew = false
            }
        } catch {
            await MainActor.run {
                self.isLoadingCrew = false
                print("Error loading project crew: \(error)")
            }
        }
    }
    
    private func removeCrewMember(_ assignment: ProjectAssignment) async {
        do {
            try await supabaseService.removeProjectAssignment(id: assignment.id)
            await loadProjectCrew() // Reload the crew list
        } catch {
            print("Error removing crew member: \(error)")
        }
    }
    
    private var crewContentView: some View {
        VStack(alignment: .leading, spacing: 20) {
            crewMembersSection
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
    }
    
    private var financialContentView: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Simple budget field for now
            VStack(alignment: .leading, spacing: 16) {
                Text("Budget")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                InfoEditableField(label: "Total Budget", text: .constant("50.000,00 €"))
            }
            
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 20)
    }
    
    // MARK: - Positioning Calculations  
    private func calculateProjectListTopOffset(geometry: GeometryProxy) -> CGFloat {
        // BACK TO WORKING CALCULATION: 32px was close to correct
        // Title was slightly too high at 32px, slightly too low now
        // Need to find the sweet spot between 30-35px upward adjustment
        
        let safeAreaTop = geometry.safeAreaInsets.top
        let lazyVStackPadding: CGFloat = 16 // From LazyVStack .padding()
        
        // Fine-tune: 32px was close, try 34px for perfect alignment
        let upwardAdjustment: CGFloat = 34
        
        return safeAreaTop + lazyVStackPadding - upwardAdjustment
    }
    
    // MARK: - Helper Functions  
    private func statusColor(for status: ProjectStatus) -> Color {
        switch status {
        case .inquiry:
            return .orange
        case .budget:
            return .blue
        case .production:
            return .green
        case .completed:
            return .green
        case .cancelled:
            return .red
        case .hold:
            return .yellow
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd.MM.yy"
        return formatter.string(from: date)
    }
}

// MARK: - CrewMemberRowView Component
struct CrewMemberRowView: View {
    let assignment: ProjectAssignment
    let person: Person
    let onRemove: () -> Void
    
    private var statusColor: Color {
        switch assignment.availability {
        case .anfragen:
            return .blue
        case .angefragt:
            return .orange
        case .verfuegbar:
            return .green
        case .nichtVerfuegbar:
            return .red
        case .ersteOption:
            return .purple
        case .zweiteOption:
            return .purple
        case .gebucht:
            return .green
        case .abgesagt:
            return .red
        case .keineRueckmeldung:
            return .gray
        }
    }
    
    private var statusText: String {
        switch assignment.availability {
        case .anfragen:
            return "To Inquire"
        case .angefragt:
            return "Inquired"
        case .verfuegbar:
            return "Available"
        case .nichtVerfuegbar:
            return "Not Available"
        case .ersteOption:
            return "1st Option"
        case .zweiteOption:
            return "2nd Option"
        case .gebucht:
            return "Booked"
        case .abgesagt:
            return "Cancelled"
        case .keineRueckmeldung:
            return "No Response"
        }
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Name and role
            VStack(alignment: .leading, spacing: 2) {
                Text(person.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                Text(assignment.role ?? "No role")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .frame(width: 120, alignment: .leading)
            
            // Status
            Text(statusText)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(statusColor)
                .foregroundStyle(.white)
                .cornerRadius(8)
                .frame(width: 80, alignment: .leading)
            
            // Rate
            Text(assignment.dailyPay?.description ?? "No rate")
                .font(.caption)
                .fontWeight(.medium)
                .frame(width: 80, alignment: .trailing)
            
            // Contact info
            VStack(alignment: .leading, spacing: 1) {
                Text(person.email ?? "No email")
                    .font(.caption)
                    .foregroundStyle(person.email != nil ? .blue : .secondary)
                    .lineLimit(1)
                
                Text(person.mobilePhone ?? "No phone")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .frame(width: 150, alignment: .leading)
            
            // Project notes
            Text(assignment.notes ?? "No notes")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            // Delete button
            Button(action: onRemove) {
                Image(systemName: "trash")
                    .font(.caption)
                    .foregroundStyle(.red)
            }
            .buttonStyle(.plain)
            .help("Remove crew member")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}

// MARK: - Field Components

struct InfoField: View {
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            Text(value)
                .font(.subheadline)
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(.quaternary.opacity(0.3))
                .cornerRadius(6)
        }
    }
}

struct InfoEditableField: View {
    let label: String
    @Binding var text: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            TextField("", text: $text)
                .font(.subheadline)
                .textFieldStyle(.roundedBorder)
        }
    }
}

struct InfoDropdownField<T: Hashable>: View {
    let label: String
    @Binding var selection: T
    let options: [T]
    let displayText: (T) -> String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            Picker("", selection: $selection) {
                ForEach(options, id: \.self) { option in
                    Text(displayText(option))
                        .tag(option)
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct InfoStringDropdownField: View {
    let label: String
    @Binding var selection: String
    let options: [String]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            Picker("", selection: $selection) {
                ForEach(options, id: \.self) { option in
                    Text(option)
                        .tag(option)
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct InfoDateField: View {
    let label: String
    @Binding var date: Date
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            DatePicker("", selection: $date, displayedComponents: .date)
                .datePickerStyle(.compact)
                .labelsHidden()
        }
    }
}
