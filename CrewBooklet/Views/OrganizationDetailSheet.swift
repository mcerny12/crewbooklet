//
//  OrganizationDetailSheet.swift
//  CrewBooklet
//
//  Enhanced Organization Detail View - MATCHES MacOSPersonDetailSheet EXACTLY
//  Drag handle, tabs, resizable height, minimal header with icons only
//

import SwiftUI

struct OrganizationDetailSheet: View {
    enum DetailTab {
        case info
        case people
        case projects
        case accounting
        case documents
        
        var title: String {
            switch self {
            case .info: return "Information"
            case .people: return "People"
            case .projects: return "Projects"
            case .accounting: return "Accounting"
            case .documents: return "Documents"
            }
        }
        
        var icon: String {
            switch self {
            case .info: return "building.2"
            case .people: return "person.2"
            case .projects: return "folder"
            case .accounting: return "banknote"
            case .documents: return "doc.text"
            }
        }
    }
    
    @Binding var organization: Organization
    @Binding var isPresented: Bool
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var currentHeight: CGFloat = 500
    @State private var selectedTab: DetailTab = .info
    var onSave: (() -> Void)? = nil
    var visualDebugActive: Bool = false
    @State private var selectedProject: Project? = nil
    @State private var connectedPeople: [Person] = []
    @State private var connectedProjects: [Project] = []
    @State private var showAddPersonSheet = false
    @State private var showAddProjectSheet = false
    @State private var showDocumentPicker = false
    
    private let supabaseService = SupabaseService.shared
    private let minHeight: CGFloat = 300
    private let maxHeight: CGFloat = 700
    
    var body: some View {
        VStack(spacing: 0) {
            tabSelectionView
            tabContentView
        }
    }

    // MARK: - Tab Content
    private var tabContentView: some View {
        Group {
            switch selectedTab {
            case .info:
                orgInfoTab
            case .people:
                orgPeopleTab
            case .projects:
                orgProjectsTab
            case .accounting:
                orgAccountingTab
            case .documents:
                orgDocumentsTab
            }
        }
    }
    
