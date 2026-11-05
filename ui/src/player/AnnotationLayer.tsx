import { useRef, useState } from "react"
import {
    hitTest,
    newId,
    normalize,
    removeItem,
    simplify,
    strokePath,
    HIGHLIGHTER_COLOR,
    HIGHLIGHTER_WIDTH,
    PEN_WIDTH,
    TEXT_SIZE,
    type PageAnnotations,
    type Point,
    type Tool,
} from "./annotations"

interface Props {
    doc: PageAnnotations
    width: number
    height: number
    editing: boolean
    tool: Tool
    color: string
    onChange: (doc: PageAnnotations) => void
    textPlaceholder: string
}

/**
 * SVG overlay that shows a page's annotations and, in edit mode, records pen
 * and highlighter strokes, places text notes and erases. Sits inside the page
 * box, so night mode inverts ink and paper together.
 */
export const AnnotationLayer = ({ doc, width, height, editing, tool, color, onChange, textPlaceholder }: Props) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const [draft, setDraft] = useState<Point[] | null>(null)
    const [textAt, setTextAt] = useState<Point | null>(null)
    const [text, setText] = useState("")

    const pointFrom = (e: React.PointerEvent): Point => {
        const rect = svgRef.current!.getBoundingClientRect()
        return normalize(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height)
    }

    const erase = (p: Point) => {
        const id = hitTest(doc, p, 0.015, height / Math.max(1, width))
        if (id) onChange(removeItem(doc, id))
    }

    const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!editing) return
        e.stopPropagation()
        e.preventDefault()
        const p = pointFrom(e)
        if (tool === "text") {
            setTextAt(p)
            setText("")
            return
        }
        e.currentTarget.setPointerCapture(e.pointerId)
        if (tool === "eraser") {
            erase(p)
            setDraft([p])
            return
        }
        setDraft([p])
    }

    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!editing || !draft) return
        e.stopPropagation()
        const p = pointFrom(e)
        if (tool === "eraser") erase(p)
        else setDraft((d) => (d ? [...d, p] : d))
    }

    const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!editing) return
        e.stopPropagation()
        if (draft && (tool === "pen" || tool === "highlighter")) {
            onChange({
                ...doc,
                strokes: [
                    ...doc.strokes,
                    {
                        id: newId(),
                        tool,
                        color: tool === "highlighter" ? HIGHLIGHTER_COLOR : color,
                        width: tool === "highlighter" ? HIGHLIGHTER_WIDTH : PEN_WIDTH,
                        points: simplify(draft),
                    },
                ],
            })
        }
        setDraft(null)
    }

    const commitText = () => {
        if (textAt && text.trim()) {
            onChange({ ...doc, texts: [...doc.texts, { id: newId(), x: textAt[0], y: textAt[1], text: text.trim(), color, size: TEXT_SIZE }] })
        }
        setTextAt(null)
        setText("")
    }

    const strokeEl = (points: Point[], strokeColor: string, w: number, highlighter: boolean, key: string) => (
        <path
            key={key}
            d={strokePath(points, width, height)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={Math.max(1, w * width)}
            strokeLinecap={highlighter ? "butt" : "round"}
            strokeLinejoin="round"
            strokeOpacity={highlighter ? 0.35 : 1}
        />
    )

    return (
        <>
            <svg
                ref={svgRef}
                className={`absolute inset-0 ${editing ? "cursor-crosshair touch-none" : "pointer-events-none"}`}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => setDraft(null)}
                data-testid="annotation-layer"
            >
                {doc.strokes.map((s) => strokeEl(s.points, s.color, s.width, s.tool === "highlighter", s.id))}
                {draft && (tool === "pen" || tool === "highlighter") &&
                    strokeEl(draft, tool === "highlighter" ? HIGHLIGHTER_COLOR : color, tool === "highlighter" ? HIGHLIGHTER_WIDTH : PEN_WIDTH, tool === "highlighter", "draft")}
                {doc.texts.map((t) => (
                    <text
                        key={t.id}
                        x={t.x * width}
                        y={t.y * height}
                        fill={t.color}
                        fontSize={Math.max(10, t.size * width)}
                        fontWeight={600}
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                    >
                        {t.text}
                    </text>
                ))}
            </svg>
            {textAt && (
                <input
                    autoFocus
                    value={text}
                    placeholder={textPlaceholder}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === "Enter") commitText()
                        if (e.key === "Escape") setTextAt(null)
                    }}
                    onBlur={commitText}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    className="absolute z-10 rounded border border-primary bg-white px-1 text-sm text-black shadow"
                    style={{ left: textAt[0] * width, top: Math.max(0, textAt[1] * height - 24), width: 180 }}
                    data-testid="annotation-text-input"
                />
            )}
        </>
    )
}
