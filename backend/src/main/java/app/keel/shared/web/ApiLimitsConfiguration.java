package app.keel.shared.web;

import app.keel.shared.ApiLimits;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** Registers keel.api for every module (ApiLimits). */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(ApiLimits.class)
class ApiLimitsConfiguration {
}
