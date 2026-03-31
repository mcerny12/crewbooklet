//
//  SharedPopupComponents.swift
//  CrewBooklet
//
//  Shared popup components with sleek design matching list entries
//

import SwiftUI

// MARK: - Sleek Form Components (matching list entry design)

struct SleekFormRow<Content: View>: View {
    let label: String
    let required: Bool
    let content: Content
    
    init(_ label: String, required: Bool = false, @ViewBuilder content: () -> Content) {
        self.label = label
        self.required = required
        self.content = content()
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Label with consistent width (matching list design)
            HStack(spacing: 2) {
                Text(label)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                if required {
                    Text("*")
                        .font(.body)
                        .foregroundStyle(.red)
                }
            }
            .frame(width: 150, alignment: .leading)
            
            Spacer()
            
            // Content area
            content
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
    }
}

struct OptionalDatePicker: View {
    @Binding var date: Date?
    let placeholder: String
    
    var body: some View {
        HStack {
            if let date = date {
                DatePicker("", selection: Binding(
                    get: { date },
                    set: { self.date = $0 }
                ), displayedComponents: .date)
                .labelsHidden()
                .datePickerStyle(.compact)
                
                Spacer()
                
                Button("Clear") {
                    self.date = nil
                }
                .buttonStyle(.borderless)
                .font(.caption)
                .foregroundStyle(.secondary)
            } else {
                Button(placeholder) {
                    self.date = Date()
                }
                .buttonStyle(.bordered)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
    }
}

// MARK: - Compact Organization Types Selector
struct CompactOrganizationTypesSelector: View {
    @Binding var selectedTypes: [OrganizationJobType]
    @State private var showingTypePicker = false
    
    var body: some View {
        HStack {
            if selectedTypes.isEmpty {
                Button("Select types...") {
                    showingTypePicker = true
                }
                .foregroundStyle(.secondary)
                .buttonStyle(.bordered)
            } else {
                HStack(spacing: 4) {
                    ForEach(selectedTypes.prefix(2), id: \.self) { type in
                        Text(type.displayName)
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.blue.opacity(0.1))
                            .foregroundStyle(.blue)
                            .cornerRadius(4)
                    }
                    
                    if selectedTypes.count > 2 {
                        Text("+\(selectedTypes.count - 2)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                Button("Edit") {
                    showingTypePicker = true
                }
                .buttonStyle(.borderless)
                .font(.caption)
            }
        }
        .sheet(isPresented: $showingTypePicker) {
            OrganizationTypePickerSheet(selectedTypes: $selectedTypes)
        }
    }
}

// MARK: - Organization Type Picker Sheet
struct OrganizationTypePickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedTypes: [OrganizationJobType]
    @State private var tempSelectedTypes: [OrganizationJobType] = []
    
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button("Cancel") { dismiss() }
                Spacer()
                Text("Organization Types")
                    .font(.title2)
                    .fontWeight(.semibold)
                Spacer()
                Button("Save") {
                    selectedTypes = tempSelectedTypes
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(.regularMaterial)
            
            List {
                ForEach(OrganizationJobType.allCases, id: \.self) { type in
                    Button {
                        if tempSelectedTypes.contains(type) {
                            tempSelectedTypes.removeAll { $0 == type }
                        } else {
                            tempSelectedTypes.append(type)
                        }
                    } label: {
                        HStack {
                            Image(systemName: tempSelectedTypes.contains(type) ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(tempSelectedTypes.contains(type) ? .blue : .secondary)
                            Text(type.displayName)
                                .foregroundStyle(.primary)
                            Spacer()
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .frame(width: 400, height: 450)
        .onAppear {
            tempSelectedTypes = selectedTypes
        }
    }
}

// MARK: - Quick Add Organization Sheet
struct QuickAddOrganizationSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var organizationName: String
    @ObservedObject var organizationViewModel: OrganizationViewModel
    let onSave: (Organization) -> Void
    @State private var isLoading = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Sleek header
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                
                Spacer()
                
                Text("Quick Add Organization")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                
                Spacer()
                
                Button("Add") {
                    Task {
                        await addOrganization()
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(organizationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
            }
            .padding()
            .background(.regularMaterial)
            
            VStack(spacing: 12) {
                SleekFormRow("Organization Name", required: true) {
                    TextField("Enter organization name", text: $organizationName)
                        .textFieldStyle(.roundedBorder)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 16)
        }
        .frame(width: 450, height: 120)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(radius: 3)
        .overlay {
            if isLoading {
                RoundedRectangle(cornerRadius: 16)
                    .fill(.regularMaterial)
                    .overlay {
                        VStack {
                            ProgressView()
                                .controlSize(.large)
                            Text("Creating organization...")
                                .foregroundStyle(.secondary)
                        }
                    }
            }
        }
    }
    
    private func addOrganization() async {
        isLoading = true
        
        let newOrganization = Organization(name: organizationName.trimmingCharacters(in: .whitespacesAndNewlines))
        
        await organizationViewModel.addOrganization(newOrganization)
        
        isLoading = false
        onSave(newOrganization)
    }
}


