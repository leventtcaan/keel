package app.keel.engine;

import java.io.File;
import java.net.URI;
import java.nio.file.Path;
import java.sql.Connection;
import java.time.Clock;
import java.time.InstantSource;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.Locale;
import java.util.Random;
import java.util.SplittableRandom;
import java.util.TimeZone;
import java.util.UUID;
import java.util.random.RandomGenerator;
import org.springframework.util.StringUtils;

/**
 * Test-only stand-ins for engine code that breaks purity, one class per forbidden thing. EnginePurityTests checks
 * that its rules flag every one of them, so no rule clause can silently stop working. They live under src/test,
 * so they are never part of the engine itself.
 */
public final class ImpureEngineFixture {

    private ImpureEngineFixture() {
    }

    // Framework
    static final class UsesSpring { boolean x() { return StringUtils.hasText("x"); } }

    // Clock
    static final class CallsNow { Object x() { return LocalDate.now(); } }
    static final class UsesClock { Object x() { return Clock.systemUTC(); } }
    static final class UsesInstantSource { Object x() { return InstantSource.system(); } }
    static final class ReadsMillis { long x() { return System.currentTimeMillis(); } }
    static final class ReadsNanos { long x() { return System.nanoTime(); } }
    static final class NewDate { Object x() { return new Date(); } }
    static final class UsesCalendar { Object x() { return Calendar.getInstance(); } }

    // Randomness
    static final class UsesRandom { int x() { return new Random().nextInt(); } }
    static final class UsesSplittableRandom { int x() { return new SplittableRandom().nextInt(); } }
    static final class UsesRandomGenerator { int x() { return RandomGenerator.getDefault().nextInt(); } }
    static final class MathRandom { double x() { return Math.random(); } }
    static final class RandomUuid { Object x() { return UUID.randomUUID(); } }
    static final class Shuffles { void x() { Collections.shuffle(new ArrayList<>()); } }

    // Environment
    static final class ReadsEnv { Object x() { return System.getenv("HOME"); } }
    static final class ReadsProperty { Object x() { return System.getProperty("user.home"); } }
    static final class DefaultZone { Object x() { return ZoneId.systemDefault(); } }
    static final class DefaultTimeZone { Object x() { return TimeZone.getDefault(); } }
    static final class DefaultLocale { Object x() { return Locale.getDefault(); } }

    // I/O
    static final class ReadsResource { Object x() { return ReadsResource.class.getResourceAsStream("/p.yaml"); } }
    static final class UsesFile { Object x() { return new File("data"); } }
    static final class UsesNioPath { Object x() { return Path.of("data"); } }
    static final class UsesNet { Object x() { return URI.create("https://example.com"); } }
    static final class UsesSql { Object x(Connection c) { return c; } }

    // Concurrency, processes, reflection
    static final class StartsThread { void x() { new Thread(() -> { }).start(); } }
    static final class UsesRuntime { Object x() { return Runtime.getRuntime(); } }
    static final class UsesProcess { Object x() { return new ProcessBuilder("ls"); } }
    static final class UsesReflection { Object x() throws Exception { return String.class.getDeclaredMethod("length"); } }
}
