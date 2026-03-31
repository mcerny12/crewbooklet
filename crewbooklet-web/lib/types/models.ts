/**
 * Data Models for CrewBooklet
 * TypeScript version of Swift DataModels.swift
 * Designed for Supabase PostgreSQL database
 */

// MARK: - Enhanced Person Model (Crew Member)
export interface Person {
  id: string;
  created_at: string;
  updated_at: string;
  user_id?: string | null;

  // Basic Info
  name: string;
  gender?: Gender | null;
  date_of_birth?: string | null;

  // Contact Information
  email?: string | null;
  mobile_phone?: string | null;
  work_phone?: string | null;
  website?: string | null;

  // Address
  address?: Address | null;

  // Professional Info
  jobs: JobType[];
  languages: Language[];

  // Organization Connection
  organization_id?: string | null;

  // Additional
  notes?: string | null;
  financial_details?: FinancialDetails | null;
  documents?: Document[] | null;
}

// MARK: - Supporting Enums for Person Model
export enum Gender {
  Male = "male",
  Female = "female",
  Other = "other"
}

export const GenderDisplay: Record<Gender, string> = {
  [Gender.Male]: "Male",
  [Gender.Female]: "Female",
  [Gender.Other]: "Other"
};

export enum Language {
  EN = "EN",
  DE = "DE",
  FR = "FR",
  ES = "ES",
  IT = "IT"
}

export const LanguageDisplay: Record<Language, string> = {
  [Language.EN]: "English",
  [Language.DE]: "German",
  [Language.FR]: "French",
  [Language.ES]: "Spanish",
  [Language.IT]: "Italian"
};

export enum JobType {
  // Production Department
  ExecutiveProducer = "Executive Producer",
  Producer = "Producer",
  LineProducer = "Line Producer",
  ProductionCoordinator = "Production Coordinator",
  ProductionAssistant = "Production Assistant",
  ProductionManager = "Production Manager",
  LocationManager = "Location Manager",
  LocationScout = "Location Scout",

  // Direction Department
  Director = "Director",
  FirstAD = "1st AD",
  SecondAD = "2nd AD",
  ThirdAD = "3rd AD",
  ScriptSupervisor = "Script Supervisor",

  // Camera Department
  Photographer = "Photographer",
  PhotographersAssistant = "Photographers Assistant",
  DigitalOperator = "Digital Operator",
  FirstAC = "1st AC",
  SecondAC = "2nd AC",
  DIT = "DIT",
  CameraOperator = "Camera Operator",
  SteadicamOperator = "Steadicam Operator",

  // Sound Department
  VTR = "VTR",
  SoundMixer = "Sound Mixer",
  BoomOperator = "Boom Operator",
  SoundAssistant = "Sound Assistant",

  // Lighting Department
  Gaffer = "Gaffer",
  Electrician = "Electrician",
  BestBoy = "Best Boy",
  LightingTechnician = "Lighting Technician",

  // Grip Department
  Grip = "Grip",
  KeyGrip = "Key Grip",
  DollyGrip = "Dolly Grip",

  // Art Department
  ProductionDesigner = "Production Designer",
  ArtDirector = "Art Director",
  SetDecorator = "Set Decorator",
  PropMaster = "Prop Master",

  // Hair & Makeup
  MakeupArtist = "Makeup Artist",
  HairStylist = "Hair Stylist",
  SpecialEffectsMakeup = "Special Effects Makeup",

  // Wardrobe
  CostumeDesigner = "Costume Designer",
  WardrobeStylist = "Wardrobe Stylist",
  WardrobeAssistant = "Wardrobe Assistant",

  // Post-Production
  Editor = "Editor",
  AssistantEditor = "Assistant Editor",
  Colorist = "Colorist",
  VFXSupervisor = "VFX Supervisor",
  VFXArtist = "VFX Artist",
  MotionGraphicsDesigner = "Motion Graphics Designer",

