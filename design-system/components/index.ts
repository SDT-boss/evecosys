/**
 * @evecosys/design-system — component exports
 *
 * Organised by atomic design tier. Import from here in the Next.js app
 * and in Storybook. All components use var(--ds-*) tokens exclusively —
 * no hardcoded colours, radii, or shadows.
 *
 * Graduation rule: a component moves from /app/components/ to here when
 * it is used in 2+ unrelated places, or when it needs visual sign-off
 * via Storybook before shipping.
 *
 * ─── ATOMS ───────────────────────────────────────────────────────────────────
 * Foundational, single-purpose UI elements with no internal composition.
 */

// Interactive controls
export { Button, buttonVariants, type ButtonProps }           from "./Button";
export { Input }                                              from "./Input";
export { Checkbox }                                           from "./Checkbox";
export { RadioGroup, RadioGroupItem }                         from "./RadioGroup";
export { Switch }                                             from "./Switch";
export { Textarea }                                           from "./Textarea";
export {
  Select, SelectGroup, SelectValue, SelectTrigger,
  SelectContent, SelectLabel, SelectItem, SelectSeparator,
  SelectScrollUpButton, SelectScrollDownButton,
}                                                             from "./Select";

// Display primitives
export { Badge, badgeVariants, type BadgeProps }              from "./Badge";
export { Label }                                              from "./Label";
export { Separator }                                          from "./Separator";
export { Avatar, AvatarImage, AvatarFallback }                from "./Avatar";
export { Skeleton }                                           from "./Skeleton";
export { Progress }                                           from "./Progress";
export { Spinner, type SpinnerProps }                         from "./Spinner";

/**
 * ─── MOLECULES ───────────────────────────────────────────────────────────────
 * Composed from atoms; carry EVEcosys-specific semantic logic.
 */

// Surfaces
export {
  Card, CardHeader, CardFooter,
  CardTitle, CardDescription, CardContent,
}                                                             from "./Card";
export { StatCard, type StatCardProps, type TrendDirection }  from "./StatCard";

// Feedback
export { Alert, AlertTitle, AlertDescription }                from "./Alert";
export { EmptyState, type EmptyStateProps }                   from "./EmptyState";

// Overlays
export {
  Dialog, DialogPortal, DialogOverlay, DialogClose,
  DialogTrigger, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
}                                                             from "./Dialog";
export {
  AlertDialog, AlertDialogPortal, AlertDialogOverlay,
  AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
}                                                             from "./AlertDialog";

// Contextual
export {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
}                                                             from "./Tooltip";
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut,
  DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup,
}                                                             from "./DropdownMenu";

// Navigation & layout
export { Tabs, TabsList, TabsTrigger, TabsContent }           from "./Tabs";
export { NavigationItem, type NavigationItemProps }           from "./NavigationItem";
export { FormField, type FormFieldProps }                     from "./FormField";

/**
 * ─── ORGANISMS ───────────────────────────────────────────────────────────────
 * Complex, multi-atom structures that define page-level patterns.
 */

export {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
}                                                             from "./Table";
export { OnboardingCard }                                     from "./OnboardingCard";
