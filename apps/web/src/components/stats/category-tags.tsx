import Link from "next/link";
import { useTranslations } from "next-intl";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryTagsProps {
  categories: Category[];
  className?: string;
}

export function CategoryTags({ categories, className }: CategoryTagsProps) {
  const t = useTranslations("product");

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <Tag className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{t("categories")}:</span>
      {categories.map((category) => (
        <Link key={category.id} href={`/topics/${category.slug}`}>
          <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
            {category.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