  // Other
  CastingDirector = "Casting Director",
  Choreographer = "Choreographer",
  StuntCoordinator = "Stunt Coordinator",
  AnimalHandler = "Animal Handler",
  Medic = "Medic",
  Security = "Security",
  Driver = "Driver",
  Catering = "Catering"
}

export enum JobCategory {
  Production = "Production",
  Direction = "Direction",
  Camera = "Camera",
  Sound = "Sound",
  Lighting = "Lighting",
  Grip = "Grip",
  ArtDepartment = "Art Department",
  Makeup = "Hair & Makeup",
  Wardrobe = "Wardrobe",
  PostProduction = "Post-Production",
  Other = "Other"
}

export const JobCategoryColors: Record<JobCategory, string> = {
  [JobCategory.Production]: "green",
  [JobCategory.Direction]: "red",
  [JobCategory.Camera]: "blue",
  [JobCategory.Sound]: "purple",
  [JobCategory.Lighting]: "yellow",
  [JobCategory.Grip]: "orange",
  [JobCategory.ArtDepartment]: "brown",
  [JobCategory.Makeup]: "pink",
  [JobCategory.Wardrobe]: "indigo",
  [JobCategory.PostProduction]: "cyan",
  [JobCategory.Other]: "gray"
};

export const JobCategoryIcons: Record<JobCategory, string> = {
  [JobCategory.Production]: "Users",
  [JobCategory.Direction]: "Megaphone",
  [JobCategory.Camera]: "Camera",
  [JobCategory.Sound]: "Waveform",
  [JobCategory.Lighting]: "Lightbulb",
  [JobCategory.Grip]: "Wrench",
  [JobCategory.ArtDepartment]: "Palette",
  [JobCategory.Makeup]: "Paintbrush",
  [JobCategory.Wardrobe]: "Shirt",
  [JobCategory.PostProduction]: "Monitor",
  [JobCategory.Other]: "User"
};

// Helper function to get job category
export function getJobCategory(job: JobType): JobCategory {
  const productionJobs = [
    JobType.ExecutiveProducer, JobType.Producer, JobType.LineProducer,
    JobType.ProductionCoordinator, JobType.ProductionAssistant,
    JobType.ProductionManager, JobType.LocationManager, JobType.LocationScout
  ];

  const directionJobs = [
    JobType.Director, JobType.FirstAD, JobType.SecondAD,
    JobType.ThirdAD, JobType.ScriptSupervisor
  ];

  const cameraJobs = [
    JobType.Photographer, JobType.PhotographersAssistant, JobType.DigitalOperator,
    JobType.FirstAC, JobType.SecondAC, JobType.DIT,
    JobType.CameraOperator, JobType.SteadicamOperator
  ];

  const soundJobs = [
    JobType.VTR, JobType.SoundMixer, JobType.BoomOperator, JobType.SoundAssistant
  ];

  const lightingJobs = [
    JobType.Gaffer, JobType.Electrician, JobType.BestBoy, JobType.LightingTechnician
  ];

  const gripJobs = [JobType.Grip, JobType.KeyGrip, JobType.DollyGrip];

  const artJobs = [
    JobType.ProductionDesigner, JobType.ArtDirector,
    JobType.SetDecorator, JobType.PropMaster
  ];

  const makeupJobs = [
    JobType.MakeupArtist, JobType.HairStylist, JobType.SpecialEffectsMakeup
  ];

  const wardrobeJobs = [
    JobType.CostumeDesigner, JobType.WardrobeStylist, JobType.WardrobeAssistant
  ];

  const postProductionJobs = [
    JobType.Editor, JobType.AssistantEditor, JobType.Colorist,
    JobType.VFXSupervisor, JobType.VFXArtist, JobType.MotionGraphicsDesigner
  ];

  if (productionJobs.includes(job)) return JobCategory.Production;
  if (directionJobs.includes(job)) return JobCategory.Direction;
  if (cameraJobs.includes(job)) return JobCategory.Camera;
  if (soundJobs.includes(job)) return JobCategory.Sound;
  if (lightingJobs.includes(job)) return JobCategory.Lighting;
  if (gripJobs.includes(job)) return JobCategory.Grip;
  if (artJobs.includes(job)) return JobCategory.ArtDepartment;
  if (makeupJobs.includes(job)) return JobCategory.Makeup;
  if (wardrobeJobs.includes(job)) return JobCategory.Wardrobe;
  if (postProductionJobs.includes(job)) return JobCategory.PostProduction;

  return JobCategory.Other;
}

