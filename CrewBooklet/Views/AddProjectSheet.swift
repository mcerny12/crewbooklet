//
//  AddProjectSheet.swift
//  CrewBooklet
//
//  Native macOS interface following strict Human Interface Guidelines
//

import SwiftUI

struct AddProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddProjectViewModel()
    
    var body: some View {
        VStack(spacing: 0) {
            // Native macOS header with material background
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
                    viewModel.saveProject()
                    dismiss()
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(.regularMaterial)
            
            // Form content using native Form component
            ScrollView {
                VStack {
                    GroupBox("Project Details") {
                        Form {
                            TextField("Project Name", text: $viewModel.projectName, prompt: Text("Required"))
                                .textFieldStyle(.roundedBorder)
                            
                            // Project Number - Auto-generated, read-only
                            HStack {
                                Text("Project Number")
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(viewModel.projectNumber.isEmpty ? "Generating..." : viewModel.projectNumber)
                                    .font(.system(.body, design: .monospaced))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(.quaternary, in: RoundedRectangle(cornerRadius: 6))
                            }
                            
                            TextField("Description", text: $viewModel.description, prompt: Text("Optional"))
                                .textFieldStyle(.roundedBorder)
                            
                            // Status selection
                            HStack {
                                Text("Status:")
                                    .foregroundStyle(.secondary)
                                
                                Spacer()
                                
                                Picker("Status", selection: $viewModel.status) {
                                    ForEach(ProjectStatus.allCases, id: \.self) { status in
                                        Text(status.rawValue).tag(status)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: 150)
                            }
                            
                            // Inquiry Country
                            HStack {
                                Text("Inquiry Country:")
                                    .foregroundStyle(.secondary)
                                
                                Spacer()
                                
                                Picker("Country", selection: $viewModel.inquiryCountry) {
                                    Text("Select Country").tag("")
                                    ForEach(FilmCountries.sortedCountries, id: \.self) { country in
                                        Text(country).tag(country)
                                    }
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: 200)
                            }
                            
                            TextField("Shooting Location", text: $viewModel.shootingLocation, prompt: Text("Optional"))
                                .textFieldStyle(.roundedBorder)
                            
                            // Budget and Currency
                            HStack {
                                Text("Budget:")
                                    .foregroundStyle(.secondary)
                                
                                TextField("Amount", value: $viewModel.budget, format: .number)
                                    .textFieldStyle(.roundedBorder)
                                    .frame(maxWidth: 120)
                                
                                Picker("Currency", selection: $viewModel.currency) {
                                    Text("EUR").tag("EUR")
                                    Text("USD").tag("USD")
                                    Text("GBP").tag("GBP")
                                }
                                .pickerStyle(.menu)
                                .frame(maxWidth: 80)
                            }
                            
                            // Date Range
                            HStack {
                                Text("Start Date:")
                                    .foregroundStyle(.secondary)
                                
                                DatePicker("", selection: $viewModel.startDate, displayedComponents: .date)
                                    .labelsHidden()
                                    .frame(maxWidth: 120)
                                
                                Text("End Date:")
                                    .foregroundStyle(.secondary)
                                
                                DatePicker("", selection: $viewModel.endDate, displayedComponents: .date)
                                    .labelsHidden()
                                    .frame(maxWidth: 120)
                            }
                            
                            TextField("Notes", text: $viewModel.notes, prompt: Text("Optional"), axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                                .lineLimit(3...6)
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
        .onAppear {
            // Auto-generate project number when sheet appears
            if viewModel.projectNumber.isEmpty {
                viewModel.generateProjectNumber()
            }
        }
        .frame(width: 600, height: 550)
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
                            Text("Saving project...")
                                .foregroundStyle(.secondary)
                        }
                    }
            }
        }
    }
}

#Preview {
    AddProjectSheet()
} 