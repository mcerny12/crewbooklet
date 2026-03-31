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
    var onPersonSelected: ((Person) -> Void)? = nil
    var onProjectSelected: ((Project) -> Void)? = nil
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
    
    // MARK: - Field Helpers
    @ViewBuilder
    private func uniformField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            TextField("", text: text)
                .font(.caption)
                .textFieldStyle(.plain)
                .frame(height: 24)
                .padding(.horizontal, 8)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func uniformPicker(_ label: String, selection: Binding<String>, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Picker("", selection: selection) {
                Text("Select \(label.lowercased())").tag("")
                ForEach(options, id: \.self) { option in
                    Text(option).tag(option)
                }
            }
            .labelsHidden()
            .font(.caption)
            .frame(height: 24)
            .padding(.horizontal, 4)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func fieldWithAction(_ label: String, text: Binding<String>, icon: String, action: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                TextField("", text: text)
                    .font(.caption)
                    .textFieldStyle(.plain)
                    .frame(height: 24)
                    .padding(.horizontal, 8)
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))

                Button(action: action) {
                    Image(systemName: icon)
                        .font(.system(size: 10))
                        .foregroundColor(text.wrappedValue.isEmpty ? .secondary.opacity(0.5) : .blue)
                        .frame(width: 20, height: 20)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(.separator.opacity(0.3), lineWidth: 0.5))
                }
                .buttonStyle(.plain)
                .disabled(text.wrappedValue.isEmpty)
            }

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
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
        .onChange(of: organization.id) { _, _ in
            // Clear stale data immediately to prevent showing wrong people/projects
            connectedPeople = []
            connectedProjects = []

            Task {
                await loadConnectedData()
            }
        }
    }
    
    private var tabPicker: some View {
        Picker("", selection: $selectedTab) {
            ForEach(DetailTab.allCases, id: \.self) { tab in
                Label(tab.rawValue, systemImage: tab.icon)
                    .tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .labelsHidden()
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
    
    private var informationTabContent: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Basic Information Grid
                basicInformationGrid

                // Notes Section
                notesSection
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .onChange(of: organization.name) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.jobs) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.contactEmail) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.contactPhone) { _, _ in scheduleAutoSave() }
        .onChange(of: organization.website) { _, _ in scheduleAutoSave() }
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

                // Business Type Dropdown
                VStack(alignment: .leading, spacing: 2) {
                    Menu {
                        ForEach(OrganizationJobType.allCases, id: \.self) { jobType in
                            Button(action: {
                                if !organization.jobs.contains(jobType) && organization.jobs.count < 3 {
                                    organization.jobs.append(jobType)
                                } else if organization.jobs.contains(jobType) {
                                    organization.jobs.removeAll { $0 == jobType }
                                }
                            }) {
                                HStack {
                                    Text(jobType.displayName)
                                    Spacer()
                                    if organization.jobs.contains(jobType) {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                            .disabled(!organization.jobs.contains(jobType) && organization.jobs.count >= 3)
                        }
                    } label: {
                        HStack {
                            if organization.jobs.isEmpty {
                                Text("")
                                    .font(.callout)
                                    .foregroundStyle(.secondary)
                            } else {
                                Text(organization.jobs.map { $0.displayName }.joined(separator: ", "))
                                    .font(.callout)
                                    .foregroundStyle(.primary)
                                    .lineLimit(1)
                            }
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.system(size: 8))
                                .foregroundStyle(.secondary)
                        }
                        .frame(height: 24)
                        .padding(.horizontal, 6)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                        .overlay(RoundedRectangle(cornerRadius: 3).stroke(.separator.opacity(0.2), lineWidth: 0.5))
                    }
                    .buttonStyle(.plain)

                    Text("Business Type")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Contact Email
                fieldWithAction("Contact Email", text: Binding(
                    get: { organization.contactEmail ?? "" },
                    set: { organization.contactEmail = $0.isEmpty ? nil : $0 }
                ), icon: "envelope.fill") {
                    if let email = organization.contactEmail, !email.isEmpty,
                       let url = URL(string: "mailto:\(email)") {
                        NSWorkspace.shared.open(url)
                    }
                }

                // Contact Phone
                fieldWithAction("Contact Phone", text: Binding(
                    get: { organization.contactPhone ?? "" },
                    set: { newValue in
                        let formatted = formatPhoneNumber(newValue)
                        organization.contactPhone = formatted.isEmpty ? nil : formatted
                    }
                ), icon: "phone.fill") {
                    if let phone = organization.contactPhone, !phone.isEmpty,
                       let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                        NSWorkspace.shared.open(url)
                    }
                }
                
                // Website
                fieldWithAction("Website", text: Binding(
                    get: { organization.website ?? "" },
                    set: { newValue in
                        let formatted = formatWebsite(newValue)
                        organization.website = formatted.isEmpty ? nil : formatted
                    }
                ), icon: "globe") {
                    if let website = organization.website, !website.isEmpty {
                        var urlString = website
                        if !urlString.hasPrefix("http://") && !urlString.hasPrefix("https://") {
                            urlString = "https://" + urlString
                        }
                        if let url = URL(string: urlString) {
                            NSWorkspace.shared.open(url)
                        }
                    }
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
                uniformPicker("Country", selection: Binding(
                    get: { organization.country ?? "" },
                    set: { organization.country = $0.isEmpty ? nil : $0 }
                ), options: FilmCountries.sortedCountries)
        }
    }
    
    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 4) {
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

            Text("Notes")
                .font(.caption)
                .foregroundStyle(.secondary)
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
                HStack {
                    Text("Associated Projects")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Spacer()

                    Button(action: {
                        // TODO: Show project picker
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.caption2)
                            Text("Add Project")
                                .font(.caption2)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    .buttonStyle(.plain)
                }

                if connectedProjects.isEmpty {
                    Text("No projects connected to this organization")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(connectedProjects) { project in
                            Button(action: {
                                onProjectSelected?(project)
                            }) {
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
                            .buttonStyle(.plain)
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
                HStack {
                    Text("Connected People")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Spacer()

                    Button(action: {
                        // TODO: Show person picker
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.caption2)
                            Text("Add Person")
                                .font(.caption2)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    .buttonStyle(.plain)
                }

                if connectedPeople.isEmpty {
                    Text("No people connected to this organization")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(connectedPeople) { person in
                            HStack(spacing: 12) {
                                // Left: Name and role
                                Button(action: {
                                    onPersonSelected?(person)
                                }) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(person.name)
                                            .font(.caption)
                                            .fontWeight(.medium)
                                            .foregroundStyle(.primary)

                                        if !person.jobs.isEmpty {
                                            Text(person.jobs.first?.displayName ?? "")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    .frame(width: 120, alignment: .leading)
                                }
                                .buttonStyle(.plain)

                                // Middle: Email and phone with buttons
                                VStack(alignment: .leading, spacing: 2) {
                                    // Email
                                    HStack(spacing: 4) {
                                        if let email = person.email, !email.isEmpty {
                                            Text(email)
                                                .font(.caption2)
                                                .foregroundStyle(.primary)
                                                .lineLimit(1)

                                            Button(action: {
                                                if let url = URL(string: "mailto:\(email)") {
                                                    NSWorkspace.shared.open(url)
                                                }
                                            }) {
                                                Image(systemName: "envelope.fill")
                                                    .font(.system(size: 8))
                                                    .foregroundStyle(.blue)
                                                    .frame(width: 14, height: 14)
                                            }
                                            .buttonStyle(.plain)
                                        } else {
                                            Text("No email")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    .frame(height: 14)

                                    // Phone
                                    HStack(spacing: 4) {
                                        if let phone = person.mobilePhone, !phone.isEmpty {
                                            Text(formatPhoneForDisplay(phone))
                                                .font(.caption2)
                                                .foregroundStyle(.primary)
                                                .lineLimit(1)

                                            Button(action: {
                                                if let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                                                    NSWorkspace.shared.open(url)
                                                }
                                            }) {
                                                Image(systemName: "phone.fill")
                                                    .font(.system(size: 8))
                                                    .foregroundStyle(.blue)
                                                    .frame(width: 14, height: 14)
                                            }
                                            .buttonStyle(.plain)
                                        } else {
                                            Text("No phone")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                    .frame(height: 14)
                                }
                                .frame(width: 200, alignment: .leading)

                                Spacer()

                                // Right: Remove button
                                Button(action: {
                                    Task {
                                        await removePerson(person)
                                    }
                                }) {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.caption)
                                        .foregroundStyle(.red)
                                }
                                .buttonStyle(.plain)
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
    
    // MARK: - People Management
    private func formatPhoneForDisplay(_ phone: String) -> String {
        let digitsOnly = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)
        if digitsOnly.isEmpty { return phone }

        var workingString = digitsOnly
        if !workingString.hasPrefix("+") && !workingString.isEmpty {
            workingString = "+" + workingString
        }

        if workingString.hasPrefix("+") {
            let digits = String(workingString.dropFirst())

            if digits.hasPrefix("49") {
                return formatWithPattern("+49", String(digits.dropFirst(2)), pattern: [3, 3, 3, 2])
            } else if digits.hasPrefix("43") {
                return formatWithPattern("+43", String(digits.dropFirst(2)), pattern: [3, 3, 3, 2])
            } else if digits.hasPrefix("1") {
                return formatWithPattern("+1", String(digits.dropFirst(1)), pattern: [3, 3, 4])
            } else {
                return "+" + digits
            }
        }

        return workingString
    }

    private func removePerson(_ person: Person) async {
        do {
            // Update person to remove organization
            var updatedPerson = person
            updatedPerson.organizationId = nil
            try await supabaseService.updatePerson(updatedPerson)

            // Reload connected people
            await loadConnectedData()
        } catch {
            print("Error removing person from organization: \(error)")
        }
    }

    // MARK: - Website Formatting
    private func formatWebsite(_ input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return "" }

        // If already has protocol, return as is
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            return trimmed
        }

        // Add https:// prefix
        return "https://" + trimmed
    }

    // MARK: - Phone Formatting
    private func formatPhoneNumber(_ input: String) -> String {
        // Remove all non-digit characters except +
        let digitsOnly = input.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)

        // If empty, return empty
        if digitsOnly.isEmpty { return "" }

        // Always add + if not present and has digits
        var workingString = digitsOnly
        if !workingString.hasPrefix("+") && !workingString.isEmpty {
            workingString = "+" + workingString
        }

        // Extract country code and remaining digits
        if workingString.hasPrefix("+") {
            let digits = String(workingString.dropFirst())

            // Detect country code and format accordingly
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
            } else if digits.hasPrefix("39") { // Italy
                return formatWithPattern("+39", String(digits.dropFirst(2)), pattern: [3, 3, 4])
            } else if digits.hasPrefix("34") { // Spain
                return formatWithPattern("+34", String(digits.dropFirst(2)), pattern: [3, 3, 3])
            } else if digits.hasPrefix("351") { // Portugal
                return formatWithPattern("+351", String(digits.dropFirst(3)), pattern: [3, 3, 3])
            } else if digits.hasPrefix("31") { // Netherlands
                return formatWithPattern("+31", String(digits.dropFirst(2)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("32") { // Belgium
                return formatWithPattern("+32", String(digits.dropFirst(2)), pattern: [3, 2, 2, 2])
            } else if digits.hasPrefix("353") { // Ireland
                return formatWithPattern("+353", String(digits.dropFirst(3)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("45") { // Denmark
                return formatWithPattern("+45", String(digits.dropFirst(2)), pattern: [2, 2, 2, 2])
            } else if digits.hasPrefix("46") { // Sweden
                return formatWithPattern("+46", String(digits.dropFirst(2)), pattern: [2, 3, 2, 2])
            } else if digits.hasPrefix("47") { // Norway
                return formatWithPattern("+47", String(digits.dropFirst(2)), pattern: [3, 2, 3])
            } else if digits.hasPrefix("358") { // Finland
                return formatWithPattern("+358", String(digits.dropFirst(3)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("48") { // Poland
                return formatWithPattern("+48", String(digits.dropFirst(2)), pattern: [3, 3, 3])
            } else if digits.hasPrefix("420") { // Czech Republic
                return formatWithPattern("+420", String(digits.dropFirst(3)), pattern: [3, 3, 3])
            } else if digits.hasPrefix("36") { // Hungary
                return formatWithPattern("+36", String(digits.dropFirst(2)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("30") { // Greece
                return formatWithPattern("+30", String(digits.dropFirst(2)), pattern: [3, 3, 4])
            // Americas
            } else if digits.hasPrefix("1") { // US/Canada
                return formatWithPattern("+1", String(digits.dropFirst(1)), pattern: [3, 3, 4])
            } else if digits.hasPrefix("52") { // Mexico
                return formatWithPattern("+52", String(digits.dropFirst(2)), pattern: [2, 4, 4])
            } else if digits.hasPrefix("55") { // Brazil
                return formatWithPattern("+55", String(digits.dropFirst(2)), pattern: [2, 5, 4])
            } else if digits.hasPrefix("54") { // Argentina
                return formatWithPattern("+54", String(digits.dropFirst(2)), pattern: [2, 4, 4])
            // Asia-Pacific
            } else if digits.hasPrefix("61") { // Australia
                return formatWithPattern("+61", String(digits.dropFirst(2)), pattern: [1, 4, 4])
            } else if digits.hasPrefix("64") { // New Zealand
                return formatWithPattern("+64", String(digits.dropFirst(2)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("81") { // Japan
                return formatWithPattern("+81", String(digits.dropFirst(2)), pattern: [2, 4, 4])
            } else if digits.hasPrefix("86") { // China
                return formatWithPattern("+86", String(digits.dropFirst(2)), pattern: [3, 4, 4])
            } else if digits.hasPrefix("82") { // South Korea
                return formatWithPattern("+82", String(digits.dropFirst(2)), pattern: [2, 4, 4])
            } else if digits.hasPrefix("91") { // India
                return formatWithPattern("+91", String(digits.dropFirst(2)), pattern: [5, 5])
            } else if digits.hasPrefix("65") { // Singapore
                return formatWithPattern("+65", String(digits.dropFirst(2)), pattern: [4, 4])
            } else if digits.hasPrefix("60") { // Malaysia
                return formatWithPattern("+60", String(digits.dropFirst(2)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("66") { // Thailand
                return formatWithPattern("+66", String(digits.dropFirst(2)), pattern: [2, 3, 4])
            // Middle East & Africa
            } else if digits.hasPrefix("971") { // UAE
                return formatWithPattern("+971", String(digits.dropFirst(3)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("966") { // Saudi Arabia
                return formatWithPattern("+966", String(digits.dropFirst(3)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("972") { // Israel
                return formatWithPattern("+972", String(digits.dropFirst(3)), pattern: [2, 3, 4])
            } else if digits.hasPrefix("27") { // South Africa
                return formatWithPattern("+27", String(digits.dropFirst(2)), pattern: [2, 3, 4])
            } else {
                // Fallback: just return with + prefix
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
            if position >= cleaned.count {
                break
            }
            let endPos = min(position + groupSize, cleaned.count)
            let start = cleaned.index(cleaned.startIndex, offsetBy: position)
            let end = cleaned.index(cleaned.startIndex, offsetBy: endPos)
            let group = String(cleaned[start..<end])
            formatted += " \(group)"
            position = endPos
        }

        // If there are remaining digits, add them
        if position < cleaned.count {
            let start = cleaned.index(cleaned.startIndex, offsetBy: position)
            let remaining = String(cleaned[start...])
            formatted += " \(remaining)"
        }

        return formatted
    }

    // MARK: - Data Loading
    private func loadConnectedData() async {
        do {
            // Load connected projects for this organization
            connectedProjects = try await supabaseService.fetchProjectsForOrganization(organization.id)

            // Load people who belong to this organization
            connectedPeople = try await supabaseService.fetchPeopleByOrganization(organization.id)
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