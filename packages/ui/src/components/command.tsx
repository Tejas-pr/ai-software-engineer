import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@workspace/ui/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@workspace/ui/components/input-group"
import { SearchIcon, CheckIcon } from "lucide-react"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

// variant="glass": a bigger, Spotlight-like palette on frosted glass. The
// command parts are styled from here so the default palette stays as it is
const commandGlass = cn(
  "top-1/5 rounded-3xl! sm:max-w-2xl",
  "**:data-[slot=command]:bg-transparent **:data-[slot=command]:p-0",
  // The input: tall, borderless, with a hairline under it
  "**:data-[slot=command-input-wrapper]:border-b **:data-[slot=command-input-wrapper]:border-glass-border **:data-[slot=command-input-wrapper]:p-2",
  "**:data-[slot=input-group]:h-12! **:data-[slot=input-group]:border-transparent **:data-[slot=input-group]:bg-transparent!",
  "**:data-[slot=command-input]:text-base",
  "**:data-[slot=input-group-addon]:ps-3 **:data-[slot=input-group-addon]:*:[svg]:size-5",
  // The list grows and shrinks with the results
  "**:data-[slot=command-list]:h-(--cmdk-list-height) **:data-[slot=command-list]:max-h-112 **:data-[slot=command-list]:p-2 **:data-[slot=command-list]:transition-[height] **:data-[slot=command-list]:duration-200 **:data-[slot=command-list]:ease-out motion-reduce:**:data-[slot=command-list]:transition-none",
  "**:[[cmdk-group-heading]]:px-3! **:[[cmdk-group-heading]]:pt-2!",
  "**:data-[slot=command-empty]:py-12 **:data-[slot=command-empty]:text-sm",
  // Roomy rows; the highlight (the sidebar's active item colours) fades between them
  "**:data-[slot=command-item]:min-h-11 **:data-[slot=command-item]:gap-3 **:data-[slot=command-item]:rounded-xl! **:data-[slot=command-item]:px-3 **:data-[slot=command-item]:text-sm **:data-[slot=command-item]:transition-colors **:data-[slot=command-item]:duration-150 **:data-[slot=command-item]:data-selected:bg-glass-selected **:data-[slot=command-item]:data-selected:text-glass-selected-foreground **:data-[slot=command-item]:*:[svg]:size-4!"
)

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  variant = "default",
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  variant?: "default" | "glass"
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        variant={variant}
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0",
          variant === "glass" && commandGlass,
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-8! bg-input/20 dark:bg-input/30">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-xs/relaxed outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-3.5 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-xs/relaxed", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 my-1 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-xs/relaxed outline-hidden select-none in-data-[slot=dialog-content]:rounded-md data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ms-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ms-auto text-[0.625rem] tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