export interface Address {
  name?: string | null;
  street1?: string | null;
  street2?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
}

export function formatAddress(address: Address): string {
  return [address.street1, address.street2, address.zip, address.city, address.country]
    .filter(Boolean)
    .join(", ");
}

export function isAddressEmpty(address: Address | null | undefined): boolean {
  if (!address) return true;
  return ![address.street1, address.street2, address.zip, address.city, address.country]
    .some(val => val && val.trim().length > 0);
}

// MARK: - Organization Model
export interface Organization {
  id: string;
  created_at: string;
  updated_at: string;
  user_id?: string | null;

  // Basic Info
  name: string;

  // Contact Information
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;

  // Address
  street?: string | null;
  street2?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;

  // Invoice Address
  name_invoice?: string | null;
  street_invoice?: string | null;
  street2_invoice?: string | null;
  zip_invoice?: string | null;
  city_invoice?: string | null;
  country_invoice?: string | null;

  // Professional Info
  jobs: OrganizationJobType[];

  // Additional
  notes?: string | null;
  financial_details?: FinancialDetails | null;
  documents?: Document[] | null;
}

// MARK: - Organization Job Types
export enum OrganizationJobType {
  Agency = "Agency",
  FilmProduction = "Film Production",
  PhotoProduction = "Photo Production",
  EquipmentRental = "Equipment Rental",
  PostProduction = "Post-Production",
  CastingAgency = "Casting Agency",
  LocationService = "Location Service",
  CateringService = "Catering Service",
  TransportService = "Transport Service",
  Broadcaster = "Broadcaster/TV Station",
  StreamingPlatform = "Streaming Platform",
  DistributionCompany = "Distribution Company",
  TalentAgency = "Talent Agency",
  MusicLabel = "Music Label",
  SoundStudio = "Sound Studio",
  EditingSuite = "Editing Suite",
  ColorGrading = "Color Grading",
  VFXStudio = "VFX Studio",
  AnimationStudio = "Animation Studio",
  Other = "Other"
}

export enum OrganizationCategory {
  Agency = "Agency",
  Production = "Production",
  Equipment = "Equipment",
  PostProduction = "Post-Production",
  Services = "Services",
  Distribution = "Distribution",
  Music = "Music",
  Other = "Other"
}

export const OrganizationCategoryColors: Record<OrganizationCategory, string> = {
  [OrganizationCategory.Agency]: "blue",
  [OrganizationCategory.Production]: "green",
  [OrganizationCategory.Equipment]: "orange",
  [OrganizationCategory.PostProduction]: "purple",
  [OrganizationCategory.Services]: "teal",
  [OrganizationCategory.Distribution]: "red",
  [OrganizationCategory.Music]: "pink",
  [OrganizationCategory.Other]: "gray"
};

export const OrganizationCategoryIcons: Record<OrganizationCategory, string> = {
  [OrganizationCategory.Agency]: "Users",
  [OrganizationCategory.Production]: "Video",
  [OrganizationCategory.Equipment]: "Wrench",
  [OrganizationCategory.PostProduction]: "Monitor",
  [OrganizationCategory.Services]: "Hand",
  [OrganizationCategory.Distribution]: "Tv",
  [OrganizationCategory.Music]: "Music",
  [OrganizationCategory.Other]: "Building"
};

