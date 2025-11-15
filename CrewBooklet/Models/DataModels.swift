//
//  DataModels.swift
//  CrewBooklet
//
//  Data models for Supabase PostgreSQL database
//

import Foundation

// MARK: - Enhanced Person Model (Crew Member) - Phase 2 Implementation
struct Person: Identifiable, Codable, Hashable {
    let id: UUID
    let createdAt: Date
    let updatedAt: Date
    
    // BASIC INFO
    var name: String
    var gender: Gender?
    
    // CONTACT INFORMATION
    var email: String?
    var mobilePhone: String?
    var workPhone: String?
    var website: String?
    
    // ADDRESS (Structured Components)
    var address: Address?
    
    // PROFESSIONAL INFO
    var jobs: [JobType]
    var languages: [Language]
    
    // ORGANIZATION CONNECTION
    var organizationId: UUID? // Connection to Organization
    
    // ADDITIONAL
    var notes: String?
    
    var financialDetails: FinancialDetails?
    
    // DOCUMENTS
    var documents: [Document]?
    
    enum CodingKeys: String, CodingKey {
        case id, name, gender, email, notes
        case mobilePhone = "mobile_phone"
        case workPhone = "work_phone"
        case website
        case address
        case jobs
        case languages
        case organizationId = "organization_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case documents
    }
    
    init(id: UUID = UUID(), name: String = "", email: String = "", jobs: [JobType] = [], notes: String = "", organizationId: UUID? = nil) {
        self.id = id
        self.name = name
        self.gender = nil
        self.email = email
        self.mobilePhone = nil
        self.workPhone = nil
        self.website = nil
        self.address = nil
        self.jobs = jobs
        self.languages = []
        self.organizationId = organizationId
        self.notes = notes
        self.createdAt = Date()
        self.updatedAt = Date()
        self.documents = []
    }
}

// MARK: - Supporting Enums for Enhanced Person Model

enum Gender: String, CaseIterable, Codable {
    case male = "male"
    case female = "female" 
    case other = "other"
    
    var displayName: String {
        switch self {
        case .male: return "Male"
        case .female: return "Female"
        case .other: return "Other"
        }
    }
}

enum Language: String, CaseIterable, Codable {
    case en = "EN"
    case de = "DE"
    case fr = "FR"
    case es = "ES"
    case it = "IT"
    
    var displayName: String {
        switch self {
        case .en: return "English"
        case .de: return "German"
        case .fr: return "French"
        case .es: return "Spanish"
        case .it: return "Italian"
        }
    }
}

enum JobType: String, CaseIterable, Codable {
    // Production Department
    case executiveProducer = "Executive Producer"
    case producer = "Producer"
    case lineProducer = "Line Producer"
    case productionCoordinator = "Production Coordinator"
    case productionAssistant = "Production Assistant"
    case productionManager = "Production Manager"
    case locationManager = "Location Manager"
    case locationScout = "Location Scout"
    
    // Direction Department
    case director = "Director"
    case firstAD = "1st AD"
    case secondAD = "2nd AD"
    case thirdAD = "3rd AD"
    case scriptSupervisor = "Script Supervisor"
    
    // Camera Department
    case photographer = "Photographer"
    case photographersAssistant = "Photographers Assistant"
    case digitalOperator = "Digital Operator"
    case firstAC = "1st AC"
    case secondAC = "2nd AC"
    case dit = "DIT"
    case cameraOperator = "Camera Operator"
    case steadicamOperator = "Steadicam Operator"
    
    // Sound Department
    case vtr = "VTR"
    case soundMixer = "Sound Mixer"
    case boomOperator = "Boom Operator"
    case soundAssistant = "Sound Assistant"
    
    // Lighting Department
    case gaffer = "Gaffer"
    case electrician = "Electrician"
    case bestBoy = "Best Boy"
    case lightingTechnician = "Lighting Technician"
    
