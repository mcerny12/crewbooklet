//
//  AddProjectSheet.swift
//  CrewBooklet
//
//  Sleek project creation form matching list entry design patterns
//

import SwiftUI

struct AddProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddProjectViewModel()
    @State private var showOrganizationPicker = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Sleek header
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                
                Spacer()
                
                Text("Add Project")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                Spacer()
                
                Button("Save") {
                    Task {
                        viewModel.saveProject()
                        try? await Task.sleep(nanoseconds: 500_000_000)
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
                    // Project Name
                    SleekFormRow("Project Name", required: true) {
                        TextField("Enter project name", text: $viewModel.projectName)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    // Project Number
                    SleekFormRow("Project Number") {
                        HStack(spacing: 8) {
                            Text(viewModel.projectNumber.isEmpty ? "Generating..." : viewModel.projectNumber)
                                .font(.system(.body, design: .monospaced))
                                .foregroundStyle(viewModel.projectNumber.isEmpty ? .secondary : .primary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(.quaternary, in: RoundedRectangle(cornerRadius: 6))
                            
                            Spacer()
                            
                            Button("↻") {
                                Task { await viewModel.generateProjectNumber() }
                            }
                            .buttonStyle(.borderless)
                            .font(.caption)
                        }
                    }
                    
                    // Status
                    SleekFormRow("Status") {
                        Picker("Status", selection: $viewModel.status) {
                            ForEach(ProjectStatus.allCases, id: \.self) { status in
                                Text(status.rawValue).tag(status)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    
                    // Client Organization
                    SleekFormRow("Client Organization") {
                        Button(viewModel.selectedOrganization?.name ?? "Select Organization") {
                            showOrganizationPicker = true
                        }
                        .foregroundStyle(viewModel.selectedOrganization == nil ? .secondary : .primary)
                        .buttonStyle(.bordered)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    
                    // Inquiry Country
                    SleekFormRow("Inquiry Country") {
                        Picker("Country", selection: $viewModel.inquiryCountry) {
                            Text("Select Country").tag("")
                            ForEach(FilmCountries.sortedCountries, id: \.self) { country in
                                Text(country).tag(country)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    
                    // Shooting Location
                    SleekFormRow("Shooting Location") {
                        TextField("Enter location", text: $viewModel.shootingLocation)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    // Start Date
                    SleekFormRow("Start Date") {
                        OptionalDatePicker(
                            date: $viewModel.startDate,
                            placeholder: "Set start date"
                        )
                    }
                    
                    // End Date
                    SleekFormRow("End Date") {
                        OptionalDatePicker(
                            date: $viewModel.endDate,
                            placeholder: "Set end date"
                        )
                    }
                    
                    // Description
                    SleekFormRow("Description") {
                        TextField("Project description", text: $viewModel.description, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...3)
                    }
                    
                    // Notes
                    SleekFormRow("Notes") {
                        TextField("Internal notes", text: $viewModel.notes, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...3)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .background(.background)
            
            // Error message
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
                            Text("Creating project...")
                                .foregroundStyle(.secondary)
                        }
                    }
            }
        }
        .sheet(isPresented: $showOrganizationPicker) {
            OrganizationPickerSheet(
                selectedOrganization: Binding(
                    get: { viewModel.selectedOrganization },
                    set: { viewModel.clientOrganizationId = $0?.id }
                ),
                organizations: viewModel.organizations,
                organizationViewModel: OrganizationViewModel()
            )
        }
    }
}

#Preview {
    AddProjectSheet()
} 