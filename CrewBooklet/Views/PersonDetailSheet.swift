//
//  PersonDetailSheet.swift
//  CrewBooklet
//
//  Enhanced Person Detail View with sliding bottom pane
//  Supports full editing of complex Person model with all enhanced fields
//

import SwiftUI

struct PersonDetailSheet: View {
    @Binding var person: Person
    @Binding var isPresented: Bool
    @StateObject private var viewModel = PersonDetailViewModel()
    var visualDebugActive: Bool = false
    
    // Add tab selection state
    @State private var selectedTab: DetailTab = .info
    @State private var organizationName: String? = nil
    @StateObject private var supabaseService = SupabaseService.shared
    
    enum DetailTab {
        case info
        case accounting
        case documents
        
        var title: String {
            switch self {
            case .info: return "Information"
            case .accounting: return "Accounting"
            case .documents: return "Documents"
            }
        }
        
        var icon: String {
            switch self {
            case .info: return "person.text.rectangle"
            case .accounting: return "banknote"
            case .documents: return "doc.text"
            }
        }
    }
    
    @State private var showDocumentPicker = false
    
    var body: some View {
        VStack(spacing: 0) {
            tabSelectionView
            tabContentView
        }
        .task {
            await loadOrganizationName()
        }
        .onChange(of: person.organizationId) { _, _ in
            Task {
                await loadOrganizationName()
            }
        }
    }

    // MARK: - Tab Content
    private var tabContentView: some View {
        Group {
            switch selectedTab {
            case .info:
                infoTab
            case .accounting:
                accountingTab
            case .documents:
                documentsTab
            }
        }
    }

