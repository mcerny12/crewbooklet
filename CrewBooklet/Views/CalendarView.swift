import SwiftUI
import UniformTypeIdentifiers

struct ProjectCalendarView: View {
    @StateObject private var viewModel = CalendarViewModel()
    @State private var showingEventEditor = false
    @State private var showingNewCalendarSheet = false
    @State private var selectedEvent: CalendarEvent?
    @State private var draggedEvent: CalendarEvent?
    @State private var isDragging = false
    @State private var dragLocation: CGPoint?
    @State private var showingCalendarExport = false
    @State private var calendarToExport: ProjectCalendar?
    @State private var newEventDate: Date?
    @State private var showingNewEventSheet = false
    @State private var errorMessage: String?
    @State private var showingError = false
    
    private let calendar = Calendar.current
    private let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }()
    
    var body: some View {
        HSplitView {
            // Calendar Sidebar
            VStack(spacing: 0) {
                HStack {
                    Text("Calendars")
                        .font(.headline)
                    
                    Spacer()
                    
                    Button(action: { showingNewCalendarSheet = true }) {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.plain)
                }
                .padding()
                
                Divider()
                
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.projectCalendars.isEmpty {
                    ContentUnavailableView(
                        "No Calendars",
                        systemImage: "calendar.badge.plus",
                        description: Text("Add a calendar to get started")
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(viewModel.projectCalendars) { projectCalendar in
                                CalendarListItem(
                                    calendar: projectCalendar,
                                    isSelected: viewModel.selectedCalendars.contains(projectCalendar.id),
                                    onToggleVisibility: {
                                        Task {
                                            do {
                                                try await viewModel.toggleCalendarVisibility(projectCalendar.id)
                                            } catch {
                                                errorMessage = error.localizedDescription
                                                showingError = true
                                            }
                                        }
                                    },
                                    onToggleSelection: {
                                        if viewModel.selectedCalendars.contains(projectCalendar.id) {
                                            viewModel.selectedCalendars.remove(projectCalendar.id)
                                        } else {
                                            viewModel.selectedCalendars.insert(projectCalendar.id)
                                        }
                                    },
                                    onExport: {
                                        calendarToExport = projectCalendar
                                        showingCalendarExport = true
                                    }
                                )
                                .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .frame(minWidth: 250, maxWidth: 300)
            .background(.background)
            
            // Main Calendar Area
            VStack(spacing: 0) {
                // Toolbar
                HStack {
                    // Navigation
                    Button(action: { viewModel.selectedDate = Date() }) {
                        Text("Today")
                    }
                    .buttonStyle(.bordered)
                    
                    HStack(spacing: 4) {
                        Button(action: navigateToPrevious) {
                            Image(systemName: "chevron.left")
                        }
                        .buttonStyle(.bordered)
                        
                        Button(action: navigateToNext) {
                            Image(systemName: "chevron.right")
                        }
                        .buttonStyle(.bordered)
                    }
                    
                    // Month/Year display
                    Text(monthYearString)
                        .font(.headline)
                        .frame(minWidth: 150)
                    
                    Spacer()
                    
                    // New Event Button
                    Button(action: {
                        newEventDate = Date()
                        showingNewEventSheet = true
                    }) {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.bordered)
                    
                    // View mode selector
                    Picker("View", selection: $viewModel.viewMode) {
                        Text("Day").tag(CalendarViewModel.ViewMode.day)
                        Text("Week").tag(CalendarViewModel.ViewMode.week)
                        Text("Month").tag(CalendarViewModel.ViewMode.month)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 200)
                }
                .padding()
                
                Divider()
                
                // Calendar Content
                Group {
                    switch viewModel.viewMode {
                    case .day:
                        DayView(
                            date: viewModel.selectedDate,
                            events: eventsForDate(viewModel.selectedDate),
                            onEventTap: { event in
                                selectedEvent = event
                                showingEventEditor = true
                            },
                            onTimeSlotTap: { date in
                                newEventDate = date
                                showingNewEventSheet = true
                            }
                        )
                    case .week:
                        WeekView(
                            startDate: startOfWeek,
                            events: eventsForWeek,
                            onEventTap: { event in
                                selectedEvent = event
                                showingEventEditor = true
                            },
                            onTimeSlotTap: { date in
                                newEventDate = date
                                showingNewEventSheet = true
                            }
                        )
                    case .month:
                        MonthView(
                            selectedDate: $viewModel.selectedDate,
                            events: viewModel.projectCalendars
                                .filter { viewModel.selectedCalendars.contains($0.id) }
                                .flatMap { $0.events },
                            onEventTap: { event in
                                selectedEvent = event
                                showingEventEditor = true
                            },
                            onDayTap: { date in
                                newEventDate = date
                                showingNewEventSheet = true
                            }
                        )
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .sheet(isPresented: $showingEventEditor) {
            if let event = selectedEvent,
               let calendarId = viewModel.projectCalendars.first(where: { calendar in
                   calendar.events.contains(where: { $0.id == event.id })
               })?.id {
                EventEditorView(event: event, calendarId: calendarId)
            }
        }
        .sheet(isPresented: $showingNewEventSheet) {
            if let date = newEventDate {
                NewEventSheet(
                    date: date,
                    calendars: viewModel.projectCalendars,
                    onSave: { event, calendarId in
                        Task {
                            await createEvent(event, in: calendarId)
                        }
                    }
                )
            }
        }
        .sheet(isPresented: $showingNewCalendarSheet) {
            NewCalendarSheet(
                onSave: { name, projectId, color in
                    Task {
                        await createCalendar(name: name, projectId: projectId, color: color)
                    }
                }
            )
        }
        .sheet(isPresented: $showingCalendarExport) {
            if let calendar = calendarToExport {
                CalendarExportView(calendar: calendar, icsContent: viewModel.exportCalendarToICS(calendar))
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") {
                showingError = false
            }
        } message: {
            Text(errorMessage ?? "An unknown error occurred")
        }
    }
    
    // MARK: - Helper Methods
    private var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: viewModel.selectedDate)
    }
    
    private var startOfWeek: Date {
        let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: viewModel.selectedDate)
        return calendar.date(from: components) ?? viewModel.selectedDate
    }
    
    private var eventsForWeek: [CalendarEvent] {
        guard let weekInterval = calendar.dateInterval(of: .weekOfYear, for: viewModel.selectedDate) else { return [] }
        
        return viewModel.projectCalendars
            .filter { viewModel.selectedCalendars.contains($0.id) }
            .flatMap { $0.events }
            .filter { event in
                event.startDate >= weekInterval.start && event.startDate < weekInterval.end
            }
    }
    
    private func eventsForDate(_ date: Date) -> [CalendarEvent] {
        viewModel.projectCalendars
            .filter { viewModel.selectedCalendars.contains($0.id) }
            .flatMap { $0.events }
            .filter { calendar.isDate($0.startDate, inSameDayAs: date) }
    }
    
    private func navigateToPrevious() {
        switch viewModel.viewMode {
        case .day:
            viewModel.selectedDate = calendar.date(byAdding: .day, value: -1, to: viewModel.selectedDate) ?? viewModel.selectedDate
        case .week:
            viewModel.selectedDate = calendar.date(byAdding: .weekOfYear, value: -1, to: viewModel.selectedDate) ?? viewModel.selectedDate
        case .month:
            viewModel.selectedDate = calendar.date(byAdding: .month, value: -1, to: viewModel.selectedDate) ?? viewModel.selectedDate
        }
    }
    
    private func navigateToNext() {
        switch viewModel.viewMode {
        case .day:
            viewModel.selectedDate = calendar.date(byAdding: .day, value: 1, to: viewModel.selectedDate) ?? viewModel.selectedDate
        case .week:
            viewModel.selectedDate = calendar.date(byAdding: .weekOfYear, value: 1, to: viewModel.selectedDate) ?? viewModel.selectedDate
        case .month:
            viewModel.selectedDate = calendar.date(byAdding: .month, value: 1, to: viewModel.selectedDate) ?? viewModel.selectedDate
        }
    }
    
    @MainActor
    private func createEvent(_ event: CalendarEvent, in calendarId: UUID) async {
        do {
            try await viewModel.createEvent(
                in: calendarId,
                title: event.title,
                startDate: event.startDate,
                endDate: event.endDate,
                isAllDay: event.isAllDay
            )
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }
    }
    
    @MainActor
    private func createCalendar(name: String, projectId: UUID, color: String) async {
        do {
            try await viewModel.createCalendarForProject(Project(id: projectId, name: name))
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }
    }
}

// MARK: - Day View
struct DayView: View {
    let date: Date
    let events: [CalendarEvent]
    let onEventTap: (CalendarEvent) -> Void
    let onTimeSlotTap: (Date) -> Void
    
    private let calendar = Calendar.current
    private let hourHeight: CGFloat = 60
    private let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ForEach(0..<24) { hour in
                    HourSlot(
                        hour: hour,
                        date: date,
                        events: eventsForHour(hour),
                        onEventTap: onEventTap,
                        onTimeSlotTap: onTimeSlotTap
                    )
                    .frame(height: hourHeight)
                }
            }
        }
    }
    
    private func eventsForHour(_ hour: Int) -> [CalendarEvent] {
        events.filter { event in
            let eventHour = calendar.component(.hour, from: event.startDate)
            return eventHour == hour
        }
    }
}

struct HourSlot: View {
    let hour: Int
    let date: Date
    let events: [CalendarEvent]
    let onEventTap: (CalendarEvent) -> Void
    let onTimeSlotTap: (Date) -> Void
    
    private let calendar = Calendar.current
    
    var body: some View {
        HStack(spacing: 0) {
            // Time label
            Text(String(format: "%02d:00", hour))
                .font(.caption)
                .frame(width: 50)
                .foregroundStyle(.secondary)
            
            // Events area
            ZStack(alignment: .topLeading) {
                Rectangle()
                    .fill(Color.gray.opacity(0.1))
                    .onTapGesture {
                        if let slotDate = calendar.date(
                            bySettingHour: hour,
                            minute: 0,
                            second: 0,
                            of: date
                        ) {
                            onTimeSlotTap(slotDate)
                        }
                    }
                
                ForEach(events) { event in
                    CalendarEventView(event: event)
                        .onTapGesture {
                            onEventTap(event)
                        }
                }
            }
        }
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundStyle(.gray.opacity(0.2)),
            alignment: .top
        )
    }
}

