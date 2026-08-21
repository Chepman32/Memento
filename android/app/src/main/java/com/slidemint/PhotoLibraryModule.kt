package com.slidemint

import android.content.ContentValues
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileNotFoundException
import java.util.concurrent.Executors

class PhotoLibraryModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {

  private val fileExecutor = Executors.newSingleThreadExecutor()

  @Volatile
  private var lastSavedUri: Uri? = null

  @Volatile
  private var lastSavedMimeType: String? = null

  override fun getName() = NAME

  @ReactMethod
  fun saveToPhotoLibrary(filePath: String, promise: Promise) {
    fileExecutor.execute {
      try {
        val source = resolveSourceFile(filePath)
        if (!source.isFile) {
          throw FileNotFoundException("Export file does not exist: $filePath")
        }

        val mediaType = mediaTypeFor(source)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          saveWithMediaStore(source, mediaType)
          promise.resolve(true)
        } else {
          saveToLegacyGallery(source, mediaType, promise)
        }
      } catch (error: Exception) {
        promise.reject("SAVE_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun openPhotosApp(promise: Promise) {
    context.runOnUiQueueThread {
      try {
        val savedUri = lastSavedUri
        val intent = if (savedUri != null) {
          Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(savedUri, lastSavedMimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
        } else {
          Intent(Intent.ACTION_VIEW, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        }

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        promise.resolve(true)
      } catch (error: Exception) {
        promise.reject("OPEN_FAILED", error.message, error)
      }
    }
  }

  private fun resolveSourceFile(filePath: String): File {
    val uri = Uri.parse(filePath)
    return if (uri.scheme == "file") {
      File(requireNotNull(uri.path) { "Invalid file URI: $filePath" })
    } else {
      File(filePath)
    }
  }

  private fun mediaTypeFor(file: File): ExportMediaType {
    return when (file.extension.lowercase()) {
      "mp4" -> ExportMediaType(
        mimeType = "video/mp4",
        publicDirectory = Environment.DIRECTORY_MOVIES,
        relativePath = "${Environment.DIRECTORY_MOVIES}/Slidevo",
        isVideo = true,
      )
      "gif" -> ExportMediaType(
        mimeType = "image/gif",
        publicDirectory = Environment.DIRECTORY_PICTURES,
        relativePath = "${Environment.DIRECTORY_PICTURES}/Slidevo",
        isVideo = false,
      )
      else -> throw IllegalArgumentException(
        "Unsupported export format: ${file.extension}",
      )
    }
  }

  private fun saveWithMediaStore(source: File, mediaType: ExportMediaType) {
    val resolver = context.contentResolver
    val collection = if (mediaType.isVideo) {
      MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    } else {
      MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    }
    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, source.name)
      put(MediaStore.MediaColumns.MIME_TYPE, mediaType.mimeType)
      put(MediaStore.MediaColumns.RELATIVE_PATH, mediaType.relativePath)
      put(MediaStore.MediaColumns.IS_PENDING, 1)
    }
    val destinationUri = resolver.insert(collection, values)
      ?: throw IllegalStateException("MediaStore could not create the export")

    try {
      val output = resolver.openOutputStream(destinationUri, "w")
        ?: throw IllegalStateException("MediaStore could not open the export")
      source.inputStream().use { input ->
        output.use { destination -> input.copyTo(destination) }
      }

      values.clear()
      values.put(MediaStore.MediaColumns.IS_PENDING, 0)
      resolver.update(destinationUri, values, null, null)
      lastSavedUri = destinationUri
      lastSavedMimeType = mediaType.mimeType
    } catch (error: Exception) {
      resolver.delete(destinationUri, null, null)
      throw error
    }
  }

  @Suppress("DEPRECATION")
  private fun saveToLegacyGallery(
    source: File,
    mediaType: ExportMediaType,
    promise: Promise,
  ) {
    val publicDirectory = Environment.getExternalStoragePublicDirectory(
      mediaType.publicDirectory,
    )
    val slidevoDirectory = File(publicDirectory, "Slidevo")
    if (!slidevoDirectory.exists() && !slidevoDirectory.mkdirs()) {
      throw IllegalStateException("Could not create the Slidevo gallery folder")
    }

    val destination = uniqueDestination(slidevoDirectory, source)
    source.copyTo(destination, overwrite = false)
    MediaScannerConnection.scanFile(
      context,
      arrayOf(destination.absolutePath),
      arrayOf(mediaType.mimeType),
    ) { _, uri ->
      lastSavedUri = uri
      lastSavedMimeType = mediaType.mimeType
      promise.resolve(true)
    }
  }

  private fun uniqueDestination(directory: File, source: File): File {
    var destination = File(directory, source.name)
    var suffix = 1
    while (destination.exists()) {
      destination = File(
        directory,
        "${source.nameWithoutExtension}_$suffix.${source.extension}",
      )
      suffix += 1
    }
    return destination
  }

  private data class ExportMediaType(
    val mimeType: String,
    val publicDirectory: String,
    val relativePath: String,
    val isVideo: Boolean,
  )

  companion object {
    private const val NAME = "PhotoLibraryModule"
  }
}
