package app.keel.nutrition;

import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/** What was eaten, day by day, for other modules: the consistency's protein days (K-220). Ranges, as logged (U5). */
@Service
public class MealTotals {

    /** A day's logged protein, low to high. */
    public record ProteinRange(int lowG, int highG) {
    }

    private final MealStore store;

    MealTotals(MealStore store) {
        this.store = store;
    }

    /** Each day with a meal logged, from {@code from} to {@code to}, both included; a day without one is absent. */
    public Map<LocalDate, ProteinRange> proteinByDay(AccountId account, LocalDate from, LocalDate to) {
        Map<LocalDate, List<MealStore.Meal>> byDay = store.days(account, from, to).stream()
                .collect(Collectors.groupingBy(MealStore.Meal::day, TreeMap::new, Collectors.toList()));
        Map<LocalDate, ProteinRange> protein = new TreeMap<>();
        byDay.forEach((day, meals) -> {
            FoodRanges.Range total = FoodRanges.total(meals.stream().flatMap(meal -> meal.items().stream())
                    .map(FoodEstimator.EstimatedItem::nutrients).toList()).proteinG();
            protein.put(day, new ProteinRange(total.low(), total.high()));
        });
        return protein;
    }
}