export function getOrganizationCategory(jobType: OrganizationJobType): OrganizationCategory {
  const agencyTypes = [
    OrganizationJobType.Agency,
    OrganizationJobType.CastingAgency,
    OrganizationJobType.TalentAgency
  ];

  const productionTypes = [
    OrganizationJobType.FilmProduction,
    OrganizationJobType.PhotoProduction
  ];

  const postProductionTypes = [
    OrganizationJobType.PostProduction,
    OrganizationJobType.EditingSuite,
    OrganizationJobType.ColorGrading,
    OrganizationJobType.VFXStudio,
    OrganizationJobType.AnimationStudio,
    OrganizationJobType.SoundStudio
  ];

  const serviceTypes = [
    OrganizationJobType.LocationService,
    OrganizationJobType.CateringService,
    OrganizationJobType.TransportService
  ];

  const distributionTypes = [
    OrganizationJobType.Broadcaster,
    OrganizationJobType.StreamingPlatform,
    OrganizationJobType.DistributionCompany
  ];

  if (agencyTypes.includes(jobType)) return OrganizationCategory.Agency;
  if (productionTypes.includes(jobType)) return OrganizationCategory.Production;
  if (jobType === OrganizationJobType.EquipmentRental) return OrganizationCategory.Equipment;
  if (postProductionTypes.includes(jobType)) return OrganizationCategory.PostProduction;
  if (serviceTypes.includes(jobType)) return OrganizationCategory.Services;
  if (distributionTypes.includes(jobType)) return OrganizationCategory.Distribution;
  if (jobType === OrganizationJobType.MusicLabel) return OrganizationCategory.Music;

  return OrganizationCategory.Other;
}

// MARK: - Project Model
export interface Project {
  id: string;
  creation_date: string;
  updated_at: string;
  user_id?: string | null;

  // Basic Info
  name: string;
  project_number: string;
  status: ProjectStatus;

  // Location Info
  inquiry_country?: string | null;
  shooting_location?: string | null;

  // Organization Connection
  client_organization_id?: string | null;

  // Additional
  description?: string | null;
  notes?: string | null;

  // Dates
  start_date?: string | null;
  end_date?: string | null;
}

// MARK: - Project Status Enum
export enum ProjectStatus {
  Inquiry = "INQUIRY",
  Budget = "BUDGET",
  Production = "PRODUCTION",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED",
  Hold = "HOLD"
}

export const ProjectStatusColors: Record<ProjectStatus, string> = {
  [ProjectStatus.Inquiry]: "blue",
  [ProjectStatus.Budget]: "orange",
  [ProjectStatus.Production]: "green",
  [ProjectStatus.Completed]: "mint",
  [ProjectStatus.Cancelled]: "red",
  [ProjectStatus.Hold]: "purple"
};

export const ProjectStatusIcons: Record<ProjectStatus, string> = {
  [ProjectStatus.Inquiry]: "HelpCircle",
  [ProjectStatus.Budget]: "DollarSign",
  [ProjectStatus.Production]: "PlayCircle",
  [ProjectStatus.Completed]: "CheckCircle",
  [ProjectStatus.Cancelled]: "XCircle",
  [ProjectStatus.Hold]: "PauseCircle"
};

