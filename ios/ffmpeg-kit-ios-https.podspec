Pod::Spec.new do |s|
  s.name = 'ffmpeg-kit-ios-https'
  s.version = '6.0'
  s.summary = 'FFmpeg Kit iOS Https Shared Framework'
  s.description = 'Includes FFmpeg with gmp and gnutls libraries enabled.'
  s.homepage = 'https://github.com/SNNafi/ffmpeg-kit'
  s.authors = {
    'ARTHENICA' => 'open-source@arthenica.com',
    'Shahriar Nasim Nafi' => 'shahriarnasim.nafi@gmail.com'
  }
  s.license = {
    :type => 'LGPL-3.0',
    :file => 'ffmpeg-kit-https-6.0-ios-xcframework/ffmpegkit.xcframework/ios-arm64/ffmpegkit.framework/LICENSE'
  }
  s.platform = :ios, '12.1'
  s.requires_arc = true
  s.libraries = 'z', 'bz2', 'c++', 'iconv'
  s.source = {
    :http => 'https://github.com/SNNafi/ffmpeg-kit/releases/download/6.0-apple-https/ffmpeg-kit-https-6.0-ios-xcframework.zip'
  }
  s.ios.frameworks = 'AudioToolbox', 'AVFoundation', 'CoreMedia', 'VideoToolbox'
  s.ios.vendored_frameworks = [
    'ffmpeg-kit-https-6.0-ios-xcframework/ffmpegkit.xcframework',
    'ffmpeg-kit-https-6.0-ios-xcframework/libavcodec.xcframework',
    'ffmpeg-kit-https-6.0-ios-xcframework/libavdevice.xcframework',
    'ffmpeg-kit-https-6.0-ios-xcframework/libavfilter.xcframework',
    'ffmpeg-kit-https-6.0-ios-xcframework/libavformat.xcframework',
    'ffmpeg-kit-https-6.0-ios-xcframework/libavutil.xcframework',
    'ffmpeg-kit-https-6.0-ios-xcframework/libswresample.xcframework',
    'ffmpeg-kit-https-6.0-ios-xcframework/libswscale.xcframework'
  ]
end
