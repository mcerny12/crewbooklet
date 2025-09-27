//
//  OrganizationDetailBottomPane.swift
//  CrewBooklet
//
//  Organization detail view for bottom navigation pane with Information, Financial, Projects, People tabs
//  Dense, minimalistic design with low but non-zero margins and padding
//

import SwiftUI

struct OrganizationDetailBottomPane: View {
    @Binding var organization: Organization
    @Binding var isPresented: Bool
    @State private var selectedTab: DetailTab = .information
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var connectedPeople: [Person] = []
    @State private var connectedProjects: [Project] = []
    @State private var saveTimer: Timer?
    
    enum DetailTab: String, CaseIterable {
        case information = "Information"
        case financial = "Financial"
        case projects = "Projects"
        case people = "People"
        
        var icon: String {
            switch self {
            case .information: return "building.2"
            case .financial: return "banknote"
            case .projects: return "folder"
            case .people: return "person.2"
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
                    case .people:
                        peopleTabContent
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            await loadConnectedData()
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
            VStack(spacing: 8) {
                // Basic Information Grid
                basicInformationGrid
                
                // Business Type Section
                if !organization.jobs.isEmpty {
                    businessTypeSection
                }
                
                // Notes Section
                notesSection
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .onChange(of: organization.name) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.contactEmail) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.contactPhone) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.street) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.street2) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.zip) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.city) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.country) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.notes) { _, _ in scheduleAutoSave() }
    }
    
    private var basicInformationGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8)
        ]
        
        return LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
                // Organization Name
                uniformField("Organization Name", text: $organization.name)
                
                // Contact Email
                uniformField("Contact Email", text: Binding(
                    get: { organization.contactEmail ?? "" },
                    set: { organization.contactEmail = $0.isEmpty ? nil : $0 }
                ))
                
                // Contact Phone
                uniformField("Contact Phone", text: Binding(
                    get: { organization.contactPhone ?? "" },
                    set: { organization.contactPhone = $0.isEmpty ? nil : $0 }
                ))
                
                // Website (not in model, skip for now)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Website")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("Not available")
                        .font(.caption)
                        .frame(height: 24)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 8)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
                }
                
                // Main Address - Street
                uniformField("Street", text: Binding(
                    get: { organization.street ?? "" },
                    set: { organization.street = $0.isEmpty ? nil : $0 }
                ))
                .gridCellColumns(2)
                
                // Main Address - Street 2
                uniformField("Street 2", text: Binding(
                    get: { organization.street2 ?? "" },
                    set: { organization.street2 = $0.isEmpty ? nil : $0 }
                ))
                
                // Main Address - ZIP
                uniformField("ZIP", text: Binding(
                    get: { organization.zip ?? "" },
                    set: { organization.zip = $0.isEmpty ? nil : $0 }
                ))
                
                // Main Address - City
                uniformField("City", text: Binding(
                    get: { organization.city ?? "" },
                    set: { organization.city = $0.isEmpty ? nil : $0 }
                ))
                
                // Main Address - Country
                uniformField("Country", text: Binding(
                    get: { organization.country ?? "" },
                    set: { organization.country = $0.isEmpty ? nil : $0 }
                ))
        }
    }
    
    private var businessTypeSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Business Types")
                .font(.caption)
                .foregroundStyle(.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 4) {
                ForEach(organization.jobs, id: \.self) { jobType in
                    Text(jobType.displayName)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.secondary.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
        }
    }
    
    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Notes")
                .font(.caption)
                .foregroundStyle(.secondary)
            TextEditor(text: Binding(
                get: { organization.notes ?? "" },
                set: { organization.notes = $0.isEmpty ? nil : $0 }
            ))
            .font(.caption)
            .frame(height: 80)
            .padding(8)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
        }
    }
    
    private var financialTabContent: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Main financial information
                financialMainGrid
                
                // Invoice Address Section
                invoiceAddressSection
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .onChange(of: organization.financialDetails?.vatNumber) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.financialDetails?.bankName) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.financialDetails?.iban) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.financialDetails?.bic) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.financialDetails?.accountNumber) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.financialDetails?.routingNumber) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.nameInvoice) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.streetInvoice) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.street2Invoice) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.zipInvoice) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.cityInvoice) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.countryInvoice) { _, _ in scheduleAutoSave() }
    }
    
    private var financialMainGrid: some View {
        let columns = [
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8),
            GridItem(.flexible(), spacing: 8)
        ]
        
        return LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
                // VAT Number
                uniformField("VAT Number", text: Binding(
                    get: { organization.financialDetails?.vatNumber ?? "" },
                    set: { 
                        if organization.financialDetails == nil { 
                            organization.financialDetails = FinancialDetails() 
                        }
                        organization.financialDetails?.vatNumber = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Bank Name
                uniformField("Bank Name", text: Binding(
                    get: { organization.financialDetails?.bankName ?? "" },
                    set: { 
                        if organization.financialDetails == nil { 
                            organization.financialDetails = FinancialDetails() 
                        }
                        organization.financialDetails?.bankName = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // IBAN
                uniformField("IBAN", text: Binding(
                    get: { organization.financialDetails?.iban ?? "" },
                    set: { 
                        if organization.financialDetails == nil { 
                            organization.financialDetails = FinancialDetails() 
                        }
                        organization.financialDetails?.iban = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // BIC/SWIFT
                uniformField("BIC/SWIFT", text: Binding(
                    get: { organization.financialDetails?.bic ?? "" },
                    set: { 
                        if organization.financialDetails == nil { 
                            organization.financialDetails = FinancialDetails() 
                        }
                        organization.financialDetails?.bic = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Account Number
                uniformField("Account Number", text: Binding(
                    get: { organization.financialDetails?.accountNumber ?? "" },
                    set: { 
                        if organization.financialDetails == nil { 
                            organization.financialDetails = FinancialDetails() 
                        }
                        organization.financialDetails?.accountNumber = $0.isEmpty ? nil : $0 
                    }
                ))
                
                // Routing Number
                uniformField("Routing Number", text: Binding(
                    get: { organization.financialDetails?.routingNumber ?? "" },
                    set: { 
                        if organization.financialDetails == nil { 
                            organization.financialDetails = FinancialDetails() 
                        }
                        organization.financialDetails?.routingNumber = $0.isEmpty ? nil : $0 
                    }
                ))
        }
    }
    
    private var invoiceAddressSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Invoice Address")
                .font(.caption)
                .foregroundStyle(.secondary)
            
            let invoiceColumns = [
                GridItem(.flexible(), spacing: 8),
                GridItem(.flexible(), spacing: 8),
                GridItem(.flexible(), spacing: 8)
            ]
            
            LazyVGrid(columns: invoiceColumns, alignment: .leading, spacing: 8) {
                // Invoice Name
                uniformField("Invoice Company Name", text: Binding(
                    get: { organization.nameInvoice ?? "" },
                    set: { organization.nameInvoice = $0.isEmpty ? nil : $0 }
                ))
                .gridCellColumns(3)
                
                // Invoice Street
                uniformField("Invoice Street", text: Binding(
                    get: { organization.streetInvoice ?? "" },
                    set: { organization.streetInvoice = $0.isEmpty ? nil : $0 }
                ))
                .gridCellColumns(2)
                
                // Invoice Street 2
                uniformField("Invoice Street 2", text: Binding(
                    get: { organization.street2Invoice ?? "" },
                    set: { organization.street2Invoice = $0.isEmpty ? nil : $0 }
                ))
                
                // Invoice ZIP
                uniformField("Invoice ZIP", text: Binding(
                    get: { organization.zipInvoice ?? "" },
                    set: { organization.zipInvoice = $0.isEmpty ? nil : $0 }
                ))
                
                // Invoice City
                uniformField("Invoice City", text: Binding(
                    get: { organization.cityInvoice ?? "" },
                    set: { organization.cityInvoice = $0.isEmpty ? nil : $0 }
                ))
                
                // Invoice Country
                uniformField("Invoice Country", text: Binding(
                    get: { organization.countryInvoice ?? "" },
                    set: { organization.countryInvoice = $0.isEmpty ? nil : $0 }
                ))
            }
        }
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
    
    private var peopleTabContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Connected People")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                if connectedPeople.isEmpty {
                    Text("No people found")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(connectedPeople) { person in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(person.name)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                    if let email = person.email {
                                        Text(email)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if !person.jobs.isEmpty {
                                    Text(person.jobs.first?.displayName ?? "")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
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
    private func loadConnectedData() async {
        do {
            // Load connected projects for this organization
            connectedProjects = try await supabaseService.fetchProjectsForOrganization(organization.id)
            
            // Load connected people - people who have worked on projects for this organization
            var allPeople: Set<Person> = []
            for project in connectedProjects {
                let peopleForProject = try await supabaseService.fetchPeopleForProject(project.id)
                for (person, _) in peopleForProject {
                    allPeople.insert(person)
                }
            }
            
            await MainActor.run {
                connectedPeople = Array(allPeople)
            }
        } catch {
            print("Error loading connected data: \(error)")
            await MainActor.run {
                connectedPeople = []
                connectedProjects = []
            }
        }
    }
    
    // MARK: - Auto Save
    private func scheduleAutoSave() {
        saveTimer?.invalidate()
        saveTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
            Task {
                await saveOrganization()
            }
        }
    }
    
    private func saveOrganization() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updateOrganization(organization)
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
    @Previewable @State var organization = Organization(name: "Example Corp", contactEmail: "contact@example.com")
    @Previewable @State var isPresented = true
    
    OrganizationDetailBottomPane(organization: $organization, isPresented: $isPresented)
}