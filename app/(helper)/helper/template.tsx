/**
 * Next re-mounts a template on every navigation, so this is where a page
 * entrance belongs — a layout would animate once and never again.
 *
 * 6px and 260ms: enough that the eye registers new content has arrived,
 * short enough that nobody waits on it. Neutralised entirely under
 * prefers-reduced-motion by the global rule in globals.css.
 */
export default function HelperTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="wt-page-enter">{children}</div>;
}