// MARK: - Project Assignment Model
export interface ProjectAssignment {
  id: string;
  project_id: string;
  person_id?: string | null;
  organization_id?: string | null;
  user_id?: string | null;
  role?: string | null;
  department?: CrewDepartment | null;
  availability: AssignmentStatus;
  daily_pay?: number | null;
  currency: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// MARK: - Assignment Status
export enum AssignmentStatus {
  Anfragen = "To Inquire",
  Angefragt = "Inquired",
  Verfuegbar = "Available",
  NichtVerfuegbar = "Not Available",
  ErsteOption = "1st Option",
  ZweiteOption = "2nd Option",
  Gebucht = "Booked",
  Abgesagt = "Cancelled",
  KeineRueckmeldung = "No Response"
}

export const AssignmentStatusColors: Record<AssignmentStatus, string> = {
  [AssignmentStatus.Anfragen]: "blue",
  [AssignmentStatus.Angefragt]: "orange",
  [AssignmentStatus.Verfuegbar]: "green",
  [AssignmentStatus.NichtVerfuegbar]: "gray",
  [AssignmentStatus.ErsteOption]: "yellow",
  [AssignmentStatus.ZweiteOption]: "orange",
  [AssignmentStatus.Gebucht]: "green",
  [AssignmentStatus.Abgesagt]: "red",
  [AssignmentStatus.KeineRueckmeldung]: "gray"
};

// MARK: - Department and Role Definitions
export enum CrewDepartment {
  Camera = "Camera",
  Sound = "Sound",
  Lighting = "Lighting",
  Grip = "Grip",
  Production = "Production",
  Direction = "Direction",
  Script = "Script",
  Continuity = "Continuity",
  Makeup = "Makeup",
  Costume = "Costume",
  SetDecoration = "Set Decoration",
  PostProduction = "Post-Production",
  VFX = "VFX",
  Talent = "Talent",
  Catering = "Catering",
  Transportation = "Transportation",
  Security = "Security",
  Location = "Location",
  Other = "Other"
}

export const CrewDepartmentIcons: Record<CrewDepartment, string> = {
  [CrewDepartment.Camera]: "Camera",
  [CrewDepartment.Sound]: "Waveform",
  [CrewDepartment.Lighting]: "Lightbulb",
  [CrewDepartment.Grip]: "Wrench",
  [CrewDepartment.Production]: "Users",
  [CrewDepartment.Direction]: "Megaphone",
  [CrewDepartment.Script]: "FileText",
  [CrewDepartment.Continuity]: "Clipboard",
  [CrewDepartment.Makeup]: "Paintbrush",
  [CrewDepartment.Costume]: "Shirt",
  [CrewDepartment.SetDecoration]: "Sofa",
  [CrewDepartment.PostProduction]: "Tv",
  [CrewDepartment.VFX]: "Sparkles",
  [CrewDepartment.Talent]: "Drama",
  [CrewDepartment.Catering]: "Utensils",
  [CrewDepartment.Transportation]: "Car",
  [CrewDepartment.Security]: "Shield",
  [CrewDepartment.Location]: "MapPin",
  [CrewDepartment.Other]: "User"
};

export const CrewDepartmentColors: Record<CrewDepartment, string> = {
  [CrewDepartment.Camera]: "blue",
  [CrewDepartment.Sound]: "purple",
  [CrewDepartment.Lighting]: "yellow",
  [CrewDepartment.Grip]: "orange",
  [CrewDepartment.Production]: "green",
  [CrewDepartment.Direction]: "red",
  [CrewDepartment.Script]: "indigo",
  [CrewDepartment.Continuity]: "teal",
  [CrewDepartment.Makeup]: "pink",
  [CrewDepartment.Costume]: "brown",
  [CrewDepartment.SetDecoration]: "cyan",
  [CrewDepartment.PostProduction]: "purple",
  [CrewDepartment.VFX]: "mint",
  [CrewDepartment.Talent]: "pink",
  [CrewDepartment.Catering]: "orange",
  [CrewDepartment.Transportation]: "cyan",
  [CrewDepartment.Security]: "red",
  [CrewDepartment.Location]: "green",
  [CrewDepartment.Other]: "gray"
};

// MARK: - Job → Department auto-mapping
export const JOB_CATEGORY_TO_DEPARTMENT: Record<JobCategory, CrewDepartment> = {
  [JobCategory.Production]:    CrewDepartment.Production,
  [JobCategory.Direction]:     CrewDepartment.Direction,
  [JobCategory.Camera]:        CrewDepartment.Camera,
  [JobCategory.Sound]:         CrewDepartment.Sound,
  [JobCategory.Lighting]:      CrewDepartment.Lighting,
  [JobCategory.Grip]:          CrewDepartment.Grip,
  [JobCategory.ArtDepartment]: CrewDepartment.SetDecoration,
  [JobCategory.Makeup]:        CrewDepartment.Makeup,
  [JobCategory.Wardrobe]:      CrewDepartment.Costume,
  [JobCategory.PostProduction]:CrewDepartment.PostProduction,
  [JobCategory.Other]:         CrewDepartment.Other,
};

export function getDepartmentFromJob(job: JobType): CrewDepartment {
  return JOB_CATEGORY_TO_DEPARTMENT[getJobCategory(job)];
}

// MARK: - User Role System
export enum UserRole {
  Admin = "admin",
  User = "user",
  Viewer = "viewer"
}

export const UserRoleDisplay: Record<UserRole, string> = {
  [UserRole.Admin]: "Administrator",
  [UserRole.User]: "User",
  [UserRole.Viewer]: "Viewer"
};

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  isAuthenticated: boolean;
}