// MARK: - Week View
struct WeekView: View {
    let startDate: Date
    let events: [CalendarEvent]
    let onEventTap: (CalendarEvent) -> Void
    let onTimeSlotTap: (Date) -> Void
    
    private let calendar = Calendar.current
    private let hourHeight: CGFloat = 60
    
    var body: some View {
        ScrollView {
            HStack(spacing: 0) {
                // Time column
                VStack(spacing: 0) {
                    Text("") // Empty header
                        .frame(height: 30)
                    
                    ForEach(0..<24) { hour in
                        Text(String(format: "%02d:00", hour))
                            .font(.caption)
                            .frame(width: 50, height: hourHeight)
                            .foregroundStyle(.secondary)
                    }
                }
                
                // Days columns
                HStack(spacing: 0) {
                    ForEach(0..<7) { dayOffset in
                        if let date = calendar.date(byAdding: .day, value: dayOffset, to: startDate) {
                            DayColumn(
                                date: date,
                                events: eventsForDate(date),
                                onEventTap: onEventTap,
                                onTimeSlotTap: onTimeSlotTap
                            )
                        }
                    }
                }
            }
        }
    }
    
    private func eventsForDate(_ date: Date) -> [CalendarEvent] {
        events.filter { event in
            calendar.isDate(event.startDate, inSameDayAs: date)
        }
    }
}

