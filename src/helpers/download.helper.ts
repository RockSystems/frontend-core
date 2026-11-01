// Збереження отриманого з бека файла на диск.
// Качаємо через axios (а не голим <a href>), щоб файл їхав тим самим шляхом
// авторизації, що й решта запитів, і щоб 4xx ловився як звичайна помилка,
// а не відкривався сирою сторінкою у вкладці.

export class DownloadHelper {
  /** Кладе blob у «Завантаження» браузера під заданим імʼям. */
  static saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Відкликаємо одразу: клік уже стартував завантаження, посилання більше
    // не потрібне, а без revoke blob висить у памʼяті до перезавантаження.
    URL.revokeObjectURL(url)
  }

  /**
   * Витягує імʼя файла з заголовка `Content-Disposition`.
   * Спершу `filename*=UTF-8''...` (RFC 5987, не-ASCII), потім звичайний `filename=`.
   * Не знайшли — null, зовні підставляється свій дефолт.
   */
  static filenameFromDisposition(disposition?: string | null): string | null {
    if (!disposition) return null

    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
    if (encoded) return decodeURIComponent(encoded[1].trim())

    const plain = /filename="?([^";]+)"?/i.exec(disposition)
    return plain ? plain[1].trim() : null
  }
}
