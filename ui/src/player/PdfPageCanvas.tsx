import { type ReactNode, useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist"

interface Props {
    doc: PDFDocumentProxy
    pageNumber: number
    /** Box the page has to fit into, in CSS pixels. */
    maxWidth: number
    maxHeight: number
    /** Rendered on top of the page in a box of the page's CSS size (annotations). */
    overlay?: (size: { width: number; height: number }) => ReactNode
}

/**
 * Renders one PDF page into a canvas, scaled to fit the box while keeping the
 * aspect ratio, at device pixel ratio so notes stay sharp on tablets.
 */
export const PdfPageCanvas = ({ doc, pageNumber, maxWidth, maxHeight, overlay }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [size, setSize] = useState<{ width: number; height: number }>()

    useEffect(() => {
        let cancelled = false
        let task: RenderTask | undefined
        const render = async () => {
            const page = await doc.getPage(pageNumber)
            if (cancelled || !canvasRef.current || maxWidth <= 0 || maxHeight <= 0) return
            const base = page.getViewport({ scale: 1 })
            const scale = Math.min(maxWidth / base.width, maxHeight / base.height)
            const dpr = window.devicePixelRatio || 1
            const viewport = page.getViewport({ scale: scale * dpr })
            const canvas = canvasRef.current
            canvas.width = Math.floor(viewport.width)
            canvas.height = Math.floor(viewport.height)
            setSize({ width: Math.floor(base.width * scale), height: Math.floor(base.height * scale) })
            const context = canvas.getContext("2d")
            if (!context) return
            task = page.render({ canvas, canvasContext: context, viewport })
            try {
                await task.promise
            } catch {
                // Cancelled because the page or size changed — nothing to do.
            }
        }
        void render()
        return () => {
            cancelled = true
            task?.cancel()
        }
    }, [doc, pageNumber, maxWidth, maxHeight])

    return (
        <div className="relative" style={size ? { width: size.width, height: size.height } : undefined}>
            <canvas
                ref={canvasRef}
                className="block bg-white shadow-lg"
                style={size ? { width: size.width, height: size.height } : { width: 0, height: 0 }}
            />
            {size && overlay?.(size)}
        </div>
    )
}
