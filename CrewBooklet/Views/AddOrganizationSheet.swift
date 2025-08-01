//
//  AddOrganizationSheet.swift
//  CrewBooklet
//
//  Native macOS interface following strict Human Interface Guidelines
//

import SwiftUI

struct AddOrganizationSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddOrganizationViewModel()
    var visualDebugActive: Bool = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Native macOS header with material background
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                
                Spacer()
                
                Text("Add Organization")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                Spacer()
                
                Button("Save") {
                    viewModel.saveOrganization()
                    dismiss()
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(.regularMaterial)
            
            // Form content using native Form component with two-column layout
            ScrollView {
                VStack(spacing: 16) {
                    GroupBox("Organization Details") {
                        HStack(alignment: .top, spacing: 16) {
                            // Left Column: Organization Information
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Organization Information")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.secondary)
                                
                                VStack(spacing: 8) {
                                    TextField("Organization Name", text: $viewModel.name, prompt: Text("Required"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    TextField("Contact Email", text: $viewModel.contactEmail, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    TextField("Contact Phone", text: $viewModel.contactPhone, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    // Organization Types - Advanced Dropdown
                                    AdvancedOrganizationTypesSelector(selectedTypes: $viewModel.selectedJobs)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            
                            // Right Column: Address
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Address")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.secondary)
                                
                                VStack(spacing: 8) {
                                    TextField("Street 1", text: $viewModel.street, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    TextField("Street 2", text: $viewModel.street2, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    HStack {
                                        TextField("ZIP", text: $viewModel.zip, prompt: Text("Optional"))
                                            .textFieldStyle(.roundedBorder)
                                            .frame(maxWidth: 80)
                                        
                                        TextField("City", text: $viewModel.city, prompt: Text("Optional"))
                                            .textFieldStyle(.roundedBorder)
                                    }
                                    
                                    TextField("Country", text: $viewModel.country, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                    
                    // Add Invoice Address Section
                    GroupBox("Invoice Address") {
                        HStack(alignment: .top, spacing: 16) {
                            // Left Column: Future fields placeholder
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Reserved for Future Fields")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.secondary)
                                
                                Rectangle()
                                    .fill(.background.secondary)
                                    .frame(height: 80)
                                    .overlay(
                                        Text("Future expansion area")
                                            .font(.caption)
                                            .foregroundStyle(.tertiary)
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            
                            // Right Column: Invoice Address
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Invoice Address")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.secondary)
                                
                                VStack(spacing: 8) {
                                    TextField("Recipient/Company Name", text: $viewModel.nameInvoice, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    TextField("Street 1", text: $viewModel.streetInvoice, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    TextField("Street 2", text: $viewModel.street2Invoice, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                    
                                    HStack {
                                        TextField("ZIP", text: $viewModel.zipInvoice, prompt: Text("Optional"))
                                            .textFieldStyle(.roundedBorder)
                                            .frame(maxWidth: 80)
                                        
                                        TextField("City", text: $viewModel.cityInvoice, prompt: Text("Optional"))
                                            .textFieldStyle(.roundedBorder)
                                    }
                                    
                                    TextField("Country", text: $viewModel.countryInvoice, prompt: Text("Optional"))
                                        .textFieldStyle(.roundedBorder)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                    
                    // Notes section with two columns
                    GroupBox("Additional Information") {
                        HStack(alignment: .top, spacing: 16) {
                            // Left Column: Future fields placeholder
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Reserved for Future Fields")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.secondary)
                                
                                Rectangle()
                                    .fill(.background.secondary)
                                    .frame(height: 80)
                                    .overlay(
                                        Text("Future expansion area")
                                            .font(.caption)
                                            .foregroundStyle(.tertiary)
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            
                            // Right Column: Notes
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Notes")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.secondary)
                                
                                TextField("Notes", text: $viewModel.notes, prompt: Text("Optional"), axis: .vertical)
                                    .textFieldStyle(.roundedBorder)
                                    .lineLimit(3...6)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
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
        .frame(width: 700, height: 600) // Increased width for two columns
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
                            Text("Saving organization...")
                                .foregroundStyle(.secondary)
                        }
                    }
            }
        }
    }
}

// MARK: - Advanced Organization Types Selector
struct AdvancedOrganizationTypesSelector: View {
    @Binding var selectedTypes: [OrganizationJobType]
    @State private var showingSecondDropdown = false
    @State private var showingThirdDropdown = false
    
    private var availableTypesForDropdown: (first: [OrganizationJobType], second: [OrganizationJobType], third: [OrganizationJobType]) {
        let allTypes = OrganizationJobType.allCases
        
        let firstAvailable = allTypes
        let secondAvailable = allTypes.filter { !selectedTypes.contains($0) }
        let thirdAvailable = allTypes.filter { !selectedTypes.contains($0) }
        
        return (firstAvailable, secondAvailable, thirdAvailable)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Organization Types")
                .font(.caption)
                .foregroundStyle(.secondary)
            
            VStack(spacing: 6) {
                // First dropdown - always visible
                if selectedTypes.isEmpty {
                    // No selection - show dropdown with placeholder
                    Menu {
                        ForEach(OrganizationJobType.allCases, id: \.self) { type in
                            Button(type.displayName) {
                                selectedTypes.append(type)
                                showingSecondDropdown = true
                            }
                        }
                    } label: {
                        HStack {
                            Text("Select organization type...")
                                .foregroundStyle(.secondary)
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(.background, in: RoundedRectangle(cornerRadius: 4))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(.separator, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .frame(height: 26)
                } else {
                    // One or more selected - show first selected type (clickable but no arrow)
                    Button(action: {
                        // Allow editing the first selection
                        selectedTypes.removeFirst()
                        
                        // Show menu for replacement
                        // This will be handled by a sheet/menu action
                    }) {
                        HStack {
                            Text(selectedTypes.first?.displayName ?? "")
                                .foregroundStyle(.primary)
                            Spacer()
                            // No arrow when selected
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(.background, in: RoundedRectangle(cornerRadius: 4))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(.separator, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .frame(height: 26)
                    
                    // Second dropdown - appears when first is selected
                    if selectedTypes.count >= 1 {
                        if selectedTypes.count == 1 {
                            // Show second dropdown
                            Menu {
                                ForEach(availableTypesForDropdown.second, id: \.self) { type in
                                    Button(type.displayName) {
                                        selectedTypes.append(type)
                                        showingThirdDropdown = true
                                    }
                                }
                            } label: {
                                HStack {
                                    Text("Add second type...")
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(.separator, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                            .frame(height: 26)
                        } else if selectedTypes.count >= 2 {
                            // Show second selected type (clickable but no arrow)
                            HStack {
                                Button(action: {
                                    // Allow removing the second selection
                                    if selectedTypes.count >= 2 {
                                        selectedTypes.remove(at: 1)
                                    }
                                }) {
                                    HStack {
                                        Text(selectedTypes[1].displayName)
                                            .foregroundStyle(.primary)
                                        Spacer()
                                        Button(action: {
                                            selectedTypes.remove(at: 1)
                                        }) {
                                            Image(systemName: "xmark.circle.fill")
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 6)
                                    .background(.background, in: RoundedRectangle(cornerRadius: 4))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 4)
                                            .stroke(.separator, lineWidth: 1)
                                    )
                                }
                                .buttonStyle(.plain)
                                .frame(height: 26)
                            }
                        }
                    }
                    
                    // Third dropdown - appears when second is selected
                    if selectedTypes.count >= 2 {
                        if selectedTypes.count == 2 {
                            // Show third dropdown
                            Menu {
                                ForEach(availableTypesForDropdown.third, id: \.self) { type in
                                    Button(type.displayName) {
                                        selectedTypes.append(type)
                                    }
                                }
                            } label: {
                                HStack {
                                    Text("Add third type...")
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    Image(systemName: "chevron.down")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(.separator, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                            .frame(height: 26)
                        } else if selectedTypes.count >= 3 {
                            // Show third selected type with remove option
                            Button(action: {
                                selectedTypes.remove(at: 2)
                            }) {
                                HStack {
                                    Text(selectedTypes[2].displayName)
                                        .foregroundStyle(.primary)
                                    Spacer()
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(.background, in: RoundedRectangle(cornerRadius: 4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(.separator, lineWidth: 1)
                                )
                            }
                            .buttonStyle(.plain)
                            .frame(height: 26)
                        }
                    }
                }
            }
            
            // Show selection count
            if !selectedTypes.isEmpty {
                Text("\(selectedTypes.count) type(s) selected")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Add Organization View Model
@MainActor
class AddOrganizationViewModel: ObservableObject {
    @Published var name: String = ""
    @Published var contactEmail: String = ""
    @Published var contactPhone: String = ""
    @Published var street: String = ""
    @Published var street2: String = ""
    @Published var zip: String = ""
    @Published var city: String = ""
    @Published var country: String = ""
    @Published var nameInvoice: String = ""
    @Published var streetInvoice: String = ""
    @Published var street2Invoice: String = ""
    @Published var zipInvoice: String = ""
    @Published var cityInvoice: String = ""
    @Published var countryInvoice: String = ""
    @Published var notes: String = ""
    @Published var selectedJobs: [OrganizationJobType] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    
    private let organizationViewModel = OrganizationViewModel()
    
    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    func saveOrganization() {
        guard isValid else {
            errorMessage = "Please fill in the organization name"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        let newOrganization = Organization(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            contactEmail: contactEmail.isEmpty ? "" : contactEmail,
            contactPhone: contactPhone.isEmpty ? "" : contactPhone,
            jobs: selectedJobs,
            notes: notes.isEmpty ? "" : notes
        )
        
        Task {
            await organizationViewModel.addOrganization(newOrganization)
            self.isLoading = false
            print("✅ Organization saved successfully")
        }
    }
}

#Preview {
    AddOrganizationSheet()
} 