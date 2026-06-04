/**
 * @evecosys/design-system — component exports
 *
 * Import from here in the Next.js app and in Storybook.
 * Only components that have a story in /design-system/stories/ and whose
 * tokens reference var(--ds-*) should be exported from this barrel.
 *
 * Graduation rule: a component graduates from /app/components/ to here
 * when it is used in two or more unrelated places, or when it is a core
 * primitive that needs visual sign-off via Storybook.
 */

export { Button, buttonVariants, type ButtonProps } from "./Button";
export { Input } from "./Input";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./Card";
export { Badge, badgeVariants, type BadgeProps } from "./Badge";
