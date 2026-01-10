import Foundation
import Speech
import AVFoundation
import React

@objc(SpeechRecognitionModule)
class SpeechRecognitionModule: RCTEventEmitter, SFSpeechRecognizerDelegate {

  private var speechRecognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var audioEngine: AVAudioEngine?

  override init() {
    super.init()
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    speechRecognizer?.delegate = self
  }

  override static func moduleName() -> String! {
    return "SpeechRecognitionModule"
  }

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["onSpeechResults", "onSpeechError", "onSpeechEnd"]
  }

  // Request permissions
  @objc
  func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {

    SFSpeechRecognizer.requestAuthorization { authStatus in
      switch authStatus {
      case .authorized:
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          let result: [String: Bool] = [
            "speech": true,
            "microphone": granted
          ]
          resolve(result)
        }
      case .denied:
        resolve(["speech": false, "microphone": false])
      case .restricted:
        resolve(["speech": false, "microphone": false])
      case .notDetermined:
        resolve(["speech": false, "microphone": false])
      @unknown default:
        resolve(["speech": false, "microphone": false])
      }
    }
  }

  // Check if available
  @objc
  func isAvailable(_ resolve: RCTPromiseResolveBlock,
                   rejecter reject: RCTPromiseRejectBlock) {
    resolve(speechRecognizer?.isAvailable ?? false)
  }

  // Start recording and transcription
  @objc
  func startRecording(_ locale: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {

    // Stop if already running
    if audioEngine?.isRunning ?? false {
      stopRecording(resolve, rejecter: reject)
      return
    }

    // Create recognizer with locale
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: locale))

    guard let recognizer = speechRecognizer, recognizer.isAvailable else {
      reject("NOT_AVAILABLE", "Speech recognition not available", nil)
      return
    }

    do {
      // Configure audio session
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
      try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

      // Create recognition request
      recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
      guard let recognitionRequest = recognitionRequest else {
        reject("INIT_ERROR", "Cannot create recognition request", nil)
        return
      }

      recognitionRequest.shouldReportPartialResults = true

      // Use on-device recognition (requires iOS 13+)
      if #available(iOS 13, *) {
        recognitionRequest.requiresOnDeviceRecognition = true
      }

      // Create audio engine
      audioEngine = AVAudioEngine()
      guard let audioEngine = audioEngine else {
        reject("AUDIO_ENGINE_ERROR", "Cannot create audio engine", nil)
        return
      }

      let inputNode = audioEngine.inputNode
      let recordingFormat = inputNode.outputFormat(forBus: 0)

      inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
        recognitionRequest.append(buffer)
      }

      audioEngine.prepare()
      try audioEngine.start()

      // Start recognition task
      recognitionTask = recognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
        if let result = result {
          let transcription = result.bestTranscription.formattedString
          let isFinal = result.isFinal

          self?.sendEvent(withName: "onSpeechResults", body: [
            "text": transcription,
            "isFinal": isFinal
          ])

          if isFinal {
            self?.stopRecording(resolve, rejecter: reject)
          }
        }

        if let error = error {
          self?.sendEvent(withName: "onSpeechError", body: [
            "error": error.localizedDescription
          ])
          self?.stopRecording({ _ in }, rejecter: { _, _, _ in })
        }
      }

      resolve(true)

    } catch {
      reject("START_ERROR", "Failed to start recording: \(error.localizedDescription)", error)
    }
  }

  // Stop recording
  @objc
  func stopRecording(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {

    audioEngine?.stop()
    audioEngine?.inputNode.removeTap(onBus: 0)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()

    audioEngine = nil
    recognitionRequest = nil
    recognitionTask = nil

    sendEvent(withName: "onSpeechEnd", body: [:])
    resolve(true)
  }

  // SFSpeechRecognizerDelegate
  func speechRecognizer(_ speechRecognizer: SFSpeechRecognizer, availabilityDidChange available: Bool) {
    if !available {
      sendEvent(withName: "onSpeechError", body: [
        "error": "Speech recognition became unavailable"
      ])
    }
  }
}
