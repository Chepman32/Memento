import Foundation
import Photos
import UIKit
import React

@objc(PhotoLibraryModule)
class PhotoLibraryModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! {
    return "PhotoLibraryModule"
  }

  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  @objc
  func saveToPhotoLibrary(_ filePath: String,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {

    // Check if file exists
    guard FileManager.default.fileExists(atPath: filePath) else {
      reject("FILE_NOT_FOUND", "File does not exist at path: \(filePath)", nil)
      return
    }

    let fileURL = URL(fileURLWithPath: filePath)
    let fileExtension = fileURL.pathExtension.lowercased()

    // Request permission to add to photo library
    PHPhotoLibrary.requestAuthorization { status in
      guard status == .authorized else {
        reject("PERMISSION_DENIED", "Photo library access denied", nil)
        return
      }

      PHPhotoLibrary.shared().performChanges({
        if fileExtension == "gif" || fileExtension == "png" || fileExtension == "jpg" || fileExtension == "jpeg" {
          // Save image
          PHAssetCreationRequest.creationRequestForAssetFromImage(atFileURL: fileURL)
        } else if fileExtension == "mp4" || fileExtension == "mov" {
          // Save video
          PHAssetCreationRequest.creationRequestForAssetFromVideo(atFileURL: fileURL)
        } else {
          reject("UNSUPPORTED_FORMAT", "Unsupported file format: \(fileExtension)", nil)
          return
        }
      }) { success, error in
        if success {
          resolve(true)
        } else {
          reject("SAVE_FAILED", error?.localizedDescription ?? "Failed to save to photo library", error)
        }
      }
    }
  }

  @objc
  func openPhotosApp(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if let url = URL(string: "photos-redirect://") {
        UIApplication.shared.open(url, options: [:]) { success in
          if success {
            resolve(true)
          } else {
            reject("OPEN_FAILED", "Failed to open Photos app", nil)
          }
        }
      } else {
        reject("INVALID_URL", "Invalid Photos app URL", nil)
      }
    }
  }
}
