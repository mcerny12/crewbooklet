//
//  AddProjectSheet.swift
//  CrewBooklet
//
//  Comprehensive project creation form with beautiful macOS design
//

import SwiftUI

struct AddProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddProjectViewModel()
    @State private var showOrganizationPicker = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with modern macOS styling
            headerView
            
            // Enhanced form content with better organization
            ScrollView {
                VStack(spacing: 20) {
                    // Essential Information Section
                    essentialInformationSection
                    
                    // Location & Client Section
                    locationAndClientSection
                    
                    // Project Timeline Section
                    timelineSection
                    
                    // Additional Details Section
                    additionalDetailsSection
                }
                .padding(24)
            }
            .background(.background)
            
            // Error message display
            if let errorMessage = viewModel.errorMessage {
                errorMessageView(errorMessage)
            }
        }
        .frame(width: 700, height: 650)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.3), radius: 15, x: 0, y: 5)
        .overlay {
            if viewModel.isLoading {
                loadingOverlay
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
    
    // MARK: - Header View
    private var headerView: some View {
        HStack {
            Button("Cancel") {
                dismiss()
            }
            .buttonStyle(.bordered)
            
            Spacer()
            
            VStack(spacing: 2) {
                Text("New Project")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                if !viewModel.projectNumber.isEmpty {
                    Text(viewModel.projectNumber)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fontDesign(.monospaced)
                }
            }
            
            Spacer()
            
            Button("Create Project") {
                Task {
                    viewModel.saveProject()
                    // Wait for completion before dismissing
                    try? await Task.sleep(nanoseconds: 500_000_000) // 0.5s
                    if viewModel.errorMessage == nil {
                        dismiss()
                    }
                }
            }
            .disabled(!viewModel.isValid || viewModel.isLoading)
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(.regularMaterial)
    }
    
    // MARK: - Essential Information Section
    private var essentialInformationSection: some View {
        FormSection("Essential Information", icon: "info.circle.fill") {
            VStack(spacing: 16) {
                // Project Name
                FormRow("Project Name") {
                    TextField("Enter project name", text: $viewModel.projectName)
                        .textFieldStyle(.roundedBorder)
                        .controlSize(.large)
                }
                
                // Project Number (Read-only)
                FormRow("Project Number") {
                    HStack {
                        Text(viewModel.projectNumber.isEmpty ? "Generating..." : viewModel.projectNumber)
                            .font(.system(.body, design: .monospaced))
                            .foregroundStyle(viewModel.projectNumber.isEmpty ? .secondary : .primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
                        
                        Spacer()
                        
                        Button("Regenerate") {
                            Task {
                                await viewModel.generateProjectNumber()
                            }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }
                
                // Project Status
                FormRow("Status") {
                    Picker("Status", selection: $viewModel.status) {
                        ForEach(ProjectStatus.allCases, id: \.self) { status in
                            Label(status.rawValue, systemImage: status.systemImage)
                                .tag(status)
                        }
                    }
                    .pickerStyle(.menu)
                    .controlSize(.large)
                }
            }
        }
    }
    
    // MARK: - Location & Client Section
    private var locationAndClientSection: some View {
        FormSection("Location & Client", icon: "building.2.fill") {
            VStack(spacing: 16) {
                // Client Organization
                FormRow("Client Organization") {
                    Button(action: { showOrganizationPicker = true }) {
                        HStack {
                            if let selectedOrg = viewModel.selectedOrganization {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(selectedOrg.name)
                                        .foregroundStyle(.primary)
                                    if let city = selectedOrg.city {
                                        Text(city)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            } else {
                                Text("Select Client Organization")
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.down")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.background, in: RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(.separator, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
                
                // Inquiry Country
                FormRow("Inquiry Country") {
                    Picker("Select Country", selection: $viewModel.inquiryCountry) {
                        Text("Select Country").tag("")
                        ForEach(FilmCountries.sortedCountries, id: \.self) { country in
                            Text(country).tag(country)
                        }
                    }
                    .pickerStyle(.menu)
                    .controlSize(.large)
                }
                
                // Shooting Location
                FormRow("Shooting Location") {
                    TextField("Enter shooting location", text: $viewModel.shootingLocation)
                        .textFieldStyle(.roundedBorder)
                        .controlSize(.large)
                }
            }
        }
    }
    
    // MARK: - Timeline Section
    private var timelineSection: some View {
        FormSection("Project Timeline", icon: "calendar.circle.fill") {
            VStack(spacing: 16) {
                // Start Date
                FormRow("Start Date") {
                    HStack {
                        DatePicker("Start Date", 
                                 selection: Binding(
                                    get: { viewModel.startDate ?? Date() },
                                    set: { viewModel.startDate = $0 }
                                 ),
                                 displayedComponents: .date)
                            .datePickerStyle(.compact)
                            .labelsHidden()
                        
                        Spacer()
                        
                        Button("Clear") {
                            viewModel.startDate = nil
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                        .disabled(viewModel.startDate == nil)
                    }
                }
                
                // End Date
                FormRow("End Date") {
                    HStack {
                        DatePicker("End Date", 
                                 selection: Binding(
                                    get: { viewModel.endDate ?? Date() },
                                    set: { viewModel.endDate = $0 }
                                 ),
                                 displayedComponents: .date)
                            .datePickerStyle(.compact)
                            .labelsHidden()
                        
                        Spacer()
                        
                        Button("Clear") {
                            viewModel.endDate = nil
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                        .disabled(viewModel.endDate == nil)
                    }
                }
            }
        }
    }
    
    // MARK: - Additional Details Section
    private var additionalDetailsSection: some View {
        FormSection("Additional Details", icon: "doc.text.fill") {
            VStack(spacing: 16) {
                // Description
                FormRow("Description") {
                    TextField("Project description", text: $viewModel.description, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...6)
                        .controlSize(.large)
                }
                
                // Notes
                FormRow("Notes") {
                    TextField("Internal notes", text: $viewModel.notes, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(2...4)
                        .controlSize(.large)
                }
            }
        }
    }
    
    // MARK: - Helper Views
    private func errorMessageView(_ message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text(message)
                .foregroundStyle(.red)
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
        .background(.regularMaterial)
    }
    
    private var loadingOverlay: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.regularMaterial)
            .overlay {
                VStack(spacing: 12) {
                    ProgressView()
                        .controlSize(.large)
                    Text("Creating project...")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }
            }
    }
}

// MARK: - Reusable Form Components
struct FormSection<Content: View>: View {
    let title: String
    let icon: String
    let content: Content
    
    init(_ title: String, icon: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.icon = icon
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(.blue)
                    .font(.title3)
                
                Text(title)
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                Spacer()
            }
            
            content
        }
        .padding(20)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}

struct FormRow<Content: View>: View {
    let label: String
    let content: Content
    
    init(_ label: String, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
            
            content
        }
    }
}

#Preview {
    AddProjectSheet()
} 