    // Grip Department
    case grip = "Grip"
    case keyGrip = "Key Grip"
    case dollyGrip = "Dolly Grip"
    
    // Art Department
    case productionDesigner = "Production Designer"
    case artDirector = "Art Director"
    case setDecorator = "Set Decorator"
    case propMaster = "Prop Master"
    
    // Hair & Makeup
    case makeupArtist = "Makeup Artist"
    case hairStylist = "Hair Stylist"
    case specialEffectsMakeup = "Special Effects Makeup"
    
    // Wardrobe
    case costumeDesigner = "Costume Designer"
    case wardrobeStylist = "Wardrobe Stylist"
    case wardrobeAssistant = "Wardrobe Assistant"
    
    // Post-Production
    case editor = "Editor"
    case assistantEditor = "Assistant Editor"
    case colorist = "Colorist"
    case vfxSupervisor = "VFX Supervisor"
    case vfxArtist = "VFX Artist"
    case motionGraphicsDesigner = "Motion Graphics Designer"
    
    // Other
    case castingDirector = "Casting Director"
    case choreographer = "Choreographer"
    case stuntCoordinator = "Stunt Coordinator"
    case animalHandler = "Animal Handler"
    case medic = "Medic"
    case security = "Security"
    case driver = "Driver"
    case catering = "Catering"
    
    var displayName: String {
        return self.rawValue
    }
    
    var category: JobCategory {
        switch self {
        // Production Department
        case .executiveProducer, .producer, .lineProducer, .productionCoordinator, .productionAssistant, .productionManager, .locationManager, .locationScout:
            return .production
        
        // Direction Department
        case .director, .firstAD, .secondAD, .thirdAD, .scriptSupervisor:
            return .direction
        
        // Camera Department
        case .photographer, .photographersAssistant, .digitalOperator, .firstAC, .secondAC, .dit, .cameraOperator, .steadicamOperator:
            return .camera
        
        // Sound Department
        case .vtr, .soundMixer, .boomOperator, .soundAssistant:
            return .sound
        
        // Lighting Department
        case .gaffer, .electrician, .bestBoy, .lightingTechnician:
            return .lighting
        
        // Grip Department
        case .grip, .keyGrip, .dollyGrip:
            return .grip
        
        // Art Department
        case .productionDesigner, .artDirector, .setDecorator, .propMaster:
            return .art
        
        // Hair & Makeup
        case .makeupArtist, .hairStylist, .specialEffectsMakeup:
            return .makeup
        
        // Wardrobe
        case .costumeDesigner, .wardrobeStylist, .wardrobeAssistant:
            return .wardrobe
        
        // Post-Production
        case .editor, .assistantEditor, .colorist, .vfxSupervisor, .vfxArtist, .motionGraphicsDesigner:
            return .postProduction
        
        // Other
        case .castingDirector, .choreographer, .stuntCoordinator, .animalHandler, .medic, .security, .driver, .catering:
            return .other
        }
    }
}

enum JobCategory: String, CaseIterable {
    case production = "Production"
    case direction = "Direction"
    case camera = "Camera"
    case sound = "Sound"
    case lighting = "Lighting"
    case grip = "Grip"
    case art = "Art Department"
    case makeup = "Hair & Makeup"
    case wardrobe = "Wardrobe"
    case postProduction = "Post-Production"
    case other = "Other"
    
    var color: String {
        switch self {
        case .production: return "green"
        case .direction: return "red"
        case .camera: return "blue"
        case .sound: return "purple"
        case .lighting: return "yellow"
        case .grip: return "orange"
        case .art: return "brown"
        case .makeup: return "pink"
        case .wardrobe: return "indigo"
        case .postProduction: return "cyan"
        case .other: return "gray"
        }
    }
    
    var icon: String {
        switch self {
        case .production: return "person.2"
        case .direction: return "megaphone"
        case .camera: return "camera"
        case .sound: return "waveform"
        case .lighting: return "lightbulb"
        case .grip: return "wrench.and.screwdriver"
        case .art: return "paintpalette"
        case .makeup: return "paintbrush"
        case .wardrobe: return "tshirt"
        case .postProduction: return "desktopcomputer"
        case .other: return "person"
        }
    }
}

