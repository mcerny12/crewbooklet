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
        VStack(spacing: 8) {
            // Basic Info Section
            VStack(alignment: .leading, spacing: 4) {
                Text("Basic Information")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                VStack(spacing: 6) {
                    // Organization Name
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Organization Name")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField("Enter organization name", text: $organization.name)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    // Contact Info
                    HStack(spacing: 6) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Contact Email")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("Enter email", text: Binding(
                                get: { organization.contactEmail ?? "" },
                                set: { organization.contactEmail = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Contact Phone")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("Enter phone", text: Binding(
                                get: { organization.contactPhone ?? "" },
                                set: { organization.contactPhone = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                    }
                    
                    // Business Type
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Business Type")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(organization.jobs.map { $0.displayName }.joined(separator: ", "))
                            .font(.body)
                            .foregroundStyle(organization.jobs.isEmpty ? .secondary : .primary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 4)
                    }
                }
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
            
            // Address Section
            VStack(alignment: .leading, spacing: 4) {
                Text("Address")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                VStack(spacing: 6) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Street")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField("Enter street", text: Binding(
                            get: { organization.street ?? "" },
                            set: { organization.street = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                    }
                    
                    HStack(spacing: 6) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("ZIP Code")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("ZIP", text: Binding(
                                get: { organization.zip ?? "" },
                                set: { organization.zip = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("City")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("Enter city", text: Binding(
                                get: { organization.city ?? "" },
                                set: { organization.city = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Country")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("Country", text: Binding(
                                get: { organization.country ?? "" },
                                set: { organization.country = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                    }
                }
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
            
            // Notes Section
            VStack(alignment: .leading, spacing: 4) {
                Text("Notes")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                TextField("Enter notes", text: Binding(
                    get: { organization.notes ?? "" },
                    set: { organization.notes = $0.isEmpty ? nil : $0 }
                ), axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(3...6)
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
            
            // Save Button
            Button("Save Changes") {
                Task {
                    await saveOrganization()
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading)
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
                    .font(.caption)
            }
        }
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