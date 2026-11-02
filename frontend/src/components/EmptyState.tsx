import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";

export default function EmptyState({
  title,
  description,
  icon = "book",
  href,
  action,
}: {
  title: string;
  description: string;
  icon?: IconName;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/70 px-5 py-14 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-sage text-brand">
        <Icon name={icon} className="size-7" />
      </div>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">
        {description}
      </p>
      {href && (
        <Link href={href} className="button-primary mt-6">
          {action ?? "Khám phá sách"}
          <Icon name="arrow" className="size-4" />
        </Link>
      )}
    </div>
  );
}