struct Address: Codable, Hashable {
    var name: String?         // <-- Added for invoice recipient/company name
    var street1: String?
    var street2: String?
    var zip: String?
    var city: String?
    var country: String?
    
    init(street1: String? = nil, street2: String? = nil, zip: String? = nil, city: String? = nil, country: String? = nil) {
        self.street1 = street1
        self.street2 = street2
        self.zip = zip
        self.city = city
        self.country = country
    }
    
    var formattedAddress: String {
        [street1, street2, zip, city, country]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }
    
    var isEmpty: Bool {
        return [street1, street2, zip, city, country].allSatisfy { $0?.isEmpty != false }
    }
    
    // Support initializer used by legacy extension in ContentView
    init(dictionary: [String: Any]) {
        self.street1 = dictionary["street1"] as? String
        self.street2 = dictionary["street2"] as? String
        self.zip = dictionary["zip"] as? String
        self.city = dictionary["city"] as? String
        self.country = dictionary["country"] as? String
    }
}

// MARK: - Organization Model
struct Organization: Identifiable, Codable, Hashable {
    let id: UUID
    let createdAt: Date
    let updatedAt: Date
    
    // BASIC INFO
    var name: String
    
    // CONTACT INFORMATION
    var contactEmail: String?
    var contactPhone: String?
    
    // ADDRESS (Structured Components)
    var street: String?
    var street2: String?
    var zip: String?
    var city: String?
    var country: String?
    
    // INVOICE ADDRESS (Separate from main address)
    var nameInvoice: String?
    var streetInvoice: String?
    var street2Invoice: String?
    var zipInvoice: String?
    var cityInvoice: String?
    var countryInvoice: String?
    
    // PROFESSIONAL INFO
    var jobs: [OrganizationJobType]
    
    // ADDITIONAL
    var notes: String?
    
    // FINANCIAL DETAILS
    var financialDetails: FinancialDetails?
    
    // DOCUMENTS
    var documents: [Document]?
    
    enum CodingKeys: String, CodingKey {
        case id, name, notes
        case contactEmail = "contact_email"
        case contactPhone = "contact_phone"
        case street, street2, zip, city, country
        case nameInvoice = "name_invoice"
        case streetInvoice = "street_invoice"
        case street2Invoice = "street2_invoice"
        case zipInvoice = "zip_invoice"
        case cityInvoice = "city_invoice"
        case countryInvoice = "country_invoice"
        case jobs
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case documents
    }
    
    init(id: UUID = UUID(), name: String = "", contactEmail: String = "", contactPhone: String = "", jobs: [OrganizationJobType] = [], notes: String = "") {
        self.id = id
        self.name = name
        self.contactEmail = contactEmail
        self.contactPhone = contactPhone
        self.street = nil
        self.street2 = nil
        self.zip = nil
        self.city = nil
        self.country = nil
        self.nameInvoice = nil
        self.streetInvoice = nil
        self.street2Invoice = nil
        self.zipInvoice = nil
        self.cityInvoice = nil
        self.countryInvoice = nil
        self.jobs = jobs
        self.notes = notes
        self.createdAt = Date()
        self.updatedAt = Date()
        self.documents = []
    }
}

// MARK: - Organization Job Types
enum OrganizationJobType: String, CaseIterable, Codable {
    case agency = "Agency"
    case filmProduction = "Film Production"
    case equipmentRental = "Equipment Rental"
    case postProduction = "Post-Production"
    case castingAgency = "Casting Agency"
    case locationService = "Location Service"
    case cateringService = "Catering Service"
    case transportService = "Transport Service"
    case broadcaster = "Broadcaster/TV Station"
    case streamingPlatform = "Streaming Platform"
    case distributionCompany = "Distribution Company"
    case talentAgency = "Talent Agency"
    case musicLabel = "Music Label"
    case soundStudio = "Sound Studio"
    case editingSuite = "Editing Suite"
    case colorGrading = "Color Grading"
    case vfxStudio = "VFX Studio"
    case animationStudio = "Animation Studio"
    case other = "Other"
    
