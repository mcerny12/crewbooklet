//
//  PersonDetailBottomPane.swift
//  CrewBooklet
//
//  Person detail view with condensed 3-column layout: Personal | Address | Professional
//

import SwiftUI

struct PersonDetailBottomPane: View {
    @Binding var person: Person
    @Binding var isPresented: Bool
    var onProjectSelected: ((Project) -> Void)? = nil
    var onOrganizationSelected: ((Organization) -> Void)? = nil
    @State private var selectedTab: DetailTab = .information
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var saveTimer: Timer?
    @State private var connectedProjects: [Project] = []
    @State private var availableOrganizations: [Organization] = []
    @State private var availableProjects: [Project] = []
    @State private var showProjectPicker = false
    @State private var showDatePicker = false

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

    // MARK: - Field Helper (condensed)
    @ViewBuilder
    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            TextField("", text: text)
                .font(.callout)
                .textFieldStyle(.plain)
                .frame(height: 24)
                .padding(.horizontal, 6)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 3))
                .overlay(RoundedRectangle(cornerRadius: 3).stroke(.separator.opacity(0.2), lineWidth: 0.5))

            Text(label)
                .font(.caption2)
                .foregroundStyle(.quaternary)
        }
    }

    private func picker(_ label: String, selection: Binding<String>, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Picker("", selection: selection) {
                Text("Select \(label.lowercased())").tag("")
                ForEach(options, id: \.self) { option in
                    Text(option).tag(option)
                }
            }
            .labelsHidden()
            .font(.callout)
            .frame(height: 24)
            .padding(.horizontal, 2)
            .background(Color(.controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 3))
            .overlay(RoundedRectangle(cornerRadius: 3).stroke(.separator.opacity(0.2), lineWidth: 0.5))

            Text(label)
                .font(.caption2)
                .foregroundStyle(.quaternary)
        }
    }

    private func fieldWithAction(_ label: String, text: Binding<String>, icon: String, action: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 4) {
                TextField("", text: text)
                    .font(.callout)
                    .textFieldStyle(.plain)
                    .frame(height: 24)
                    .padding(.horizontal, 6)
                    .background(Color(.controlBackgroundColor))
                    .clipShape(RoundedRectangle(cornerRadius: 3))
                    .overlay(RoundedRectangle(cornerRadius: 3).stroke(.separator.opacity(0.2), lineWidth: 0.5))

                Button(action: action) {
                    Image(systemName: icon)
                        .font(.system(size: 10))
                        .foregroundColor(text.wrappedValue.isEmpty ? .secondary.opacity(0.5) : .blue)
                        .frame(width: 20, height: 20)
                        .background(Color(.controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                }
                .buttonStyle(.plain)
                .disabled(text.wrappedValue.isEmpty)
            }

            Text(label)
                .font(.caption2)
                .foregroundStyle(.quaternary)
        }
    }

    var body: some View {
        BottomNavigationPane(isPresented: $isPresented) {
            VStack(spacing: 0) {
                tabPicker

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
        .onChange(of: person.id) { _, _ in
            // Reset to Information tab when person changes
            selectedTab = .information
        }
    }

    private var tabPicker: some View {
        Picker("", selection: $selectedTab) {
            ForEach(DetailTab.allCases, id: \.self) { tab in
                Label(tab.rawValue, systemImage: tab.icon).tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .labelsHidden()
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
    }

    private var informationTabContent: some View {
        ScrollView {
            HStack(alignment: .top, spacing: 12) {
                personalColumn
                addressColumn
                professionalColumn
            }
            .padding()
        }
        .onChange(of: person.name) { _, _ in scheduleAutoSave() }
        .onChange(of: person.dateOfBirth) { _, _ in scheduleAutoSave() }
        .onChange(of: person.gender) { _, _ in scheduleAutoSave() }
        .onChange(of: person.organizationId) { _, _ in scheduleAutoSave() }
        .onChange(of: person.email) { _, _ in scheduleAutoSave() }
        .onChange(of: person.jobs) { _, _ in scheduleAutoSave() }
        .onChange(of: person.languages) { _, _ in scheduleAutoSave() }
    }

    private var personalColumn: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PERSONAL")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    field("Name", text: $person.name)

                    // Age display with date picker
                    VStack(alignment: .leading, spacing: 1) {
                        Button(action: { showDatePicker.toggle() }) {
                            HStack {
                                Text(ageDisplay())
                                    .font(.callout)
                                    .foregroundStyle(.primary)
                                Spacer()
                                Image(systemName: "calendar")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(height: 24)
                            .padding(.horizontal, 6)
                            .background(Color(.controlBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .overlay(RoundedRectangle(cornerRadius: 3).stroke(.separator.opacity(0.2), lineWidth: 0.5))
                        }
                        .buttonStyle(.plain)
                        .popover(isPresented: $showDatePicker) {
                            VStack(spacing: 12) {
                                Text("Date of Birth")
                                    .font(.headline)

                                DatePicker("", selection: Binding(
                                    get: { person.dateOfBirth ?? Date() },
                                    set: { person.dateOfBirth = $0 }
                                ), displayedComponents: .date)
                                .datePickerStyle(.field)
                                .labelsHidden()

                                Divider()

                                HStack(spacing: 8) {
                                    Button("Clear") {
                                        person.dateOfBirth = nil
                                        showDatePicker = false
                                    }
                                    .buttonStyle(.bordered)

                                    Spacer()

                                    Button("Done") {
                                        showDatePicker = false
                                    }
                                    .buttonStyle(.borderedProminent)
                                }
                            }
                            .padding()
                            .frame(width: 260)
                        }

                        Text("Age")
                            .font(.caption2)
                            .foregroundStyle(.quaternary)
                    }

                    // Gender radio buttons (condensed)
                    VStack(alignment: .leading, spacing: 1) {
                        HStack(spacing: 8) {
                            ForEach(Gender.allCases, id: \.self) { gender in
                                Button(action: { person.gender = gender }) {
                                    HStack(spacing: 3) {
                                        Image(systemName: person.gender == gender ? "circle.fill" : "circle")
                                            .font(.system(size: 10))
                                            .foregroundStyle(person.gender == gender ? .blue : .secondary)
                                        Text(String(gender.rawValue.prefix(1)))
                                            .font(.caption)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .frame(height: 24)

                        Text("Gender")
                            .font(.caption2)
                            .foregroundStyle(.quaternary)
                    }

                    fieldWithAction("Email", text: Binding(
                        get: { person.email ?? "" },
                        set: { person.email = $0.isEmpty ? nil : $0 }
                    ), icon: "envelope.fill") {
                        if let email = person.email, !email.isEmpty,
                           let url = URL(string: "mailto:\(email)") {
                            NSWorkspace.shared.open(url)
                        }
                    }

                    fieldWithAction("Mobile", text: Binding(
                        get: { person.mobilePhone ?? "" },
                        set: { newValue in
                            let formatted = formatPhoneNumber(newValue)
                            person.mobilePhone = formatted.isEmpty ? nil : formatted
                        }
                    ), icon: "phone.fill") {
                        if let phone = person.mobilePhone, !phone.isEmpty,
                           let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                            NSWorkspace.shared.open(url)
                        }
                    }

                    fieldWithAction("Work Phone", text: Binding(
                        get: { person.workPhone ?? "" },
                        set: { newValue in
                            let formatted = formatPhoneNumber(newValue)
                            person.workPhone = formatted.isEmpty ? nil : formatted
                        }
                    ), icon: "phone.fill") {
                        if let phone = person.workPhone, !phone.isEmpty,
                           let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                            NSWorkspace.shared.open(url)
                        }
                    }

            field("Website", text: Binding(
                get: { person.website ?? "" },
                set: { newValue in
                    let formatted = formatWebsite(newValue)
                    person.website = formatted.isEmpty ? nil : formatted
                }
            ))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var addressColumn: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("ADDRESS")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    field("Street", text: Binding(
                        get: { person.address?.street1 ?? "" },
                        set: {
                            if person.address == nil { person.address = Address() }
                            person.address?.street1 = $0.isEmpty ? nil : $0
                        }
                    ))

                    field("Street 2", text: Binding(
                        get: { person.address?.street2 ?? "" },
                        set: {
                            if person.address == nil { person.address = Address() }
                            person.address?.street2 = $0.isEmpty ? nil : $0
                        }
                    ))

                    HStack(spacing: 6) {
                        field("ZIP", text: Binding(
                            get: { person.address?.zip ?? "" },
                            set: {
                                if person.address == nil { person.address = Address() }
                                person.address?.zip = $0.isEmpty ? nil : $0
                            }
                        ))
                        .frame(maxWidth: 80)

                        field("City", text: Binding(
                            get: { person.address?.city ?? "" },
                            set: {
                                if person.address == nil { person.address = Address() }
                                person.address?.city = $0.isEmpty ? nil : $0
                            }
                        ))
                    }

                    picker("Country", selection: Binding(
                        get: { person.address?.country ?? "" },
                        set: {
                            if person.address == nil { person.address = Address() }
                            person.address?.country = $0.isEmpty ? nil : $0
                        }
                    ), options: FilmCountries.sortedCountries)

            // Notes
            VStack(alignment: .leading, spacing: 1) {
                TextEditor(text: Binding(
                    get: { person.notes ?? "" },
                    set: { person.notes = $0.isEmpty ? nil : $0 }
                ))
                .font(.callout)
                .frame(height: 60)
                .padding(4)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 3))
                .overlay(RoundedRectangle(cornerRadius: 3).stroke(.separator.opacity(0.2), lineWidth: 0.5))

                Text("Notes")
                    .font(.caption2)
                    .foregroundStyle(.quaternary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var professionalColumn: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("PROFESSIONAL")
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    // Organization
                    VStack(alignment: .leading, spacing: 1) {
                        HStack(spacing: 4) {
                            Menu {
                                Button("None") { person.organizationId = nil }
                                Divider()
                                ForEach(availableOrganizations) { org in
                                    Button(org.name) { person.organizationId = org.id }
                                }
                            } label: {
                                HStack {
                                    Text(availableOrganizations.first { $0.id == person.organizationId }?.name ?? "")
                                        .font(.callout)
                                        .foregroundStyle(person.organizationId == nil ? .secondary : .primary)
                                        .lineLimit(1)
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

                            // Organization detail button
                            Button(action: {
                                if let orgId = person.organizationId,
                                   let org = availableOrganizations.first(where: { $0.id == orgId }) {
                                    onOrganizationSelected?(org)
                                }
                            }) {
                                Image(systemName: "building.2")
                                    .font(.system(size: 10))
                                    .frame(width: 20, height: 20)
                                    .background(Color(.controlBackgroundColor))
                                    .clipShape(RoundedRectangle(cornerRadius: 3))
                                    .overlay(RoundedRectangle(cornerRadius: 3).stroke(.separator.opacity(0.2), lineWidth: 0.5))
                            }
                            .buttonStyle(.plain)
                            .disabled(person.organizationId == nil)
                        }

                        Text("Organization")
                            .font(.caption2)
                            .foregroundStyle(.quaternary)
                    }

                    // Jobs (max 3)
                    VStack(alignment: .leading, spacing: 1) {
                        Menu {
                            ForEach(JobType.allCases, id: \.self) { job in
                                Button(action: {
                                    if !person.jobs.contains(job) && person.jobs.count < 3 {
                                        person.jobs.append(job)
                                    } else if person.jobs.contains(job) {
                                        person.jobs.removeAll { $0 == job }
                                    }
                                }) {
                                    HStack {
                                        Text(job.displayName)
                                        Spacer()
                                        if person.jobs.contains(job) {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                                .disabled(!person.jobs.contains(job) && person.jobs.count >= 3)
                            }
                        } label: {
                            HStack {
                                if person.jobs.isEmpty {
                                    Text("")
                                        .font(.callout)
                                        .foregroundStyle(.secondary)
                                } else {
                                    Text(person.jobs.map { $0.displayName }.joined(separator: ", "))
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

                        Text("Jobs (max 3)")
                            .font(.caption2)
                            .foregroundStyle(.quaternary)
                    }

                    // Languages
                    VStack(alignment: .leading, spacing: 1) {
                        Menu {
                            ForEach(Language.allCases, id: \.self) { lang in
                                Button(action: {
                                    if !person.languages.contains(lang) {
                                        person.languages.append(lang)
                                    } else {
                                        person.languages.removeAll { $0 == lang }
                                    }
                                }) {
                                    HStack {
                                        Text(lang.displayName)
                                        Spacer()
                                        if person.languages.contains(lang) {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                if person.languages.isEmpty {
                                    Text("")
                                        .font(.callout)
                                        .foregroundStyle(.secondary)
                                } else {
                                    Text(person.languages.map { $0.displayName }.joined(separator: ", "))
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

                        Text("Languages")
                            .font(.caption2)
                            .foregroundStyle(.quaternary)
                    }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var financialTabContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 6) {
                field("VAT Number", text: Binding(
                    get: { person.financialDetails?.vatNumber ?? "" },
                    set: {
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.vatNumber = $0.isEmpty ? nil : $0
                    }
                ))

                field("Bank Name", text: Binding(
                    get: { person.financialDetails?.bankName ?? "" },
                    set: {
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.bankName = $0.isEmpty ? nil : $0
                    }
                ))

                field("IBAN", text: Binding(
                    get: { person.financialDetails?.iban ?? "" },
                    set: {
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.iban = $0.isEmpty ? nil : $0
                    }
                ))

                field("BIC/SWIFT", text: Binding(
                    get: { person.financialDetails?.bic ?? "" },
                    set: {
                        if person.financialDetails == nil { person.financialDetails = FinancialDetails() }
                        person.financialDetails?.bic = $0.isEmpty ? nil : $0
                    }
                ))
            }
            .padding(8)
        }
    }

    private var projectsTabContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Projects")
                        .font(.headline)
                    Spacer()
                    Button(action: { showProjectPicker = true }) {
                        Label("Link", systemImage: "plus.circle.fill")
                            .font(.callout)
                            .foregroundStyle(.blue)
                    }
                    .buttonStyle(.plain)
                    .popover(isPresented: $showProjectPicker) {
                        VStack(spacing: 4) {
                            Text("Link Project")
                                .font(.headline)

                            ScrollView {
                                VStack(spacing: 2) {
                                    ForEach(availableProjects) { project in
                                        Button(action: {
                                            Task { await linkProject(project) }
                                        }) {
                                            HStack {
                                                VStack(alignment: .leading, spacing: 1) {
                                                    Text(project.name)
                                                        .font(.callout)
                                                    Text(project.projectNumber)
                                                        .font(.caption2)
                                                        .foregroundStyle(.secondary)
                                                }
                                                Spacer()
                                            }
                                            .padding(6)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .frame(width: 280, height: 350)
                        }
                        .padding()
                    }
                }

                if connectedProjects.isEmpty {
                    ContentUnavailableView("No Projects", systemImage: "folder")
                        .frame(height: 150)
                } else {
                    VStack(spacing: 3) {
                        ForEach(connectedProjects) { project in
                            Button(action: {
                                onProjectSelected?(project)
                            }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(project.name)
                                            .font(.callout)
                                            .foregroundStyle(.primary)
                                        Text(project.projectNumber + " • " + project.status.rawValue)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    HStack(spacing: 4) {
                                        Button(action: {
                                            Task { await unlinkProject(project) }
                                        }) {
                                            Image(systemName: "xmark.circle.fill")
                                                .foregroundStyle(.red)
                                        }
                                        .buttonStyle(.plain)

                                        Image(systemName: "chevron.right")
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                .padding(6)
                                .background(Color(.controlBackgroundColor))
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(8)
        }
        .task {
            await loadAvailableProjects()
        }
    }

    // MARK: - Helper Methods
    private func ageDisplay() -> String {
        guard let dob = person.dateOfBirth else { return "No DOB" }
        let age = Calendar.current.dateComponents([.year], from: dob, to: Date()).year ?? 0
        let formatter = DateFormatter()
        formatter.dateFormat = "dd.MM.yyyy"
        let dateString = formatter.string(from: dob)
        return "\(age) / \(dateString)"
    }

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

    private func loadConnectedProjects() async {
        do {
            connectedProjects = try await supabaseService.fetchProjectsForPerson(person.id)
        } catch {
            print("Error loading projects: \(error)")
            connectedProjects = []
        }
    }

    private func loadOrganizations() async {
        do {
            availableOrganizations = try await supabaseService.fetchOrganizations()
        } catch {
            availableOrganizations = []
        }
    }

    private func loadAvailableProjects() async {
        do {
            availableProjects = try await supabaseService.fetchAllProjects()
        } catch {
            availableProjects = []
        }
    }

    private func linkProject(_ project: Project) async {
        do {
            // Check if assignment already exists
            let existingAssignments = try await supabaseService.fetchProjectAssignments(projectId: project.id)
            if existingAssignments.contains(where: { $0.personId == person.id }) {
                print("Assignment already exists")
                showProjectPicker = false
                return
            }

            // Create new assignment
            try await supabaseService.assignPersonToProject(
                personId: person.id,
                projectId: project.id,
                role: person.jobs.first?.displayName ?? "",
                department: .other
            )
            await loadConnectedProjects()
            showProjectPicker = false
        } catch {
            print("Error linking project: \(error)")
        }
    }

    private func unlinkProject(_ project: Project) async {
        do {
            // Find the assignment ID
            let assignments = try await supabaseService.fetchProjectAssignments(projectId: project.id)
            if let assignment = assignments.first(where: { $0.personId == person.id }) {
                try await supabaseService.removeProjectAssignment(id: assignment.id)
                await loadConnectedProjects()
            }
        } catch {
            print("Error unlinking: \(error)")
        }
    }

    private func scheduleAutoSave() {
        saveTimer?.invalidate()
        saveTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
            Task { await savePerson() }
        }
    }

    private func savePerson() async {
        guard !isLoading else { return }
        isLoading = true
        do {
            try await supabaseService.updatePerson(person)
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
        }
    }
}