struct DayColumn: View {
    let date: Date
    let events: [CalendarEvent]
    let onEventTap: (CalendarEvent) -> Void
    let onTimeSlotTap: (Date) -> Void
    
    private let calendar = Calendar.current
    private let hourHeight: CGFloat = 60
    
    var body: some View {
        VStack(spacing: 0) {
            // Day header
            Text(dayHeaderText)
                .font(.caption)
                .frame(height: 30)
                .padding(.horizontal, 4)
                .background(isToday ? Color.blue.opacity(0.1) : Color.clear)
            
            // Hours
            ForEach(0..<24) { hour in
                ZStack(alignment: .topLeading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.1))
                        .onTapGesture {
                            if let slotDate = calendar.date(
                                bySettingHour: hour,
                                minute: 0,
                                second: 0,
                                of: date
                            ) {
                                onTimeSlotTap(slotDate)
                            }
                        }
                    
                    ForEach(eventsForHour(hour)) { event in
                        CalendarEventView(event: event)
                            .onTapGesture {
                                onEventTap(event)
                            }
                    }
                }
                .frame(height: hourHeight)
                .overlay(
                    Rectangle()
                        .frame(height: 1)
                        .foregroundStyle(.gray.opacity(0.2)),
                    alignment: .top
                )
            }
        }
    }
    
    private var dayHeaderText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE d"
        return formatter.string(from: date)
    }
    
    private var isToday: Bool {
        calendar.isDateInToday(date)
    }
    
    private func eventsForHour(_ hour: Int) -> [CalendarEvent] {
        events.filter { event in
            let eventHour = calendar.component(.hour, from: event.startDate)
            return eventHour == hour
        }
    }
}

