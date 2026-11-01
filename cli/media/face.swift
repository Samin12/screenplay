// Finds the face in a video with Apple's Vision framework. Prints one line per sample: "t cx cy h"
// (seconds, face centre x/y and height as fractions of the frame, y from the top), or "t" alone when
// no face was found. usage: swift face.swift <video> <samples per second>
import AVFoundation
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count >= 3, let rate = Double(args[2]), rate > 0 else {
  FileHandle.standardError.write(Data("usage: face.swift <video> <samples per second>\n".utf8))
  exit(2)
}

let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = CMTime(value: 1, timescale: 30)
gen.requestedTimeToleranceAfter = CMTime(value: 1, timescale: 30)
gen.maximumSize = CGSize(width: 960, height: 540)

let duration = CMTimeGetSeconds(asset.duration)
var i = 0
while Double(i) / rate < duration {
  let t = Double(i) / rate
  i += 1
  guard let image = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) else {
    print(String(format: "%.3f", t))
    continue
  }
  let request = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
  let faces = request.results ?? []
  // The speaker is the biggest face (a video on a shelf or a phone in hand has smaller ones).
  if let f = faces.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) {
    let b = f.boundingBox
    print(String(format: "%.3f %.4f %.4f %.4f", t, b.midX, 1 - b.midY, b.height))
  } else {
    print(String(format: "%.3f", t))
  }
}
