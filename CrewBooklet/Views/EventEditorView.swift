import SwiftUI

struct EventEditorView: View {
    @Environment(\.dismiss) private var dismiss
    let event: CalendarEvent
    let calendarId: UUID
    @StateObject private var viewModel = CalendarViewModel()
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingError = false
    
    @State private var title: String
    @State private var startDate: Date
    @State private var endDate: Date
    @State private var isAllDay: Bool
    @State private var location: String
    @State private var notes: String
    @State private var attendees: String
    @State private var status: EventStatus
    @State private var showingRecurrenceEditor = false
    @State private var recurrence: RecurrenceRule?
    
    init(event: CalendarEvent, calendarId: UUID) {
        self.event = event
        self.calendarId = calendarId
        
        // Initialize state with event values
        _title = State(initialValue: event.title)
        _startDate = State(initialValue: event.startDate)
        _endDate = State(initialValue: event.endDate)
        _isAllDay = State(initialValue: event.isAllDay)
        _location = State(initialValue: event.location ?? "")
        _notes = State(initialValue: event.notes ?? "")
        _attendees = State(initialValue: event.attendees?.joined(separator: ", ") ?? "")
        _status = State(initialValue: event.status)
        _recurrence = State(initialValue: event.recurrence)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .keyboardShortcut(.escape, modifiers: [])
                
                Spacer()
                
                if isSaving {
                    ProgressView()
                        .controlSize(.small)
                } else {
                    Button("Save") {
                        Task {
                            isSaving = true
                            do {
                                try await viewModel.updateEvent(updatedEvent(), in: calendarId)
                                dismiss()
                            } catch {
                                errorMessage = error.localizedDescription
                                showingError = true
                            }
                            isSaving = false
                        }
                    }
                    .keyboardShortcut(.return, modifiers: .command)
                }
            }
            .padding()
            
            Divider()
            
            // Event details form
            Form {
                Section {
                    TextField("Event Title", text: $title)
                    
                    Toggle("All-day", isOn: $isAllDay)
                    
                    if !isAllDay {
                        DatePicker("Starts", selection: $startDate)
                        DatePicker("Ends", selection: $endDate)
                    } else {
                        DatePicker("Starts", selection: $startDate, displayedComponents: .date)
                        DatePicker("Ends", selection: $endDate, displayedComponents: .date)
                    }
                }
                
                Section {
                    TextField("Location", text: $location)
                    
                    TextField("Attendees (comma-separated emails)", text: $attendees)
                    
                    Picker("Status", selection: $status) {
                        Text("Tentative").tag(EventStatus.tentative)
                        Text("Confirmed").tag(EventStatus.confirmed)
                        Text("Cancelled").tag(EventStatus.cancelled)
                    }
                }
                
                Section {
                    Button(recurrence == nil ? "Add Recurrence..." : "Edit Recurrence...") {
                        showingRecurrenceEditor = true
                    }
                    
                    if let recurrence = recurrence {
                        HStack {
                            Text("Repeats \(recurrence.frequency.rawValue)")
                            
                            Spacer()
                            
                            Button("Remove") {
                                self.recurrence = nil
                            }
                            .foregroundStyle(.red)
                        }
                    }
                }
                
                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(height: 100)
                }
            }
            .formStyle(.grouped)
            .padding()
            .disabled(isSaving)
        }
        .frame(width: 500, height: 600)
        .sheet(isPresented: $showingRecurrenceEditor) {
            RecurrenceEditorView(recurrence: $recurrence)
        }
        .alert("Error Saving Event", isPresented: $showingError) {
            Button("OK") {
                showingError = false
            }
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
    }
    
    private func updatedEvent() -> CalendarEvent {
        var updatedEvent = event
        updatedEvent.title = title
        updatedEvent.startDate = startDate
        updatedEvent.endDate = endDate
        updatedEvent.isAllDay = isAllDay
        updatedEvent.location = location.isEmpty ? nil : location
        updatedEvent.notes = notes.isEmpty ? nil : notes
        updatedEvent.attendees = attendees.isEmpty ? nil : attendees.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        updatedEvent.status = status
        updatedEvent.recurrence = recurrence
        updatedEvent.lastModified = Date()
        return updatedEvent
    }
}

struct RecurrenceEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var recurrence: RecurrenceRule?
    
    @State private var frequency: RecurrenceRule.Frequency = .daily
    @State private var interval: Int = 1
    @State private var hasEndDate = false
    @State private var endDate = Date()
    @State private var occurrences: Int = 1
    @State private var selectedDays: Set<Int> = []
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .keyboardShortcut(.escape, modifiers: [])
                
                Spacer()
                
                Button("Done") {
                    saveRecurrence()
                }
                .keyboardShortcut(.return, modifiers: .command)
            }
            .padding()
            
            Divider()
            
            // Recurrence options
            Form {
                Section {
                    Picker("Frequency", selection: $frequency) {
                        Text("Daily").tag(RecurrenceRule.Frequency.daily)
                        Text("Weekly").tag(RecurrenceRule.Frequency.weekly)
                        Text("Monthly").tag(RecurrenceRule.Frequency.monthly)
                        Text("Yearly").tag(RecurrenceRule.Frequency.yearly)
                    }
                    
                    Stepper("Every \(interval) \(frequency.rawValue)\(interval > 1 ? "s" : "")", value: $interval, in: 1...99)
                }
                
                if frequency == .weekly {
                    Section("Repeat On") {
                        ForEach(1...7, id: \.self) { day in
                            Toggle(Calendar.current.weekdaySymbols[day - 1], isOn: Binding(
                                get: { selectedDays.contains(day) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedDays.insert(day)
                                    } else {
                                        selectedDays.remove(day)
                                    }
                                }
                            ))
                        }
                    }
                }
                
                Section("Ends") {
                    Picker("End Type", selection: $hasEndDate) {
                        Text("After \(occurrences) occurrence\(occurrences > 1 ? "s" : "")").tag(false)
                        Text("On date").tag(true)
                    }
                    
                    if hasEndDate {
                        DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                    } else {
                        Stepper("Occurrences: \(occurrences)", value: $occurrences, in: 1...999)
                    }
                }
            }
            .formStyle(.grouped)
            .padding()
        }
        .frame(width: 400, height: 500)
        .onAppear {
            if let existing = recurrence {
                frequency = existing.frequency
                interval = existing.interval
                hasEndDate = existing.endDate != nil
                endDate = existing.endDate ?? Date()
                occurrences = existing.occurrences ?? 1
                selectedDays = existing.daysOfWeek ?? []
            }
        }
    }
    
    private func saveRecurrence() {
        recurrence = RecurrenceRule(
            frequency: frequency,
            interval: interval,
            endDate: hasEndDate ? endDate : nil,
            occurrences: hasEndDate ? nil : occurrences,
            daysOfWeek: frequency == .weekly ? selectedDays : nil
        )
        dismiss()
    }
} 