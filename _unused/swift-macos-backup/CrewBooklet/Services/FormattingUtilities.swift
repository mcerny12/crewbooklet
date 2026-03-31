//
//  FormattingUtilities.swift
//  CrewBooklet
//
//  Utilities for formatting phone numbers, websites, and handling zip code lookups
//

import Foundation

// MARK: - Phone Number Formatting Utilities
struct PhoneNumberFormatter {
    
    /// Formats a phone number to the standard format: +49 1 234 567 890
    /// - Parameter input: Raw phone number input
    /// - Returns: Formatted phone number string
    static func formatPhoneNumber(_ input: String) -> String {
        let cleaned = cleanPhoneNumber(input)
        
        // If empty, return empty
        if cleaned.isEmpty {
            return ""
        }
        
        // Extract country code and number
        let (countryCode, nationalNumber) = extractCountryCodeAndNumber(cleaned)
        
        // Format the national number with spaces every 3 digits
        let formattedNational = formatNationalNumber(nationalNumber)
        
        return "+\(countryCode) \(formattedNational)"
    }
    
    /// Cleans phone number input by removing all non-digit characters except +
    private static func cleanPhoneNumber(_ input: String) -> String {
        return input.replacingOccurrences(of: "[^0-9+]", with: "", options: .regularExpression)
    }
    
    /// Extracts country code and national number from cleaned input
    private static func extractCountryCodeAndNumber(_ cleaned: String) -> (countryCode: String, nationalNumber: String) {
        var workingString = cleaned
        
        // Handle different input formats
        if workingString.hasPrefix("+") {
            workingString = String(workingString.dropFirst()) // Remove +
        } else if workingString.hasPrefix("00") {
            workingString = String(workingString.dropFirst(2)) // Remove 00
        }
        
        // If no country code provided, default to 00
        if workingString.isEmpty {
            return ("00", "")
        }
        
        // Try to identify country code
        let countryCode = identifyCountryCode(workingString)
        let nationalNumber = String(workingString.dropFirst(countryCode.count))
        
        return (countryCode, nationalNumber)
    }
    
    /// Identifies country code from the beginning of the number
    private static func identifyCountryCode(_ number: String) -> String {
        // Common country codes (prioritize longer codes first)
        let countryCodes = [
            "49": "Germany",
            "43": "Austria", 
            "41": "Switzerland",
            "1": "USA/Canada",
            "44": "UK",
            "33": "France",
            "39": "Italy",
            "34": "Spain",
            "31": "Netherlands",
            "32": "Belgium",
            "46": "Sweden",
            "47": "Norway",
            "45": "Denmark",
            "48": "Poland",
            "420": "Czech Republic",
            "36": "Hungary",
            "61": "Australia",
            "64": "New Zealand",
            "81": "Japan",
            "82": "South Korea",
            "65": "Singapore",
            "852": "Hong Kong",
            "971": "UAE",
            "27": "South Africa",
            "212": "Morocco",
            "90": "Turkey",
            "30": "Greece",
            "351": "Portugal",
            "353": "Ireland",
            "385": "Croatia",
            "386": "Slovenia",
            "40": "Romania",
            "359": "Bulgaria"
        ]
        
        // Check for 3-digit codes first, then 2-digit, then 1-digit
        for length in [3, 2, 1] {
            if number.count >= length {
                let prefix = String(number.prefix(length))
                if countryCodes[prefix] != nil {
                    return prefix
                }
            }
        }
        
        // Default to 00 if no country code found
        return "00"
    }
    
    /// Formats national number with spaces every 3 digits
    private static func formatNationalNumber(_ number: String) -> String {
        if number.isEmpty {
            return ""
        }
        
        // Group digits by 3 from left to right
        var formatted = ""
        var digitCount = 0
        
        for char in number {
            if digitCount > 0 && digitCount % 3 == 0 {
                formatted += " "
            }
            formatted += String(char)
            digitCount += 1
        }
        
        return formatted
    }
}

// MARK: - Website Formatting Utilities
struct WebsiteFormatter {
    
    /// Formats website URL to standard format: website.com
    /// - Parameter input: Raw website input
    /// - Returns: Formatted website string
    static func formatWebsite(_ input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if trimmed.isEmpty {
            return ""
        }
        
        var formatted = trimmed.lowercased()
        
        // Remove common prefixes
        let prefixes = ["https://", "http://", "www."]
        for prefix in prefixes {
            if formatted.hasPrefix(prefix) {
                formatted = String(formatted.dropFirst(prefix.count))
                break
            }
        }
        
        // Remove trailing slashes and paths
        if let slashIndex = formatted.firstIndex(of: "/") {
            formatted = String(formatted[..<slashIndex])
        }
        
        // Remove backslashes (common mistake)
        formatted = formatted.replacingOccurrences(of: "\\", with: "")
        
        return formatted
    }
}

// MARK: - Zip Code Lookup Utilities
struct ZipCodeLookup {
    
