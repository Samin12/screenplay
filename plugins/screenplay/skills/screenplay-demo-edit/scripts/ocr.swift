// OCR helper for the privacy scan (tools/screen_privacy.py). macOS Vision, no dependencies.
//   swiftc -O tools/ocr.swift -o tools/.ocr
//   tools/.ocr [--match <regex>] a.png b.png ...     (or image paths on stdin, one per line)
// Prints one JSON line per image: {"file", "w", "h", "items": [{"text", "x", "y", "w", "h", "hits": [...]}]}
// Boxes are in image pixels, top-left origin. `hits` are the boxes of the regex matches inside a line
// (only lines with a match are printed when --match is given).

import Foundation
import Vision
import ImageIO

struct Box: Codable { let text: String; let x: Double; let y: Double; let w: Double; let h: Double }
struct Item: Codable { let text: String; let x: Double; let y: Double; let w: Double; let h: Double; let hits: [Box] }
struct Out: Codable { let file: String; let w: Int; let h: Int; let items: [Item] }

var args = Array(CommandLine.arguments.dropFirst())
var pattern: NSRegularExpression? = nil
if let i = args.firstIndex(of: "--match"), i + 1 < args.count {
  pattern = try! NSRegularExpression(pattern: args[i + 1])
  args.removeSubrange(i...(i + 1))
}
var files = args
if files.isEmpty { while let l = readLine() { if !l.isEmpty { files.append(l) } } }

var results = [Out?](repeating: nil, count: files.count)
let lock = NSLock()
DispatchQueue.concurrentPerform(iterations: files.count) { i in
  let f = files[i]
  guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: f) as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return }
  let W = Double(img.width), H = Double(img.height)
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.usesLanguageCorrection = false
  let handler = VNImageRequestHandler(cgImage: img, options: [:])
  try? handler.perform([req])
  func box(_ b: CGRect, _ t: String) -> Box { Box(text: t, x: b.minX * W, y: (1 - b.maxY) * H, w: b.width * W, h: b.height * H) }
  var items: [Item] = []
  for o in req.results ?? [] {
    guard let c = o.topCandidates(1).first else { continue }
    var hits: [Box] = []
    if let re = pattern {
      let s = c.string
      for m in re.matches(in: s, range: NSRange(s.startIndex..., in: s)) {
        guard let r = Range(m.range, in: s), let bb = try? c.boundingBox(for: r)?.boundingBox else { continue }
        hits.append(box(bb, String(s[r])))
      }
      if hits.isEmpty { continue }
    }
    let b = box(o.boundingBox, c.string)
    items.append(Item(text: b.text, x: b.x, y: b.y, w: b.w, h: b.h, hits: hits))
  }
  lock.lock(); results[i] = Out(file: f, w: img.width, h: img.height, items: items); lock.unlock()
}
let enc = JSONEncoder()
for r in results { if let r = r, let d = try? enc.encode(r) { print(String(data: d, encoding: .utf8)!) } }
