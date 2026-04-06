## 2025-05-14 - [O(N) GPX Parsing Optimization]
**Learning:** Using the spread operator (`[...acc, item]`) inside a `reduce` or any loop for large datasets (like 5,000+ GPX trackpoints) causes quadratic $O(N^2)$ time complexity due to constant array copying. This blocks the main thread and leads to noticeable UI lag in React applications.
**Action:** Always prefer standard `for` loops or `forEach` with a mutable array `push` when aggregating large datasets in frontend logic to ensure $O(N)$ performance.

## 2025-05-14 - [UI Consistency for Header Buttons]
**Learning:** Consistent button heights and hover shapes (border-radius) are critical for a professional SPA look. Standardizing on utility classes like `h-10` and `rounded-xl` across diverse button types (icon-only, text+icon, toggle) ensures perfect alignment in headers.
**Action:** When a user requests "matching" buttons, verify both the physical height (px) and the `border-radius` (hover shape) across all interactive elements in the target container.
