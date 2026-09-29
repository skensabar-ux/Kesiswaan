/**
 * Isi placeholder {nama} pada template. Placeholder yang tidak dikenal dibiarkan apa adanya
 * agar kesalahan template mudah terlihat saat dicek.
 */
export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>) {
  return template.replace(/\{([a-z_]+)\}/g, (m, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? m : String(v);
  });
}
