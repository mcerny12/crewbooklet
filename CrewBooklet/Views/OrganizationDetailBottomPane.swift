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
                        case .people:
                            peopleTabContent
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                }
            }
        }
        .task {
            await loadConnectedData()
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
            // Row 1: Name, Contact Email, Contact Phone
            HStack(spacing: 4) {
                VStack(alignment: .leading, spacing: 1) {
                    Text("Organization Name")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Name", text: $organization.name)
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Contact Email")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Email", text: Binding(
                        get: { organization.contactEmail ?? "" },
                        set: { organization.contactEmail = $0.isEmpty ? nil : $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("Contact Phone")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    TextField("Phone", text: Binding(
                        get: { organization.contactPhone ?? "" },
                        set: { organization.contactPhone = $0.isEmpty ? nil : $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                }
            }
            
            // Row 2: Business Type
            VStack(alignment: .leading, spacing: 1) {
                Text("Business Type")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(organization.jobs.map { $0.displayName }.joined(separator: ", "))
                    .font(.caption)
                    .foregroundStyle(organization.jobs.isEmpty ? .secondary : .primary)
                    .frame(height: 22)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 6)
                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 4))
                    .lineLimit(1)
            }
            
            // Main Address Section
            VStack(alignment: .leading, spacing: 2) {
                Text("Main Address")
                    .font(.caption)
                    .fontWeight(.medium)
                
                HStack(spacing: 4) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Street")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Street", text: Binding(
                            get: { organization.street ?? "" },
                            set: { organization.street = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Street 2")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Street 2", text: Binding(
                            get: { organization.street2 ?? "" },
                            set: { organization.street2 = $0.isEmpty ? nil : $0 }
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
                            get: { organization.zip ?? "" },
                            set: { organization.zip = $0.isEmpty ? nil : $0 }
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
                            get: { organization.city ?? "" },
                            set: { organization.city = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Country")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Country", text: Binding(
                            get: { organization.country ?? "" },
                            set: { organization.country = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                }
            }
            
            // Invoice Address Section
            VStack(alignment: .leading, spacing: 2) {
                Text("Invoice Address")
                    .font(.caption)
                    .fontWeight(.medium)
                
                HStack(spacing: 4) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Invoice Name")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Invoice Name", text: Binding(
                            get: { organization.nameInvoice ?? "" },
                            set: { organization.nameInvoice = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Invoice Street")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Invoice Street", text: Binding(
                            get: { organization.streetInvoice ?? "" },
                            set: { organization.streetInvoice = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                }
                
                HStack(spacing: 4) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Invoice ZIP")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("ZIP", text: Binding(
                            get: { organization.zipInvoice ?? "" },
                            set: { organization.zipInvoice = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    .frame(maxWidth: 80)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Invoice City")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Invoice City", text: Binding(
                            get: { organization.cityInvoice ?? "" },
                            set: { organization.cityInvoice = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                        .font(.caption)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Invoice Country")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        TextField("Country", text: Binding(
                            get: { organization.countryInvoice ?? "" },
                            set: { organization.countryInvoice = $0.isEmpty ? nil : $0 }
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
                    get: { organization.notes ?? "" },
                    set: { organization.notes = $0.isEmpty ? nil : $0 }
                ), axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .font(.caption)
                .lineLimit(2...3)
            }
            
            // Save Button and Error
            HStack {
                Spacer()
                Button("Save") {
                    Task { await saveOrganization() }
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
                
                if connectedProjects.isEmpty {
                    Text("No associated projects")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(connectedProjects) { project in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name)
                                        .font(.body)
                                        .fontWeight(.medium)
                                    Text(project.projectNumber)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(project.status.rawValue)
                                    .font(.caption)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(.blue.opacity(0.2))
                                    .foregroundStyle(.blue)
                                    .cornerRadius(4)
                            }
                            .padding(6)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
        }
    }
    
    private var peopleTabContent: some View {
        VStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Linked Employees")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                if connectedPeople.isEmpty {
                    Text("No linked employees")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(8)
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(connectedPeople) { person in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(person.name)
                                        .font(.body)
                                        .fontWeight(.medium)
                                    if let email = person.email {
                                        Text(email)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if !person.jobs.isEmpty {
                                    Text(person.jobs.first?.displayName ?? "")
                                        .font(.caption)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(.green.opacity(0.2))
                                        .foregroundStyle(.green)
                                        .cornerRadius(4)
                                }
                            }
                            .padding(6)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 4))
                        }
                    }
                }
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
        }
    }
    
    private func loadConnectedData() async {
        do {
            connectedPeople = try await supabaseService.fetchPeopleByOrganization(organization.id)
            // Load connected projects when method is available
            // connectedProjects = try await supabaseService.fetchProjectsByOrganization(organization.id)
        } catch {
            errorMessage = "Failed to load connected data: \(error.localizedDescription)"
        }
    }
    
    private func saveOrganization() async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updateOrganization(organization)
            await MainActor.run {
                isLoading = false
            }
            // Could add a success message or callback here
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = "Failed to save organization: \(error.localizedDescription)"
            }
        }
    }
}

#Preview {
    @Previewable @State var organization = Organization(name: "Example Corp", contactEmail: "contact@example.com")
    @Previewable @State var isPresented = true
    
    return ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()
        
        OrganizationDetailBottomPane(organization: $organization, isPresented: $isPresented)
    }
}