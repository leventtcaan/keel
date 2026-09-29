package app.keel.shared;

/** Each nested class logs one way SafeLog does not allow; LogWhitelistTests proves its rule flags every one. */
@SuppressWarnings("unused")
public final class LeakyLoggingFixture {

    private LeakyLoggingFixture() {
    }

    static final class UsesSlf4j {
        void log(double kg) {
            org.slf4j.LoggerFactory.getLogger(UsesSlf4j.class).info("weight {}", kg);
        }
    }

    static final class UsesJavaUtilLogging {
        void log(double kg) {
            java.util.logging.Logger.getLogger("x").info("weight " + kg);
        }
    }

    static final class UsesSystemLogger {
        void log(double kg) {
            System.getLogger("x").log(System.Logger.Level.INFO, "weight " + kg);
        }
    }

    static final class UsesSpringsLogAccessor {
        void log(double kg) {
            new org.springframework.core.log.LogAccessor(UsesSpringsLogAccessor.class).info("weight " + kg);
        }
    }

    static final class UsesSystemLoggerWithABundle {
        void log(double kg) {
            System.getLogger("x", null).log(System.Logger.Level.INFO, "weight " + kg);
        }
    }

    static final class PrintsToOut {
        void log(double kg) {
            System.out.println("weight " + kg);
        }
    }

    static final class PrintsToErr {
        void log(double kg) {
            System.err.println("weight " + kg);
        }
    }

    static final class PrintsAStackTrace {
        void log(RuntimeException e) {
            e.printStackTrace();
        }
    }
}
