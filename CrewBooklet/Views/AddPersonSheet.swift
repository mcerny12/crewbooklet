//
//  AddPersonSheet.swift
//  CrewBooklet
//
//  Native macOS interface following strict Human Interface Guidelines
//

import SwiftUI

struct AddPersonSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddPersonViewModel()
    @StateObject private var organizationViewModel = OrganizationViewModel()
    @State private var showOrganizationPicker = false
    @State private var selectedOrganization: Organization?
    var visualDebugActive: Bool = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Native macOS header with material background
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                
                Spacer()
                
                Text("Add Person")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                Spacer()
                
                Button("Save") {
                    Task {
                        await viewModel.savePerson(organizationId: selectedOrganization?.id)
                        if viewModel.errorMessage == nil {
                            dismiss()
                        }
                    }
                }
                .disabled(!viewModel.isFormValid || viewModel.isLoading)
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(.regularMaterial)
            
            // Form content using native Form component
            ScrollView {
                VStack {
                    GroupBox("Person Details") {
                        Form {
                            TextField("Name", text: $viewModel.name, prompt: Text("Required"))
                                .textFieldStyle(.roundedBorder)
                            
                            TextField("Email", text: $viewModel.email, prompt: Text("Required"))
                                .textFieldStyle(.roundedBorder)
                            
                            // Gender selection
                            HStack {
                                Text("Gender:")
                                    .foregroundStyle(.secondary)
                                
                                Spacer()
                                
                                Picker("Gender", selection: $viewModel.gender) {
                                    Text("Not specified").tag(nil as Gender?)
                                    ForEach(Gender.allCases, id: \.self) { gender in
                                        Text(gender.displayName).tag(gender as Gender?)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: 150)
                            }
                            
                            TextField("Mobile Phone", text: $viewModel.mobilePhone, prompt: Text("Optional"))
                                .textFieldStyle(.roundedBorder)
                            
                            TextField("Work Phone", text: $viewModel.workPhone, prompt: Text("Optional"))
                                .textFieldStyle(.roundedBorder)
                            
                            TextField("Website", text: $viewModel.website, prompt: Text("Optional"))
                                .textFieldStyle(.roundedBorder)
                            
                            MacOSJobSelector(selection: $viewModel.selectedJob, availableJobs: viewModel.availableJobs)
                            
                            // Address section
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Address")
                                    .foregroundStyle(.secondary)
                                
                                TextField("Street 1", text: $viewModel.addressStreet1, prompt: Text("Optional"))
                                    .textFieldStyle(.roundedBorder)
                                
                                TextField("Street 2", text: $viewModel.addressStreet2, prompt: Text("Optional"))
                                    .textFieldStyle(.roundedBorder)
                                
                                HStack {
                                    TextField("ZIP", text: $viewModel.addressZip, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                        .frame(maxWidth: 80)
                                    
                                    TextField("City", text: $viewModel.addressCity, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                }
                                
                                TextField("Country", text: $viewModel.addressCountry, prompt: Text("Optional"))
                                    .textFieldStyle(.roundedBorder)
                            }
                            
                            // Organization selection
                            HStack {
                                Text("Organization:")
                                    .foregroundStyle(.secondary)
                                
                                Spacer()
                                
                                Button(selectedOrganization?.name ?? "Select Organization") {
                                    showOrganizationPicker = true
                                }
                                .foregroundStyle(selectedOrganization == nil ? .secondary : .primary)
                                .buttonStyle(.bordered)
                            }
                            .padding(.vertical, 4)
                        }
                        .formStyle(.grouped)
                    }
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
                .padding()
            }
            .background(.background)
            
            // Error message display
            if let errorMessage = viewModel.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(errorMessage)
                        .foregroundStyle(.red)
                    Spacer()
                }
                .padding()
                .background(.regularMaterial)
            }
        }
        .frame(width: 600, height: 650)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(radius: 3)
        .overlay {
            if viewModel.isLoading {
                RoundedRectangle(cornerRadius: 16)
                    .fill(.regularMaterial)
                    .overlay {
                        VStack {
                            ProgressView()
                                .controlSize(.large)
                            Text("Saving person...")
                                .foregroundStyle(.secondary)
                        }
                    }
            }
        }
        .task {
            await organizationViewModel.loadOrganizations()
        }
        .sheet(isPresented: $showOrganizationPicker) {
            OrganizationPickerSheet(
                selectedOrganization: $selectedOrganization,
                organizations: organizationViewModel.organizations,
                organizationViewModel: organizationViewModel
            )
        }
    }
}

