import * as React from "react"

// Minimal Slot replacement for the asChild pattern: when rendered, it clones its
// only child and forwards all props. Drop-in for @radix-ui/react-slot in the
// contexts we use it (sidebar, form). Child props win over parent props to
// preserve user-provided overrides.
//
// React 19+ moves `ref` into props, so cloneElement is enough — callers that
// need to forward refs pass them via `ref={...}` on the child like any other prop.
export function Slot({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
    if (!React.isValidElement(children)) {
        return null
    }
    const child = children as React.ReactElement<Record<string, unknown>>
    return React.cloneElement(child, {
        ...props,
        ...child.props,
    } as Record<string, unknown>)
}
