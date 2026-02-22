"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/src/lib/utils"

type Stringifier<T> = (item: T) => string

type ComboboxContextValue = {
  items: any[]
  filteredItems: any[]
  value: any | null
  inputValue: string
  open: boolean
  highlightedIndex: number
  itemToStringLabel: Stringifier<any>
  itemToStringValue: Stringifier<any>
  setOpen: (open: boolean) => void
  setInputValue: (value: string) => void
  setHighlightedIndex: (index: number) => void
  selectItem: (item: any | null) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null)

function useComboboxContext<T>() {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error("Combobox components must be used inside <Combobox>.")
  }
  return context as ComboboxContextValue & {
    items: T[]
    filteredItems: T[]
    value: T | null
    itemToStringLabel: Stringifier<T>
    itemToStringValue: Stringifier<T>
    selectItem: (item: T | null) => void
  }
}

type ComboboxProps<T> = {
  items: T[]
  value?: T | null
  inputValue?: string
  itemToStringLabel: Stringifier<T>
  itemToStringValue: Stringifier<T>
  onValueChange?: (value: T | null) => void
  onInputValueChange?: (value: string) => void
  children: React.ReactNode
}

function Combobox<T>({
  items,
  value,
  inputValue,
  itemToStringLabel,
  itemToStringValue,
  onValueChange,
  onInputValueChange,
  children,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<T | null>(null)
  const [internalInputValue, setInternalInputValue] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const selectedValue = value ?? internalValue
  const currentInputValue = inputValue ?? internalInputValue

  const filteredItems = React.useMemo(() => {
    const query = currentInputValue.trim().toLowerCase()
    if (query.length === 0) {
      return items
    }
    return items.filter((item) =>
      itemToStringLabel(item).toLowerCase().includes(query)
    )
  }, [currentInputValue, itemToStringLabel, items])

  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredItems.length])

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const setValueInternal = React.useCallback(
    (item: T | null) => {
      setInternalValue(item)
      onValueChange?.(item)
    },
    [onValueChange]
  )

  const setInputInternal = React.useCallback(
    (nextValue: string) => {
      setInternalInputValue(nextValue)
      onInputValueChange?.(nextValue)
    },
    [onInputValueChange]
  )

  const selectItem = React.useCallback(
    (item: T | null) => {
      if (item) {
        setInputInternal(itemToStringLabel(item))
      } else {
        setInputInternal("")
      }
      setValueInternal(item)
      setOpen(false)
    },
    [itemToStringLabel, setInputInternal, setValueInternal]
  )

  return (
    <ComboboxContext.Provider
      value={{
        items,
        filteredItems,
        value: selectedValue,
        inputValue: currentInputValue,
        open,
        highlightedIndex,
        itemToStringLabel,
        itemToStringValue,
        setOpen,
        setInputValue: setInputInternal,
        setHighlightedIndex,
        selectItem,
      }}
    >
      <div ref={rootRef} data-slot="combobox" className="relative">
        {children}
      </div>
    </ComboboxContext.Provider>
  )
}

type ComboboxInputProps = Omit<React.ComponentProps<typeof InputGroupInput>, "value" | "onChange"> & {
  showTrigger?: boolean
  showClear?: boolean
}

