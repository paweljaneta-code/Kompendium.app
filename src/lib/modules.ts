import fs from "node:fs/promises";
import path from "node:path";

export type ContentModule = {
  slug: string;
  title: string;
  subtitle: string;
  content: string;
};

const modulesDir = path.join(process.cwd(), "content", "modules");

const getModuleTitle = (content: string) => {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  return titleMatch?.[1]?.trim() ?? "Modul terapeutyczny";
};

const getModuleSubtitle = (content: string) => {
  const subtitleMatch = content.match(/^_(.+)_$/m);
  return subtitleMatch?.[1]?.trim() ?? "";
};

export async function getAllModules(): Promise<ContentModule[]> {
  const entries = await fs.readdir(modulesDir, { withFileTypes: true });
  const mdFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"));

  const modules = await Promise.all(
    mdFiles.map(async (file) => {
      const slug = file.name.replace(/\.md$/i, "");
      const fullPath = path.join(modulesDir, file.name);
      const content = await fs.readFile(fullPath, "utf8");

      return {
        slug,
        title: getModuleTitle(content),
        subtitle: getModuleSubtitle(content),
        content
      };
    })
  );

  return modules.sort((a, b) => a.title.localeCompare(b.title, "pl"));
}

export async function getModuleBySlug(slug: string): Promise<ContentModule | null> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!safeSlug) return null;

  const fullPath = path.join(modulesDir, `${safeSlug}.md`);

  try {
    const content = await fs.readFile(fullPath, "utf8");
    return {
      slug: safeSlug,
      title: getModuleTitle(content),
      subtitle: getModuleSubtitle(content),
      content
    };
  } catch {
    return null;
  }
}
