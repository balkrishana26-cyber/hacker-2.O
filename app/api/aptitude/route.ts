import { NextResponse } from "next/server"
import { connectDb } from "@/dbConnection/connect"
import { AptitudeResult } from "@/dbConnection/Schema/aptitudeResult"
import formidable from "formidable"
import fs from "fs"
import path from "path"

export const runtime = "edge" // keep default serverless

export async function POST(req: Request) {
  await connectDb().catch(() => null)

  // Support both JSON body and multipart/form-data (resume upload)
  const contentType = req.headers.get("content-type") || ""
  if (contentType.includes("multipart/form-data")) {
    // parse with formidable (server-side only)
    const form = new formidable.IncomingForm({ multiples: false })
    return new Promise<NextResponse>((resolve) => {
      form.parse(req as any, async (err, fields, files) => {
        if (err) return resolve(NextResponse.json({ error: String(err) }, { status: 500 }))
        try {
          const result = JSON.parse(fields.result as string)
          const saved = await AptitudeResult.create(result)
          // save resume file locally if present (fallback)
          if (files?.resume && (files.resume as any).filepath) {
            const file = files.resume as any
            const destDir = path.join(process.cwd(), "data", "aptitude-resumes")
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
            const dest = path.join(destDir, `${saved._id}_${file.originalFilename}`)
            fs.copyFileSync(file.filepath, dest)
          }
          return resolve(NextResponse.json({ success: true, id: saved._id }))
        } catch (e) {
          return resolve(NextResponse.json({ error: String(e) }, { status: 500 }))
        }
      })
    })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    const saved = await AptitudeResult.create(body)
    return NextResponse.json({ success: true, id: saved._id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || "Failed to save" }, { status: 500 })
  }
}
