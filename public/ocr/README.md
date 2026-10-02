# Local OCR assets

The English language model is from the official `tesseract-ocr/tessdata_fast` repository under Apache 2.0. The uncompressed model SHA256 is `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2`. `MODEL-LICENSE` contains its licence.

Worker and WebAssembly engine files are generated from the pinned npm dependencies by `scripts/prepare-ocr.mjs` during install, development, and build. They are excluded from Git. No passport image or extracted identifier is an asset in this directory.
