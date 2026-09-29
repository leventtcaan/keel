package app.keel;

import app.keel.shared.SafeLog;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;

/**
 * A module listener runs on its own thread after the request has been answered (@EnableAsync), so its failure reaches
 * no error handler. Spring's default would log the exception's message and the listener's arguments — the event
 * (K-214 review); SafeLog writes the listener and the failure's type and location instead (V3).
 */
@Configuration(proxyBeanMethods = false)
class BackgroundFailures implements AsyncConfigurer {

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (failure, task, arguments) -> SafeLog.backgroundFailure(task, failure);
    }
}
