#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PhotoLibraryModule, NSObject)

RCT_EXTERN_METHOD(saveToPhotoLibrary:(NSString *)filePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(openPhotosApp:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