// MARK: - Native macOS Job Selector
struct MacOSJobSelector: View {
    @Binding var selection: JobType?
    let availableJobs: [JobType]
    
    var body: some View {
        VStack(alignment: .leading) {
            Text("Job")
                .foregroundStyle(.secondary)
            
            Menu {
                Button("Select a job...") {
                    selection = nil
                }
                .disabled(true)
                
                Divider()
                
                ForEach(availableJobs, id: \.self) { job in
                    Button(job.displayName) {
                        selection = job
                    }
                }
            } label: {
                HStack {
                    Text(selection?.displayName ?? "Select a job...")
                        .foregroundStyle(selection != nil ? .primary : .secondary)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
            }
            .buttonStyle(.plain)
            .frame(minHeight: 32)
        }
    }
}

// MARK: - Enhanced Organization Picker with Add Functionality
struct OrganizationPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedOrganization: Organization?
    let organizations: [Organization]
    @ObservedObject var organizationViewModel: OrganizationViewModel
    @State private var searchText = ""
    @State private var showAddOrganization = false
    @State private var newOrganizationName = ""
    
    var filteredOrganizations: [Organization] {
        if searchText.isEmpty {
            return organizations
        } else {
            return organizations.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var showAddOption: Bool {
        !searchText.isEmpty && !filteredOrganizations.contains { $0.name.lowercased() == searchText.lowercased() }
    }
    
    var body: some View {
                        NavigationView {
            VStack(spacing: 0) {
                // Search field
                TextField("Search organizations...", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .padding()
                
                // Results list
                List {
                    // Show existing organizations
                    ForEach(filteredOrganizations) { organization in
                        Button(action: {
                            selectedOrganization = organization
                            dismiss()
                        }) {
                            HStack {
                                Image(systemName: "building.2")
                                    .foregroundStyle(.blue)
                                Text(organization.name)
                                    .foregroundStyle(.primary)
                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    
                    // Show "Add new organization" option if search doesn't match existing
                    if showAddOption {
                        Button(action: {
                            newOrganizationName = searchText
                            showAddOrganization = true
                        }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(.green)
                                Text("Add \"\(searchText)\"")
                                    .foregroundStyle(.primary)
                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .navigationTitle("Select Organization")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("None") {
                        selectedOrganization = nil
                        dismiss()
                    }
                }
            }
        }
        .frame(width: 400, height: 500)
        .sheet(isPresented: $showAddOrganization) {
            AddOrganizationFromPickerSheet(
                organizationName: $newOrganizationName,
                organizationViewModel: organizationViewModel,
                onSave: { newOrganization in
                    selectedOrganization = newOrganization
                    showAddOrganization = false
                    dismiss()
                }
            )
        }
    }
}

// MARK: - Quick Add Organization Sheet
struct AddOrganizationFromPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var organizationName: String
    @ObservedObject var organizationViewModel: OrganizationViewModel
    let onSave: (Organization) -> Void
    @State private var isLoading = false
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Add New Organization")
                .font(.title2)
                .fontWeight(.semibold)
            
            TextField("Organization Name", text: $organizationName)
                .textFieldStyle(.roundedBorder)
            
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(.bordered)
                
                Spacer()
                
                Button("Add") {
                    Task {
                        await addOrganization()
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(organizationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
            }
        }
        .padding()
        .frame(width: 300, height: 150)
    }
    
    private func addOrganization() async {
        isLoading = true
        
        let newOrganization = Organization(name: organizationName.trimmingCharacters(in: .whitespacesAndNewlines))
        
        await organizationViewModel.addOrganization(newOrganization)
        
        isLoading = false
        onSave(newOrganization)
    }
}

#Preview {
    AddPersonSheet()
} 