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
    @Published var budget: Decimal?
    @Published var currency: String = "EUR"
    @Published var startDate: Date = Date()
    @Published var endDate: Date = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    @Published var notes: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    
    private let projectViewModel = ProjectViewModel()
    
    var isValid: Bool {
        !projectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    func generateProjectNumber() {
        let currentYear = Calendar.current.component(.year, from: Date())
        
        // This is a simple auto-increment - in real implementation,
        // you'd fetch existing projects to determine the next number
        let nextNumber = 1 // Simplified for now
        projectNumber = String(format: "%04d-%02d", currentYear, nextNumber)
    }
    
    func saveProject() {
        guard isValid else {
            errorMessage = "Please fill in the project name"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        let projectToSave = Project(
            name: projectName,
            status: status,
            description: description.isEmpty ? "" : description,
            notes: notes.isEmpty ? "" : notes
        )
        
        Task {
            await projectViewModel.addProject(projectToSave)
            self.isLoading = false
            print("✅ Project saved successfully")
        }
    }
}