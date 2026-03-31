import SwiftUI
import EventKit

@MainActor
class CalendarViewModel: ObservableObject {
    @Published var projectCalendars: [ProjectCalendar] = []
    @Published var selectedDate: Date = Date()
    @Published var selectedCalendars: Set<UUID> = []
    @Published var viewMode: ViewMode = .month
    @Published var errorMessage: String?
    @Published var isLoading = false
    
    private let supabaseService = SupabaseService.shared
    private let eventStore = EKEventStore()
    
    enum ViewMode {
        case day, week, month
    }
    
    init() {
        Task {
            do {
                try await loadCalendars()
            } catch {
                errorMessage = "Failed to load calendars: \(error.localizedDescription)"
                print("Error loading initial calendars: \(error)")
            }
        }
    }
    
    func loadCalendars() async throws {
        isLoading = true
        defer { isLoading = false }
        projectCalendars = try await supabaseService.fetchProjectCalendars()
        // Select all calendars by default
        selectedCalendars = Set(projectCalendars.map { $0.id })
    }
    
    func createCalendarForProject(_ project: Project) async throws {
        let calendar = ProjectCalendar(
            projectId: project.id,
            name: project.name,
            color: generateRandomColor()
        )
        try await supabaseService.createProjectCalendar(calendar)
        try await loadCalendars()
    }
    
    func toggleCalendarVisibility(_ calendarId: UUID) async throws {
        guard let index = projectCalendars.firstIndex(where: { $0.id == calendarId }) else { return }
        var calendar = projectCalendars[index]
        calendar.isVisible.toggle()
        try await supabaseService.updateProjectCalendar(calendar)
        try await loadCalendars()
    }
    
    func toggleCalendarSharing(_ calendarId: UUID) async throws {
        guard let index = projectCalendars.firstIndex(where: { $0.id == calendarId }) else { return }
        var calendar = projectCalendars[index]
        calendar.isShared.toggle()
        try await supabaseService.updateProjectCalendar(calendar)
        try await loadCalendars()
    }
    
    func createEvent(in calendarId: UUID, title: String, startDate: Date, endDate: Date, isAllDay: Bool = false) async throws {
        let event = CalendarEvent(
            title: title,
            startDate: startDate,
            endDate: endDate,
            isAllDay: isAllDay
        )
        try await supabaseService.createCalendarEvent(event, in: calendarId)
        try await loadCalendars()
    }
    
    func updateEvent(_ event: CalendarEvent, in calendarId: UUID) async throws {
        try await supabaseService.updateCalendarEvent(event, in: calendarId)
        try await loadCalendars()
    }
    
    func deleteEvent(_ eventId: UUID, from calendarId: UUID) async throws {
        try await supabaseService.deleteCalendarEvent(eventId, from: calendarId)
        try await loadCalendars()
    }
    
    // MARK: - iCalendar Export
    func exportCalendarToICS(_ calendar: ProjectCalendar) -> String {
        var icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//CrewBooklet//Calendar//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:\(calendar.name)"
        ]
        
        for event in calendar.events {
            let dateFormatter = ISO8601DateFormatter()
            
            var eventContent = [
                "BEGIN:VEVENT",
                "UID:\(event.id.uuidString)",
                "DTSTAMP:\(dateFormatter.string(from: event.lastModified))",
                "DTSTART:\(dateFormatter.string(from: event.startDate))",
                "DTEND:\(dateFormatter.string(from: event.endDate))",
                "SUMMARY:\(event.title)",
                "STATUS:\(event.status.rawValue.uppercased())"
            ]
            
            if let location = event.location {
                eventContent.append("LOCATION:\(location)")
            }
            
            if let notes = event.notes {
                eventContent.append("DESCRIPTION:\(notes)")
            }
            
            if let attendees = event.attendees {
                for attendee in attendees {
                    eventContent.append("ATTENDEE:mailto:\(attendee)")
                }
            }
            
            if let recurrence = event.recurrence {
                var rrule = "RRULE:FREQ=\(recurrence.frequency.rawValue.uppercased())"
                if recurrence.interval > 1 {
                    rrule += ";INTERVAL=\(recurrence.interval)"
                }
                if let endDate = recurrence.endDate {
                    rrule += ";UNTIL=\(dateFormatter.string(from: endDate))"
                }
                if let occurrences = recurrence.occurrences {
                    rrule += ";COUNT=\(occurrences)"
                }
                if let daysOfWeek = recurrence.daysOfWeek, !daysOfWeek.isEmpty {
                    let days = daysOfWeek.map { dayNumberToICSDay($0) }.joined(separator: ",")
                    rrule += ";BYDAY=\(days)"
                }
                eventContent.append(rrule)
            }
            
            eventContent.append("END:VEVENT")
            icsContent.append(contentsOf: eventContent)
        }
        
        icsContent.append("END:VCALENDAR")
        return icsContent.joined(separator: "\r\n")
    }
    
    // MARK: - Helper Methods
    private func dayNumberToICSDay(_ dayNumber: Int) -> String {
        let days = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
        return days[dayNumber - 1]
    }
    
    private func generateRandomColor() -> String {
        let colors = [
            "#007AFF", // Blue
            "#34C759", // Green
            "#FF9500", // Orange
            "#FF2D55", // Red
            "#5856D6", // Purple
            "#FF3B30", // Red
            "#5AC8FA", // Light Blue
            "#FFCC00"  // Yellow
        ]
        return colors.randomElement() ?? "#007AFF"
    }
} 