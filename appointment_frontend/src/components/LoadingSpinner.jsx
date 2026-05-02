// Centered teal spinner — size prop sm | md | lg maps to Tailwind width/height scale.
const sizes = { sm: 'h-6 w-6 border-2', md: 'h-10 w-10 border-2', lg: 'h-14 w-14 border-4' };

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-zen-primary border-t-transparent ${sizes[size] || sizes.md} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
