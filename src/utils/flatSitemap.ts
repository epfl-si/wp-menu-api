export function flatSitemap(sitemap: any[]): string[] {
	return sitemap.flatMap(s => [`<url>
  <loc>${s.url}</loc>
</url>`, ...flatSitemap(s.children)])
}
