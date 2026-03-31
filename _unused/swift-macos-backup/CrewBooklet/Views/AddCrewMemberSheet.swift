import SwiftUI

// MARK: - Add Crew Member Sheet
struct AddCrewMemberSheet: View {
    let project: Project
    let availablePeople: [Person]
    let onAdded: () -> Void
    
    @State private var selectedPerson: Person?
    @State private var projectRole: String = ""
    @State private var selectedAvailability: AssignmentStatus = .anfragen
    @State private var dailyPay: Decimal = 0
    @State private var currency: String = "EUR"
    @State private var notes: String = ""
    @State private var isLoading = false
    @State private var searchText = ""
    @State private var selectedJobFilter: JobType?
    @Environment(\.dismiss) private var dismiss
    
    private let supabaseService = SupabaseService.shared
    
    // Filter people based on search text and job filter
    private var filteredPeople: [Person] {
        var filtered = availablePeople
        
        // Filter by search text
        if !searchText.isEmpty {
            filtered = filtered.filter { person in
                let nameMatches = person.name.localizedCaseInsensitiveContains(searchText)
                let emailMatches = person.email?.localizedCaseInsensitiveContains(searchText) ?? false
                return nameMatches || emailMatches
            }
        }
        
        // Filter by job type if selected
        if let jobFilter = selectedJobFilter {
            filtered = filtered.filter { person in
                person.jobs.contains(jobFilter)
            }
        }
        
        return filtered
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                searchAndFilterSection
                peopleListSection
                assignmentDetailsSection
                Spacer()
            }
            .navigationTitle("Add Crew Member")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        addCrewMember()
                    }
                    .disabled(selectedPerson == nil || projectRole.isEmpty || isLoading)
                }
            }
        }
    }
    
    // MARK: - View Components
    
    private var searchAndFilterSection: some View {
        VStack(spacing: 12) {
            TextField("Search people...", text: $searchText)
                .textFieldStyle(.roundedBorder)
            
            HStack {
                Text("Filter by job:")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Picker("Job Filter", selection: $selectedJobFilter) {
                    Text("All Jobs").tag(nil as JobType?)
                    ForEach(JobType.allCases, id: \.self) { job in
                        Text(job.displayName).tag(job as JobType?)
                    }
                }
                .pickerStyle(.menu)
            }
        }
        .padding(.horizontal)
    }
    
    private var peopleListSection: some View {
        List(filteredPeople, id: \.id) { person in
            PersonRowView(
                person: person,
                isSelected: selectedPerson?.id == person.id,
                onSelect: { selectedPerson = person }
            )
        }
    }
    
    private var assignmentDetailsSection: some View {
        Group {
            if selectedPerson != nil {
                VStack(spacing: 12) {
                    Text("Assignment Details")
                        .font(.headline)
                    
                    VStack(spacing: 8) {
                        TextField("Role", text: $projectRole)
                            .textFieldStyle(.roundedBorder)
                        
                        Picker("Availability", selection: $selectedAvailability) {
                            ForEach(AssignmentStatus.allCases, id: \.self) { status in
                                Text(status.rawValue).tag(status)
                            }
                        }
                        .pickerStyle(.menu)
                        
                        HStack {
                            TextField("Daily Pay", value: $dailyPay, format: .number)
                                .textFieldStyle(.roundedBorder)
                            
                            Picker("Currency", selection: $currency) {
                                ForEach(["USD", "EUR", "GBP", "CHF"], id: \.self) { curr in
                                    Text(curr).tag(curr)
                                }
                            }
                            .pickerStyle(.menu)
                        }
                        
                        TextField("Notes", text: $notes, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...4)
                    }
                }
                .padding()
                .background(.background, in: RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(.separator, lineWidth: 1)
                )
                .padding(.horizontal)
            }
        }
    }
    
    private func addCrewMember() {
        guard let selectedPerson = selectedPerson else { return }
        
        isLoading = true
        
        let assignment = ProjectAssignment(
            projectId: project.id,
            personId: selectedPerson.id,
            role: projectRole,
            availability: selectedAvailability,
            dailyPay: dailyPay,
            currency: currency,
            notes: notes.isEmpty ? nil : notes
        )
        
        Task {
            do {
                try await supabaseService.addProjectAssignment(assignment)
                await MainActor.run {
                    isLoading = false
                    onAdded()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    print("Error adding crew member: \(error)")
                }
            }
        }
    }
}

// MARK: - Person Row View
struct PersonRowView: View {
    let person: Person
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(person.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                    
                    if let email = person.email {
                        Text(email)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    
                    if !person.jobs.isEmpty {
                        Text(person.jobs.map { $0.displayName }.joined(separator: ", "))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.accentColor)
                }
            }
        }
        .buttonStyle(.plain)
    }
} 