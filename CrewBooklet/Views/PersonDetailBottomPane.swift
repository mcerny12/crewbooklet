//
//  PersonDetailBottomPane.swift
//  CrewBooklet
//
//  Person detail view for bottom navigation pane with Information, Financial, Projects tabs
//  Dense, minimalistic design with low but non-zero margins and padding
//

import SwiftUI

struct PersonDetailBottomPane: View {
    @Binding var person: Person
    @Binding var isPresented: Bool
    @State private var selectedTab: DetailTab = .information
    @StateObject private var supabaseService = SupabaseService.shared
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    enum DetailTab: String, CaseIterable {
        case information = "Information"
        case financial = "Financial"
        case projects = "Projects"
        
        var icon: String {
            switch self {
            case .information: return "person.text.rectangle"
            case .financial: return "banknote"
            case .projects: return "folder"
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
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                }
            }
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
                    // Name
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Name")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField("Enter name", text: $person.name)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    // Email
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Email")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextField("Enter email", text: Binding(
                            get: { person.email ?? "" },
                            set: { person.email = $0.isEmpty ? nil : $0 }
                        ))
                        .textFieldStyle(.roundedBorder)
                    }
                    
                    // Phone Numbers
                    HStack(spacing: 6) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Mobile Phone")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("Enter mobile", text: Binding(
                                get: { person.mobilePhone ?? "" },
                                set: { person.mobilePhone = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Work Phone")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            TextField("Enter work phone", text: Binding(
                                get: { person.workPhone ?? "" },
                                set: { person.workPhone = $0.isEmpty ? nil : $0 }
                            ))
                            .textFieldStyle(.roundedBorder)
                        }
                    }
                    
                    // Jobs and Languages
                    HStack(spacing: 6) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Jobs")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(person.jobs.map { $0.displayName }.joined(separator: ", "))
                                .font(.body)
                                .foregroundStyle(person.jobs.isEmpty ? .secondary : .primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 4)
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Languages")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(person.languages.map { $0.displayName }.joined(separator: ", "))
                                .font(.body)
                                .foregroundStyle(person.languages.isEmpty ? .secondary : .primary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 4)
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
                    get: { person.notes ?? "" },
                    set: { person.notes = $0.isEmpty ? nil : $0 }
                ), axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(3...6)
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
            
            // Save Button
            Button("Save Changes") {
                Task {
                    await savePerson()
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
                
                // Projects content here
                Text("Associated projects will be displayed here")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
            }
            .padding(8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 6))
        }
    }
    
    private func savePerson() async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await supabaseService.updatePerson(person)
            await MainActor.run {
                isLoading = false
            }
            // Could add a success message or callback here
        } catch {
            await MainActor.run {
                isLoading = false
                errorMessage = "Failed to save person: \(error.localizedDescription)"
            }
        }
    }
}

#Preview {
    @Previewable @State var person = Person(name: "John Doe", email: "john@example.com")
    @Previewable @State var isPresented = true
    
    return ZStack {
        Color.gray.opacity(0.2)
            .ignoresSafeArea()
        
        PersonDetailBottomPane(person: $person, isPresented: $isPresented)
    }
}