    var displayName: String {
        return self.rawValue
    }
    
    var category: OrganizationCategory {
        switch self {
        case .agency, .castingAgency, .talentAgency:
            return .agency
        case .filmProduction:
            return .production
        case .equipmentRental:
            return .equipment
        case .postProduction, .editingSuite, .colorGrading, .vfxStudio, .animationStudio, .soundStudio:
            return .postProduction
        case .locationService, .cateringService, .transportService:
            return .services
        case .broadcaster, .streamingPlatform, .distributionCompany:
            return .distribution
        case .musicLabel:
            return .music
        case .other:
            return .other
        }
    }
}

enum OrganizationCategory: String, CaseIterable {
    case agency = "Agency"
    case production = "Production"
    case equipment = "Equipment"
    case postProduction = "Post-Production"
    case services = "Services"
    case distribution = "Distribution"
    case music = "Music"
    case other = "Other"
    
    var color: String {
        switch self {
        case .agency: return "blue"
        case .production: return "green"
        case .equipment: return "orange"
        case .postProduction: return "purple"
        case .services: return "teal"
        case .distribution: return "red"
        case .music: return "pink"
        case .other: return "gray"
        }
    }
    
    var icon: String {
        switch self {
        case .agency: return "person.2.badge.gearshape"
        case .production: return "video.fill"
        case .equipment: return "wrench.and.screwdriver.fill"
        case .postProduction: return "desktopcomputer"
        case .services: return "hand.raised.fill"
        case .distribution: return "tv.fill"
        case .music: return "music.note"
        case .other: return "building.2"
        }
    }
}

// MARK: - Project Model (Enhanced for Film Production)
struct Project: Identifiable, Codable, Hashable {
    let id: UUID
    let createdAt: Date
    let updatedAt: Date

    // BASIC INFO
    var name: String
    var projectNumber: String // Auto-generated unique identifier
    var status: ProjectStatus // ANFRAGE, BUDGET, PRODUKTION, ABGESAGT, HOLD

    // LOCATION INFO
    var inquiryCountry: String? // Country where inquiry originated
    var shootingLocation: String? // Country where shooting takes place

    // ORGANIZATION CONNECTION
    var clientOrganizationId: UUID? // Connection to Organization

    // ADDITIONAL
    var description: String?
    var notes: String?

    // DATES
    var startDate: Date?
    var endDate: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, status, description, notes
        case projectNumber = "project_number"
        case inquiryCountry = "inquiry_country"
        case shootingLocation = "shooting_location"
        case clientOrganizationId = "client_organization_id"
        case startDate = "start_date"
        case endDate = "end_date"
        case createdAt = "creation_date"  // Fixed: Database uses 'creation_date', not 'created_at'
        case updatedAt = "updated_at"
    }

    // Custom decoder to handle both date formats (DATE and TIMESTAMP)
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        projectNumber = try container.decode(String.self, forKey: .projectNumber)
        status = try container.decode(ProjectStatus.self, forKey: .status)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        inquiryCountry = try container.decodeIfPresent(String.self, forKey: .inquiryCountry)
        shootingLocation = try container.decodeIfPresent(String.self, forKey: .shootingLocation)
        clientOrganizationId = try container.decodeIfPresent(UUID.self, forKey: .clientOrganizationId)

        // Decode standard timestamps
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)

        // Decode optional dates with flexible format support
        startDate = try Self.decodeFlexibleDate(from: container, forKey: .startDate)
        endDate = try Self.decodeFlexibleDate(from: container, forKey: .endDate)
    }

    // Helper to decode dates in both "YYYY-MM-DD" and ISO 8601 formats
    private static func decodeFlexibleDate(from container: KeyedDecodingContainer<CodingKeys>, forKey key: CodingKeys) throws -> Date? {
        // Try to decode as Date first (for ISO 8601 timestamps)
        if let date = try? container.decodeIfPresent(Date.self, forKey: key) {
            return date
        }

        // Try to decode as String (for DATE format "YYYY-MM-DD")
        if let dateString = try? container.decodeIfPresent(String.self, forKey: key) {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            dateFormatter.timeZone = TimeZone(identifier: "UTC")
            return dateFormatter.date(from: dateString)
        }

        return nil
    }
    
    init(id: UUID = UUID(), name: String = "", status: ProjectStatus = .inquiry, description: String? = nil, notes: String? = nil, clientOrganizationId: UUID? = nil) {
        self.id = id
        self.name = name
        self.status = status
        self.description = description
        self.notes = notes
        self.clientOrganizationId = clientOrganizationId
        self.projectNumber = "P\(Int.random(in: 10000...99999))"
        self.inquiryCountry = nil
        self.shootingLocation = nil
        self.startDate = nil
        self.endDate = nil
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}