export const GUEST_SESSION: UserSession = {
  userId: "",
  email: "",
  role: UserRole.User,
  isAuthenticated: false
};

// MARK: - Film Industry Countries
export const FILM_COUNTRIES = [
  "Germany", "Austria", "Switzerland", "USA", "Canada", "United Kingdom",
  "France", "Italy", "Spain", "Netherlands", "Belgium", "Sweden", "Norway",
  "Denmark", "Poland", "Czech Republic", "Hungary", "Australia", "New Zealand", "Japan",
  "South Korea", "Singapore", "Hong Kong", "UAE", "South Africa", "Morocco", "Turkey",
  "Greece", "Portugal", "Ireland", "Croatia", "Slovenia", "Romania", "Bulgaria"
].sort();

// MARK: - Advanced Search Models
export interface AdvancedSearchCriteria {
  // General search
  generalText: string;

  // Person criteria
  personName: string;
  personEmail: string;
  personCity: string;
  personJobs: JobType[];
  personLanguages: Language[];
  personOrganization?: string | null;

  // Project criteria
  projectName: string;
  projectNumber: string;
  projectStatus: ProjectStatus[];
  projectInquiryCountry: string;
  projectShootingLocation: string;
  projectClientOrganization?: string | null;

  // Organization criteria
  organizationName: string;

  // Search options
  searchPeople: boolean;
  searchProjects: boolean;
  searchOrganizations: boolean;
  useAndLogic: boolean;
}

export interface PersonSearchResult {
  person: Person;
  matchFields: string[];
}

export interface OrganizationSearchResult {
  organization: Organization;
  matchFields: string[];
}

export interface ProjectSearchResult {
  project: Project;
  matchFields: string[];
}

export interface AdvancedSearchResults {
  people: PersonSearchResult[];
  organizations: OrganizationSearchResult[];
  projects: ProjectSearchResult[];
  totalCount: number;
  executionTimeMs: number;
}

// MARK: - Calendar Models

export const PROJECT_COLORS = [
  '#2563EB', // blue
  '#16A34A', // green
  '#DC2626', // red
  '#7C3AED', // purple
  '#D97706', // amber
  '#DB2777', // pink
  '#0D9488', // teal
  '#EA580C', // orange
] as const;

