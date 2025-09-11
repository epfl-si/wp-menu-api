export function flatSitemap(sitemap: any[], visited = new WeakSet()): string[] {
	return sitemap.flatMap(s => {
		// Avoid infinite recursion
		if (visited.has(s)) {
			return [];
		}
		visited.add(s);

		const self = `<url>
  <loc>${s.url}</loc>
</url>`;

		const children = Array.isArray(s.children)
			? flatSitemap(s.children, visited)
			: [];

		return [self, ...children];
	});
}