    private var infoTab: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Basic Information Section
                PersonDetailSection(title: "Basic Information") {
                    VStack(spacing: 12) {
                        TextField("Full Name", text: $person.name)
                            .textFieldStyle(.roundedBorder)
                        
                        TextField("Email", text: Binding(
                            get: { person.email ?? "" },
                            set: { person.email = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        // Gender selection
                        Picker("Gender", selection: Binding(
                            get: { person.gender ?? .other },
                            set: { person.gender = $0 }
                        )) {
                            ForEach(Gender.allCases, id: \.self) { gender in
                                Text(gender.displayName).tag(gender)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                
                // Contact Information Section
                PersonDetailSection(title: "Contact Information") {
                    VStack(spacing: 12) {
                        TextField("Mobile Phone", text: Binding(
                            get: { person.mobilePhone ?? "" },
                            set: { 
                                let formatted = PhoneNumberFormatter.formatPhoneNumber($0)
                                person.mobilePhone = formatted.isEmpty ? nil : formatted 
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("Work Phone", text: Binding(
                            get: { person.workPhone ?? "" },
                            set: { 
                                let formatted = PhoneNumberFormatter.formatPhoneNumber($0)
                                person.workPhone = formatted.isEmpty ? nil : formatted 
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("Website", text: Binding(
                            get: { person.website ?? "" },
                            set: { 
                                let formatted = WebsiteFormatter.formatWebsite($0)
                                person.website = formatted.isEmpty ? nil : formatted 
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                    }
                }
                
                // Address Section
                PersonDetailSection(title: "Address") {
                    VStack(spacing: 12) {
                        TextField("Street 1", text: Binding(
                            get: { person.address?.street1 ?? "" },
                            set: { 
                                if person.address == nil { person.address = Address() }
                                person.address?.street1 = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("Street 2", text: Binding(
                            get: { person.address?.street2 ?? "" },
                            set: { 
                                if person.address == nil { person.address = Address() }
                                person.address?.street2 = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        HStack(spacing: 8) {
                            TextField("City", text: Binding(
                                get: { person.address?.city ?? "" },
                                set: { 
                                    if person.address == nil { person.address = Address() }
                                    person.address?.city = $0.isEmpty ? nil : $0
                                }
                            ))
                            .textFieldStyle(.roundedBorder)
                            
                            TextField("ZIP Code", text: Binding(
                                get: { person.address?.zip ?? "" },
                                set: { zipCode in
                                    if person.address == nil { person.address = Address() }
                                    person.address?.zip = zipCode.isEmpty ? nil : zipCode
                                    
                                    // Auto-fill city and country if zip code is provided
                                    if !zipCode.isEmpty {
                                        if let (city, country) = ZipCodeLookup.lookupCityAndCountry(for: zipCode) {
                                            if !city.isEmpty && (person.address?.city?.isEmpty ?? true) {
                                                person.address?.city = city
                                            }
                                            if !country.isEmpty && (person.address?.country?.isEmpty ?? true) {
                                                person.address?.country = country
                                            }
                                        }
                                    }
                                }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                        
                        Picker("Country", selection: Binding(
                            get: { person.address?.country ?? "" },
                            set: {
                                if person.address == nil { person.address = Address() }
                                person.address?.country = $0.isEmpty ? nil : $0
                            }
                        )) {
                            Text("Select country").tag("")
                            ForEach(FilmCountries.sortedCountries, id: \.self) { country in
                                Text(country).tag(country)
                            }
                        }
                    }
                }
                
                // Languages Section (Multiple selection checkboxes)
                PersonDetailSection(title: "Languages") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Select spoken languages")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            ForEach(Language.allCases, id: \.self) { language in
                                Button(action: {
                                    toggleLanguage(language)
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: person.languages.contains(language) ? "checkmark.square.fill" : "square")
                                            .foregroundColor(person.languages.contains(language) ? .accentColor : .secondary)
                                        Text(language.displayName)
                                            .foregroundColor(.primary)
                                            .font(.caption)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                
                // Jobs Section (Multiple selection from controlled list)
                PersonDetailSection(title: "Professional Roles") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Select job roles (multiple selections allowed)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 8) {
                            ForEach(JobType.allCases, id: \.self) { job in
                                Button(action: {
                                    toggleJob(job)
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: person.jobs.contains(job) ? "checkmark.square.fill" : "square")
                                            .foregroundColor(person.jobs.contains(job) ? .accentColor : .secondary)
                                        Text(job.displayName)
                                            .foregroundColor(.primary)
                                            .font(.caption2)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                
                // Organization Section (if person has organization)
                if person.organizationId != nil {
                    PersonDetailSection(title: "Organization") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Connected to organization")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            if let organizationName = organizationName {
                                Text(organizationName)
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary)
                            } else {
                                Text("Loading organization...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                
                // Notes Section
                PersonDetailSection(title: "Notes") {
                    TextEditor(text: Binding(
                        get: { person.notes ?? "" },
                        set: { person.notes = $0.isEmpty ? nil : $0 }
                    ))
                    .frame(minHeight: 80)
                    .padding(8)
                    .background(Color(.textBackgroundColor))
                    .cornerRadius(6)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
    }

    private var accountingTab: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Bank Details Section
                PersonDetailSection(title: "Bank Details") {
                    VStack(spacing: 12) {
                        TextField("Bank Name", text: Binding(
                            get: { person.financialDetails?.bankName ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                person.financialDetails?.bankName = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("IBAN", text: Binding(
                            get: { person.financialDetails?.iban ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                person.financialDetails?.iban = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("BIC/SWIFT", text: Binding(
                            get: { person.financialDetails?.bic ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                person.financialDetails?.bic = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("Account Number", text: Binding(
                            get: { person.financialDetails?.accountNumber ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                person.financialDetails?.accountNumber = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("Routing Number", text: Binding(
                            get: { person.financialDetails?.routingNumber ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                person.financialDetails?.routingNumber = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                    }
                }
                
                // Tax Information Section
                PersonDetailSection(title: "Tax Information") {
                    VStack(spacing: 12) {
                        Picker("Country", selection: Binding(
                            get: { person.financialDetails?.country ?? "" },
                            set: {
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                person.financialDetails?.country = $0.isEmpty ? nil : $0
                            }
                        )) {
                            Text("Select country").tag("")
                            ForEach(FilmCountries.sortedCountries, id: \.self) { country in
                                Text(country).tag(country)
                            }
                        }
                        
                        TextField("VAT Number", text: Binding(
                            get: { person.financialDetails?.vatNumber ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                person.financialDetails?.vatNumber = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                    }
                }
                
                // Invoice Address Section
                PersonDetailSection(title: "Invoice Address") {
                    VStack(spacing: 12) {
                        TextField("Street", text: Binding(
                            get: { person.financialDetails?.invoiceAddress?.street1 ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                if person.financialDetails?.invoiceAddress == nil { person.financialDetails?.invoiceAddress = Address() }
                                person.financialDetails?.invoiceAddress?.street1 = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        TextField("City", text: Binding(
                            get: { person.financialDetails?.invoiceAddress?.city ?? "" },
                            set: { 
                                if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                if person.financialDetails?.invoiceAddress == nil { person.financialDetails?.invoiceAddress = Address() }
                                person.financialDetails?.invoiceAddress?.city = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        
                        HStack(spacing: 8) {
                            TextField("ZIP Code", text: Binding(
                                get: { person.financialDetails?.invoiceAddress?.zip ?? "" },
                                set: { zipCode in
                                    if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                    if person.financialDetails?.invoiceAddress == nil { person.financialDetails?.invoiceAddress = Address() }
                                    person.financialDetails?.invoiceAddress?.zip = zipCode.isEmpty ? nil : zipCode
                                    
                                    // Auto-fill city and country if zip code is provided
                                    if !zipCode.isEmpty {
                                        if let (city, country) = ZipCodeLookup.lookupCityAndCountry(for: zipCode) {
                                            if !city.isEmpty && (person.financialDetails?.invoiceAddress?.city?.isEmpty ?? true) {
                                                person.financialDetails?.invoiceAddress?.city = city
                                            }
                                            if !country.isEmpty && (person.financialDetails?.invoiceAddress?.country?.isEmpty ?? true) {
                                                person.financialDetails?.invoiceAddress?.country = country
                                            }
                                        }
                                    }
                                }
                            ))
                            .textFieldStyle(.roundedBorder)
                            
                            Picker("Country", selection: Binding(
                                get: { person.financialDetails?.invoiceAddress?.country ?? "" },
                                set: {
                                    if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                                    if person.financialDetails?.invoiceAddress == nil { person.financialDetails?.invoiceAddress = Address() }
                                    person.financialDetails?.invoiceAddress?.country = $0.isEmpty ? nil : $0
                                }
                            )) {
                                Text("Select country").tag("")
                                ForEach(FilmCountries.sortedCountries, id: \.self) { country in
                                    Text(country).tag(country)
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
    }

    private var documentsTab: some View {
        ScrollView {
            VStack(spacing: 24) {
                PersonDetailSection(title: "Documents") {
                    VStack(spacing: 16) {
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
                        
                        if let documents = person.documents, !documents.isEmpty {
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
                }
            }
            .padding()
        }
    }

    // MARK: - Tab Selection
    private var tabSelectionView: some View {
        Picker("", selection: $selectedTab) {
            ForEach([DetailTab.info, .accounting, .documents], id: \.self) { tab in
                Label(tab.title, systemImage: tab.icon)
                    .tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
    }
    
    // Helper methods for multi-selection
    private func toggleLanguage(_ language: Language) {
        if person.languages.contains(language) {
            person.languages.removeAll { $0 == language }
        } else {
            person.languages.append(language)
        }
    }
    
    private func toggleJob(_ job: JobType) {
        if person.jobs.contains(job) {
            person.jobs.removeAll { $0 == job }
        } else {
            person.jobs.append(job)
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
        if person.documents == nil {
            person.documents = []
        }
        person.documents?.append(document)
    }
    
    private func removeDocument(_ document: Document) {
        person.documents?.removeAll { $0.id == document.id }
    }
    
    private func getFileSize(url: URL) -> Int64 {
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            return attributes[.size] as? Int64 ?? 0
        } catch {
            return 0
        }
    }
    
    private func loadOrganizationName() async {
        guard let orgId = person.organizationId else {
            await MainActor.run {
                organizationName = nil
            }
            return
        }
        
        do {
            let organizations = try await supabaseService.fetchOrganizations()
            if let organization = organizations.first(where: { $0.id == orgId }) {
                await MainActor.run {
                    organizationName = organization.name
                }
            } else {
                await MainActor.run {
                    organizationName = "Organization not found"
                }
            }
        } catch {
            print("Error loading organization: \(error)")
            await MainActor.run {
                organizationName = "Error loading organization"
            }
        }
    }
}

// MARK: - Reusable Section Component
struct PersonDetailSection<Content: View>: View {
    let title: String
    let content: Content
    
    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            
            content
        }
        .padding(16)
        .background(Color(.controlBackgroundColor))
        .cornerRadius(8)
    }
}

// MARK: - ViewModel for Person Detail Operations
@MainActor
class PersonDetailViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let supabaseService = SupabaseService.shared
    
    func loadPerson(_ person: Person) {
        // Initialize any additional data needed for editing
        print("📝 Loading person for editing: \(person.name)")
    }
    
    func savePerson(_ person: Person) {
        isLoading = true
        
        Task {
            do {
                try await supabaseService.updatePerson(person)
                print("✅ Successfully saved person: \(person.name)")
                
                await MainActor.run {
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Failed to save person: \(error.localizedDescription)"
                    print("❌ Error saving person: \(error)")
                }
            }
        }
    }
}

// MARK: - Document Row Component
struct DocumentRow: View {
    let document: Document
    let onDelete: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            // Document icon
            Image(systemName: iconName)
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 32, height: 32)
            
            // Document info
            VStack(alignment: .leading, spacing: 2) {
                Text(document.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)
                
                Text("\(document.type.uppercased()) • \(formatFileSize(document.size))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            Spacer()
            
            // Actions
            HStack(spacing: 8) {
                Button(action: {
                    openDocument()
                }) {
                    Image(systemName: "eye")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                .buttonStyle(.plain)
                
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundColor(.red)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
    }
    
    private var iconName: String {
        switch document.type.lowercased() {
        case "pdf": return "doc.richtext"
        case "doc", "docx": return "doc.text"
        case "jpg", "jpeg", "png", "gif": return "photo"
        case "txt": return "doc.plaintext"
        default: return "doc"
        }
    }
    
    private func formatFileSize(_ size: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.allowedUnits = [.useKB, .useMB, .useGB]
        formatter.countStyle = .file
        return formatter.string(fromByteCount: size)
    }
    
    private func openDocument() {
        NSWorkspace.shared.open(document.url)
    }
}

#Preview {
    struct PersonDetailPreview: View {
        @State private var isPresented = true
        @State private var samplePerson = Person(
            name: "John Doe",
            email: "john@example.com",
            jobs: [.director, .photographer],
            notes: "Sample notes"
        )
        
        var body: some View {
            ZStack {
                Color.gray.opacity(0.3)
                    .ignoresSafeArea()
                
                if isPresented {
                    PersonDetailSheet(
                        person: $samplePerson,
                        isPresented: $isPresented
                    )
                    .frame(height: 600)
                    .transition(.move(edge: .bottom))
                }
            }
        }
    }
    
    return PersonDetailPreview()
}

 