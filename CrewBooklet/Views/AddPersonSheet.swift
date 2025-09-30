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
    @ObservedObject var organizationViewModel: OrganizationViewModel
    @State private var showOrganizationPicker = false
    @State private var selectedOrganization: Organization?
    var visualDebugActive: Bool = false
    
    init(organizationViewModel: OrganizationViewModel, visualDebugActive: Bool = false) {
        self.organizationViewModel = organizationViewModel
        self.visualDebugActive = visualDebugActive
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Sleek header
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
            
            // Sleek form content matching list entry design
            ScrollView {
                VStack(spacing: 6) {
                    SleekFormRow("Name", required: true) {
                        TextField("Enter full name", text: $viewModel.name)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Email", required: true) {
                        TextField("Enter email address", text: $viewModel.email)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Gender") {
                        Picker("Gender", selection: $viewModel.gender) {
                            Text("Not specified").tag(nil as Gender?)
                            ForEach(Gender.allCases, id: \.self) { gender in
                                Text(gender.displayName).tag(gender as Gender?)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    
                    SleekFormRow("Organization") {
                        Button(selectedOrganization?.name ?? "Select Organization") {
                            showOrganizationPicker = true
                        }
                        .foregroundStyle(selectedOrganization == nil ? .secondary : .primary)
                        .buttonStyle(.bordered)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    
                    SleekFormRow("Job") {
                        MacOSJobSelector(selection: $viewModel.selectedJob, availableJobs: viewModel.availableJobs)
                    }
                    
                    SleekFormRow("Mobile Phone") {
                        TextField("Enter mobile number", text: $viewModel.mobilePhone)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Work Phone") {
                        TextField("Enter work number", text: $viewModel.workPhone)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Website") {
                        TextField("Enter website URL", text: $viewModel.website)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    // Address rows
                    SleekFormRow("Street") {
                        TextField("Street address", text: $viewModel.addressStreet1)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Street 2") {
                        TextField("Apartment, suite, etc.", text: $viewModel.addressStreet2)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("ZIP & City") {
                        HStack(spacing: 8) {
                            TextField("ZIP", text: $viewModel.addressZip)
                                .textFieldStyle(.roundedBorder)
                                .frame(maxWidth: 80)
                                .onSubmit {
                                    viewModel.handleZipCodeChange()
                                }
                            
                            TextField("City", text: $viewModel.addressCity)
                                .textFieldStyle(.roundedBorder)
                        }
                    }
                    
                    SleekFormRow("Country") {
                        TextField("Country", text: $viewModel.addressCountry)
                            .textFieldStyle(.roundedBorder)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
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
        .frame(width: 650, height: 520)
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
        .frame(width: 600, height: 600)
        .sheet(isPresented: $showAddOrganization) {
            QuickAddOrganizationSheet(
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

#Preview {
    AddPersonSheet(organizationViewModel: OrganizationViewModel())
} 