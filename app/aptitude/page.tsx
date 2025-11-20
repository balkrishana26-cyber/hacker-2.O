"use client"

import React, { useEffect, useRef, useState } from "react"


type Question = {
  id: number
  q: string
  choices: string[]
  answer: number
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    q: "What is 8 * 7?",
    choices: ["54", "56", "58", "62"],
    answer: 1,
  },
  {
    id: 2,
    q: "Which is a prime number?",
    choices: ["21", "25", "29", "27"],
    answer: 2,
  },
  {
    id: 3,
    q: "Choose the synonym of 'rapid'",
    choices: ["slow", "quick", "dull", "calm"],
    answer: 1,
  },
  {
    id: 4,
    q: "Which completes the sequence: 2,4,8,16,?",
    choices: ["20", "24", "32", "30"],
    answer: 2,
  },
  {
    id: 5,
    q: "General knowledge: The capital of France is?",
    choices: ["Berlin", "Madrid", "Rome", "Paris"],
    answer: 3,
  },
]

export default function AptitudeTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [started, setStarted] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [violation, setViolation] = useState<string | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [batch, setBatch] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resultAttached, setResultAttached] = useState(false)

  // Basic motion/away detection using frame-difference
  useEffect(() => {
    if (!started) return
    let model: any = null
    let intervalId: any = null
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const loadAndRun = async () => {
      try {
        // Use eval-wrapped dynamic imports so the bundler doesn't statically analyze
        // these heavy browser-only packages during server build.
        const tf = await (eval('import("@tensorflow/tfjs")'))
        await tf.ready()
        await (eval('import("@tensorflow/tfjs-backend-webgl")'))
        const m = await (eval('import("@tensorflow-models/face-landmarks-detection")'))
        model = m
        const detector = await m.load(m.SupportedPackages?.mediapipeFacemesh)

        let lastNoseX: number | null = null
        let closedFrames = 0
        const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1])

        const checkFrame = async () => {
          if (!video || video.readyState < 2) return
          const faces = await detector.estimateFaces({ input: video as HTMLVideoElement })
          if (!faces || faces.length === 0) {
            setViolation("No face detected — possible cheating")
            autoSubmit("violation")
            return
          }

          const face = faces[0] as any
          // bounding box presence check
          const box = face.boundingBox
          if (box) {
            const w = box.bottomRight[0] - box.topLeft[0]
            const h = box.bottomRight[1] - box.topLeft[1]
            const area = w * h
            if (area < 2000) {
              setViolation("Face too small or too far from camera")
              autoSubmit("violation")
              return
            }
          }

          // try to access mesh/keypoints for eyes and nose
          const mesh: any[] | undefined = face.scaledMesh || face.keypoints?.map((k: any) => [k.x, k.y])
          if (mesh && mesh.length > 200) {
            // indices based on MediaPipe facemesh
            const nose = mesh[1]
            const leftTop = mesh[159]
            const leftBottom = mesh[145]
            const leftLeft = mesh[33]
            const leftRight = mesh[133]
            const rightTop = mesh[386]
            const rightBottom = mesh[374]
            const rightLeft = mesh[362]
            const rightRight = mesh[263]

            // head movement: nose x change
            if (nose && Array.isArray(nose)) {
              const nx = nose[0]
              if (lastNoseX !== null) {
                if (Math.abs(nx - lastNoseX) > 120) {
                  setViolation("Rapid head movement detected (possible cheating)")
                  autoSubmit("violation")
                  return
                }
              }
              lastNoseX = nx
            }

            // eye aspect ratio for blink detection
            if (leftTop && leftBottom && leftLeft && leftRight && rightTop && rightBottom && rightLeft && rightRight) {
              const leftV = (dist(leftTop, leftBottom))
              const leftH = dist(leftLeft, leftRight)
              const rightV = dist(rightTop, rightBottom)
              const rightH = dist(rightLeft, rightRight)
              const leftEAR = leftH > 0 ? leftV / leftH : 1
              const rightEAR = rightH > 0 ? rightV / rightH : 1
              const ear = (leftEAR + rightEAR) / 2
              // if eyes are mostly closed for several frames, consider as cover/cheating
              if (ear < 0.12) {
                closedFrames++
              } else {
                closedFrames = 0
              }
              if (closedFrames > 6) {
                setViolation("Eyes appear closed or camera covered")
                autoSubmit("violation")
                return
              }
            }
          }
        }

        intervalId = setInterval(checkFrame, 1200)
      } catch (e) {
        console.error("Face model load failed", e)
      }
    }

    loadAndRun()

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setViolation("Page hidden or switched tab")
        autoSubmit("violation")
      }
    }
    window.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("blur", handleVisibility)
    return () => {
      window.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("blur", handleVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStarted(true)
    } catch (e) {
      console.error(e)
      setPermissionDenied(true)
    }
  }

  const selectAnswer = (qIndex: number, choiceIndex: number) => {
    setAnswers(prev => {
      const copy = [...prev]
      copy[qIndex] = choiceIndex
      return copy
    })
  }

  const calculate = async (reason = "manual") => {
    let correct = 0
    for (let i = 0; i < QUESTIONS.length; i++) {
      if (answers[i] === QUESTIONS[i].answer) correct++
    }
    const sc = Math.round((correct / QUESTIONS.length) * 100)
    setScore(sc)
    if (sc >= 80) setBatch("High")
    else if (sc >= 50) setBatch("Intermediate")
    else setBatch("Beginner")
    setSubmitted(true)
    // stop camera
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
    }
    // send result to server
    try {
      const payload = {
        score: sc,
        batch: sc >= 80 ? "High" : sc >= 50 ? "Intermediate" : "Beginner",
        violation,
        answers,
        meta: { reason },
      }
      const resp = await fetch("/api/aptitude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await resp.json()
      if (json?.success && json.id) {
        // store result id to localStorage so application can attach it
        localStorage.setItem("aptitudeResultId", String(json.id))
      }
    } catch (e) {
      console.error("Failed to save result to server", e)
    }

    return { score: sc, batch, reason }
  }

  const autoSubmit = (reason = "violation") => {
    if (!submitted) {
      calculate(reason)
    }
  }

  const downloadResult = async () => {
    const result = {
      timestamp: new Date().toISOString(),
      score,
      batch,
      violation,
      answers,
    }
    const jszip = await import("jszip")
    const zip = new jszip.default()
    zip.file("aptitude-result.json", JSON.stringify(result, null, 2))
    const content = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(content)
    const a = document.createElement("a")
    a.href = url
    a.download = "result_with_metadata.zip"
    a.click()
    URL.revokeObjectURL(url)
  }

  const attachResumeAndDownload = async (file: File | null) => {
    if (!file || score == null) return
    const result = {
      timestamp: new Date().toISOString(),
      score,
      batch,
      violation,
      answers,
    }

    // upload resume and result to server via multipart form
    const form = new FormData()
    form.append("resume", file)
    form.append("result", JSON.stringify(result))
    try {
      const resp = await fetch("/api/aptitude", { method: "POST", body: form })
      const json = await resp.json()
      if (json?.success && json.id) {
        localStorage.setItem("aptitudeResultId", String(json.id))
        setResultAttached(true)
        alert("Result saved and resume attached. Result ID: " + json.id)
      } else {
        alert("Upload completed but server did not return success")
      }
    } catch (e) {
      console.error(e)
      alert("Failed to upload resume and result")
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Inter, sans-serif" }}>
      <h1>Quick Aptitude & General Test</h1>
      <p>This test will be proctored using your webcam. Switching tab or leaving the camera view will submit the test automatically.</p>

      {!started && !submitted && (
        <div>
          <button onClick={startCamera} style={{ padding: "8px 12px", marginTop: 10 }}>Start Test</button>
          {permissionDenied && <p style={{ color: "red" }}>Camera permission denied — enable camera to take test.</p>}
        </div>
      )}

      {started && !submitted && (
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          <div>
            <video ref={videoRef} style={{ width: 320, height: 240, background: "#000" }} muted />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <p style={{ color: "orange" }}>Do not switch away from this tab or cover the camera</p>
          </div>
          <div>
            {QUESTIONS.map((q, i) => (
              <div key={q.id} style={{ marginBottom: 12, border: "1px solid #ddd", padding: 8 }}>
                <div><strong>Q{i + 1}:</strong> {q.q}</div>
                <div style={{ marginTop: 6 }}>
                  {q.choices.map((c, idx) => (
                    <label key={idx} style={{ display: "block" }}>
                      <input type="radio" name={`q-${i}`} checked={answers[i] === idx} onChange={() => selectAnswer(i, idx)} /> {c}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <button onClick={() => calculate("manual")} style={{ padding: "8px 12px" }}>Submit Test</button>
            </div>
          </div>
        </div>
      )}

      {submitted && (
        <div style={{ marginTop: 20 }}>
          <h2>Test Result</h2>
          <p><strong>Score:</strong> {score}%</p>
          <p><strong>Assigned Batch:</strong> {batch}</p>
          {violation && <p style={{ color: "red" }}><strong>Violation:</strong> {violation}</p>}

          <div style={{ marginTop: 12 }}>
            <button onClick={downloadResult} style={{ padding: "8px 12px", marginRight: 8 }}>Download Result (ZIP)</button>
            <label style={{ marginLeft: 8 }}>
              Upload Resume to attach result:
              <input type="file" accept="application/pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
            </label>
            <button onClick={() => attachResumeAndDownload(resumeFile)} disabled={!resumeFile} style={{ padding: "8px 12px", marginLeft: 8 }}>Attach Result & Download Resume ZIP</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={() => {
              alert("To apply for an internship, include this test result file with your resume. The site requires you to attach your test result before applying.")
            }}>How to attach result when applying</button>
          </div>
        </div>
      )}
    </div>
  )
}
