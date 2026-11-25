Pod::Spec.new do |s|
  s.name           = 'Places'
  s.version        = '1.0.0'
  s.summary        = 'Looks a place up by its address and measures the walk between two places (K-1227).'
  s.description    = 'MKLocalSearch for an address and MKDirections for a walking distance; asks for no location.'
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
