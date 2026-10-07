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

/** The exercise catalog and its vocabularies (muscles, setup fields), read once from the classpath (data/, packaged by the build). */
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
        // The two closed vocabularies a move names from: muscles (with their regions) and setup fields.
        Map<String, Object> vocabulary = new HashMap<>();
        for (String file : new String[] {"data/muscles.yaml", "data/exercise-setup.yaml"}) {
            try (InputStream in = new ClassPathResource(file).getInputStream()) {
                vocabulary.putAll(new Yaml(strict).<Map<String, Object>>load(in));
            }
        }
        return ExerciseCatalog.of(files, vocabulary);
    }

    /** The reps a starting weight is asked for (ADR-072 #5), from the onboarding's parameter file. */
    @Bean
    StartingWeightReps startingWeightReps() {
        return StartingWeightReps.fromClasspath();
    }

    /** The program templates (K-211, data/programs), checked against the catalog as they load. */
    @Bean
    ProgramTemplates programTemplates(ExerciseCatalog catalog) throws IOException {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        Map<String, Object> files = new HashMap<>();
        for (Resource file : new PathMatchingResourcePatternResolver().getResources("classpath:data/programs/*.yaml")) {
            try (InputStream in = file.getInputStream()) {
                files.put(file.getFilename(), new Yaml(strict).load(in));
            }
        }
        return ProgramTemplates.of(files, catalog);
    }
}