// MARK: - Project Status Enum
enum ProjectStatus: String, CaseIterable, Codable {
    case inquiry = "INQUIRY"
    case budget = "BUDGET"
    case production = "PRODUCTION"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
    case hold = "HOLD"
    
    var color: String {
        switch self {
        case .inquiry: return "blue"
        case .budget: return "orange"
        case .production: return "green"
        case .completed: return "mint"
        case .cancelled: return "red"
        case .hold: return "purple"
        }
    }
    
    var systemImage: String {
        switch self {
        case .inquiry: return "questionmark.circle"
        case .budget: return "dollarsign.circle"
        case .production: return "play.circle"
        case .completed: return "checkmark.circle"
        case .cancelled: return "xmark.circle"
        case .hold: return "pause.circle"
        }
    }
}

// MARK: - Project Assignment Model (Enhanced for Crew Management)
struct ProjectAssignment: Identifiable, Codable {
    let id: UUID
    let projectId: UUID
    let personId: UUID
    var role: String? // Specific position/role on THIS project (can be different from person's general jobs)
    var department: CrewDepartment?
    var availability: AssignmentStatus
    var dailyPay: Decimal? // Daily pay amount
    var currency: String
    var notes: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, role, department, availability, notes, currency
        case projectId = "project_id"
        case personId = "person_id"
        case dailyPay = "daily_pay"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    init(id: UUID = UUID(), projectId: UUID, personId: UUID, role: String? = nil, department: CrewDepartment = .other, availability: AssignmentStatus = .anfragen, dailyPay: Decimal? = nil, currency: String = "EUR", notes: String? = nil) {
        self.id = id
        self.projectId = projectId
        self.personId = personId
        self.role = role
        self.department = department
        self.availability = availability
        self.dailyPay = dailyPay
        self.currency = currency
        self.notes = notes
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}

// MARK: - Supporting Data Structures

struct ContactMethod: Identifiable, Codable {
    var id = UUID()
    var type: ContactMethodType
    var value: String
    var label: String
    var isPrimary: Bool
    
    enum ContactMethodType: String, CaseIterable, Codable {
        case phone = "Phone"
        case mobile = "Mobile"
        case email = "Email"
        case whatsapp = "WhatsApp"
        case telegram = "Telegram"
        case skype = "Skype"
        case website = "Website"
        case fax = "Fax"
        case other = "Other"
        
