//
//  AddOrganizationSheet.swift
//  CrewBooklet
//
//  Native macOS interface following strict Human Interface Guidelines
//

import SwiftUI

struct AddOrganizationSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel: AddOrganizationViewModel
    @ObservedObject var organizationViewModel: OrganizationViewModel
    var visualDebugActive: Bool = false
    
    init(organizationViewModel: OrganizationViewModel, visualDebugActive: Bool = false) {
        self.organizationViewModel = organizationViewModel
        self.visualDebugActive = visualDebugActive
        self._viewModel = StateObject(wrappedValue: AddOrganizationViewModel(organizationViewModel: organizationViewModel))
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Sleek header
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
                    Task {
                        await viewModel.saveOrganization()
                        if viewModel.errorMessage == nil {
                            dismiss()
                        }
                    }
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(.regularMaterial)
            
            // Sleek form content
            ScrollView {
                VStack(spacing: 6) {
                    SleekFormRow("Organization Name", required: true) {
                        TextField("Enter organization name", text: $viewModel.name)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Contact Email") {
                        TextField("Enter contact email", text: $viewModel.contactEmail)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Contact Phone") {
                        TextField("Enter contact phone", text: $viewModel.contactPhone)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Organization Types") {
                        CompactOrganizationTypesSelector(selectedTypes: $viewModel.selectedJobs)
                    }
                    
                    // Address rows
                    SleekFormRow("Street") {
                        TextField("Street address", text: $viewModel.street)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Street 2") {
                        TextField("Apartment, suite, etc.", text: $viewModel.street2)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("ZIP & City") {
                        HStack(spacing: 8) {
                            TextField("ZIP", text: $viewModel.zip)
                                .textFieldStyle(.roundedBorder)
                                .frame(maxWidth: 80)
                                .onSubmit {
                                    viewModel.handleZipCodeChange()
                                }
                            
                            TextField("City", text: $viewModel.city)
                                .textFieldStyle(.roundedBorder)
                        }
                    }
                    
                    SleekFormRow("Country") {
                        TextField("Country", text: $viewModel.country)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    SleekFormRow("Notes") {
                        TextField("Additional notes", text: $viewModel.notes, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...3)
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
        .frame(width: 650, height: 480)
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


// MARK: - Add Organization View Model
@MainActor
class AddOrganizationViewModel: ObservableObject {
    @Published var name: String = ""
    @Published var contactEmail: String = ""
    @Published var contactPhone: String = "" {
        didSet {
            if contactPhone != oldValue {
                contactPhone = PhoneNumberFormatter.formatPhoneNumber(contactPhone)
            }
        }
    }
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
    
    private let organizationViewModel: OrganizationViewModel
    
    init(organizationViewModel: OrganizationViewModel) {
        self.organizationViewModel = organizationViewModel
    }
    
    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    func handleZipCodeChange() {
        guard !zip.isEmpty else { return }
        
        // Auto-fill city and country based on zip code
        if let (cityName, countryName) = ZipCodeLookup.lookupCityAndCountry(for: zip) {
            if !cityName.isEmpty && city.isEmpty {
                city = cityName
            }
            if !countryName.isEmpty && country.isEmpty {
                country = countryName
            }
        }
    }
    
    func handleInvoiceZipCodeChange() {
        guard !zipInvoice.isEmpty else { return }
        
        // Auto-fill city and country based on zip code
        if let (cityName, countryName) = ZipCodeLookup.lookupCityAndCountry(for: zipInvoice) {
            if !cityName.isEmpty && cityInvoice.isEmpty {
                cityInvoice = cityName
            }
            if !countryName.isEmpty && countryInvoice.isEmpty {
                countryInvoice = countryName
            }
        }
    }
    
    func saveOrganization() async {
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
        
        await organizationViewModel.addOrganization(newOrganization)
        isLoading = false
        
        if organizationViewModel.errorMessage != nil {
            errorMessage = organizationViewModel.errorMessage
        } else {
            print("✅ Organization saved successfully")
        }
    }
}

#Preview {
    AddOrganizationSheet(organizationViewModel: OrganizationViewModel())
} 