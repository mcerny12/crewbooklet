import SwiftUI

struct MacOSOrganizationRow: View {
    let organization: Organization
    var onTap: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil

    private var displayBusinessType: String {
        if organization.jobs.isEmpty {
            return "No business type"
        } else if organization.jobs.count == 1 {
            return organization.jobs.first!.displayName
        } else {
            return "\(organization.jobs.first!.displayName) +\(organization.jobs.count - 1) more"
        }
    }

    private func formatPhoneForDisplay(_ phone: String) -> String {
        // Remove all non-digit characters except +
        let digitsOnly = phone.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)

        if digitsOnly.isEmpty { return phone }

        // Always add + if not present
        var workingString = digitsOnly
        if !workingString.hasPrefix("+") && !workingString.isEmpty {
            workingString = "+" + workingString
        }

        // Extract and format based on country code
        if workingString.hasPrefix("+") {
            let digits = String(workingString.dropFirst())

            // European countries
            if digits.hasPrefix("49") { // Germany
                return formatWithPattern("+49", String(digits.dropFirst(2)), pattern: [3, 3, 3, 2])
            } else if digits.hasPrefix("43") { // Austria
                return formatWithPattern("+43", String(digits.dropFirst(2)), pattern: [3, 3, 3, 2])
            } else if digits.hasPrefix("41") { // Switzerland
                return formatWithPattern("+41", String(digits.dropFirst(2)), pattern: [2, 3, 2, 2])
            } else if digits.hasPrefix("44") { // UK
                return formatWithPattern("+44", String(digits.dropFirst(2)), pattern: [4, 3, 4])
            } else if digits.hasPrefix("33") { // France
                return formatWithPattern("+33", String(digits.dropFirst(2)), pattern: [1, 2, 2, 2, 2])
            } else if digits.hasPrefix("1") { // US/Canada
                return formatWithPattern("+1", String(digits.dropFirst(1)), pattern: [3, 3, 4])
            } else {
                return "+" + digits
            }
        }

        return workingString
    }

    private func formatWithPattern(_ countryCode: String, _ number: String, pattern: [Int]) -> String {
        let cleaned = number.filter { $0.isNumber }
        var formatted = countryCode
        var position = 0

        for groupSize in pattern {
            if position >= cleaned.count { break }
            let endPos = min(position + groupSize, cleaned.count)
            let start = cleaned.index(cleaned.startIndex, offsetBy: position)
            let end = cleaned.index(cleaned.startIndex, offsetBy: endPos)
            formatted += " \(String(cleaned[start..<end]))"
            position = endPos
        }

        if position < cleaned.count {
            let start = cleaned.index(cleaned.startIndex, offsetBy: position)
            formatted += " \(String(cleaned[start...]))"
        }

        return formatted
    }

    var body: some View {
        Button(action: { onTap?() }) {
            HStack(spacing: 40) {
                // Left side: Name and business type stacked
                VStack(alignment: .leading, spacing: 2) {
                    Text(organization.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Text(displayBusinessType)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .frame(width: 220, alignment: .leading)

                // Middle: Email and phone with buttons stacked
                VStack(alignment: .leading, spacing: 2) {
                    // Email with button
                    HStack(spacing: 4) {
                        if let email = organization.contactEmail, !email.isEmpty {
                            Text(email)
                                .font(.caption)
                                .foregroundStyle(.primary)
                                .lineLimit(1)

                            Button(action: {
                                if let url = URL(string: "mailto:\(email)") {
                                    NSWorkspace.shared.open(url)
                                }
                            }) {
                                Image(systemName: "envelope.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.blue)
                                    .frame(width: 16, height: 16)
                            }
                            .buttonStyle(.plain)
                        } else {
                            Text("No email")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(height: 16)

                    // Phone with button
                    HStack(spacing: 4) {
                        if let phone = organization.contactPhone, !phone.isEmpty {
                            Text(formatPhoneForDisplay(phone))
                                .font(.caption)
                                .foregroundStyle(.primary)
                                .lineLimit(1)

                            Button(action: {
                                if let url = URL(string: "tel:\(phone.replacingOccurrences(of: " ", with: ""))") {
                                    NSWorkspace.shared.open(url)
                                }
                            }) {
                                Image(systemName: "phone.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.blue)
                                    .frame(width: 16, height: 16)
                            }
                            .buttonStyle(.plain)
                        } else {
                            Text("No phone")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(height: 16)
                }
                .frame(width: 280, alignment: .leading)

                Spacer()

                // Right side: Icons
                HStack(spacing: 4) {
                    if !(organization.notes?.isEmpty ?? true) {
                        Image(systemName: "note.text")
                            .font(.caption2)
                            .foregroundStyle(.blue)
                    }

                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 9)
            .background(.background)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(.separator.opacity(0.3), lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(organization.name)
    }
}

struct OrganizationsListView: View {
    @ObservedObject var organizationViewModel: OrganizationViewModel
    @State var searchText: String = ""
    @Binding var showAddOrganizationSheet: Bool
    var onOrganizationSelected: (Organization) -> Void
    var visualDebugActive: Bool = false
    
    private var filteredOrganizations: [Organization] {
        let filtered = if searchText.isEmpty {
            organizationViewModel.organizations
        } else {
            organizationViewModel.organizations.filter { org in
                org.name.localizedCaseInsensitiveContains(searchText) ||
                (org.contactEmail ?? "").localizedCaseInsensitiveContains(searchText) ||
                org.jobs.contains { job in job.displayName.localizedCaseInsensitiveContains(searchText) }
            }
        }
        return filtered.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                if organizationViewModel.isLoading {
                    ProgressView("Loading organizations...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredOrganizations.isEmpty {
                    ContentUnavailableView(
                        searchText.isEmpty ? "No Organizations" : "No Search Results",
                        systemImage: searchText.isEmpty ? "building.2" : "magnifyingglass",
                        description: Text(searchText.isEmpty ? "Add your first organization" : "Try a different search term")
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: 4) {
                            ForEach(filteredOrganizations) { org in
                                MacOSOrganizationRow(organization: org, onTap: {
                                    onOrganizationSelected(org)
                                })
                            }
                        }
                        .padding()
                        .padding(.bottom, 80) // Extra padding for floating button
                    }
                }
            }
        }
        .background(.background)
    }
}

#Preview {
    OrganizationsListView(organizationViewModel: OrganizationViewModel(), showAddOrganizationSheet: .constant(false), onOrganizationSelected: { _ in })
} 