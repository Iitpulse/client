"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MultiSelectCreatableOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

interface MultiSelectCreatableProps {
  options: MultiSelectCreatableOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  onCreateNew?: (name: string) => Promise<void>;
  createNewPlaceholder?: string;
  createNewLabel?: string;
  allowCreate?: boolean;
  className?: string;
}

export function MultiSelectCreatable({
  options,
  values,
  onValuesChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  onCreateNew,
  createNewPlaceholder = "Enter name...",
  createNewLabel = "Add new item",
  allowCreate = true,
  className,
}: MultiSelectCreatableProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const selectedSet = React.useMemo(() => new Set(values), [values]);

  const toggleValue = (value: string) => {
    const newValues = selectedSet.has(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    onValuesChange(newValues);
  };

  const handleCreateNew = async () => {
    if (!newItemName.trim() || !onCreateNew) return;

    setIsCreating(true);
    try {
      await onCreateNew(newItemName.trim());
      setNewItemName("");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create new item:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((opt) =>
      (opt.label || opt.value || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const showCreateOption =
    allowCreate &&
    onCreateNew &&
    search &&
    !options.some((opt) => (opt.label || opt.value || "").toLowerCase() === search.toLowerCase());

  return (
    <>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex h-auto min-h-9 w-full items-center justify-between gap-2 overflow-hidden px-3 py-1.5 text-sm",
              className
            )}
          >
            {values.length === 0 ? (
              <span className="text-muted-foreground font-normal">
                {placeholder}
              </span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {values.map((value) => {
                  const option = options.find((opt) => opt.value === value);
                  return (
                    <Badge
                      variant="outline"
                      key={value}
                      className="group flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleValue(value);
                      }}
                    >
                      {option?.label || value}
                      <XIcon className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                    </Badge>
                  );
                })}
              </div>
            )}
            <ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSet.has(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label || option.value}
                  </CommandItem>
                ))}
              </CommandGroup>
              {showCreateOption && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setNewItemName(search);
                        setDialogOpen(true);
                        setOpen(false);
                      }}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add &quot;{search}&quot;
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
              {allowCreate && onCreateNew && !showCreateOption && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setDialogOpen(true);
                        setOpen(false);
                      }}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      {createNewLabel}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createNewLabel}</DialogTitle>
            <DialogDescription>
              Enter a name for the new item. It will be added to the list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder={createNewPlaceholder}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateNew();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNew} disabled={isCreating || !newItemName.trim()}>
              {isCreating ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Single Select with Create capability
interface SingleSelectCreatableProps {
  options: MultiSelectCreatableOption[];
  value: string;
  onValueChange: (value: string, option?: MultiSelectCreatableOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  onCreateNew?: (name: string) => Promise<void>;
  createNewPlaceholder?: string;
  createNewLabel?: string;
  allowCreate?: boolean;
  className?: string;
}

export function SingleSelectCreatable({
  options,
  value,
  onValueChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  onCreateNew,
  createNewPlaceholder = "Enter name...",
  createNewLabel = "Add new item",
  allowCreate = true,
  className,
}: SingleSelectCreatableProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newItemName, setNewItemName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const handleCreateNew = async () => {
    if (!newItemName.trim() || !onCreateNew) return;

    setIsCreating(true);
    try {
      await onCreateNew(newItemName.trim());
      setNewItemName("");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create new item:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((opt) =>
      (opt.label || opt.value || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const showCreateOption =
    allowCreate &&
    onCreateNew &&
    search &&
    !options.some((opt) => (opt.label || opt.value || "").toLowerCase() === search.toLowerCase());

  return (
    <>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 px-3 py-2 text-sm font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            {selectedOption?.label || selectedOption?.value || placeholder}
            <ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onValueChange(option.value, option);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label || option.value}
                  </CommandItem>
                ))}
              </CommandGroup>
              {showCreateOption && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setNewItemName(search);
                        setDialogOpen(true);
                        setOpen(false);
                      }}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add &quot;{search}&quot;
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
              {allowCreate && onCreateNew && !showCreateOption && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setDialogOpen(true);
                        setOpen(false);
                      }}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      {createNewLabel}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createNewLabel}</DialogTitle>
            <DialogDescription>
              Enter a name for the new item. It will be added to the list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder={createNewPlaceholder}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateNew();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNew} disabled={isCreating || !newItemName.trim()}>
              {isCreating ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
