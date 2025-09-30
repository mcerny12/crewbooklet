import Foundation

@MainActor
class AddPersonViewModel: ObservableObject {
    @Published var name: String = ""
    @Published var email: String = ""
    @Published var gender: Gender? = nil
    @Published var mobilePhone: String = ""
    @Published var workPhone: String = ""
    @Published var website: String = ""
    @Published var addressStreet1: String = ""
    @Published var addressStreet2: String = ""
    @Published var addressZip: String = ""
    @Published var addressCity: String = ""
    @Published var addressCountry: String = ""
    @Published var selectedJob: JobType? = nil
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    
    let availableJobs = JobType.allCases
    
    var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    private let peopleViewModel = PeopleViewModel()
    
    func savePerson(organizationId: UUID?) async {
        guard isFormValid else {
            errorMessage = "Please fill in all required fields"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        // Create address object if any address fields are filled
        var address: Address? = nil
        if !addressStreet1.isEmpty || !addressStreet2.isEmpty || !addressZip.isEmpty || !addressCity.isEmpty || !addressCountry.isEmpty {
            address = Address(
                street1: addressStreet1.isEmpty ? nil : addressStreet1,
                street2: addressStreet2.isEmpty ? nil : addressStreet2,
                zip: addressZip.isEmpty ? nil : addressZip,
                city: addressCity.isEmpty ? nil : addressCity,
                country: addressCountry.isEmpty ? nil : addressCountry
            )
        }
        
        let newPerson = Person(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            email: email.trimmingCharacters(in: .whitespacesAndNewlines),
            jobs: selectedJob != nil ? [selectedJob!] : [],
            notes: "",
            organizationId: organizationId
        )
        
        // Set the additional fields
        var personToSave = newPerson
        personToSave.gender = gender
        personToSave.mobilePhone = mobilePhone.isEmpty ? nil : mobilePhone
        personToSave.workPhone = workPhone.isEmpty ? nil : workPhone
        personToSave.website = website.isEmpty ? nil : website
        personToSave.address = address
        
        await peopleViewModel.addPerson(personToSave)
        print("✅ Person saved successfully")
        
        isLoading = false
    }
}

@MainActor
class AddProjectViewModel: ObservableObject {
    @Published var projectName: String = ""
    @Published var projectNumber: String = ""
    @Published var description: String = ""
    @Published var status: ProjectStatus = .inquiry
    @Published var inquiryCountry: String = ""
    @Published var shootingLocation: String = ""
    @Published var clientOrganizationId: UUID? = nil
    @Published var startDate: Date? = nil
    @Published var endDate: Date? = nil
    @Published var notes: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    @Published var organizations: [Organization] = []
    
    private let projectViewModel = ProjectViewModel()
    private let supabaseService = SupabaseService.shared
    
    var isValid: Bool {
        !projectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    var selectedOrganization: Organization? {
        organizations.first { $0.id == clientOrganizationId }
    }
    
    init() {
        Task {
            await loadOrganizations()
            await generateProjectNumber()
        }
    }
    
    func loadOrganizations() async {
        do {
            organizations = try await supabaseService.fetchOrganizations()
        } catch {
            print("❌ Error loading organizations: \(error)")
        }
    }
    
    func generateProjectNumber() async {
        do {
            let existingProjects = try await supabaseService.fetchProjects()
            let currentYear = Calendar.current.component(.year, from: Date())
            let yearPrefix = "\(currentYear)-"
            
            // Find the highest project number for the current year
            let currentYearProjects = existingProjects.filter { $0.projectNumber.hasPrefix(yearPrefix) }
            
            let highestNumber = currentYearProjects
                .compactMap { project in
                    let numberPart = project.projectNumber.replacingOccurrences(of: yearPrefix, with: "")
                    return Int(numberPart)
                }
                .max() ?? 0
            
            let nextNumber = highestNumber + 1
            await MainActor.run {
                self.projectNumber = String(format: "%04d-%02d", currentYear, nextNumber)
            }
        } catch {
            print("❌ Error generating project number: \(error)")
            // Fallback to random number
            let currentYear = Calendar.current.component(.year, from: Date())
            await MainActor.run {
                self.projectNumber = String(format: "%04d-%02d", currentYear, Int.random(in: 1...999))
            }
        }
    }
    
    func saveProject() {
        guard isValid else {
            errorMessage = "Please fill in the project name"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        // Create project with all available fields
        var projectToSave = Project(
            name: projectName,
            status: status,
            description: description.isEmpty ? nil : description,
            notes: notes.isEmpty ? nil : notes,
            clientOrganizationId: clientOrganizationId
        )
        
        // Set the generated project number
        projectToSave.projectNumber = projectNumber
        projectToSave.inquiryCountry = inquiryCountry.isEmpty ? nil : inquiryCountry
        projectToSave.shootingLocation = shootingLocation.isEmpty ? nil : shootingLocation
        projectToSave.startDate = startDate
        projectToSave.endDate = endDate
        
        Task {
            do {
                try await supabaseService.addProject(projectToSave)
                await MainActor.run {
                    self.isLoading = false
                    print("✅ Project saved successfully")
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = "Failed to save project: \(error.localizedDescription)"
                    self.isLoading = false
                    print("❌ Error saving project: \(error)")
                }
            }
        }
    }
}