// MARK: - Month View
struct MonthView: View {
    @Binding var selectedDate: Date
    let events: [CalendarEvent]
    let onEventTap: (CalendarEvent) -> Void
    let onDayTap: (Date) -> Void
    
    private let calendar = Calendar.current
    
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 0) {
                    // Weekday headers
                    HStack(spacing: 0) {
                        ForEach(calendar.shortWeekdaySymbols, id: \.self) { weekday in
                            Text(weekday)
                                .font(.caption)
                                .frame(width: geometry.size.width / 7)
                                .padding(.vertical, 8)
                        }
                    }
                    
                    Divider()
                    
                    // Calendar days grid
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 0) {
                        ForEach(daysInMonth, id: \.self) { date in
                            CalendarDayCell(
                                date: date,
                                events: eventsForDate(date),
                                isSelected: calendar.isDate(date, inSameDayAs: selectedDate),
                                onEventTap: onEventTap
                            )
                            .frame(height: 120)
                            .onTapGesture {
                                selectedDate = date
                                onDayTap(date)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private var daysInMonth: [Date] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: selectedDate) else { return [] }
        
        let days = calendar.generateDates(
            inside: monthInterval,
            matching: DateComponents(hour: 0, minute: 0, second: 0)
        )
        
        return days
    }
    
    private func eventsForDate(_ date: Date) -> [CalendarEvent] {
        events.filter { calendar.isDate($0.startDate, inSameDayAs: date) }
    }
}

// MARK: - New Event Sheet
struct NewEventSheet: View {
    let date: Date
    let calendars: [ProjectCalendar]
    let onSave: (CalendarEvent, UUID) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var isAllDay = false
    @State private var selectedCalendarId: UUID?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    
    init(date: Date, calendars: [ProjectCalendar], onSave: @escaping (CalendarEvent, UUID) -> Void) {
        self.date = date
        self.calendars = calendars
        self.onSave = onSave
        _startDate = State(initialValue: date)
        _endDate = State(initialValue: Calendar.current.date(byAdding: .hour, value: 1, to: date) ?? date)
        _selectedCalendarId = State(initialValue: calendars.first?.id)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    TextField("Event Title", text: $title)
                    
                    Picker("Calendar", selection: $selectedCalendarId) {
                        ForEach(calendars) { calendar in
                            Text(calendar.name)
                                .tag(calendar.id as UUID?)
                        }
                    }
                    
                    Toggle("All-day", isOn: $isAllDay)
                    
                    if !isAllDay {
                        DatePicker("Start", selection: $startDate)
                        DatePicker("End", selection: $endDate)
                    } else {
                        DatePicker("Start", selection: $startDate, displayedComponents: .date)
                        DatePicker("End", selection: $endDate, displayedComponents: .date)
                    }
                }
            }
            .navigationTitle("New Event")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    if isLoading {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Button("Add") {
                            if let calendarId = selectedCalendarId {
                                let event = CalendarEvent(
                                    title: title,
                                    startDate: startDate,
                                    endDate: endDate,
                                    isAllDay: isAllDay
                                )
                                onSave(event, calendarId)
                                dismiss()
                            }
                        }
                        .disabled(title.isEmpty || selectedCalendarId == nil)
                    }
                }
            }
        }
        .frame(width: 400, height: 400)
        .alert("Error", isPresented: $showingError) {
            Button("OK") {
                showingError = false
            }
        } message: {
            Text(errorMessage ?? "An unknown error occurred")
        }
    }
}

