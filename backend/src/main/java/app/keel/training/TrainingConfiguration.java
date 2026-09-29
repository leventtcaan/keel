package app.keel.training;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/** The exercise catalog and its muscle vocabulary, read once from the classpath (data/, packaged by the build). */
@Configuration(proxyBeanMethods = false)
class TrainingConfiguration {

    @Bean
    ExerciseCatalog exerciseCatalog() throws IOException {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        Map<String, Object> files = new HashMap<>();
        for (Resource file : new PathMatchingResourcePatternResolver().getResources("classpath:data/exercises/*.yaml")) {
            try (InputStream in = file.getInputStream()) {
                files.put(file.getFilename(), new Yaml(strict).load(in));
            }
        }
        try (InputStream in = new ClassPathResource("data/muscles.yaml").getInputStream()) {
            return ExerciseCatalog.of(files, new Yaml(strict).load(in));
        }
    }
}
