//
//  PersonDetailBottomPane.swift
//  CrewBooklet
//
//  Person detail view for bottom navigation pane with Information, Financial, Projects tabs
//  Dense, minimalistic design with low but non-zero margins and padding
//

import SwiftUI

struct PersonDetailBottomPane: View {
    @Binding var person: Person
    @Binding var isPresented: Bool
    @State private var selectedTab: DetailTab = .information
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var saveTimer: Timer?
    @State private var connectedProjects: [Project] = []
    @State private var availableOrganizations: [Organization] = []
    
    enum DetailTab: String, CaseIterable {
        case information = "Information"
        case financial = "Financial"
        case projects = "Projects"
        
        var icon: String {
            switch self {
            case .information: return "person.text.rectangle"
            case .financial: return "banknote"
            case .projects: return "folder"
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
                    case .financial:
                        financialTabContent
                    case .projects:
                        projectsTabContent
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            await loadConnectedProjects()
            await loadOrganizations()
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
        .onChange(of: person.name) { _, _ in scheduleAutoSave() }
        .onChange(of: person.gender) { _, _ in scheduleAutoSave() }
        .onChange(of: person.organizationId) { _, _ in scheduleAutoSave() }
        .onChange(of: person.email) { _, _ in scheduleAutoSave() }
        .onChange(of: person.website) { _, _ in scheduleAutoSave() }
        .onChange(of: person.mobilePhone) { _, _ in scheduleAutoSave() }
        .onChange(of: person.workPhone) { _, _ in scheduleAutoSave() }
        .onChange(of: person.address?.street1) { _, _ in scheduleAutoSave() }
        .onChange(of: person.address?.street2) { _, _ in scheduleAutoSave() }
        .onChange(of: person.address?.zip) { _, _ in scheduleAutoSave() }
        .onChange(of: person.address?.city) { _, _ in scheduleAutoSave() }
        .onChange(of: person.address?.country) { _, _ in scheduleAutoSave() }
        .onChange(of: person.notes) { _, _ in scheduleAutoSave() }
    }
    
    private var informationGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8)
        ]
        
        return LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
                // Name
                uniformField("Name", text: $person.name)
                
                // Gender
                VStack(alignment: .leading, spacing: 2) {
                    Text("Gender")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Picker("Gender", selection: Binding(
                        get: { person.gender ?? .other },
                        set: { person.gender = $0 }
                    )) {
                        ForEach(Gender.allCases, id: \.self) { gender in
                            Text(gender.displayName).tag(gender)
                        }
                    }
                    .pickerStyle(.menu)
                    .font(.caption)
                    .frame(height: 24)
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
                }
                
                // Organization Selector
                VStack(alignment: .leading, spacing: 2) {
                    Text("Organization")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    SearchableDropdown(
                        title: "Select Organization",
                        options: availableOrganizations,
                        displayText: { $0.name },
                        searchText: { $0.name },
                        selection: Binding(
                            get: { 
                                availableOrganizations.first { $0.id == person.organizationId }
                            },
                            set: { organization in
                                person.organizationId = organization?.id
                            }
                        ),
                        allowCustomText: false,
                        customText: .constant("")
                    )
                    .frame(height: 24)
                }
                
                // Email
                uniformField("Email", text: Binding(
                    get: { person.email ?? "" },
                    set: { person.email = $0.isEmpty ? nil : $0 }
                ))
                
                // Website
                uniformField("Website", text: Binding(
                    get: { person.website ?? "" },
                    set: { person.website = $0.isEmpty ? nil : $0 }
                ))
                
                // Mobile Phone
                uniformField("Mobile Phone", text: Binding(
                    get: { person.mobilePhone ?? "" },
                    set: { person.mobilePhone = $0.isEmpty ? nil : $0 }
                ))
                
                // Work Phone
                uniformField("Work Phone", text: Binding(
                    get: { person.workPhone ?? "" },
                    set: { person.workPhone = $0.isEmpty ? nil : $0 }
                ))
                
