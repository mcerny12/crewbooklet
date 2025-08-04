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
    
    var body: some View {
        BottomNavigationPane(isPresented: $isPresented) {
            VStack(spacing: 0) {
                // Tab selection with minimal spacing
                tabSelectionView
                
                // Content with minimal padding
                ScrollView {
                    VStack(spacing: 6) {
                        switch selectedTab {
                        case .information:
                            informationTabContent
                        case .financial:
                            financialTabContent
                        case .projects:
                            projectsTabContent
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                }
            }
        }
    }
    
    private var tabSelectionView: some View {
        Picker("", selection: $selectedTab) {
            ForEach(DetailTab.allCases, id: \.self) { tab in
                Label(tab.rawValue, systemImage: tab.icon)
                    .tag(tab)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
    }
    
    private var informationTabContent: some View {
        VStack(spacing: 6) {
            // Row 1: Name, Gender, Organization
            HStack(spacing: 4) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Name")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Name", text: $person.name)
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Gender")
                        .font(.caption2)
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
                    .frame(height: 22)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Organization")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    // Placeholder for organization picker
                    Text("Select...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(height: 22)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 6)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 4))
                }
            }
            
            // Row 2: Email, Website, Mobile Phone
            HStack(spacing: 4) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Email")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Email", text: Binding(
                        get: { person.email ?? "" },
                        set: { person.email = $0.isEmpty ? nil : $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Website")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Website", text: Binding(
                        get: { person.website ?? "" },
                        set: { person.website = $0.isEmpty ? nil : $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Mobile Phone")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Mobile", text: Binding(
                        get: { person.mobilePhone ?? "" },
                        set: { person.mobilePhone = $0.isEmpty ? nil : $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                }
            }
            
            // Row 3: Work Phone, Jobs, Languages
            HStack(spacing: 4) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Work Phone")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Work Phone", text: Binding(
                        get: { person.workPhone ?? "" },
                        set: { person.workPhone = $0.isEmpty ? nil : $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Jobs")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(person.jobs.map { $0.displayName }.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(person.jobs.isEmpty ? .secondary : .primary)
                        .frame(height: 22)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 6)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 4))
                        .lineLimit(1)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Languages")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(person.languages.map { $0.displayName }.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(person.languages.isEmpty ? .secondary : .primary)
                        .frame(height: 22)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 6)
                        .background(.quaternary, in: RoundedRectangle(cornerRadius: 4))
                        .lineLimit(1)
                }
            }
            
            // Address Section (2 columns)
            VStack(alignment: .leading, spacing: 2) {
                Text("Address")
                    .font(.caption)
                    .fontWeight(.medium)
                
                HStack(spacing: 4) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Street 1")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Street 1", text: Binding(
                            get: { person.address?.street1 ?? "" },
                            set: { 
                                if person.address == nil { person.address = Address() }
                                person.address?.street1 = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Street 2")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Street 2", text: Binding(
                            get: { person.address?.street2 ?? "" },
                            set: { 
                                if person.address == nil { person.address = Address() }
                                person.address?.street2 = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                }
                
                HStack(spacing: 4) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("ZIP")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("ZIP", text: Binding(
                            get: { person.address?.zip ?? "" },
                            set: { 
                                if person.address == nil { person.address = Address() }
                                person.address?.zip = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    .frame(maxWidth: 80)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("City")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("City", text: Binding(
                            get: { person.address?.city ?? "" },
                            set: { 
                                if person.address == nil { person.address = Address() }
                                person.address?.city = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Country")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Country", text: Binding(
                            get: { person.address?.country ?? "" },
                            set: { 
                                if person.address == nil { person.address = Address() }
                                person.address?.country = $0.isEmpty ? nil : $0
                            }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                }
            }
            
            // Notes
            VStack(alignment: .leading, spacing: 1) {
                Text("Notes")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                TextField("Notes", text: Binding(
                    get: { person.notes ?? "" },
                    set: { person.notes = $0.isEmpty ? nil : $0 }
                ), axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .font(.caption)
                .lineLimit(2...3)
            }
            
            // Save Button and Error
            HStack {
                Spacer()
                Button("Save") {
                    Task { await savePerson() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)
                .font(.caption)
                .controlSize(.small)
            }
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
                    .font(.caption2)
            }
        }
        .padding(4)
    }
    
    private var financialTabContent: some View {
        VStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Financial Information")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                // Financial details content here
                Text("Financial details will be implemented here")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
        }
    }
    
    private var projectsTabContent: some View {
        VStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Associated Projects")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                // Projects content here
                Text("Associated projects will be displayed here")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
        }
    }
    
    private func savePerson() async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updatePerson(person)
            await MainActor.run {
                isLoading = false
            }
            // Could add a success message or callback here
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = "Failed to save person: \(error.localizedDescription)"
            }
        }
    }
}

#Preview {
    @Previewable @State var person = Person(name: "John Doe", email: "john@example.com")
    @Previewable @State var isPresented = true
    
    return ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()
        
        PersonDetailBottomPane(person: $person, isPresented: $isPresented)
    }
}