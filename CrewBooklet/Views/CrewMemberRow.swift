import SwiftUI

// MARK: - Crew Member Row Component
struct CrewMemberRow: View {
    @Binding var assignment: ProjectAssignment
    let person: Person
    let onRemove: () -> Void
    
    @State private var customRoleText = ""
    
    var body: some View {
        HStack(spacing: 12) {
            // Name column (fixed width)
            VStack(alignment: .leading, spacing: 2) {
                Text(person.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                if let email = person.email {
                    Text(email)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                } else {
                    Text("No email")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 120, alignment: .leading)
            
            // Position column (searchable dropdown - specific to project)
            SearchableDropdown(
                title: "Role",
                options: JobType.allCases,
                displayText: { $0.displayName },
                searchText: { $0.displayName },
                selection: Binding(
                    get: { 
                        if let role = assignment.role {
                            return JobType.allCases.first { $0.displayName == role }
                        }
                        return nil
                    },
                    set: { jobType in
                        if let jobType = jobType {
                            assignment.role = jobType.displayName
                        } else {
                            assignment.role = customRoleText.isEmpty ? nil : customRoleText
                        }
                    }
                ),
                allowCustomText: true,
                customText: $customRoleText
            )
            .frame(width: 120)
            
            // Daily Pay column (editable)
            TextField("Daily Pay", value: $assignment.dailyPay, format: .number)
                .textFieldStyle(.roundedBorder)
                .font(.caption)
                .frame(width: 80)
            
            // Availability column (searchable dropdown)
            SearchableDropdown(
                title: "Status",
                options: AssignmentStatus.allCases,
                displayText: { $0.rawValue },
                searchText: { $0.rawValue },
                selection: Binding(
                    get: { assignment.availability },
                    set: { assignment.availability = $0 ?? .anfragen }
                ),
                allowCustomText: false,
                customText: .constant("")
            )
            .frame(width: 100)
            
            // Phone column (read-only)
            VStack(alignment: .leading, spacing: 2) {
                if let phone = person.mobilePhone {
                    Text(phone)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else {
                    Text("No phone")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 120, alignment: .leading)
            
            // Currency column (searchable dropdown)
            SearchableDropdown(
                title: "Currency",
                options: [CurrencyOption("USD"), CurrencyOption("EUR"), CurrencyOption("GBP"), CurrencyOption("CHF")],
                displayText: { $0.code },
                searchText: { $0.code },
                selection: Binding(
                    get: { CurrencyOption(assignment.currency) },
                    set: { assignment.currency = $0?.code ?? "EUR" }
                ),
                allowCustomText: false,
                customText: .constant("")
            )
            .frame(width: 60)
            
            // Notes column (editable)
            TextField("Notes", text: Binding(
                get: { assignment.notes ?? "" },
                set: { assignment.notes = $0.isEmpty ? nil : $0 }
            ), axis: .vertical)
            .textFieldStyle(.roundedBorder)
            .font(.caption)
            .frame(width: 120)
            .lineLimit(2...4)
            
            // Actions column
            HStack(spacing: 4) {
                Button(action: onRemove) {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
            }
            .frame(width: 40)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(.background, in: RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(.separator, lineWidth: 1)
        )
        .onAppear {
            // Initialize custom role text if assignment has a custom role
            if let role = assignment.role, JobType.allCases.first(where: { $0.displayName == role }) == nil {
                customRoleText = role
            }
        }
    }
    
    private var availabilityColor: Color {
        switch assignment.availability {
        case .anfragen: return .blue
        case .angefragt: return .orange
        case .verfuegbar: return .green
        case .nichtVerfuegbar: return .gray
        case .ersteOption: return .yellow
        case .zweiteOption: return .orange
        case .gebucht: return .green
        case .abgesagt: return .red
        case .keineRueckmeldung: return .gray
        }
    }
} 