        var icon: String {
            switch self {
            case .phone: return "phone"
            case .mobile: return "phone.arrow.up.right"
            case .email: return "envelope"
            case .whatsapp: return "message"
            case .telegram: return "paperplane"
            case .skype: return "video"
            case .website: return "globe"
            case .fax: return "faxmachine"
            case .other: return "info.circle"
            }
        }
    }
}

struct BankDetails: Codable {
    var bankName: String = ""
    var iban: String = ""
    var bic: String = ""
    var accountHolder: String = ""
}

struct InsuranceDetails: Codable {
    var provider: String = ""
    var policyNumber: String = ""
    var coverage: String = ""
    var expiryDate: Date?
}

struct EmergencyContact: Codable {
    var name: String = ""
    var relationship: String = ""
    var phone: String = ""
    var email: String = ""
}

struct ContactPerson: Identifiable, Codable {
    var id = UUID()
    var personId: UUID
    var role: String
    var department: String
    var isPrimary: Bool
}

struct OrganizationAffiliation: Identifiable, Codable {
    var id = UUID()
    var organizationId: UUID
    var role: String
    var startDate: Date?
    var endDate: Date?
    var isActive: Bool
}

struct Location: Identifiable, Codable {
    var id = UUID()
    var name: String
    var address: Address
    var type: String // Studio, Location, Office, etc.
    var description: String
}

struct DateRange: Identifiable, Codable {
    var id = UUID()
    var startDate: Date
    var endDate: Date
    var notes: String = ""
}

struct SocialMediaAccount: Identifiable, Codable {
    var id = UUID()
    var platform: String
    var handle: String
    var url: String
}

// MARK: - Assignment Status
enum AssignmentStatus: String, CaseIterable, Codable {
    case anfragen = "To Inquire"              // Inquiry (to be sent)
    case angefragt = "Inquired"           // Inquired (sent)
    case verfuegbar = "Available"          // Available
    case nichtVerfuegbar = "Not Available" // Not Available
    case ersteOption = "1st Option"          // First Option
    case zweiteOption = "2nd Option"         // Second Option
    case gebucht = "Booked"               // Booked
    case abgesagt = "Cancelled"             // Cancelled
    case keineRueckmeldung = "No Response" // No Response
    
    var color: String {
        switch self {
        case .anfragen: return "blue"
        case .angefragt: return "orange"
        case .verfuegbar: return "green"
        case .nichtVerfuegbar: return "gray"
        case .ersteOption: return "yellow"
        case .zweiteOption: return "orange"
        case .gebucht: return "green"
        case .abgesagt: return "red"
        case .keineRueckmeldung: return "gray"
        }
    }
}



// MARK: - Department and Role Definitions
enum CrewDepartment: String, CaseIterable, Codable {
    case camera = "Camera"
    case sound = "Sound"
    case lighting = "Lighting"
    case grip = "Grip"
    case production = "Production"
    case direction = "Direction"
    case script = "Script"
    case continuity = "Continuity"
    case makeup = "Makeup"
    case costume = "Costume"
    case setDecoration = "Set Decoration"
    case postProduction = "Post-Production"
    case vfx = "VFX"
    case talent = "Talent"
    case catering = "Catering"
    case transportation = "Transportation"
    case security = "Security"
    case location = "Location"
    case other = "Other"
    
    var icon: String {
        switch self {
        case .camera: return "camera"
        case .sound: return "waveform"
        case .lighting: return "lightbulb"
        case .grip: return "wrench.and.screwdriver"
        case .production: return "person.2"
        case .direction: return "megaphone"
        case .script: return "doc.text"
        case .continuity: return "list.clipboard"
        case .makeup: return "paintbrush"
        case .costume: return "tshirt"
        case .setDecoration: return "sofa"
        case .postProduction: return "tv"
        case .vfx: return "sparkles"
        case .talent: return "theatermasks"
        case .catering: return "fork.knife"
        case .transportation: return "car"
        case .security: return "shield"
        case .location: return "location"
        case .other: return "person"
        }
    }
    