function ComboboxInput({
  className,
  disabled = false,
  showTrigger = true,
  showClear = false,
  onKeyDown,
  onFocus,
  ...props
}: ComboboxInputProps) {
  const {
    filteredItems,
    inputValue,
    highlightedIndex,
    setHighlightedIndex,
    setInputValue,
    setOpen,
    selectItem,
  } = useComboboxContext<unknown>()

  const hasValue = inputValue.length > 0

  return (
    <InputGroup className={cn("w-full", className)} data-disabled={disabled}>
      <InputGroupInput
        {...props}
        disabled={disabled}
        value={inputValue}
        onFocus={(event) => {
          setOpen(true)
          onFocus?.(event)
        }}
        onChange={(event) => {
          setInputValue(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (!filteredItems.length) {
            if (event.key === "Escape") {
              setOpen(false)
            }
            onKeyDown?.(event)
            return
          }

          if (event.key === "ArrowDown") {
            event.preventDefault()
            setOpen(true)
            setHighlightedIndex(
              highlightedIndex >= filteredItems.length - 1 ? 0 : highlightedIndex + 1
            )
          }
          if (event.key === "ArrowUp") {
            event.preventDefault()
            setOpen(true)
            setHighlightedIndex(
              highlightedIndex <= 0 ? filteredItems.length - 1 : highlightedIndex - 1
            )
          }
          if (event.key === "Enter") {
            event.preventDefault()
            selectItem(filteredItems[highlightedIndex] ?? null)
          }
          if (event.key === "Escape") {
            setOpen(false)
          }
          onKeyDown?.(event)
        }}
      />
      <InputGroupAddon align="inline-end">
        {showClear && hasValue && (
          <InputGroupButton
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => selectItem(null)}
            disabled={disabled}
          >
            <XIcon className="pointer-events-none size-4" />
          </InputGroupButton>
        )}
        {showTrigger && (
          <InputGroupButton
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => setOpen(true)}
            disabled={disabled}
          >
            <ChevronDownIcon className="pointer-events-none size-4" />
          </InputGroupButton>
        )}
      </InputGroupAddon>
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { open } = useComboboxContext<unknown>()
  if (!open) {
    return null
  }
  return (
    <div
      data-slot="combobox-content"
      className={cn(
        "bg-popover text-popover-foreground absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-md border shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ComboboxList({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="combobox-list"
      className={cn("max-h-80 overflow-y-auto p-1", className)}
      {...props}
    >
      {children}
    </div>
  )
}

type ComboboxCollectionProps<T> = {
  children: (item: T) => React.ReactNode
}

function ComboboxCollection<T>({ children }: ComboboxCollectionProps<T>) {
  const { filteredItems } = useComboboxContext<T>()
  return <>{filteredItems.map((item) => children(item))}</>
}

type ComboboxItemProps<T> = Omit<React.ComponentProps<"button">, "value"> & {
  value: T
}

function ComboboxItem<T>({
  className,
  children,
  value,
  onMouseEnter,
  ...props
}: ComboboxItemProps<T>) {
  const {
    value: selectedItem,
    highlightedIndex,
    filteredItems,
    itemToStringValue,
    selectItem,
    setHighlightedIndex,
  } = useComboboxContext<T>()

  const selectedKey = selectedItem ? itemToStringValue(selectedItem) : null
  const currentKey = itemToStringValue(value)
  const isSelected = selectedKey === currentKey
  const itemIndex = filteredItems.findIndex(
    (item) => itemToStringValue(item) === currentKey
  )
  const isHighlighted = itemIndex >= 0 && highlightedIndex === itemIndex

  return (
    <button
      type="button"
      data-slot="combobox-item"
      data-highlighted={isHighlighted || undefined}
      className={cn(
        "hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm",
        isHighlighted && "bg-accent text-accent-foreground",
        className
      )}
      onMouseEnter={(event) => {
        if (itemIndex >= 0) {
          setHighlightedIndex(itemIndex)
        }
        onMouseEnter?.(event)
      }}
      onClick={() => selectItem(value)}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected ? <CheckIcon className="size-4 shrink-0" /> : null}
    </button>
  )
}

function ComboboxEmpty({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { filteredItems } = useComboboxContext<unknown>()
  if (filteredItems.length > 0) {
    return null
  }
  return (
    <div
      data-slot="combobox-empty"
      className={cn("text-muted-foreground py-2 text-center text-sm", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function ComboboxTrigger({
  className,
  ...props
}: React.ComponentProps<typeof InputGroupButton>) {
  return <InputGroupButton className={cn(className)} {...props} />
}

function ComboboxValue({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function ComboboxGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />
}

function ComboboxLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-2 py-1 text-xs", className)} {...props} />
}

function ComboboxSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("bg-border my-1 h-px", className)} {...props} />
}

function ComboboxChips({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />
}

function ComboboxChip({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />
}

function ComboboxChipsInput(
  props: React.ComponentProps<typeof InputGroupInput>
) {
  return <InputGroupInput {...props} />
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
