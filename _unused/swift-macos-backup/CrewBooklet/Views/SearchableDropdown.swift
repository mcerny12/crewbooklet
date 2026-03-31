import SwiftUI

struct SearchableDropdown<T: Hashable & Identifiable>: View {
    let title: String
    let options: [T]
    let displayText: (T) -> String
    let searchText: (T) -> String
    @Binding var selection: T?
    let allowCustomText: Bool
    @Binding var customText: String
    
    @State private var isExpanded = false
    @State private var searchTextInput = ""
    
    init(
        title: String,
        options: [T],
        displayText: @escaping (T) -> String,
        searchText: @escaping (T) -> String,
        selection: Binding<T?>,
        allowCustomText: Bool = false,
        customText: Binding<String> = .constant("")
    ) {
        self.title = title
        self.options = options
        self.displayText = displayText
        self.searchText = searchText
        self._selection = selection
        self.allowCustomText = allowCustomText
        self._customText = customText
    }
    
    var filteredOptions: [T] {
        if searchTextInput.isEmpty {
            return options
        } else {
            return options.filter { searchText($0).localizedCaseInsensitiveContains(searchTextInput) }
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            dropdownButton
            if isExpanded {
                dropdownContent
            }
        }
        .onTapGesture {
            if isExpanded {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded = false
                }
            }
        }
    }
    
    private var dropdownButton: some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                isExpanded.toggle()
            }
        }) {
            HStack {
                Text(selectionText)
                    .foregroundStyle(selectionText == title ? .secondary : .primary)
                    .font(.caption)
                Spacer()
                Image(systemName: "chevron.down")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.background, in: RoundedRectangle(cornerRadius: 4))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(.separator, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    private var dropdownContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            searchField
            optionsList
        }
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
    
    private var searchField: some View {
        TextField("Search...", text: $searchTextInput)
            .textFieldStyle(.roundedBorder)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
    }
    
    private var optionsList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(filteredOptions) { option in
                    optionRow(option)
                    if option.id != filteredOptions.last?.id {
                        Divider()
                            .padding(.leading, 8)
                    }
                }
                
                if allowCustomText {
                    if !filteredOptions.isEmpty {
                        Divider()
                            .padding(.leading, 8)
                    }
                    customOptionRow
                }
            }
        }
        .frame(maxHeight: 200)
        .background(.background, in: RoundedRectangle(cornerRadius: 4))
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(.separator, lineWidth: 1)
        )
        .padding(.top, 4)
    }
    
    private func optionRow(_ option: T) -> some View {
        Button(action: {
            selection = option
            customText = ""
            withAnimation(.easeInOut(duration: 0.2)) {
                isExpanded = false
            }
        }) {
            HStack {
                Text(displayText(option))
                    .foregroundStyle(.primary)
                    .font(.caption)
                Spacer()
                if selection?.id == option.id {
                    Image(systemName: "checkmark")
                        .font(.caption2)
                        .foregroundColor(.accentColor)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
        .background(selection?.id == option.id ? Color.accentColor.opacity(0.1) : Color.clear)
    }
    
    private var customOptionRow: some View {
        VStack(spacing: 0) {
            Button(action: {
                selection = nil
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded = false
                }
            }) {
                HStack {
                    Text("Custom Role")
                        .foregroundStyle(.primary)
                        .font(.caption)
                    Spacer()
                    if selection == nil && !customText.isEmpty {
                        Image(systemName: "checkmark")
                            .font(.caption2)
                            .foregroundColor(.accentColor)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
            }
            .buttonStyle(.plain)
            .background(selection == nil && !customText.isEmpty ? Color.accentColor.opacity(0.1) : Color.clear)
            
            if selection == nil {
                TextField("Enter custom role...", text: $customText)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
            }
        }
    }
    
    private var selectionText: String {
        if let selection = selection {
            return displayText(selection)
        } else if allowCustomText && !customText.isEmpty {
            return customText
        } else {
            return title
        }
    }
}

// MARK: - JobType Extension for SearchableDropdown
extension JobType: Identifiable {
    public var id: String { rawValue }
}

// MARK: - AssignmentStatus Extension for SearchableDropdown
extension AssignmentStatus: Identifiable {
    public var id: String { rawValue }
}

// MARK: - ProjectStatus Extension for SearchableDropdown
extension ProjectStatus: Identifiable {
    public var id: String { rawValue }
}

// MARK: - CurrencyOption for SearchableDropdown
struct CurrencyOption: Identifiable, Hashable {
    let id: String
    let code: String
    
    init(_ code: String) {
        self.id = code
        self.code = code
    }
}

// MARK: - OrganizationJobType Extension for SearchableDropdown
extension OrganizationJobType: Identifiable {
    public var id: String { rawValue }
}

#Preview {
    VStack(spacing: 20) {
        SearchableDropdown(
            title: "Select Job",
            options: JobType.allCases,
            displayText: { $0.displayName },
            searchText: { $0.displayName },
            selection: .constant(nil),
            allowCustomText: true,
            customText: .constant("")
        )
        
        SearchableDropdown(
            title: "Select Status",
            options: AssignmentStatus.allCases,
            displayText: { $0.rawValue },
            searchText: { $0.rawValue },
            selection: .constant(.verfuegbar)
        )
    }
    .padding()
} 