    // MARK: - Tab Selection
    private var tabSelectionView: some View {
        Picker("", selection: $selectedTab) {
            ForEach([DetailTab.info, .people, .projects, .accounting, .documents], id: \.self) { tab in
                Label(tab.title, systemImage: tab.icon)
                    .tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
    }
    
    // Info tab content (matches MacOSPersonDetailSheet formContentView pattern)
    private var orgInfoTab: some View {
        VStack(spacing: 0) {
            // Two-column layout with equal heights
            HStack(alignment: .top, spacing: 16) {
                // Left column: Basic Info + Contact Info
                VStack(spacing: 12) { 
                    orgBasicInfoSection
                    orgContactInfoSection
                }
                .frame(maxWidth: .infinity)
                
                // Right column: Address + Invoice Address + Notes + Business Type
                VStack(spacing: 12) { 
                    orgAddressSection
                    orgInvoiceAddressSection
                    orgNotesSection
                    orgBusinessTypeSection
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }
    
    private var orgBasicInfoSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Basic Information").font(.subheadline).fontWeight(.medium).foregroundStyle(.secondary)
            VStack(spacing: 4) {
                TextField("Organization Name", text: $organization.name)
                    .textFieldStyle(.roundedBorder)
                    .controlSize(.small)
                    .frame(height: 26)
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 80)
    }
    
    private var orgContactInfoSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Contact Information").font(.subheadline).fontWeight(.medium).foregroundStyle(.secondary)
            VStack(spacing: 4) {
                TextField("Contact Email", text: Binding(
                    get: { organization.contactEmail ?? "" },
                    set: { organization.contactEmail = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                TextField("Contact Phone", text: Binding(
                    get: { organization.contactPhone ?? "" },
                    set: { 
                        let formatted = PhoneNumberFormatter.formatPhoneNumber($0)
                        organization.contactPhone = formatted.isEmpty ? nil : formatted 
                    }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 80)
    }
    
    private var orgAddressSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Address").font(.subheadline).fontWeight(.medium).foregroundStyle(.secondary)
            HStack(spacing: 8) {
                TextField("Street 1", text: Binding(
                    get: { organization.street ?? "" },
                    set: { organization.street = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                TextField("Street 2", text: Binding(
                    get: { organization.street2 ?? "" },
                    set: { organization.street2 = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
            }
            HStack(spacing: 8) {
                TextField("ZIP", text: Binding(
                    get: { organization.zip ?? "" },
                    set: { zipCode in
                        organization.zip = zipCode.isEmpty ? nil : zipCode
                        
                        // Auto-fill city and country if zip code is provided
                        if !zipCode.isEmpty {
                            if let (city, country) = ZipCodeLookup.lookupCityAndCountry(for: zipCode) {
                                if !city.isEmpty && (organization.city?.isEmpty ?? true) {
                                    organization.city = city
                                }
                                if !country.isEmpty && (organization.country?.isEmpty ?? true) {
                                    organization.country = country
                                }
                            }
                        }
                    }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                .frame(maxWidth: 100)
                TextField("City", text: Binding(
                    get: { organization.city ?? "" },
                    set: { organization.city = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                TextField("Country", text: Binding(
                    get: { organization.country ?? "" },
                    set: { organization.country = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                .frame(maxWidth: 120)
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 120)
    }
    
    private var orgInvoiceAddressSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Invoice Address").font(.subheadline).fontWeight(.medium).foregroundStyle(.secondary)
            TextField("Recipient/Company Name", text: Binding(
                get: { organization.nameInvoice ?? "" },
                set: { organization.nameInvoice = $0.isEmpty ? nil : $0 }
            ))
            .textFieldStyle(.roundedBorder)
            HStack(spacing: 8) {
                TextField("Street 1", text: Binding(
                    get: { organization.streetInvoice ?? "" },
                    set: { organization.streetInvoice = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                TextField("Street 2", text: Binding(
                    get: { organization.street2Invoice ?? "" },
                    set: { organization.street2Invoice = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
            }
            HStack(spacing: 8) {
                TextField("ZIP", text: Binding(
                    get: { organization.zipInvoice ?? "" },
                    set: { zipCode in
                        organization.zipInvoice = zipCode.isEmpty ? nil : zipCode
                        
                        // Auto-fill city and country if zip code is provided
                        if !zipCode.isEmpty {
                            if let (city, country) = ZipCodeLookup.lookupCityAndCountry(for: zipCode) {
                                if !city.isEmpty && (organization.cityInvoice?.isEmpty ?? true) {
                                    organization.cityInvoice = city
                                }
                                if !country.isEmpty && (organization.countryInvoice?.isEmpty ?? true) {
                                    organization.countryInvoice = country
                                }
                            }
                        }
                    }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                .frame(maxWidth: 100)
                TextField("City", text: Binding(
                    get: { organization.cityInvoice ?? "" },
                    set: { organization.cityInvoice = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                TextField("Country", text: Binding(
                    get: { organization.countryInvoice ?? "" },
                    set: { organization.countryInvoice = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
                .controlSize(.small)
                .frame(height: 26)
                .frame(maxWidth: 120)
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 140)
    }
    
    private var orgNotesSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Notes").font(.subheadline).fontWeight(.medium).foregroundStyle(.secondary)
            TextEditor(text: Binding(
                get: { organization.notes ?? "" },
                set: { organization.notes = $0.isEmpty ? nil : $0 }
            ))
            .frame(minHeight: 60)
            .padding(6)
            .background(Color(.textBackgroundColor))
            .cornerRadius(4)
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(.separator, lineWidth: 1)
            )
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 100)
    }
    
    // Business Type Section (moved to info tab, searchable dropdown)
    private var orgBusinessTypeSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Type of Business").font(.subheadline).fontWeight(.medium).foregroundStyle(.secondary)
            
            // Searchable dropdown for business types
            Menu {
                ForEach(OrganizationJobType.allCases, id: \.self) { jobType in
                    Button(action: {
                        toggleBusinessType(jobType)
                    }) {
                        HStack {
                            Text(jobType.displayName)
                            Spacer()
                            if organization.jobs.contains(jobType) {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            } label: {
                HStack {
                    Text(selectedBusinessTypesText)
                        .foregroundStyle(organization.jobs.isEmpty ? .secondary : .primary)
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
            .controlSize(.small)
            .frame(height: 26)
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
        .frame(maxWidth: .infinity, minHeight: 60)
    }
    
    private var selectedBusinessTypesText: String {
        if organization.jobs.isEmpty {
            return "Select business types"
        } else {
            return organization.jobs.map { $0.displayName }.joined(separator: ", ")
        }
    }
    
    private func toggleBusinessType(_ jobType: OrganizationJobType) {
        if organization.jobs.contains(jobType) {
            organization.jobs.removeAll { $0 == jobType }
        } else {
            organization.jobs.append(jobType)
        }
    }
    
    // Document management methods
    private func addDocument(from url: URL) {
        let document = Document(
            id: UUID(),
            name: url.lastPathComponent,
            type: url.pathExtension.lowercased(),
            size: getFileSize(url: url),
            uploadDate: Date(),
            url: url
        )
        
        if organization.documents == nil {
            organization.documents = []
        }
        organization.documents?.append(document)
    }
    
    private func removeDocument(_ document: Document) {
        organization.documents?.removeAll { $0.id == document.id }
    }
    
    private func getFileSize(url: URL) -> Int64 {
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            return attributes[.size] as? Int64 ?? 0
        } catch {
            return 0
        }
    }
    
    private func saveOrganization() async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updateOrganization(organization)
            await MainActor.run {
                isLoading = false
                onSave?()
                withAnimation(.easeInOut(duration: 0.3)) {
                    isPresented = false
                }
            }
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
    
    private func loadConnectedData() async {
        // Load connected people and projects from Supabase
        do {
            connectedPeople = try await supabaseService.fetchPeopleByOrganization(organization.id)
            connectedProjects = try await supabaseService.fetchProjectsForOrganization(organization.id)
        } catch {
            errorMessage = "Failed to load connected data: \(error.localizedDescription)"
        }
    }

    private var orgPeopleTab: some View {
        OrganizationPeopleTabView(organization: organization)
    }
    private var orgProjectsTab: some View {
        OrganizationProjectsTabView(organization: organization, selectedProject: $selectedProject)
    }
    private var orgAccountingTab: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Financial Information")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal)
                    FinancialDetailsView(details: Binding(
                        get: { organization.financialDetails ?? FinancialDetails() },
                        set: { organization.financialDetails = $0 }
                    ))
                    .padding(.horizontal)
                }
                VStack(alignment: .leading, spacing: 12) {
                    Text("Payment History")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal)
                    ContentUnavailableView(
                        "No payment history",
                        systemImage: "banknote",
                        description: Text("Payment records will appear here")
                    )
                    .frame(height: 200)
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
    }
    private var orgDocumentsTab: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Documents")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .padding(.horizontal)
                    Button(action: {
                        showDocumentPicker = true
                    }) {
                        VStack(spacing: 8) {
                            Image(systemName: "doc.badge.plus")
                                .font(.system(size: 32))
                                .foregroundColor(.accentColor)
                            Text("Add Document")
                                .font(.headline)
                            Text("Click to select files")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(24)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.accentColor.opacity(0.3), style: StrokeStyle(lineWidth: 2, dash: [5]))
                        )
                    }
                    .buttonStyle(.plain)
                    .fileImporter(
                        isPresented: $showDocumentPicker,
                        allowedContentTypes: [.pdf, .text, .image, .audio, .movie, .archive],
                        allowsMultipleSelection: true
                    ) { result in
                        switch result {
                        case .success(let files):
                            for file in files {
                                let gotAccess = file.startAccessingSecurityScopedResource()
                                if gotAccess {
                                    addDocument(from: file)
                                    file.stopAccessingSecurityScopedResource()
                                }
                            }
                        case .failure(let error):
                            print("Document import failed: \(error)")
                        }
                    }
                    if let documents = organization.documents, !documents.isEmpty {
                        LazyVStack(spacing: 8) {
                            ForEach(documents) { document in
                                DocumentRow(document: document) {
                                    removeDocument(document)
                                }
                            }
                        }
                    } else {
                        ContentUnavailableView(
                            "No Documents",
                            systemImage: "doc.text",
                            description: Text("Add documents to keep them organized")
                        )
                        .frame(height: 120)
                    }
                }
                .padding()
            }
        }
    }
}

// MARK: - Supporting Views

struct OrganizationPeopleTabView: View {
    let organization: Organization
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ContentUnavailableView(
                    "No People Connected",
                    systemImage: "person.2",
                    description: Text("People connected to this organization will appear here")
                )
                .frame(maxHeight: .infinity)
            }
            .padding()
        }
    }
}

struct OrganizationProjectsTabView: View {
    let organization: Organization
    @Binding var selectedProject: Project?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ContentUnavailableView(
                    "No Projects",
                    systemImage: "folder.badge.plus",
                    description: Text("Projects for this organization will appear here")
                )
                .frame(maxHeight: .infinity)
            }
            .padding()
        }
    }
}

struct FinancialDetailsView: View {
    @Binding var details: FinancialDetails
    
    var body: some View {
        VStack(spacing: 16) {
            // Country
            VStack(alignment: .leading, spacing: 4) {
                Text("Country")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter country", text: Binding(
                    get: { details.country ?? "" },
                    set: { details.country = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
            }
            
            // IBAN
            VStack(alignment: .leading, spacing: 4) {
                Text("IBAN")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter IBAN", text: Binding(
                    get: { details.iban ?? "" },
                    set: { details.iban = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
            }
            
            // BIC
            VStack(alignment: .leading, spacing: 4) {
                Text("BIC")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter BIC", text: Binding(
                    get: { details.bic ?? "" },
                    set: { details.bic = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
            }
            
            // Bank Name
            VStack(alignment: .leading, spacing: 4) {
                Text("Bank Name")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter bank name", text: Binding(
                    get: { details.bankName ?? "" },
                    set: { details.bankName = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
            }
            
            // VAT Number
            VStack(alignment: .leading, spacing: 4) {
                Text("VAT Number")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                
                TextField("Enter VAT number", text: Binding(
                    get: { details.vatNumber ?? "" },
                    set: { details.vatNumber = $0.isEmpty ? nil : $0 }
                ))
                .textFieldStyle(.roundedBorder)
            }
        }
    }
}

 