    /// Looks up city and country for a given zip code
    /// - Parameter zipCode: The zip code to lookup
    /// - Returns: Tuple with city and country, or nil if not found
    static func lookupCityAndCountry(for zipCode: String) -> (city: String, country: String)? {
        let cleaned = zipCode.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Check if it's all digits first
        guard cleaned.allSatisfy({ $0.isNumber }) else {
            // UK postcodes (various formats with letters)
            if cleaned.count >= 5 && cleaned.count <= 8 {
                return lookupUKPostcode(cleaned)
            }
            return nil
        }
        
        // For numeric codes, check by specific patterns and ranges
        if cleaned.count == 5 {
            // Could be German or US - check ranges to determine
            if let firstTwo = Int(String(cleaned.prefix(2))) {
                // German zip codes: 01000-99999
                // US zip codes: 00501-99950
                // Use geographic patterns to distinguish
                if firstTwo >= 1 && firstTwo <= 99 {
                    // Try German first for European ranges
                    if let result = lookupGermanZipCode(cleaned) {
                        return result
                    }
                    // Fall back to US if not found in German database
                    return lookupUSZipCode(cleaned)
                }
            }
            return lookupGermanZipCode(cleaned) // Default to German for 5-digit codes
        }
        
        if cleaned.count == 4 {
            // Could be Austrian or Swiss - check ranges
            // Austrian zip codes: 1000-9999
            // Swiss zip codes: 1000-9999
            // Try both and return the first match
            if let result = lookupAustrianZipCode(cleaned) {
                return result
            }
            return lookupSwissZipCode(cleaned)
        }
        
        return nil
    }
    
    // MARK: - Country-specific lookup functions
    
    private static func lookupGermanZipCode(_ zipCode: String) -> (city: String, country: String)? {
        // Sample German zip codes - in a real app, this would be a comprehensive database
        let germanZipCodes: [String: String] = [
            // Berlin
            "10115": "Berlin",
            "10117": "Berlin",
            "10119": "Berlin",
            "10178": "Berlin",
            "10179": "Berlin",
            
            // Hamburg
            "20095": "Hamburg",
            "20099": "Hamburg",
            "20354": "Hamburg",
            "22087": "Hamburg",
            
            // Munich
            "80331": "Munich",
            "80333": "Munich",
            "80335": "Munich",
            "80337": "Munich",  // The specific zip code you mentioned
            "80339": "Munich",
            "80469": "Munich",
            "81675": "Munich",
            "81679": "Munich",
            
            // Cologne
            "50667": "Cologne",
            "50668": "Cologne",
            "50670": "Cologne",
            "50672": "Cologne",
            
            // Frankfurt am Main
            "60311": "Frankfurt am Main",
            "60313": "Frankfurt am Main",
            "60314": "Frankfurt am Main",
            "60316": "Frankfurt am Main",
            
            // Stuttgart
            "70173": "Stuttgart",
            "70174": "Stuttgart",
            "70176": "Stuttgart",
            "70178": "Stuttgart",
            
            // Düsseldorf
            "40213": "Düsseldorf",
            "40215": "Düsseldorf",
            "40217": "Düsseldorf",
            "40219": "Düsseldorf",
            
            // Other major cities
            "44135": "Dortmund",
            "45127": "Essen",
            "28195": "Bremen",
            "30159": "Hannover",
            "04109": "Leipzig",
            "01067": "Dresden",
            "90403": "Nuremberg",
            "68159": "Mannheim"
        ]
        
        if let city = germanZipCodes[zipCode] {
            return (city: city, country: "Germany")
        }

        // Fallback for unknown German zip codes
        return (city: "", country: "Germany")
    }
    
    private static func lookupAustrianZipCode(_ zipCode: String) -> (city: String, country: String)? {
        let austrianZipCodes: [String: String] = [
            "1010": "Vienna",
            "4020": "Linz",
            "5020": "Salzburg",
            "6020": "Innsbruck",
            "8010": "Graz",
            "9020": "Klagenfurt"
        ]
        
        if let city = austrianZipCodes[zipCode] {
            return (city: city, country: "Austria")
        }

        return (city: "", country: "Austria")
    }
    
    private static func lookupSwissZipCode(_ zipCode: String) -> (city: String, country: String)? {
        let swissZipCodes: [String: String] = [
            "8001": "Zurich",
            "3001": "Bern",
            "4001": "Basel",
            "1201": "Geneva",
            "1003": "Lausanne",
            "6900": "Lugano"
        ]
        
        if let city = swissZipCodes[zipCode] {
            return (city: city, country: "Switzerland")
        }

        return (city: "", country: "Switzerland")
    }
    
    private static func lookupUSZipCode(_ zipCode: String) -> (city: String, country: String)? {
        let usZipCodes: [String: String] = [
            "10001": "New York",
            "90210": "Beverly Hills",
            "60601": "Chicago",
            "33101": "Miami",
            "94102": "San Francisco",
            "02101": "Boston",
            "20001": "Washington"
        ]
        
        if let city = usZipCodes[zipCode] {
            return (city: city, country: "USA")
        }
        
        return (city: "", country: "USA")
    }
    
    private static func lookupUKPostcode(_ postcode: String) -> (city: String, country: String)? {
        let ukPostcodes: [String: String] = [
            "SW1A 1AA": "London",
            "M1 1AA": "Manchester",
            "B1 1AA": "Birmingham",
            "LS1 1AA": "Leeds",
            "G1 1AA": "Glasgow",
            "EH1 1AA": "Edinburgh"
        ]
        
        if let city = ukPostcodes[postcode.uppercased()] {
            return (city: city, country: "United Kingdom")
        }
        
        return (city: "", country: "United Kingdom")
    }
}