    var color: String {
        switch self {
        case .camera: return "blue"
        case .sound: return "purple"
        case .lighting: return "yellow"
        case .grip: return "orange"
        case .production: return "green"
        case .direction: return "red"
        case .script: return "indigo"
        case .continuity: return "teal"
        case .makeup: return "pink"
        case .costume: return "brown"
        case .setDecoration: return "cyan"
        case .postProduction: return "purple"
        case .vfx: return "mint"
        case .talent: return "pink"
        case .catering: return "orange"
        case .transportation: return "cyan"
        case .security: return "red"
        case .location: return "green"
        case .other: return "gray"
        }
    }
}

// MARK: - User Role System
enum UserRole: String, CaseIterable, Codable {
    case admin = "admin"
    case user = "user"
    
    var displayName: String {
        switch self {
        case .admin: return "Administrator"
        case .user: return "User"
        }
    }
    
    var canDelete: Bool {
        switch self {
        case .admin: return true
        case .user: return false
        }
    }
    
    var canEditAll: Bool {
        switch self {
        case .admin: return true
        case .user: return false
        }
    }
}

struct UserSession {
    let userId: UUID
    let email: String
    let role: UserRole
    let isAuthenticated: Bool
    
    static let guest = UserSession(
        userId: UUID(),
        email: "",
        role: .user,
        isAuthenticated: false
    )
}

// MARK: - Film Industry Countries
struct FilmCountries {
    static let countries = [
        "Germany", "Austria", "Switzerland", "USA", "Canada", "United Kingdom",
        "France", "Italy", "Spain", "Netherlands", "Belgium", "Sweden", "Norway",
        "Denmark", "Poland", "Czech Republic", "Hungary", "Australia", "New Zealand", "Japan",
        "South Korea", "Singapore", "Hong Kong", "UAE", "South Africa", "Morocco", "Turkey",
        "Greece", "Portugal", "Ireland", "Croatia", "Slovenia", "Romania", "Bulgaria"
    ]
    
    static let sortedCountries = countries.sorted()
}

// MARK: - Advanced Search Models
struct AdvancedSearchCriteria: Codable {
    // General search
    var generalText: String = ""
    
    // Person criteria
    var personName: String = ""
    var personEmail: String = ""
    var personCity: String = ""
    var personJobs: [JobType] = []
    var personLanguages: [Language] = []
    var personOrganization: UUID? = nil
    
    // Project criteria  
    var projectName: String = ""
    var projectNumber: String = ""
    var projectStatus: [ProjectStatus] = []
    var projectInquiryCountry: String = ""
    var projectShootingLocation: String = ""
    var projectClientOrganization: UUID? = nil
    
    // Organization criteria
    var organizationName: String = ""
    
    // Search options
    var searchPeople: Bool = true
    var searchProjects: Bool = true
    var searchOrganizations: Bool = true
    var useAndLogic: Bool = true // true = AND logic, false = OR logic
    
    var isEmpty: Bool {
        generalText.isEmpty &&
        personName.isEmpty &&
        personEmail.isEmpty &&
        personCity.isEmpty &&
        personJobs.isEmpty &&
        personLanguages.isEmpty &&
        personOrganization == nil &&
        projectName.isEmpty &&
        projectNumber.isEmpty &&
        projectStatus.isEmpty &&
        projectInquiryCountry.isEmpty &&
        projectShootingLocation.isEmpty &&
        projectClientOrganization == nil &&
        organizationName.isEmpty
    }
    
    var hasMultipleCriteria: Bool {
        let criteriaCount = [
            !generalText.isEmpty,
            !personName.isEmpty,
            !personEmail.isEmpty,
            !personCity.isEmpty,
            !personJobs.isEmpty,
            !personLanguages.isEmpty,
            personOrganization != nil,
            !projectName.isEmpty,
            !projectNumber.isEmpty,
            !projectStatus.isEmpty,
            !projectInquiryCountry.isEmpty,
            !projectShootingLocation.isEmpty,
            projectClientOrganization != nil,
            !organizationName.isEmpty
        ].filter { $0 }.count
        
        return criteriaCount > 1
    }
}

struct AdvancedSearchResults {
    var people: [PersonSearchResult] = []
    var organizations: [OrganizationSearchResult] = []
    var projects: [ProjectSearchResult] = []
    var totalCount: Int = 0
    var executionTimeMs: Double = 0
    
