Pod::Spec.new do |s|
  s.name           = 'BackupExclusion'
  s.version        = '1.0.0'
  s.summary        = 'Leaves files out of iCloud and computer backups (K-618).'
  s.description    = 'Sets URLResourceValues.isExcludedFromBackup on a file or folder.'
  s.license        = 'UNLICENSED'
  s.author         = 'keel'
  s.homepage       = 'https://github.com/leventtcaan/keel'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/leventtcaan/keel.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