// Each array: [saturated, light-pastel, dark, shifted-hue] — clearly distinct at every position
export const PROJECT_COLOR_SHADES: Record<string, string[]> = {
  '#2563EB': ['#3B82F6', '#93C5FD', '#1E3A8A', '#6366F1'],   // blue, light-blue, navy, indigo
  '#16A34A': ['#22C55E', '#86EFAC', '#14532D', '#84CC16'],   // green, light-green, dark-green, lime
  '#DC2626': ['#EF4444', '#FCA5A5', '#7F1D1D', '#F97316'],   // red, light-red, dark-red, orange
  '#7C3AED': ['#8B5CF6', '#C4B5FD', '#3B0764', '#EC4899'],   // purple, light-purple, dark-purple, pink
  '#D97706': ['#F59E0B', '#FDE68A', '#78350F', '#FB923C'],   // amber, light-amber, brown, orange
  '#DB2777': ['#EC4899', '#F9A8D4', '#831843', '#F43F5E'],   // pink, light-pink, dark-pink, rose
  '#0D9488': ['#14B8A6', '#5EEAD4', '#134E4A', '#0EA5E9'],   // teal, light-teal, dark-teal, sky
  '#EA580C': ['#F97316', '#FDBA74', '#7C2D12', '#EAB308'],   // orange, light-orange, dark-orange, yellow
};

export interface ProjectCalendar {
  id: string;
  created_at: string;
  project_id: string;
  name: string;
  color: string;        // hex — shade of the project color
  is_visible: boolean;
  share_token?: string | null;
  sort_order: number;
  events?: CalendarEvent[];
}

export interface CalendarEvent {
  id: string;
  created_at: string;
  calendar_id: string;
  title: string;
  start_date: string;   // ISO timestamp
  end_date: string;     // ISO timestamp
  is_all_day: boolean;
  location?: string | null;
  notes?: string | null;
  status: EventStatus;
}

export enum EventStatus {
  Tentative = "tentative",
  Confirmed = "confirmed",
  Cancelled = "cancelled"
}

// MARK: - Financial Details
export interface FinancialDetails {
  id: string;
  country?: string | null;
  iban?: string | null;
  bic?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  routing_number?: string | null;
  vat_number?: string | null;
  invoice_address?: Address | null;
}

// MARK: - Document Model
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  upload_date: string;
  file_url: string;
}

// MARK: - Invoice Model
export enum InvoiceStatus {
  Draft = "draft",
  Sent = "sent",
  Paid = "paid",
  Overdue = "overdue",
  Cancelled = "cancelled"
}

export const InvoiceStatusColors: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Draft]: "gray",
  [InvoiceStatus.Sent]: "blue",
  [InvoiceStatus.Paid]: "green",
  [InvoiceStatus.Overdue]: "red",
  [InvoiceStatus.Cancelled]: "orange"
};

export interface Invoice {
  id: string;
  created_at: string;
  updated_at: string;
  user_id?: string | null;

  invoice_number: string;
  status: InvoiceStatus;

  // Linked project
  project_id?: string | null;

  // Recipient (usually auto-filled from project's client org)
  recipient_name?: string | null;
  recipient_contact?: string | null;
  recipient_street?: string | null;
  recipient_zip?: string | null;
  recipient_city?: string | null;
  recipient_country?: string | null;

  // Sender info (user's own details stored on invoice)
  sender_name?: string | null;
  sender_address_line?: string | null;
  sender_phone?: string | null;
  sender_email?: string | null;

  // Invoice metadata
  date?: string | null;
  due_date?: string | null;
  service_period_start?: string | null;
  service_period_end?: string | null;
  reference?: string | null;
  uid_recipient?: string | null;

  // Content
  greeting?: string | null;
  intro?: string | null;
  footer_notes?: string | null;

  // Bank details
  bank_recipient?: string | null;
  iban?: string | null;
  bic?: string | null;

  // Computed totals (stored for display)
  total?: number | null;

  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  sort_order: number;
  description: string;
  sub_description?: string | null;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

export interface InvoiceAttachment {
  id: string;
  created_at: string;
  invoice_id: string;
  label?: string | null; // null = invoice-level; item description = item-level
  file_name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
}

// MARK: - Helper Types for Forms
export interface PersonFormData extends Omit<Person, 'id' | 'created_at' | 'updated_at'> {}
export interface OrganizationFormData extends Omit<Organization, 'id' | 'created_at' | 'updated_at'> {}
export interface ProjectFormData extends Omit<Project, 'id' | 'creation_date' | 'updated_at'> {}
