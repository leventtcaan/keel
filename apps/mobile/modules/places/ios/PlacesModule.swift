import ExpoModulesCore
import MapKit

/// Apple Maps for the saved places (K-1227, ADR-093): an address typed by the user to a name and a point, and the walking route
/// (its distance and its line) between two points. Neither reads where the phone is (no CLLocationManager, no location permission); the text typed and the two
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

    // The walking route: its length in metres and the points of its line on the streets ([lat, lng] pairs, start to end); null when
    // Apple has no walking route between the two points; throws when the request fails (offline, say), and the caller then falls
    // back to the straight line.
    AsyncFunction("walkingRoute") { (fromLat: Double, fromLng: Double, toLat: Double, toLng: Double) async throws -> [String: Any]? in
      let request = MKDirections.Request()
      request.source = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: fromLat, longitude: fromLng)))
      request.destination = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: toLat, longitude: toLng)))
      request.transportType = .walking
      request.requestsAlternateRoutes = false
      let response = try await MKDirections(request: request).calculate()
      guard let route = response.routes.first else { return nil }
      let line = route.polyline
      var coordinates = [CLLocationCoordinate2D](repeating: kCLLocationCoordinate2DInvalid, count: line.pointCount)
      line.getCoordinates(&coordinates, range: NSRange(location: 0, length: line.pointCount))
      return [
        "metres": route.distance,
        "points": coordinates.map { [$0.latitude, $0.longitude] },
      ]
    }
  }
}