    var isEmpty: Bool {
        people.isEmpty && organizations.isEmpty && projects.isEmpty
    }
    
    var hasResults: Bool {
        !isEmpty
    }
    
    init() {
        self.totalCount = 0
    }
    
    init(people: [PersonSearchResult], organizations: [OrganizationSearchResult], projects: [ProjectSearchResult], executionTime: Double = 0) {
        self.people = people
        self.organizations = organizations
        self.projects = projects
        self.totalCount = people.count + organizations.count + projects.count
        self.executionTimeMs = executionTime
    }
}

// MARK: - Calendar Models
struct ProjectCalendar: Identifiable, Codable {
    let id: UUID
    let projectId: UUID
    let name: String
    var color: String // Hex color code
    var isVisible: Bool
    var isShared: Bool
    var lastModified: Date
    var events: [CalendarEvent]
    
    init(id: UUID = UUID(), projectId: UUID, name: String, color: String = "#007AFF", isVisible: Bool = true, isShared: Bool = false) {
        self.id = id
        self.projectId = projectId
        self.name = name
        self.color = color
        self.isVisible = isVisible
        self.isShared = isShared
        self.lastModified = Date()
        self.events = []
    }
}

struct CalendarEvent: Identifiable, Codable {
    let id: UUID
    var title: String
    var startDate: Date
    var endDate: Date
    var isAllDay: Bool
    var location: String?
    var notes: String?
    var attendees: [String]? // Email addresses
    var status: EventStatus
    var recurrence: RecurrenceRule?
    var lastModified: Date
    
    init(id: UUID = UUID(), title: String, startDate: Date, endDate: Date, isAllDay: Bool = false) {
        self.id = id
        self.title = title
        self.startDate = startDate
        self.endDate = endDate
        self.isAllDay = isAllDay
        self.status = .confirmed
        self.lastModified = Date()
    }
}

enum EventStatus: String, Codable {
    case tentative
    case confirmed
    case cancelled
}

struct RecurrenceRule: Codable {
    enum Frequency: String, Codable {
        case daily, weekly, monthly, yearly
    }
    
    let frequency: Frequency
    let interval: Int
    let endDate: Date?
    let occurrences: Int?
    let daysOfWeek: Set<Int>? // 1 = Sunday, 7 = Saturday
}

struct FinancialDetails: Codable, Hashable, Identifiable {
    var id = UUID()
    var country: String? // ISO country code
    var iban: String?
    var bic: String?
    var bankName: String?
    var accountNumber: String? // For US/other
    var routingNumber: String? // For US
    var vatNumber: String?
    var invoiceAddress: Address? // Separate from main address
} 

// MARK: - Document Model
struct Document: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var type: String // File extension
    var size: Int64 // File size in bytes
    var uploadDate: Date
    var url: URL // Local file URL
    
    enum CodingKeys: String, CodingKey {
        case id, name, type, size, uploadDate
        case url = "file_url"
    }
    
    init(id: UUID = UUID(), name: String, type: String, size: Int64, uploadDate: Date, url: URL) {
        self.id = id
        self.name = name
        self.type = type
        self.size = size
        self.uploadDate = uploadDate
        self.url = url
    }
    
    // Custom encoding/decoding for URL
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        type = try container.decode(String.self, forKey: .type)
        size = try container.decode(Int64.self, forKey: .size)
        uploadDate = try container.decode(Date.self, forKey: .uploadDate)
        
        // Decode URL string and convert to URL
        let urlString = try container.decode(String.self, forKey: .url)
        url = URL(string: urlString) ?? URL(fileURLWithPath: "")
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(type, forKey: .type)
        try container.encode(size, forKey: .size)
        try container.encode(uploadDate, forKey: .uploadDate)
        try container.encode(url.absoluteString, forKey: .url)
    }
} 