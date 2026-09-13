import { useEffect } from "react";

function setMetaTag(name: string, content: string): () => void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const created = !tag;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  const prevContent = tag.getAttribute("content");
  tag.setAttribute("content", content);
  return () => {
    if (created) {
      tag?.remove();
    } else if (prevContent !== null) {
      tag?.setAttribute("content", prevContent);
    }
  };
}

function setCanonicalLink(href: string): () => void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !link;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  const prevHref = link.getAttribute("href");
  link.setAttribute("href", href);
  return () => {
    if (created) {
      link?.remove();
    } else if (prevHref !== null) {
      link?.setAttribute("href", prevHref);
    }
  };
}

/** Sets the page title, meta description, and canonical URL for as long as the calling page is mounted. */
export function useDocumentMeta(title: string, description?: string, canonicalPath?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const cleanups: Array<() => void> = [];
    if (description) cleanups.push(setMetaTag("description", description));
    if (canonicalPath) {
      cleanups.push(setCanonicalLink(`https://maketsmart.com${canonicalPath}`));
    }

    return () => {
      document.title = prevTitle;
      cleanups.forEach((fn) => fn());
    };
  }, [title, description, canonicalPath]);
}
