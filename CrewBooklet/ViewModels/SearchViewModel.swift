import Foundation
import Combine

@MainActor
class SearchViewModel: ObservableObject {
    @Published var searchText: String = ""
    @Published var searchResults: SearchResults = SearchResults()
    @Published var isSearching: Bool = false
    @Published var showResults: Bool = false
    
    private var searchCancellable: AnyCancellable?
    private let supabaseService = SupabaseService.shared
    
    init() {
        setupSearchDebounce()
    }
    
    private func setupSearchDebounce() {
        // Debounce search to avoid too many API calls
        searchCancellable = $searchText
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] searchText in
                Task {
                    await self?.performSearch(query: searchText)
                }
            }
    }
    
    func performSearch(query: String) async {
        // Clear results if query is too short
        guard query.count >= 2 else {
            searchResults = SearchResults()
            showResults = false
            isSearching = false
            return
        }
        
        isSearching = true
        
        do {
            let results = try await supabaseService.performComprehensiveSearch(query: query)
            searchResults = results
            showResults = results.hasResults
            isSearching = false
        } catch {
            print("❌ Search error: \(error)")
            searchResults = SearchResults()
            showResults = false
            isSearching = false
        }
    }
    
    func clearSearch() {
        searchText = ""
        searchResults = SearchResults()
        showResults = false
        isSearching = false
    }
    
    func selectResult() {
        // Hide results when user selects an item
        showResults = false
    }
} 