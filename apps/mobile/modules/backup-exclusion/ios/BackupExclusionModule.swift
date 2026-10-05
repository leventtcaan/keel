import ExpoModulesCore

/// Leaves a file or folder out of iCloud and computer backups (K-618, ADR-055 › 97). The progress photos are the only
/// copy and are promised never to leave the phone; iOS backs up the app's documents folder unless told not to.
/// photoFiles.ts marks the photos' folder and every photo in it.
public class BackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackupExclusion")

    // A file:// string arrives as a URL (expo-modules-core's URL conversion). Throws, to JS, when iOS refuses.
    Function("exclude") { (url: URL) throws -> Void in
      var target = url
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try target.setResourceValues(values)
    }
  }
}
