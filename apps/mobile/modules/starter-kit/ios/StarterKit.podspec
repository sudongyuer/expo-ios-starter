Pod::Spec.new do |s|
  s.name           = 'StarterKit'
  s.version        = '1.0.0'
  s.summary        = 'First-party native code and native UI for the app'
  s.description    = 'All first-party Swift code for the app, one directory per capability.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '26.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
