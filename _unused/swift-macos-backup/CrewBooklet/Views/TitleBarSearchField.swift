import SwiftUI
import AppKit

/// Advanced search field for title bar (search field + advanced search button)
struct TitleBarSearchField: View {
    @EnvironmentObject var searchViewModel: SearchViewModel
    var onFrameChange: ((CGRect) -> Void)? = nil
    var visualDebugActive: Bool = false
    var onAdvancedSearch: (() -> Void)? = nil
    
    var body: some View {
        ZStack {
            HStack(spacing: 6) {
                // Search field - stays in fixed position
                NSSearchFieldWrapper(searchText: $searchViewModel.searchText)
                    .frame(width: 200, height: 22)
                
                // Advanced search button
                Button(action: {
                    onAdvancedSearch?()
                }) {
                    Image(systemName: "magnifyingglass.circle")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.blue)
                }
                .buttonStyle(.plain)
                .help("Advanced Search")
                .frame(width: 22, height: 22)
            }
            .background(
                GeometryReader { geo in
                    Color.clear
                        .onAppear {
                            onFrameChange?(geo.frame(in: .global))
                            if visualDebugActive {
                                print("🔍 SEARCH FIELD POSITION:")
                                print("   - Global frame: \(geo.frame(in: .global))")
                                print("   - MinY (top): \(geo.frame(in: .global).minY)")
                                print("   - MaxY (bottom): \(geo.frame(in: .global).maxY)")
                                print("   - MidY (center): \(geo.frame(in: .global).midY)")
                                print("   - Width: \(geo.frame(in: .global).width)")
                            }
                        }
                        .onChange(of: geo.frame(in: .global)) { oldFrame, newFrame in
                            onFrameChange?(newFrame)
                            if visualDebugActive {
                                print("🔍 SEARCH FIELD POSITION:")
                                print("   - Global frame: \(newFrame)")
                                print("   - MinY (top): \(newFrame.minY)")
                                print("   - MaxY (bottom): \(newFrame.maxY)")
                                print("   - MidY (center): \(newFrame.midY)")
                                print("   - Width: \(newFrame.width)")
                            }
                        }
                }
            )
            
            // Loading indicator - overlay to not push other elements
            if searchViewModel.isSearching {
                HStack {
                    Spacer()
                    ProgressView()
                        .controlSize(.small)
                        .padding(.trailing, 8)
                }
                .frame(width: 200, height: 22)
                .allowsHitTesting(false) // Don't interfere with search field interaction
                .zIndex(999)
            }
        }
    }

}

/// NSSearchField wrapped for SwiftUI integration
struct NSSearchFieldWrapper: NSViewRepresentable {
    @Binding var searchText: String
    
    func makeNSView(context: Context) -> NSSearchField {
        let searchField = NSSearchField()
        searchField.placeholderString = "Search CrewBooklet..."
        searchField.delegate = context.coordinator
        
        // Configure appearance for title bar
        searchField.cell?.controlSize = .regular
        searchField.frame = CGRect(x: 0, y: 0, width: 200, height: 22)
        
        // Enable continuous updates while typing
        searchField.cell?.sendsActionOnEndEditing = false
        
        return searchField
    }
    
    func updateNSView(_ nsView: NSSearchField, context: Context) {
        if nsView.stringValue != searchText {
            nsView.stringValue = searchText
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, NSSearchFieldDelegate {
        var parent: NSSearchFieldWrapper
        
        init(_ parent: NSSearchFieldWrapper) {
            self.parent = parent
        }
        
        // This method is called every time the text changes
        func controlTextDidChange(_ notification: Notification) {
            guard let searchField = notification.object as? NSSearchField else { return }
            
            DispatchQueue.main.async {
                self.parent.searchText = searchField.stringValue
            }
        }
    }
} 