package app.keel.nutrition;

import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Which region's foods a user sees first (K-1061, ADR-090 #1): from the request's {@code Accept-Language} (iOS sends the
 * device's languages: "en-US", "tr-TR"), else from the time zone of the profile. A preference for ranking only — a region
 * the database has no foods for (or none known) is no preference, and every food stays findable.
 */
final class FoodRegion {

    /** The regions the database has foods for (nutrition.food.region). */
    static final Set<String> KNOWN = Set.of("US", "TR");

    // A language alone points to the region whose foods it is most likely about.
    private static final Map<String, String> LANGUAGE_REGION = Map.of("en", "US", "tr", "TR");

    private FoodRegion() {
    }

    static Optional<String> of(String acceptLanguage, Optional<ZoneId> zone) {
        Optional<String> byLanguage = fromLanguages(acceptLanguage);
        return byLanguage.isPresent() ? byLanguage : zone.flatMap(FoodRegion::fromZone);
    }

    /** The first language of the header, by weight, that points to a known region ("en-GB, en;q=0.8" → US through "en"). */
    static Optional<String> fromLanguages(String header) {
        if (header == null || header.isBlank()) {
            return Optional.empty();
        }
        List<Locale.LanguageRange> ranges;
        try {
            ranges = Locale.LanguageRange.parse(header.strip());
        } catch (IllegalArgumentException malformed) {
            return Optional.empty();
        }
        return ranges.stream().sorted(Comparator.comparingDouble(Locale.LanguageRange::getWeight).reversed())
                .map(range -> region(Locale.forLanguageTag(range.getRange()))).flatMap(Optional::stream).findFirst();
    }

    private static Optional<String> region(Locale locale) {
        String country = locale.getCountry();
        if (KNOWN.contains(country)) {
            return Optional.of(country);
        }
        return country.isEmpty() ? Optional.ofNullable(LANGUAGE_REGION.get(locale.getLanguage())) : Optional.empty();
    }

    private static Optional<String> fromZone(ZoneId zone) {
        String id = zone.getId();
        if (id.equals("Europe/Istanbul") || id.equals("Asia/Istanbul") || id.equals("Turkey")) {
            return Optional.of("TR");
        }
        if (id.startsWith("America/") || id.startsWith("US/") || id.equals("Pacific/Honolulu")) {
            return Optional.of("US");
        }
        return Optional.empty();
    }
}