                // Street 1
                uniformField("Street 1", text: Binding(
                    get: { person.address?.street1 ?? "" },
                    set: { 
                        if person.address == nil { person.address = Address() }
                        person.address?.street1 = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Street 2
                uniformField("Street 2", text: Binding(
                    get: { person.address?.street2 ?? "" },
                    set: { 
                        if person.address == nil { person.address = Address() }
                        person.address?.street2 = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // ZIP Code
                uniformField("ZIP", text: Binding(
                    get: { person.address?.zip ?? "" },
                    set: { 
                        if person.address == nil { person.address = Address() }
                        person.address?.zip = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // City
                uniformField("City", text: Binding(
                    get: { person.address?.city ?? "" },
                    set: { 
                        if person.address == nil { person.address = Address() }
                        person.address?.city = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Country
                uniformField("Country", text: Binding(
                    get: { person.address?.country ?? "" },
                    set: { 
                        if person.address == nil { person.address = Address() }
                        person.address?.country = $0.isEmpty ? nil : $0 
                    }
                ))
            
            // Jobs and Languages as read-only sections
            if !person.jobs.isEmpty || !person.languages.isEmpty {
                jobsAndLanguagesSection
            }
            
            // Notes section
            notesSection
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
    
    private var jobsAndLanguagesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !person.jobs.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Jobs")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 4) {
                        ForEach(person.jobs, id: \.self) { job in
                            Text(job.displayName)
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(.secondary.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
            
            if !person.languages.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Languages")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 4) {
                        ForEach(person.languages, id: \.self) { language in
                            Text(language.displayName)
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(.secondary.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
    
    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Notes")
                .font(.caption)
                .foregroundStyle(.secondary)
            TextEditor(text: Binding(
                get: { person.notes ?? "" },
                set: { person.notes = $0.isEmpty ? nil : $0 }
            ))
            .font(.caption)
            .frame(height: 80)
            .padding(8)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
        }
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
    }
    
    private var financialTabContent: some View {
        ScrollView {
            financialGrid
        }
        .onChange(of: person.financialDetails?.vatNumber) { _, _ in scheduleAutoSave() }
        .onChange(of: person.financialDetails?.bankName) { _, _ in scheduleAutoSave() }
        .onChange(of: person.financialDetails?.iban) { _, _ in scheduleAutoSave() }
        .onChange(of: person.financialDetails?.bic) { _, _ in scheduleAutoSave() }
        .onChange(of: person.financialDetails?.accountNumber) { _, _ in scheduleAutoSave() }
        .onChange(of: person.financialDetails?.routingNumber) { _, _ in scheduleAutoSave() }
    }
    
    private var financialGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8)
        ]
        
        return LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
                // VAT Number
                uniformField("VAT Number", text: Binding(
                    get: { person.financialDetails?.vatNumber ?? "" },
                    set: { 
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.vatNumber = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Bank Name
                uniformField("Bank Name", text: Binding(
                    get: { person.financialDetails?.bankName ?? "" },
                    set: { 
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.bankName = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // IBAN
                uniformField("IBAN", text: Binding(
                    get: { person.financialDetails?.iban ?? "" },
                    set: { 
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.iban = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // BIC/SWIFT
                uniformField("BIC/SWIFT", text: Binding(
                    get: { person.financialDetails?.bic ?? "" },
                    set: { 
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.bic = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Account Number
                uniformField("Account Number", text: Binding(
                    get: { person.financialDetails?.accountNumber ?? "" },
                    set: { 
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.accountNumber = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Routing Number
                uniformField("Routing Number", text: Binding(
                    get: { person.financialDetails?.routingNumber ?? "" },
                    set: { 
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.routingNumber = $0.isEmpty ? nil : $0 
                    }
                ))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
    
    private var projectsTabContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Associated Projects")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                if connectedProjects.isEmpty {
                    Text("No projects found")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(connectedProjects) { project in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                    if let description = project.description {
                                        Text(description)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                    Text("Status: \(project.status.rawValue)")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(8)
                            .background(Color(.controlBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
                        }
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - Data Loading
    private func loadConnectedProjects() async {
        do {
            connectedProjects = try await supabaseService.fetchProjectsForPerson(person.id)
        } catch {
            print("Error loading connected projects: \(error)")
            await MainActor.run {
                connectedProjects = []
            }
        }
    }
    
    private func loadOrganizations() async {
        do {
            availableOrganizations = try await supabaseService.fetchOrganizations()
        } catch {
            print("Error loading organizations: \(error)")
            await MainActor.run {
                availableOrganizations = []
            }
        }
    }
    
    // MARK: - Auto Save
    private func scheduleAutoSave() {
        saveTimer?.invalidate()
        saveTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
            Task {
                await savePerson()
            }
        }
    }
    
    private func savePerson() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updatePerson(person)
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
    @Previewable @State var person = Person(name: "John Doe", email: "john@example.com")
    @Previewable @State var isPresented = true
    
    PersonDetailBottomPane(person: $person, isPresented: $isPresented)
}