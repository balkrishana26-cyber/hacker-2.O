import { NextResponse } from "next/server"
import { connectDb } from "@/dbConnection/connect"
import { AptitudeResult } from "@/dbConnection/Schema/aptitudeResult"
import formidable from "formidable"
import fs from "fs"
import path from "path"

function ensureDataDir(dirName: string) {
  const destDir = path.join(process.cwd(), "data", dirName)
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
  return destDir
}

async function fallbackSaveResult(result: any, resumeFile?: { filepath?: string; originalFilename?: string }) {
  // create an id and write JSON file
  ensureDataDir("aptitude-results")
  const id = `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const filePath = path.join(process.cwd(), "data", "aptitude-results", `${id}.json`)
  const toWrite = { _id: id, ...result }
  fs.writeFileSync(filePath, JSON.stringify(toWrite, null, 2), "utf-8")
  if (resumeFile && resumeFile.filepath && resumeFile.originalFilename) {
    const resumesDir = ensureDataDir("aptitude-resumes")
    const dest = path.join(resumesDir, `${id}_${resumeFile.originalFilename}`)
    fs.copyFileSync(resumeFile.filepath, dest)
  }
  return id
}

export async function POST(req: Request) {
  // Try to connect to DB but continue even if no DB
  await connectDb().catch(() => null)

  // Support both JSON body and multipart/form-data (resume upload)
  const contentType = req.headers.get("content-type") || ""
  if (contentType.includes("multipart/form-data")) {
    const form = new formidable.IncomingForm({ multiples: false })
    return new Promise<NextResponse>((resolve) => {
      form.parse(req as any, async (err, fields, files) => {
        if (err) return resolve(NextResponse.json({ error: String(err) }, { status: 500 }))
        try {
          const result = JSON.parse(fields.result as string)
          try {
            const saved = await AptitudeResult.create(result)
            // save resume file locally for reference
            if (files?.resume && (files.resume as any).filepath) {
              const file = files.resume as any
              const destDir = ensureDataDir("aptitude-resumes")
              const dest = path.join(destDir, `${String(saved._id)}_${file.originalFilename}`)
              fs.copyFileSync(file.filepath, dest)
            }
            return resolve(NextResponse.json({ success: true, id: saved._id }))
          } catch (e) {
            // fallback to file storage
            const file = files?.resume as any
            const localId = await fallbackSaveResult(result, file)
            return resolve(NextResponse.json({ success: true, id: localId, fallback: true }))
          }
        } catch (e) {
          return resolve(NextResponse.json({ error: String(e) }, { status: 500 }))
        }
      })
    })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    try {
      const saved = await AptitudeResult.create(body)
      return NextResponse.json({ success: true, id: saved._id })
    } catch (e) {
      const localId = await fallbackSaveResult(body)
      return NextResponse.json({ success: true, id: localId, fallback: true })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || "Failed to save" }, { status: 500 })
  }
}
