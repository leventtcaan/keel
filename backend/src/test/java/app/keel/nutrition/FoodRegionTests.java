package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Which region's foods come first (K-1061): from the device's languages, else the profile's time zone; no preference otherwise. */
class FoodRegionTests {

    @Test
    void theCountryOfTheFirstLanguageDecides() {
        assertThat(FoodRegion.of("en-US", Optional.empty())).contains("US");
        assertThat(FoodRegion.of("tr-TR,tr;q=0.9,en;q=0.8", Optional.empty())).contains("TR");
        assertThat(FoodRegion.of("en-US,tr;q=0.5", Optional.empty())).contains("US");
    }

    @Test
    void theWeightsOrderTheLanguagesNotTheirPlaceInTheHeader() {
        assertThat(FoodRegion.of("en-US;q=0.5, tr-TR", Optional.empty())).contains("TR");
    }

    @Test
    void aLanguageWithoutACountryPointsToItsUsualRegion() {
        assertThat(FoodRegion.of("tr", Optional.empty())).contains("TR");
        assertThat(FoodRegion.of("en", Optional.empty())).contains("US");
    }

    @Test
    void aCountryTheDatabaseHasNoFoodsForFallsThroughToTheNextLanguage() {
        assertThat(FoodRegion.of("en-GB,en;q=0.9", Optional.empty())).as("en-GB, then en").contains("US");
        assertThat(FoodRegion.of("fr-FR", Optional.empty())).isEmpty();
        assertThat(FoodRegion.of("de-DE,fr;q=0.5", Optional.empty())).isEmpty();
    }

    @Test
    void noHeaderOrABrokenOneIsNoPreferenceAndThenTheTimeZoneSpeaks() {
        assertThat(FoodRegion.of(null, Optional.empty())).isEmpty();
        assertThat(FoodRegion.of("  ", Optional.empty())).isEmpty();
        assertThat(FoodRegion.of("not a header;;;", Optional.empty())).isEmpty();
        assertThat(FoodRegion.of(null, Optional.of(ZoneId.of("America/New_York")))).contains("US");
        assertThat(FoodRegion.of(null, Optional.of(ZoneId.of("Europe/Istanbul")))).contains("TR");
        assertThat(FoodRegion.of(null, Optional.of(ZoneId.of("Europe/Paris")))).isEmpty();
        assertThat(FoodRegion.of("*", Optional.of(ZoneId.of("America/Chicago")))).as("a wildcard says nothing").contains("US");
    }

    @Test
    void theLanguageBeatsTheTimeZone() {
        assertThat(FoodRegion.of("tr-TR", Optional.of(ZoneId.of("America/New_York")))).contains("TR");
    }
}