// MARK: - New Calendar Sheet
struct NewCalendarSheet: View {
    let onSave: (String, UUID, String) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var selectedColor = "#007AFF"
    @StateObject private var projectViewModel = ProjectViewModel()
    @State private var selectedProjectId: UUID?
    @State private var errorMessage: String?
    @State private var showingError = false
    
    private let colors = [
        "#007AFF", // Blue
        "#34C759", // Green
        "#FF9500", // Orange
        "#FF2D55", // Red
        "#5856D6", // Purple
        "#FF3B30", // Red
        "#5AC8FA", // Light Blue
        "#FFCC00"  // Yellow
    ]
    
    var body: some View {
        NavigationView {
            Form {
                Section("Calendar Details") {
                    TextField("Calendar Name", text: $name)
                        .textFieldStyle(.roundedBorder)
                        .font(.body)
                    
                    if projectViewModel.isLoading {
                        ProgressView("Loading projects...")
                            .controlSize(.small)
                    } else {
                        Picker("Project", selection: $selectedProjectId) {
                            Text("Select a project").tag(nil as UUID?)
                            ForEach(projectViewModel.projects) { project in
                                Text(project.name)
                                    .tag(project.id as UUID?)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }
                .listRowBackground(Color.clear)
                
                Section("Calendar Color") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
                        ForEach(colors, id: \.self) { color in
                            Button(action: { selectedColor = color }) {
                                Circle()
                                    .fill(Color(hex: color))
                                    .frame(width: 36, height: 36)
                                    .overlay(
                                        Circle()
                                            .strokeBorder(color == selectedColor ? Color.blue : Color.clear, lineWidth: 3)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.clear)
            }
            .scrollContentBackground(.hidden)
            .background(Color(.windowBackgroundColor))
            .navigationTitle("New Calendar")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .keyboardShortcut(.escape, modifiers: [])
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    if projectViewModel.isLoading {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Button("Add") {
                            if let projectId = selectedProjectId {
                                onSave(name, projectId, selectedColor)
                                dismiss()
                            }
                        }
                        .keyboardShortcut(.return, modifiers: .command)
                        .disabled(name.isEmpty || selectedProjectId == nil)
                    }
                }
            }
            .disabled(projectViewModel.isLoading)
        }
        .frame(width: 400, height: 300)
        .task {
            await projectViewModel.loadProjects()
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") {
                showingError = false
            }
        } message: {
            Text(errorMessage ?? "An unknown error occurred")
        }
    }
}

// MARK: - Calendar Components
struct CalendarListItem: View {
    let calendar: ProjectCalendar
    let isSelected: Bool
    let onToggleVisibility: () -> Void
    let onToggleSelection: () -> Void
    let onExport: () -> Void
    @State private var showingError = false
    @State private var errorMessage: String?
    @StateObject private var viewModel = CalendarViewModel()
    
    var body: some View {
        HStack {
            Button(action: onToggleVisibility) {
                Image(systemName: calendar.isVisible ? "eye.fill" : "eye.slash.fill")
                    .foregroundStyle(calendar.isVisible ? .primary : .secondary)
            }
            .buttonStyle(.plain)
            
            Button(action: onToggleSelection) {
                HStack {
                    Circle()
                        .fill(Color(hex: calendar.color))
                        .frame(width: 12, height: 12)
                    
                    Text(calendar.name)
                        .lineLimit(1)
                }
            }
            .buttonStyle(.plain)
            
            Spacer()
            
            Menu {
                Button("Share...", action: onExport)
                Button(calendar.isShared ? "Stop Sharing" : "Share Calendar") {
                    Task {
                        do {
                            try await viewModel.toggleCalendarSharing(calendar.id)
                        } catch {
                            errorMessage = error.localizedDescription
                            showingError = true
                        }
                    }
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
        .alert("Error", isPresented: $showingError) {
            Button("OK") {
                showingError = false
            }
        } message: {
            Text(errorMessage ?? "An unknown error occurred")
        }
    }
}

struct CalendarDayCell: View {
    let date: Date
    let events: [CalendarEvent]
    let isSelected: Bool
    let onEventTap: (CalendarEvent) -> Void
    
    private let calendar = Calendar.current
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Day number
            Text("\(calendar.component(.day, from: date))")
                .font(.caption)
                .foregroundStyle(isSelected ? .blue : .primary)
                .padding(6)
            
            // Events
            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(events) { event in
                        CalendarEventView(event: event)
                            .onTapGesture {
                                onEventTap(event)
                            }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(isSelected ? Color.blue.opacity(0.1) : Color.clear)
        .overlay(
            Rectangle()
                .stroke(Color.gray.opacity(0.2), lineWidth: 0.5)
        )
    }
}

struct CalendarEventView: View {
    let event: CalendarEvent
    
    private let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter
    }()
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if !event.isAllDay {
                Text(timeFormatter.string(from: event.startDate))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            
            Text(event.title)
                .font(.caption)
                .lineLimit(1)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(4)
    }
}

struct CalendarDropDelegate: DropDelegate {
    let date: Date
    let viewModel: CalendarViewModel
    @Binding var draggedEvent: CalendarEvent?
    @Binding var isDragging: Bool
    
    func performDrop(info: DropInfo) -> Bool {
        guard let draggedEvent = draggedEvent else { return false }
        
        // Calculate the time difference and update the event
        let calendar = Calendar.current
        let difference = calendar.dateComponents([.day], from: draggedEvent.startDate, to: date)
        
        if let days = difference.day {
            var updatedEvent = draggedEvent
            updatedEvent.startDate = calendar.date(byAdding: .day, value: days, to: draggedEvent.startDate) ?? draggedEvent.startDate
            updatedEvent.endDate = calendar.date(byAdding: .day, value: days, to: draggedEvent.endDate) ?? draggedEvent.endDate
            
            // Find the calendar containing this event and update it
            if let calendarId = viewModel.projectCalendars.first(where: { $0.events.contains(where: { $0.id == draggedEvent.id }) })?.id {
                Task {
                    do {
                        try await viewModel.updateEvent(updatedEvent, in: calendarId)
                    } catch {
                        print("Error updating event: \(error)")
                    }
                }
            }
        }
        
        self.draggedEvent = nil
        isDragging = false
        return true
    }
}

// MARK: - Calendar Export View
struct CalendarExportView: View {
    let calendar: ProjectCalendar
    let icsContent: String
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Export Calendar")
                .font(.title)
            
            Text("Share \(calendar.name) with others")
                .foregroundStyle(.secondary)
            
            HStack {
                Button("Save as .ics") {
                    saveToFile()
                }
                .buttonStyle(.bordered)
                
                Button("Copy to Clipboard") {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(icsContent, forType: .string)
                }
                .buttonStyle(.bordered)
            }
            
            Button("Done") {
                dismiss()
            }
            .keyboardShortcut(.escape, modifiers: [])
        }
        .padding()
        .frame(width: 400, height: 200)
    }
    
    private func saveToFile() {
        let savePanel = NSSavePanel()
        savePanel.allowedContentTypes = [.ics]
        savePanel.nameFieldStringValue = "\(calendar.name).ics"
        
        savePanel.begin { response in
            if response == .OK, let url = savePanel.url {
                do {
                    try icsContent.write(to: url, atomically: true, encoding: .utf8)
                } catch {
                    print("Error saving file: \(error)")
                }
            }
        }
    }
}

// MARK: - Calendar Extensions
extension Calendar {
    func generateDates(
        inside interval: DateInterval,
        matching components: DateComponents
    ) -> [Date] {
        var dates: [Date] = []
        dates.append(interval.start)
        
        enumerateDates(
            startingAfter: interval.start,
            matching: components,
            matchingPolicy: .nextTime
        ) { date, _, stop in
            if let date = date {
                if date < interval.end {
                    dates.append(date)
                } else {
                    stop = true
                }
            }
        }
        
        return dates
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

extension UTType {
    static let ics = UTType(filenameExtension: "ics")!
} 