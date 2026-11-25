import ExpoModulesCore
import MapKit

/// Apple Maps for the saved places (K-1227, ADR-093): an address typed by the user to a name and a point, and the walking distance
/// between two points. Neither reads where the phone is (no CLLocationManager, no location permission); the text typed and the two
/// points are sent to Apple's map service, which the app says next to the search box. Compiled by the EAS build only.
public class PlacesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Places")

    // Up to a handful of matches for an address or a name; empty when Apple finds none; throws to JS when the search fails.
    AsyncFunction("search") { (text: String) async throws -> [[String: Any]] in
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = text
      let response = try await MKLocalSearch(request: request).start()
      return response.mapItems.prefix(5).map { item in
        [
          "name": item.name ?? "",
          "address": item.placemark.title ?? "",
          "lat": item.placemark.coordinate.latitude,
          "lng": item.placemark.coordinate.longitude,
        ]
      }
    }

    // The walking route's length in metres; null when Apple has no walking route between the two points; throws when the
    // request fails (offline, say), and the caller then falls back to the straight line.
    AsyncFunction("walkingDistance") { (fromLat: Double, fromLng: Double, toLat: Double, toLng: Double) async throws -> Double? in
      let request = MKDirections.Request()
      request.source = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: fromLat, longitude: fromLng)))
      request.destination = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: toLat, longitude: toLng)))
      request.transportType = .walking
      request.requestsAlternateRoutes = false
      let response = try await MKDirections(request: request).calculate()
      return response.routes.first?.distance
    }
  }
}
